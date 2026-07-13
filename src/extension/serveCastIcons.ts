import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const CAST_ICON_DIR = path.resolve(process.cwd(), 'data/cast_icon');

// 拡張子 → Content-Type。未知の拡張子は octet-stream で配信する。
const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

type Log = { warn(...args: unknown[]): void };

/**
 * data/cast_icon/{キャスト名}.{拡張子} を配信する簡易静的ミドルウェア。
 *
 * 武器画像（serveWeaponImages.ts）と異なり、ファイル名が日本語かつ拡張子が不定のため、
 * リクエストされた名前（拡張子なし・URLエンコード済み）に対し、ディレクトリを走査して
 * 「拡張子を除いた basename が一致する最初のファイル」を配信する。
 */
export function createCastIconMiddleware(log: Log) {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end();
      return;
    }

    const rawPath = (req.url ?? '').split('?')[0];
    let decoded: string;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {
      res.statusCode = 400;
      res.end();
      return;
    }

    // path.basename でパス区切りを除去し、パストラバーサルを防ぐ。
    const name = path.basename(decoded);
    if (!name || name === '.' || name === '..') {
      res.statusCode = 400;
      res.end();
      return;
    }

    let entries: string[];
    try {
      entries = fs.readdirSync(CAST_ICON_DIR);
    } catch (e) {
      log.warn('[serveCastIcons] ディレクトリ読み込みエラー:', e);
      res.statusCode = 404;
      res.end();
      return;
    }

    // 拡張子を除いた basename が一致するファイルを探す。
    const match = entries.find((f) => path.basename(f, path.extname(f)) === name);
    if (!match) {
      res.statusCode = 404;
      res.end();
      return;
    }

    const resolved = path.resolve(CAST_ICON_DIR, match);
    if (!resolved.startsWith(CAST_ICON_DIR + path.sep)) {
      res.statusCode = 400;
      res.end();
      return;
    }

    const contentType = CONTENT_TYPES[path.extname(match).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    // アイコン差し替えを考慮し、キャッシュは短めにする。
    res.setHeader('Cache-Control', 'public, max-age=60');
    const stream = fs.createReadStream(resolved);
    stream.on('error', (e) => {
      log.warn('[serveCastIcons] ファイル読み込みエラー:', e);
      res.statusCode = 500;
      res.end();
    });
    stream.pipe(res);
  };
}
