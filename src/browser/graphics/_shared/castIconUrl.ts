/**
 * キャストアイコン画像（data/cast_icon/{キャスト名}.{拡張子}）のURLを組み立てる。
 *
 * `nodecg.mount()`（Extension APIのメソッド）は `/bundles/{bundleName}/` 配下に
 * 自動でプレフィックスされないため、`serveCastIcons.ts` は素の `/cast-icons` に配信される。
 * 拡張子は不定なので、名前（拡張子なし）だけを渡してサーバ側で解決させる。
 */
export function castIconUrl(name: string): string {
  return `/cast-icons/${encodeURIComponent(name)}`;
}
