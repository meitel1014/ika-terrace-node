import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Rule } from '../../schemas';
import { stripHtml } from '../../browser/utils/stripHtml';
import { yieldToEventLoop } from './utils';

const STAGES_BASE_DIR = path.resolve(process.cwd(), 'data/stages');
// 1920×1080 の上 250px を除外した判定領域（原寸）
const CROP_TOP_1080 = 250;

type StageTemplate = {
  stageName: string;
  rgb: Float32Array;              // N*3 (N=width*height)、正規化済み 0–1
  mean: [number, number, number]; // ZNCC 用チャネル別平均
  width: number;
  height: number;
};

const templateCache: Record<Rule, StageTemplate[] | null> = {
  turfWar: null,
  splatZones: null,
  towerControl: null,
  rainmaker: null,
  clamBlitz: null,
};

type WarnLogger = (message: string, ...args: unknown[]) => void;

/**
 * data/stages/<rule>/stages.json（{ starter, counter }）から
 * 判別対象ステージ名（starter ∪ counter）を返す。
 */
function readStageNames(rule: Rule, warn?: WarnLogger): string[] {
  const jsonPath = path.join(STAGES_BASE_DIR, rule, 'stages.json');
  if (!fs.existsSync(jsonPath)) {
    warn?.(`[matchStage] stages.json が存在しません: ${jsonPath}`);
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
      starter?: unknown;
      counter?: unknown;
    };
    // 各要素は "ステージ名"（文字列）または { name, label }。name を取り出し、
    // 判別テンプレート（data/stages/<rule>/<name>.png）の検索キーとして
    // HTML タグを除去したプレーン名にする。
    const toName = (item: unknown): string => {
      const raw =
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && typeof (item as { name?: unknown }).name === 'string'
            ? (item as { name: string }).name
            : '';
      return stripHtml(raw).trim();
    };
    const starter = Array.isArray(parsed.starter) ? parsed.starter.map(toName) : [];
    const counter = Array.isArray(parsed.counter) ? parsed.counter.map(toName) : [];
    // 重複を除いた starter ∪ counter
    return [...new Set([...starter, ...counter])].filter(Boolean);
  } catch (e) {
    warn?.(`[matchStage] stages.json のパースに失敗しました: ${jsonPath}`, e);
    return [];
  }
}

async function extractRgb(
  imgPath: string,
  cropTop: number,
  cropH: number,
  imgW: number,
  resizeW?: number,
  resizeH?: number,
): Promise<{ rgb: Float32Array; mean: [number, number, number]; width: number; height: number }> {
  let pipeline = sharp(imgPath).extract({ left: 0, top: cropTop, width: imgW, height: cropH });
  if (resizeW !== undefined && resizeH !== undefined) {
    pipeline = pipeline.resize(resizeW, resizeH, { fit: 'fill' });
  }
  const { data, info } = await pipeline.removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const n = info.width * info.height;
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3]     = data[i * info.channels]     / 255;
    rgb[i * 3 + 1] = data[i * info.channels + 1] / 255;
    rgb[i * 3 + 2] = data[i * info.channels + 2] / 255;
  }
  const sum = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) sum[c] += rgb[i * 3 + c];
  }
  const mean: [number, number, number] = [sum[0] / n, sum[1] / n, sum[2] / n];
  return { rgb, mean, width: info.width, height: info.height };
}

export async function loadStageTemplates(rule: Rule, warn?: WarnLogger): Promise<StageTemplate[]> {
  if (templateCache[rule]) return templateCache[rule]!;

  const dir = path.join(STAGES_BASE_DIR, rule);
  if (!fs.existsSync(dir)) {
    warn?.(`[matchStage] ディレクトリが存在しません: ${dir}`);
    return (templateCache[rule] = []);
  }

  const stageNames = readStageNames(rule, warn);

  const templates: StageTemplate[] = [];
  for (const stageName of stageNames) {
    const pngPath = path.join(dir, `${stageName}.png`);
    if (!fs.existsSync(pngPath)) {
      warn?.(`[matchStage] テンプレート PNG が存在しません: ${pngPath}`);
      continue;
    }
    try {
      const meta = await sharp(pngPath).metadata();
      const imgW = meta.width ?? 1920;
      const imgH = meta.height ?? 1080;
      const cropTop = Math.round(CROP_TOP_1080 * (imgH / 1080));
      const cropH = imgH - cropTop;

      const { rgb, mean, width, height } = await extractRgb(pngPath, cropTop, cropH, imgW);
      templates.push({ stageName, rgb, mean, width, height });
    } catch (e) {
      warn?.(`[matchStage] テンプレートのロードに失敗しました: "${stageName}"`, e);
    }
  }

  return (templateCache[rule] = templates);
}

// アルファマスクなし RGB ZNCC
// score = Σ_c Σ_i (A_c - Ā_c)(B_c - B̄_c) / √(Σ(A-Ā)² × Σ(B-B̄)²)
function znccRgb(
  src: Float32Array,
  srcMean: [number, number, number],
  tmpl: Float32Array,
  tmplMean: [number, number, number],
  n: number,
): number {
  let sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      const a = src[i * 3 + c] - srcMean[c];
      const b = tmpl[i * 3 + c] - tmplMean[c];
      sumAB += a * b;
      sumA2 += a * a;
      sumB2 += b * b;
    }
  }
  const denom = Math.sqrt(sumA2 * sumB2);
  return denom === 0 ? 0 : sumAB / denom;
}

export async function matchStage(
  screenshotPath: string,
  rule: Rule,
  imgWidth: number,
  imgHeight: number,
  warn?: WarnLogger,
): Promise<{ stageName: string; score: number }[]> {
  const templates = await loadStageTemplates(rule, warn);
  if (templates.length === 0) return [];

  // テンプレートの幅/高さを基準サイズとして使用（全テンプレートが同サイズ前提）
  const { width: tmplW, height: tmplH } = templates[0];

  // 上 250px 相当をクロップしてテンプレートと同サイズにリサイズ
  const cropTop = Math.round(CROP_TOP_1080 * (imgHeight / 1080));
  const cropH = imgHeight - cropTop;
  const { rgb: srcRgb, mean: srcMean } = await extractRgb(
    screenshotPath,
    cropTop,
    cropH,
    imgWidth,
    tmplW,
    tmplH,
  );

  const n = tmplW * tmplH;
  const ranked: { stageName: string; score: number }[] = [];
  for (const t of templates) {
    ranked.push({
      stageName: t.stageName,
      score: znccRgb(srcRgb, srcMean, t.rgb, t.mean, n),
    });
    // フルサイズ比較は重いため 1 テンプレートごとに yield
    await yieldToEventLoop();
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** テンプレートキャッシュを破棄する（ルール変更・stages.json 更新時の再読込用）。 */
export function invalidateStageTemplates(rule: Rule): void {
  templateCache[rule] = null;
}
