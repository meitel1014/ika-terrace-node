import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

const WEAPON_IMAGE_DIR = path.resolve(process.cwd(), 'data/weapon_flat_10_0_0');

// weapon_aliases.csv の id 列はアルファベット・数字・アンダースコアのみで構成される想定。
const SAFE_FILENAME = /^[A-Za-z0-9_]+\.png$/;

type Log = { warn(...args: unknown[]): void };

/** data/weapon_flat_10_0_0/{id}.png を配信する簡易静的ミドルウェア。 */
export function createWeaponImageMiddleware(log: Log) {
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

    const filename = path.basename(decoded);
    if (!SAFE_FILENAME.test(filename)) {
      res.statusCode = 400;
      res.end();
      return;
    }

    const resolved = path.resolve(WEAPON_IMAGE_DIR, filename);
    if (!resolved.startsWith(WEAPON_IMAGE_DIR + path.sep)) {
      res.statusCode = 400;
      res.end();
      return;
    }

    if (!fs.existsSync(resolved)) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const stream = fs.createReadStream(resolved);
    stream.on('error', (e) => {
      log.warn('[serveWeaponImages] ファイル読み込みエラー:', e);
      res.statusCode = 500;
      res.end();
    });
    stream.pipe(res);
  };
}
