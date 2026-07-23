/**
 * ステージアイコン画像（data/stage_icon/{ステージ名}.png）のURLを組み立てる。
 *
 * `nodecg.mount()`（Extension APIのメソッド）は `/bundles/{bundleName}/` 配下に
 * 自動でプレフィックスされないため、`serveStageIcons.ts` は素の `/stage-icons` に配信される。
 * 拡張子は不定なので、名前（拡張子なし）だけを渡してサーバ側で解決させる。
 */
export function stageIconUrl(name: string): string {
  return `/stage-icons/${encodeURIComponent(name)}`;
}
