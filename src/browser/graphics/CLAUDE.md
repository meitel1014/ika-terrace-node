# Graphic 仕様

| Graphic | 用途 | 表示領域 |
|---|---|---|
| `battle` | 対戦表示用（1920×1080） | 左上: チーム名2段（FitText 自動縮小）/ 左下: αプレイヤー4名 / 右下: βプレイヤー4名 |
| `team-roster-alpha` / `team-roster-bravo` | 選手ロスター表示用（各1920×1080フルスクリーン、片チームのみ） | チーム名 + プレイヤー4名分（名前・持ちブキアイコン最大3つ・X ID） |

- **battle**: `selection` Replicant からチーム情報を取得。`FitText`（`src/browser/components/FitText.tsx`）でチーム名の長さに応じてフォントサイズを自動縮小。プレイヤー名は `team.players` を使用。
- **team-roster-alpha/bravo**: `_shared/TeamRosterGraphic.tsx` を `side` propsで出し分けてマウントする独立ページ（1ページ2チーム表示ではない）。武器画像は `_shared/weaponImageUrl.ts` 経由で `/weapon-images/{id}.png`(バンドル名プレフィックス無し。`nodecg.mount()` は `/bundles/{bundleName}/` 配下に自動プレフィックスされないため)から取得(`player.weapons.slice(0, 3)`)。X IDは表示側で先頭`@`を正規化して付与する（データ自体は生値を保持）。
- 装飾は CSS クラスのみ付与。スタイル調整は手動で行う。
- チームは `selection` Replicant のアルファ/ブラボー選択に応じて即時表示される（表示/非表示の切り替えやフェード制御は無い）。

## 実装パターン

- **HTML 生成**: `{name}/index.tsx` を置くとビルド時に `graphics/{name}.html` が自動生成される。手動で HTML を書かない。
- **`_shared/` ディレクトリ**: graphics 共通コンポーネント + CSS を配置。`index.tsx` がないためエントリ扱いされない。
