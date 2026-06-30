/**
 * 全チームのチーム名画像を一括エクスポートするスタンドアロンスクリプト。
 * NodeCG・Replicant に依存せず、data/teams.csv を直接読む。
 *
 * 実行: node scripts/export-images.mjs
 *       または: pnpm run export-images
 *
 * 要件: インターネット接続（Adobe Typekit + Google Fonts の CDN 読み込み）
 *
 * 出力: dump/
 *   Name-Team_VS-under/{team.id}.png              960×70
 *   Name-Team_VS-side/{アルファ|ブラボー}/{team.id}.png  960×1080
 *
 * ─── メンテナンスガイド ────────────────────────────────────────────────────────
 * ✅ 自動反映（スクリプト修正不要）:
 *   - CSS の変更（色・サイズ・レイアウト等）
 *       → UNDER_CSS / SIDE_CSS / GLOBAL_CSS を実行時に readFileSync で読み込む
 *   - チームデータ変更（data/teams.csv）
 *       → 実行のたびに最新の CSV を読み込む
 *
 * ❌ 手動での同期が必要:
 *   - Shadow パラメータ
 *       → 参照元: src/browser/graphics/_shared/UnderGraphic.tsx の const SHADOW
 *                  src/browser/graphics/_shared/SideGraphic.tsx の const SHADOW
 *       → buildUnderHtml / buildSideHtml の buildSvgFilter 呼び出し引数を更新
 *   - FitText のスケール計算ロジック
 *       → 参照元: src/browser/components/FitText.tsx の useEffect 内
 *       → buildSideHtml の <script> ブロックを更新
 *   - HTML の要素構造（新要素追加・削除）
 *       → 参照元: UnderGraphic.tsx / SideGraphic.tsx の TeamSlot コンポーネントの return
 *       → buildUnderHtml / buildSideHtml の HTML テンプレート部分を更新
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

// ─── パス解決 ──────────────────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');
const DUMP_DIR = path.join(PROJECT_ROOT, 'dump');

// ─── CSS（実行時に読み込み。各ファイルの変更は自動反映） ──────────────────────────

// 参照元: src/browser/graphics/_shared/under.css
const UNDER_CSS = readFileSync(
  path.join(SRC_ROOT, 'browser/graphics/_shared/under.css'), 'utf-8',
);

// 参照元: src/browser/graphics/_shared/side.css
const SIDE_CSS = readFileSync(
  path.join(SRC_ROOT, 'browser/graphics/_shared/side.css'), 'utf-8',
);

// 参照元: src/browser/global.css
// * { box-sizing: border-box } を全要素に適用することで、実際の NodeCG ページと
// 同じレイアウト計算になる（適用しないと .side-slot の content area がずれる）
const GLOBAL_CSS = readFileSync(
  path.join(SRC_ROOT, 'browser/global.css'), 'utf-8',
);

// ─── CSV パーサ（src/extension/csv.ts の移植） ────────────────────────────────

function parseCsv(input) {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    if (row.length === 1 && row[0] === '') { row = []; return; }
    rows.push(row); row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { pushField(); i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { pushField(); pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { pushField(); pushRow(); }
  return rows;
}

// ─── チームローダー（src/extension/loadTeams.ts の移植） ──────────────────────

// 参照元: src/extension/loadTeams.ts の PLAYER_DIGITS / findPlayerColumnIndex
// 申請フォームによる表記揺れ（半角/全角/丸数字）に対応するため柔軟に検出する
const PLAYER_DIGITS = [
  ['1', '１', '①'],
  ['2', '２', '②'],
  ['3', '３', '③'],
  ['4', '４', '④'],
];

function findPlayerColumnIndex(header, playerNum) {
  const digits = PLAYER_DIGITS[playerNum];
  return header.findIndex(h => digits.some(d => h.includes(d)));
}

function loadTeams() {
  const csvPath = path.join(PROJECT_ROOT, 'data/teams.csv');
  const raw = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(raw);
  if (rows.length === 0) return [];

  const header = rows[0].map(h => h.trim());

  // 参照元: src/extension/loadTeams.ts の idx 構築
  const idx = {
    name:     header.indexOf('チーム名'),
    viewname: header.indexOf('チーム名(表示用)'),
    players: [
      findPlayerColumnIndex(header, 0),
      findPlayerColumnIndex(header, 1),
      findPlayerColumnIndex(header, 2),
      findPlayerColumnIndex(header, 3),
    ],
  };

  const pool = [];
  let serial = 0;

  for (const row of rows.slice(1)) {
    const rawName = idx.name >= 0 ? (row[idx.name] ?? '').trim() : '';
    if (!rawName) continue;

    serial++;
    const rawViewname = idx.viewname >= 0 ? (row[idx.viewname] ?? '').trim() : '';

    pool.push({
      id:       String(serial),          // 連番文字列（Replicant 検索キー）
      name:     rawName,                 // CSV 原本チーム名（編集禁止）
      viewname: rawViewname || rawName,  // 表示用チーム名（HTML 可、Graphic 専用）
      players: [
        idx.players[0] >= 0 ? (row[idx.players[0]] ?? '').trim() : '',
        idx.players[1] >= 0 ? (row[idx.players[1]] ?? '').trim() : '',
        idx.players[2] >= 0 ? (row[idx.players[2]] ?? '').trim() : '',
        idx.players[3] >= 0 ? (row[idx.players[3]] ?? '').trim() : '',
      ],
    });
  }

  return pool;
}

// ─── HTML 生成ユーティリティ ───────────────────────────────────────────────────

// 参照元: src/browser/utils/stripHtml.ts
const stripHtml = html => html.replace(/<[^>]*>/g, '');

// 参照元: src/browser/graphics/_shared/ShadowFilters.tsx の feXxx フィルター構成
function buildSvgFilter(id, color, opacity, dilate, dx, dy, blur) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feFlood flood-color="${color}" flood-opacity="${opacity}" result="color"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="${dilate}" result="spread"/>
      <feOffset in="spread" dx="${dx}" dy="${dy}" result="shifted"/>
      <feGaussianBlur in="shifted" stdDeviation="${blur}" result="blurred"/>
      <feComposite in="color" in2="blurred" operator="in" result="shadow"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>`;
}

// Typekit kit ID は .env の TYPEKIT_KIT_ID から取得（src/template.html と同じ値を使う）
// pageHeight: html/body をこの高さで固定し、NodeCG ページと同じ containing block を再現する
// CSS 内の @import は <style> の先頭でなければならないため行単位で抽出して先頭に置く
function buildHead(cssText, pageHeight) {
  const importLines = [];
  const otherLines = [];
  for (const line of cssText.split('\n')) {
    (line.trim().startsWith('@import') ? importLines : otherLines).push(line);
  }
  const css = [
    ...importLines,
    `html, body { margin: 0; height: ${pageHeight}px; overflow: hidden; background: transparent; }`,
    GLOBAL_CSS,
    ...otherLines,
  ].join('\n');

  return `<head>
<meta charset="UTF-8">
<script>(function(d){
  var config={kitId:'${process.env.TYPEKIT_KIT_ID ?? ''}',scriptTimeout:8000,async:true},
  h=d.documentElement,
  t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),
  tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;
  h.className+=" wf-loading";
  tk.src='https://use.typekit.net/'+config.kitId+'.js';
  tk.async=true;
  tk.onload=tk.onreadystatechange=function(){
    a=this.readyState;
    if(f||a&&a!="complete"&&a!="loaded")return;
    f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}
  };
  s.parentNode.insertBefore(tk,s);
})(document);</script>
<style>
${css}
</style>
</head>`;
}

// ─── under HTML ────────────────────────────────────────────────────────────────
// 参照元（構造）: src/browser/graphics/_shared/UnderGraphic.tsx の TeamSlot
// 参照元（表示）: チーム名 → team.name（CSV 原本、HTML なし）、プレイヤー → team.players.join('　')

function buildUnderHtml(team) {
  // SHADOW 参照元: UnderGraphic.tsx の const SHADOW
  // SHADOW.dx = 0 なので alpha/bravo で shadow パラメータは共通
  const filter = buildSvgFilter('shadow-alpha', 'rgb(43,43,43)', 0.7, 4, 0, 2, 2);

  return `<!DOCTYPE html><html>
${buildHead(UNDER_CSS, 70)}
<body>
<svg width="0" height="0" style="position:absolute"><defs>
  ${filter}
</defs></svg>
<div class="under-slot under-alpha">
  <div class="under-team-name">${stripHtml(team.name)}</div>
  <div class="under-players">${team.players.join('　')}</div>
</div>
</body></html>`;
}

// ─── side HTML ─────────────────────────────────────────────────────────────────
// 参照元（構造）: src/browser/graphics/_shared/SideGraphic.tsx
//   SideGraphic → .side-container → .side-slot.side-alpha + .side-slot.side-bravo
//   TeamSlot    → .side-slot → .side-team-content → team-name / players
// 参照元（表示）:
//   チーム名 → team.viewname を innerHTML + FitText スケール（FitText コンポーネント相当）
//   プレイヤー → team.players.map() で各行
//
// ビューポート 1920×1080 で NodeCG と同じ構造をレンダリングし、
// alpha: clip { x:0,   y:0, width:960, height:1080 }
// bravo: clip { x:960, y:0, width:960, height:1080 } で切り出す

function buildSideHtml(team, side) {
  // SHADOW 参照元: SideGraphic.tsx の const SHADOW
  // dx の符号: ShadowFilters.tsx の sides 配列
  //   [{ id: 'shadow-alpha', dx: -shadow.dx }, { id: 'shadow-bravo', dx: shadow.dx }]
  //   SHADOW.dx = 6 → alpha: dx=-6、bravo: dx=+6
  const filterAlpha = buildSvgFilter('shadow-alpha', 'rgb(94,94,94)', 0.6, 6, -6, 10, 4);
  const filterBravo = buildSvgFilter('shadow-bravo', 'rgb(94,94,94)', 0.6, 6,  6, 10, 4);

  // FitText の align prop → transformOrigin の対応
  // 参照元: src/browser/components/FitText.tsx
  //   align='left'  → 'left top'  （alpha）
  //   align='right' → 'right top' （bravo）
  const fitOrigin = side === 'alpha' ? 'left top' : 'right top';

  // チームコンテンツは対象サイドのスロットにのみ配置する（もう片方は空）
  const slotContent = `
    <div class="side-team-content">
      <div class="side-team-name" id="fit-container">
        <span id="fit-inner" style="display:inline-block;white-space:nowrap">${team.viewname}</span>
      </div>
      <div class="side-players">
        ${team.players.map(p => `<div class="side-player">${p}</div>`).join('\n        ')}
      </div>
    </div>`;

  return `<!DOCTYPE html><html>
${buildHead(SIDE_CSS, 1080)}
<body>
<svg width="0" height="0" style="position:absolute"><defs>
  ${filterAlpha}
  ${filterBravo}
</defs></svg>
<div class="side-container">
  <div class="side-slot side-alpha">
    ${side === 'alpha' ? slotContent : ''}
  </div>
  <div class="side-slot side-bravo">
    ${side === 'bravo' ? slotContent : ''}
  </div>
</div>
<script>
(function() {
  // FitText vanilla JS 実装 — src/browser/components/FitText.tsx の useEffect を移植
  // FitText.tsx のスケール計算が変わった場合はこのブロックも更新すること
  var container = document.getElementById('fit-container');
  var inner = document.getElementById('fit-inner');
  if (!container || !inner) {
    document.body.setAttribute('data-fit-done', '1');
    return;
  }
  inner.style.transform = 'none';
  container.style.height = 'auto';
  requestAnimationFrame(function() {
    var cw = inner.scrollWidth, aw = container.clientWidth;
    var ch = inner.scrollHeight;
    var ah = container.parentElement ? container.parentElement.clientHeight : 0;
    var s = 1;
    if (cw > aw && cw > 0) s = Math.min(s, aw / cw);
    if (ah > 0 && ch > ah) s = Math.min(s, ah / ch);
    inner.style.transform = 'scale(' + s + ')';
    inner.style.transformOrigin = '${fitOrigin}';
    container.style.height = (ch * s) + 'px';
    document.body.setAttribute('data-fit-done', '1');
  });
})();
</script>
</body></html>`;
}

// ─── Puppeteer スクリーンショット ──────────────────────────────────────────────
// viewport: ブラウザウィンドウサイズ（レイアウト計算の基準）
// clip:     実際に切り出す矩形（side は viewport=1920×1080 から片側を clip）

async function capture(page, html, viewport, clip, hasFitText = false) {
  await page.setViewport({ ...viewport, deviceScaleFactor: 1 });
  // networkidle0 だと Typekit の非同期リクエストでタイムアウトするため domcontentloaded を使う
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  // Typekit がフォント注入完了後に wf-active / wf-inactive クラスを付与するまで待機
  await page.waitForFunction(
    () => document.documentElement.classList.contains('wf-active')
       || document.documentElement.classList.contains('wf-inactive'),
    { timeout: 10000 },
  );
  if (hasFitText) {
    await page.waitForFunction(
      () => document.body.getAttribute('data-fit-done') === '1',
      { timeout: 5000 },
    );
  }
  await new Promise(r => setTimeout(r, 150));
  return page.screenshot({ omitBackground: true, type: 'png', clip });
}

// ─── メイン ───────────────────────────────────────────────────────────────────

const SIDE_LABEL = { alpha: 'アルファ', bravo: 'ブラボー' };

async function main() {
  const teams = loadTeams();
  console.log(`チーム数: ${teams.length}`);
  console.log(`出力先: ${DUMP_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // WSL2 / Docker 環境では必須
  });
  const page = await browser.newPage();
  let done = 0;

  try {
    for (const team of teams) {
      // under: 960×70
      const underDir = path.join(DUMP_DIR, 'Name-Team_VS-under');
      mkdirSync(underDir, { recursive: true });
      const underBuf = await capture(
        page, buildUnderHtml(team),
        { width: 960, height: 70 },
        { x: 0, y: 0, width: 960, height: 70 },
      );
      writeFileSync(path.join(underDir, `${team.name}.png`), underBuf);

      // side: 1920×1080 でレンダリングし、alpha(x:0) / bravo(x:960) を clip で切り出す
      for (const side of ['alpha', 'bravo']) {
        const sideDir = path.join(DUMP_DIR, 'Name-Team_VS-side', SIDE_LABEL[side]);
        mkdirSync(sideDir, { recursive: true });
        const sideBuf = await capture(
          page, buildSideHtml(team, side),
          { width: 1920, height: 1080 },
          { x: side === 'alpha' ? 0 : 960, y: 0, width: 960, height: 1080 },
          true,
        );
        writeFileSync(path.join(sideDir, `${team.name}.png`), sideBuf);
      }

      done++;
      console.log(`[${done}/${teams.length}] ${team.name}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✓ 完了 → ${DUMP_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
