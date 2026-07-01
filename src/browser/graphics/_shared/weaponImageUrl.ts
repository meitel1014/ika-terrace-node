/**
 * 武器画像（data/weapon_flat_10_0_0/{id}.png）のURLを組み立てる。
 *
 * `nodecg.mount()`（Extension APIのメソッド）は `/bundles/{bundleName}/` 配下に
 * 自動でプレフィックスされない（package.json の宣言的な `nodecg.mount` 設定とは別物）ため、
 * `serveWeaponImages.ts` は素の `/weapon-images` に配信される。
 */
export function weaponImageUrl(weaponId: string): string {
  return `/weapon-images/${weaponId}.png`;
}
