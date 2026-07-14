# Graphic 仕様

全 Graphic は 1920×1080。

| Graphic | 用途 | 表示領域 |
|---|---|---|
| `battle` | 対戦表示用 | 左上: チーム名2段（FitText 自動縮小）+ 勝利本数 / 左下: αプレイヤー4名 / 右下: βプレイヤー4名 |
| `cast` | 実況・解説担当者表示（メインレイアウト） | 担当者名 + キャストアイコン |
| `cast-replay` | 実況・解説担当者表示（リプレイレイアウト） | 担当者名 + キャストアイコン |
| `champion` | 優勝演出 | 優勝確定チームのチーム名 + プレイヤー4名 |
| `team-roster-alpha` / `team-roster-bravo` | 選手ロスター表示用（フルスクリーン、片チームのみ） | チーム名 + プレイヤー4名分（名前・持ちブキアイコン最大3つ・X ID） |

- **battle**: `selection` Replicant からチーム情報を、`winCount` Replicant から勝利本数を取得。`FitText`（`src/browser/components/FitText.tsx`）でチーム名の長さに応じてフォントサイズを自動縮小。プレイヤー名は `team.players` を使用。
- **cast / cast-replay**: `_shared/CastGraphic.tsx` をレイアウト別に薄くラップした独立ページ。`castMembers` Replicant を読み、キャストアイコンは `_shared/castIconUrl.ts` 経由で `/cast-icons/{キャスト名}`（バンドル名プレフィックス無し）から取得。アイコンが無い担当者は `onError` でアイコンを隠す。
- **champion**: `champion` Replicant の `side` を読むだけのステートレス描画。`side` が確定したときのみ該当チームを表示する（`champion` の導出は Extension 側 `recomputeChampion()` が担う）。`side` から先に hook を呼ばないよう、確定時だけ子コンポーネント（`useTeamData`）をマウントする。
- **team-roster-alpha/bravo**: `_shared/TeamRosterGraphic.tsx` を `side` propsで出し分けてマウントする独立ページ（1ページ2チーム表示ではない）。武器画像は `_shared/weaponImageUrl.ts` 経由で `/weapon-images/{id}.png`(バンドル名プレフィックス無し。`nodecg.mount()` は `/bundles/{bundleName}/` 配下に自動プレフィックスされないため)から取得(`player.weapons.slice(0, 3)`)。X IDは表示側で先頭`@`を正規化して付与する（データ自体は生値を保持）。
- 装飾は CSS クラスのみ付与。スタイル調整は手動で行う。
- チームは `selection` Replicant のアルファ/ブラボー選択に応じて即時表示される（表示/非表示の切り替えやフェード制御は無い）。

## 実装パターン

- **HTML 生成**: `{name}/index.tsx` を置くとビルド時に `graphics/{name}.html` が自動生成される。手動で HTML を書かない。
- **`_shared/` ディレクトリ**: graphics 共通コンポーネント + CSS を配置。`index.tsx` がないためエントリ扱いされない。
