/** X(Twitter) ID の生値に `@` を付与して表示用文字列にする。空なら空文字。 */
export function formatXId(xId: string): string {
  const trimmed = xId.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

/** X(Twitter) ID の生値からプロフィールページのURLを組み立てる。空なら空文字。 */
export function xProfileUrl(xId: string): string {
  const trimmed = xId.trim().replace(/^@/, '');
  if (!trimmed) return '';
  return `https://x.com/${trimmed}`;
}
