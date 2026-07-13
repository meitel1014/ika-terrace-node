import type { NodeCG } from './nodecg';
import { loadTeamsPoolFromCsv, parseTeamsPoolFromCsvText } from './loadTeams';
import { loadTeamsFromSheets } from './loadTeamsFromSheets';
import { createWeaponImageMiddleware } from './serveWeaponImages';
import { createCastIconMiddleware } from './serveCastIcons';
import { loadCastCandidates } from './loadCastCandidates';
import { castCandidatesSchema } from '../schemas';
import type { Team } from '../schemas';

export default (nodecg: NodeCG) => {
  const log = new nodecg.Logger('ikaterrace');
  log.info('=====Extension is running=====');

  const teamsPoolRep = nodecg.Replicant('teamsPool');
  const selectionRep = nodecg.Replicant('selection');
  const winCountRep = nodecg.Replicant('winCount');
  const winTargetRep = nodecg.Replicant('winTarget');
  const championRep = nodecg.Replicant('champion');
  const castCandidatesRep = nodecg.Replicant('castCandidates');
  const castMembersRep = nodecg.Replicant('castMembers');

  // 優勝サイド（champion）を winCount / winTarget から一元的に導出する。
  // - 確定済みサイドが必要数を維持している間はそのまま（先着優先。BO3 で 2-2 等の異常系対策）。
  // - 未確定 or 確定サイドが必要数を下回ったら、到達サイドを再判定（同時到達は alpha 優先）。
  // selection 変更時は既存ロジックが該当枠の winCount を 0 にするため、その change を
  // 通じてここが再発火し champion も自動的に解除される（selection ハンドラへの追記は不要）。
  const recomputeChampion = () => {
    const wc = winCountRep.value ?? { alpha: 0, bravo: 0 };
    const target = winTargetRep.value ?? 2;
    const cur = championRep.value?.side ?? null;
    if (cur && wc[cur] >= target) return;
    let next: 'alpha' | 'bravo' | null = null;
    if (wc.alpha >= target) next = 'alpha';
    else if (wc.bravo >= target) next = 'bravo';
    if (next !== cur) {
      championRep.value = { side: next };
      log.info(`[champion] side=${next ?? 'none'} (winCount=${JSON.stringify(wc)}, target=${target})`);
    }
  };
  winCountRep.on('change', recomputeChampion);
  winTargetRep.on('change', recomputeChampion);

  // チーム選択が入れ替わったら、その枠の勝利数を 0 にリセットする。
  // Extension 側で一元化することで、Dashboard 経由でもプログラム経由でも確実にリセットされる。
  selectionRep.on('change', (newVal, oldVal) => {
    if (!newVal || !oldVal) return; // 初回購読（oldVal=undefined）はスキップ
    const wc = winCountRep.value ?? { alpha: 0, bravo: 0 };
    const next = { ...wc };
    let changed = false;
    if (newVal.alpha !== oldVal.alpha) {
      next.alpha = 0;
      changed = true;
    }
    if (newVal.bravo !== oldVal.bravo) {
      next.bravo = 0;
      changed = true;
    }
    if (changed) {
      winCountRep.value = next;
      log.info(`[winCount] selection 変更により勝利数をリセット: ${JSON.stringify(next)}`);
    }
  });

  // 初回起動時のみ teamsPool を初期化。Googleスプレッドシートを優先し、
  // 読み込めない場合（未設定・認証失敗等）は data/teams.csv にフォールバックする。
  if ((teamsPoolRep.value ?? []).length === 0) {
    void (async () => {
      const fromSheets = await loadTeamsFromSheets(log);
      if (fromSheets && fromSheets.length > 0) {
        teamsPoolRep.value = fromSheets;
        log.info(`Loaded teams from Google Sheets: ${fromSheets.length}`);
      } else {
        const loaded = loadTeamsPoolFromCsv();
        teamsPoolRep.value = loaded;
        log.info(`Loaded teams from CSV (fallback): ${loaded.length}`);
      }
    })();
  }

  castCandidatesRep.value = loadCastCandidates();
  log.info(
    `[cast] cast=${castCandidatesRep.value?.cast.length ?? 0}, ` +
    `operator=${castCandidatesRep.value?.operator.length ?? 0}, ` +
    `observer=${castCandidatesRep.value?.observer.length ?? 0}`
  );

  // POST /upload-teams-csv  (body: UTF-8 CSV text, Content-Type: text/plain)
  const MAX_CSV_BYTES = 1 * 1024 * 1024; // 1 MB: チーム情報CSVとして十分な上限

  nodecg.mount('/upload-teams-csv', (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

    let totalBytes = 0;
    let oversized = false
    ;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_CSV_BYTES) {
        if (!oversized) {
          oversized = true;
          res.status(413).json({ error: 'payload too large' });
          req.destroy();
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (oversized) return;

      const csvText = Buffer.concat(chunks).toString('utf-8');
      if (!csvText.trim()) {
        res.status(400).json({ error: 'empty body' });
        return;
      }

      let loaded;
      try {
        loaded = parseTeamsPoolFromCsvText(csvText);
      } catch (e) {
        log.error('[upload-teams-csv] CSV パース失敗', e);
        res.status(400).json({ error: 'invalid CSV' });
        return;
      }

      teamsPoolRep.value = loaded;
      log.info(`[upload-teams-csv] ${loaded.length} 件`);
      res.status(200).json({ teams: loaded.length });
    });

    req.on('error', (e) => {
      log.error('[upload-teams-csv] リクエストエラー', e);
    });
  });

  // POST /upload-cast-json  (body: UTF-8 JSON text, Content-Type: text/plain)
  const MAX_CAST_JSON_BYTES = 1 * 1024 * 1024;

  nodecg.mount('/upload-cast-json', (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

    let totalBytes = 0;
    let oversized = false;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_CAST_JSON_BYTES) {
        if (!oversized) {
          oversized = true;
          res.status(413).json({ error: 'payload too large' });
          req.destroy();
        }
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (oversized) return;

      const jsonText = Buffer.concat(chunks).toString('utf-8');
      if (!jsonText.trim()) {
        res.status(400).json({ error: 'empty body' });
        return;
      }

      let loaded;
      try {
        loaded = castCandidatesSchema.parse(JSON.parse(jsonText));
      } catch (e) {
        log.error('[upload-cast-json] JSON パース失敗', e);
        res.status(400).json({ error: 'invalid JSON' });
        return;
      }

      castCandidatesRep.value = loaded;
      log.info(
        `[upload-cast-json] cast=${loaded.cast.length}, operator=${loaded.operator.length}, observer=${loaded.observer.length}`
      );
      res.status(200).json({ cast: loaded.cast.length, operator: loaded.operator.length, observer: loaded.observer.length });
    });

    req.on('error', (e) => {
      log.error('[upload-cast-json] リクエストエラー', e);
    });
  });

  // GET /weapon-images/{id}.png
  nodecg.mount('/weapon-images', createWeaponImageMiddleware(log));

  // GET /cast-icons/{キャスト名}
  nodecg.mount('/cast-icons', createCastIconMiddleware(log));

  // OBS 等の外部トリガーから勝利数（本数）を操作するエンドポイント
  // POST /result  (body: { "result": "alpha_win" | "bravo_win" | "reset" }, Content-Type: application/json)
  //   alpha_win / bravo_win → 該当枠 +1、reset → 両枠 0
  // NodeCG がグローバルに express.json() を適用済みのため、パース済みの req.body を参照する
  // （不正な JSON はここに到達する前に 400 系で弾かれる）。
  nodecg.mount('/result', (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).end();
      return;
    }

    const result = (req.body as { result?: unknown } | undefined)?.result;
    if (result !== 'alpha_win' && result !== 'bravo_win' && result !== 'reset') {
      log.error('[result] 試合結果受信エラー: ' + String(result));
      res.status(400).json({ error: 'invalid result' });
      return;
    }

    const wc = winCountRep.value ?? { alpha: 0, bravo: 0 };
    if (result === 'reset') {
      winCountRep.value = { alpha: 0, bravo: 0 };
    } else if (result === 'alpha_win') {
      winCountRep.value = { ...wc, alpha: wc.alpha + 1 };
    } else {
      winCountRep.value = { ...wc, bravo: wc.bravo + 1 };
    }
    log.info(`[result] '${result}' -> winCount=${JSON.stringify(winCountRep.value)}`);
    res.status(202).end();
  });

  // ── Message ハンドラ ───────────────────────────────────

  nodecg.listenFor('reloadTeamsCsv', (_data, ack) => {
    const loaded = loadTeamsPoolFromCsv();
    teamsPoolRep.value = loaded;
    log.info(`Reloaded teams from CSV: ${loaded.length}`);
    if (ack && !ack.handled) ack(null);
  });

  nodecg.listenFor('reloadTeamsFromSheets', (_data, ack) => {
    void (async () => {
      const loaded = await loadTeamsFromSheets(log);
      if (loaded) {
        teamsPoolRep.value = loaded;
        log.info(`Reloaded teams from Google Sheets: ${loaded.length}`);
        if (ack && !ack.handled) ack(null);
      } else {
        log.warn('reloadTeamsFromSheets: スプレッドシート読み込みに失敗（teamsPoolは変更なし）');
        if (ack && !ack.handled) ack('スプレッドシート読み込みに失敗しました');
      }
    })();
  });

  nodecg.listenFor('updateTeam', ({ teamId, patch }, ack) => {
    const pool = teamsPoolRep.value;
    if (!pool) {
      if (ack && !ack.handled) ack(null);
      return;
    }
    const idx = pool.findIndex((t) => t.id === teamId);
    if (idx < 0) {
      log.warn(`updateTeam: teamId="${teamId}" not found`);
      if (ack && !ack.handled) ack(null);
      return;
    }

    const prev = pool[idx];
    const { players: patchPlayers, ...patchRest } = patch;
    const updated: Team = { ...prev, ...patchRest };
    if (patchPlayers) {
      updated.players = prev.players.map((p, i) => ({
        ...p,
        ...patchPlayers[i],
      })) as Team['players'];
    }

    const newPool = [...pool];
    newPool[idx] = updated;
    teamsPoolRep.value = newPool;
    if (ack && !ack.handled) ack(null);
  });

  nodecg.listenFor('reloadCastJson', (_data, ack) => {
    castCandidatesRep.value = loadCastCandidates();
    log.info('[cast] data/cast.json を再読み込みしました');
    if (ack && !ack.handled) ack(null);
  });

  nodecg.listenFor('setCastMembers', (data, ack) => {
    castMembersRep.value = data;
    if (ack && !ack.handled) ack(null);
  });
};
