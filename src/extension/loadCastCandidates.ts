import fs from 'node:fs';
import path from 'node:path';
import { castCandidatesSchema } from '../schemas';
import type { CastCandidates } from '../schemas';

const CAST_JSON_PATH = path.resolve(process.cwd(), 'data/cast.json');

export function loadCastCandidates(): CastCandidates {
  if (!fs.existsSync(CAST_JSON_PATH)) return castCandidatesSchema.parse(undefined);
  try {
    const raw = fs.readFileSync(CAST_JSON_PATH, 'utf-8');
    return castCandidatesSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.warn('[cast] data/cast.json の読み込みに失敗しました:', e);
    return castCandidatesSchema.parse(undefined);
  }
}
