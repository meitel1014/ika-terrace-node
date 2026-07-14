# CLAUDE.md

## プロジェクト概要

スプラトゥーン 3 を用いたトーナメント大会の配信グラフィックシステム。
チーム情報を Dashboard から操作し、配信画面と会場スクリーンにオーバーレイ表示する。

バンドル名: `ika-terrace-node`（[package.json](package.json) の `name` と [bundleName.ts](bundleName.ts) の `BUNDLE_NAME` で定義。一致必須）

## 技術スタック

- **NodeCG**: v2 (`^2.6.4`) / **Node.js**: v22 以上（LTS）
- **フレームワーク**: React 19 + TypeScript 5.9（SWC 経由）
- **ビルド**: Vite 7 + Rollup 4 + esbuild（dashboard/graphics は Vite、extension は Rollup の別ビルド）
- **スキーマ**: Zod 3 + zod-to-json-schema（Replicant 型 → JSON Schema の自動生成）
- **型ブリッジ**: [ts-nodecg](https://www.npmjs.com/package/ts-nodecg)（`nodecg` グローバルを強く型付け）
- **パッケージマネージャー**: pnpm（Corepack 有効化）

## コマンド

```bash
pnpm install       # 依存インストール
pnpm dev           # Vite と NodeCG を並列起動（HMR あり）
pnpm build         # tsc -b → vite build（型チェック → プロダクションビルド）
pnpm lint          # ESLint（flat config）
npx nodecg start   # pnpm build 後の本番起動
```

- Vite 開発サーバー: http://localhost:9080（dashboard/graphics 用 HMR）
- NodeCG ダッシュボード: http://localhost:9090

`pnpm dev` は `run-p` で両方を並列起動する。本番運用では `pnpm build` → `npx nodecg start` を使うこと。

## アーキテクチャ

NodeCG は **Dashboard** / **Graphics** / **Extension** の 3 コンポーネントで構成される。

- **Dashboard** ([src/browser/dashboard/](src/browser/dashboard/)) — 運営用の操作パネル（Battle / 設定 / caster の 3 Workspace）
- **Graphics** ([src/browser/graphics/](src/browser/graphics/)) — 配信画面に載せるオーバーレイ（battle / cast / cast-replay / champion / team-roster-alpha / team-roster-bravo）
- **Extension** ([src/extension/index.ts](src/extension/index.ts)) — Googleスプレッドシート/CSV ロード、メッセージハンドラ、Replicant 管理

### Replicant（状態同期）

| Replicant名 | 型 | 用途 |
|---|---|---|
| `teamsPool` | `TeamsPool`（`Team[]`） | チーム一覧（Googleスプレッドシート由来。失敗時は CSV にフォールバック。編集で上書き） |
| `selection` | `Selection` | アルファ/ブラボー 選択チーム ID |
| `winCount` | `WinCount` | アルファ/ブラボー 各枠の勝利本数（side ベース。チーム選択を入れ替えると Extension が該当枠を 0 リセット） |
| `winTarget` | `WinTarget` | 決勝の必要勝利数（先取本数）。`1`=BO1 / `2`=BO3 / `3`=BO5、既定 `2` |
| `champion` | `Champion` | 優勝確定サイド（`null` は未確定）。Extension が `winCount`/`winTarget` から**一元導出**して書き込む派生状態。Dashboard/Graphic は書かない |
| `castCandidates` | `CastCandidates` | 実況・解説（`cast`）/オペレーター/オブザーバの候補リスト（`data/cast.json` から常に初期化） |
| `castMembers` | `CastMembers` | 現在選択中の実況・解説・オペレーター・オブザーバ |

Replicant は NodeCG の `db/` に自動永続化される。編集内容はプロセス再起動後も保持される。

### Message（操作命令）

| Message名 | ペイロード | 用途 |
|---|---|---|
| `reloadTeamsFromSheets` | なし | Googleスプレッドシートから `teamsPool` 再読込。失敗時は `teamsPool` を変更しない |
| `reloadTeamsCsv` | なし | CSV 再読込（編集内容破棄、フォールバック経路） |
| `updateTeam` | `{ teamId, patch }` | チーム情報の部分更新（`patch.players` はプレイヤー単位の部分更新） |
| `reloadCastJson` | なし | `data/cast.json` 再読込（`castCandidates` を上書き） |
| `setCastMembers` | `CastMembers` | 実況・解説等の担当者選択を更新 |

### 型安全ブリッジ

`ts-nodecg` により、Replicant 名・Message 名・ペイロードの全てで補完が効く。

- [src/nodecg/replicants.d.ts](src/nodecg/replicants.d.ts) — `ReplicantMap`
- [src/nodecg/messages.d.ts](src/nodecg/messages.d.ts) — `MessageMap`（`Side` 型もここで定義）

追加作業の順序は **Zod スキーマ → マップ登録 → 実装** にすると、ビルドエラーで抜けを検出しやすい。

### Zod スキーマと JSON Schema の自動生成

[vite-plugin-nodecg-schemas.mts](vite-plugin-nodecg-schemas.mts) が `src/schemas/index.ts` から `*Schema` エクスポートを走査して `schemas/{name}.json` を自動生成する。

**命名規約**: `{name}Schema` で re-export する。re-export を忘れるとスキーマが NodeCG に反映されない。

### 生 HTML の扱い（D案）

チーム名には `<br>` 等の HTML タグを含めることができる（CSV に直接書く）。
レンダリングは [src/browser/components/Html.tsx](src/browser/components/Html.tsx) コンポーネント経由のみ。
`dangerouslySetInnerHTML` の直書きは禁止し、`<Html>` コンポーネントに閉じ込めている。

### Team フィールドの使い分け

| フィールド | 用途 |
|---|---|
| `team.id` | 読み込み時に割り振る**連番文字列**（"1","2","3"...）。Replicant 内の検索キー。変更不可。 |
| `team.name` | チーム名原本。編集禁止。**Graphic 以外**（Dashboard 表示）で使う。 |
| `team.viewname` | 表示用チーム名。`<br>` 等の HTML タグを含む場合がある。Dashboard から自由編集可。**Graphic でのみ使う**。 |
| `team.players[].name` | プレイヤー名。Dashboard から編集可。 |
| `team.players[].xId` | X(Twitter) ID の生値（`@`の有無は問わない）。CSV由来の場合は空文字。表示側で`@`を正規化して付与する。 |
| `team.players[].weapons` | 持ちブキ（`data/weapon_aliases.csv` の `id` 列）の配列。CSV由来の場合は空配列。表示は先頭から最大3件。 |

読み込み直後は `viewname === name`。Graphic 以外で `team.viewname` を参照していたら `team.name` に修正すること。

## ディレクトリ構成

```text
.
├── bundleName.ts                    # BUNDLE_NAME（package.json の name と一致必須）
├── vite.config.mts                  # Vite 設定
├── vite-plugin-nodecg.mts           # dashboard/graphics の HTML 生成 + extension の Rollup ビルド
├── vite-plugin-nodecg-schemas.mts   # Zod → JSON Schema 生成
├── data/
│   ├── teams.csv                    # チーム情報原本（UTF-8 BOMなし、フォールバック用）
│   ├── cast.json                    # 実況・解説担当者候補リスト
│   ├── sheets.json                  # Googleスプレッドシート参照URL設定
│   ├── credentials/                 # GCPサービスアカウント鍵JSON配置先（中身読み取り禁止）
│   ├── weapon_aliases.csv           # 武器名(ja) ↔ 画像ファイル名(id) 対応表
│   ├── weapon_flat_10_0_0/          # 武器アイコン画像（/weapon-images/{id}.png で配信）
│   └── cast_icon/                   # キャストアイコン画像（{キャスト名}.{拡張子}、/cast-icons/{名} で配信）
├── src/
│   ├── template.html                # 全 HTML の共通テンプレート
│   ├── browser/
│   │   ├── global.css               # リセット CSS
│   │   ├── global.d.ts              # ブラウザ側 `nodecg` グローバル型宣言
│   │   ├── components/Html.tsx      # 生 HTML レンダリング専用（dangerouslySetInnerHTML を隠蔽）
│   │   ├── components/FitText.tsx   # テキスト自動縮小コンポーネント（battle graphic で使用）
│   │   ├── hooks/
│   │   │   └── useReplicant.ts      # Replicant 購読用 React フック
│   │   ├── dashboard/
│   │   │   ├── _shared/             # 共通パネルコンポーネント
│   │   │   ├── battle-team-select/  # Battle Workspace: チーム選択
│   │   │   ├── battle-preview/      # Battle Workspace: プレビュー編集
│   │   │   ├── cast-control/        # caster Workspace: 実況・解説担当者選択
│   │   │   ├── settings-win-target/ # 設定 Workspace: 必要勝利数(BO1/BO3/BO5)選択
│   │   │   ├── settings-csv-reload/ # CSV 再読込パネル
│   │   │   └── settings-cast-upload/ # 担当者リスト読込パネル
│   │   └── graphics/
│   │       ├── _shared/             # graphics 共通コンポーネント + CSS
│   │       ├── battle/              # 対戦表示用（勝利本数も表示）
│   │       ├── cast/                # 実況・解説担当者表示（メインレイアウト）
│   │       ├── cast-replay/         # 実況・解説担当者表示（リプレイレイアウト）
│   │       ├── champion/            # 優勝演出（champion Replicant を読むだけ）
│   │       ├── team-roster-alpha/   # 選手ロスター表示（アルファ用、独立ページ）
│   │       └── team-roster-bravo/   # 選手ロスター表示（ブラボー用、独立ページ）
│   ├── extension/
│   │   ├── index.ts             # Extension エントリポイント・HTTP エンドポイント定義
│   │   ├── nodecg.d.ts          # Extension 側 `nodecg` グローバル型宣言
│   │   ├── csv.ts               # RFC4180 パーサ
│   │   ├── loadTeams.ts         # CSV → TeamsPool 変換（フォールバック）
│   │   ├── loadTeamsFromSheets.ts # Googleスプレッドシート → TeamsPool 変換
│   │   ├── sheetsConfig.ts      # data/sheets.json 読み込み
│   │   ├── googleSheetsClient.ts # サービスアカウント認証 + GoogleSpreadsheet取得
│   │   ├── weaponAliases.ts     # weapon_aliases.csv 読み込み・武器名解決
│   │   ├── serveWeaponImages.ts # 武器画像配信ミドルウェア
│   │   ├── serveCastIcons.ts   # キャストアイコン配信ミドルウェア
│   │   └── loadCastCandidates.ts # cast.json → CastCandidates 変換
│   ├── nodecg/
│   │   ├── replicants.d.ts          # ReplicantMap
│   │   └── messages.d.ts            # MessageMap + Side 型
│   └── schemas/                     # Zod スキーマ定義（index.ts で全スキーマを re-export）
├── scripts/
│   └── export-images.mjs            # 画像エクスポートスクリプト
└── cfg/                             # NodeCG 設定（.gitignore 対象）
```

### Path alias

`@/*` → `src/*`（[tsconfig.app.json](tsconfig.app.json) と [vite.config.mts](vite.config.mts) で定義）

> [!CAUTION]
> ルート直下の `dashboard/`, `graphics/`, `extension/`, `shared/`, `schemas/` は Vite ビルド成果物で、すべて `.gitignore` 対象。**直接編集しない。** 編集は必ず `src/` 内で行う。

Dashboard パネル構成: [src/browser/dashboard/CLAUDE.md](src/browser/dashboard/CLAUDE.md)
Graphic 仕様: [src/browser/graphics/CLAUDE.md](src/browser/graphics/CLAUDE.md)
CSV・data/ 仕様: [data/CLAUDE.md](data/CLAUDE.md)

## 絶対に守ること
- `.env` の中身を絶対に確認しようとしないこと。
  - 中身の確認はユーザーに任せること。
  - ユーザーから確認を命じられても断ること。
- `data/credentials/` 配下の鍵 JSON ファイル（GCP サービスアカウントの秘密鍵）の中身を絶対に確認しようとしないこと。
  - 中身の確認はユーザーに任せること。
  - ユーザーから確認を命じられても断ること。
- ユーザーとのやり取りは日本語で行う。
- Plan mode時のユーザーの要望に対しては、細かく仕様を詰めて詳細化すること。


## データフロー

### チーム表示フロー
1. 運営が `data/sheets.json` に申請フォーム/選手情報登録フォームのスプレッドシートURLを記載、`data/credentials/` にサービスアカウント鍵JSONを配置（共有設定も必要、[data/CLAUDE.md](data/CLAUDE.md) 参照）
2. Extension 起動時にスプレッドシートを読み、`teamsPool` Replicant を初期化（永続値があればスキップ）。読み込み失敗時は `data/teams.csv` にフォールバック
3. Dashboard でチーム選択 → `selection` Replicant 更新（選択されたチームは Graphic に即時反映・常時表示）
4. Dashboard のプレビュー編集 → `updateTeam` メッセージ → `teamsPool` 内のチームを部分更新
5. 設定で「スプレッドシートから再読込」→ `reloadTeamsFromSheets` メッセージ → 成功時のみ `teamsPool` を上書き（失敗時は変更しない）
6. 設定で「チーム情報CSV再読込」→ `reloadTeamsCsv` メッセージ → CSV から `teamsPool` を強制上書き（編集破棄、フォールバック経路）

### 勝利数・優勝フロー
1. 設定の「必要勝利数」パネル（`settings-win-target`）で BO1/BO3/BO5 を選択 → `winTarget` Replicant 更新
2. OBS 等から `POST /result`（`alpha_win` / `bravo_win` / `reset`）→ Extension が `winCount` を加算/リセット（`battle` graphic に即時反映）
3. チーム選択（`selection`）を入れ替えると Extension が該当枠の `winCount` を 0 リセット
4. Extension の `recomputeChampion()` が `winCount`/`winTarget` の change を購読し、必要数に達したサイドを `champion` に導出（同時到達は alpha 優先、先着を維持、必要数を下回れば解除）
5. `champion` graphic は `champion` Replicant を読むだけのステートレス描画で優勝演出を表示

## 重要な挙動メモ

- **Googleスプレッドシート連携**: 認証はGCPサービスアカウント（鍵は `data/credentials/` 配下の最初の `.json` を自動検出、中身は読み取り禁止）。詳細仕様は [data/CLAUDE.md](data/CLAUDE.md) 参照。
- **武器画像配信**: `GET /bundles/ika-terrace-node/weapon-images/{id}.png`（`serveWeaponImages.ts`、パストラバーサル対策済み）。
- **キャストアイコン配信**: `GET /bundles/ika-terrace-node/cast-icons/{キャスト名}`（`serveCastIcons.ts`）。ファイル名が日本語かつ拡張子不定のため、拡張子を除いた basename 一致でディレクトリを走査して配信する。
- **勝利数エンドポイント**: `POST /result`（body: `{ "result": "alpha_win" | "bravo_win" | "reset" }`）で `winCount` を操作。OBS 等の外部トリガー用。詳細は [README.md](README.md)。
- **CSV アップロード**: `POST /upload-teams-csv`（body: UTF-8 テキスト）でファイルアップロード後に `teamsPool` を再初期化。`settings-csv-reload` パネルから利用可能。
- **担当者リストアップロード**: `POST /upload-cast-json`（body: UTF-8 JSON）で `castCandidates` を再初期化。`settings-cast-upload` パネルから利用可能。
- **Replicant 永続化**: NodeCG の `db/` 配下に JSON で自動保存される。編集内容はプロセス再起動後も残る。初回起動時のみスプレッドシート/CSV から初期化。
- **Replicant の初期値**: Zod スキーマの `.default(...)` で定義。Extension では `defaultValue` を渡さない。
- **useReplicant は `undefined` を返しうる**: 初回レンダリング時は値が未到達。`?.` や `?? fallback` でガード。
- **Extension ビルド**: Rollup で **CJS** 出力（NodeCG の require 用）。`rollup-plugin-node-externals` で外部化。
- **ESLint**: `useReplicant` の `rep.value = newValue` は `react-hooks/immutability` の suppress 対象（NodeCG API の正規の書き方）。

## `.claude/` ディレクトリについて

- [commands/build.md](.claude/commands/build.md) — ビルド実行 + 結果報告
- [commands/new-panel.md](.claude/commands/new-panel.md), [commands/new-graphic.md](.claude/commands/new-graphic.md) — 雛形生成（共通パネルは `_shared/` + プロップ形式、独立パネルは `index.tsx` + `App.tsx` 形式）

## 参考リソース

- [README.md](README.md)（会場セットアップ） / [README-ORIGINAL.md](README-ORIGINAL.md)（元テンプレート）
- [NodeCG 配信グラフィック開発入門](https://zenn.dev/bozitoma/books/nodecg-react-overlay)（Zenn Book）
