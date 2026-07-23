import { stripHtml } from '@/browser/utils/stripHtml';

/**
 * ステージアイコン画像（data/stage_icon/{ステージ名}.png）のURLを組み立てる。
 *
 * `nodecg.mount()`（Extension APIのメソッド）は `/bundles/{bundleName}/` 配下に
 * 自動でプレフィックスされないため、`serveStageIcons.ts` は素の `/stage-icons` に配信される。
 * 拡張子は不定なので、名前（拡張子なし）だけを渡してサーバ側で解決させる。
 * ステージ名に <br> 等の HTML タグが含まれても照合できるよう、タグを除去して検索する。
 */
export function stageIconUrl(name: string): string {
  return `/stage-icons/${encodeURIComponent(stripHtml(name))}`;
}
