# CLAUDE.md

## プロジェクト概要

スプラトゥーン 3 を用いたトーナメント大会の配信グラフィックシステム。
チーム情報を Dashboard から操作し、配信画面と会場スクリーンにオーバーレイ表示する。

バンドル名: `dezifes-nodecg`（[package.json](package.json) の `name` と [bundleName.ts](bundleName.ts) の `BUNDLE_NAME` で定義。一致必須）

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

- Vite 開発サーバー: http://localhost:8080（dashboard/graphics 用 HMR）
- NodeCG ダッシュボード: http://localhost:9090

`pnpm dev` は `run-p` で両方を並列起動する。本番運用では `pnpm build` → `npx nodecg start` を使うこと。

## アーキテクチャ

NodeCG は **Dashboard** / **Graphics** / **Extension** の 3 コンポーネントで構成される。

- **Dashboard** ([src/browser/dashboard/](src/browser/dashboard/)) — 運営用の操作パネル（Battle / 設定 / caster の 3 Workspace）
- **Graphics** ([src/browser/graphics/](src/browser/graphics/)) — 配信画面に載せるオーバーレイ（under / side / champions / cast / cast-replay）
- **Extension** ([src/extension/index.ts](src/extension/index.ts)) — CSV ロード、メッセージハンドラ、Replicant 管理

### Replicant（状態同期）

| Replicant名 | 型 | 用途 |
|---|---|---|
| `teamsPool` | `TeamsPool`（`Team[]`） | チーム一覧（CSV 由来、編集で上書き） |
| `selection` | `Selection` | アルファ/ブラボー 選択チーム ID |
| `castCandidates` | `CastCandidates` | 実況/解説/オペレーター/オブザーバ候補リスト（`data/cast.json` から常に初期化） |
| `castMembers` | `CastMembers` | 現在選択中の実況・解説・オペレーター・オブザーバ |

Replicant は NodeCG の `db/` に自動永続化される。編集内容はプロセス再起動後も保持される。

### Message（操作命令）

| Message名 | ペイロード | 用途 |
|---|---|---|
| `reloadTeamsCsv` | なし | CSV 再読込（編集内容破棄） |
| `updateTeam` | `{ teamId, patch }` | チーム情報の部分更新 |
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
| `team.id` | CSV 読み込み時に割り振る**連番文字列**（"1","2","3"...）。Replicant 内の検索キー。変更不可。 |
| `team.name` | CSV 原本のチーム名。編集禁止。**Graphic 以外**（Dashboard 表示）で使う。 |
| `team.viewname` | 表示用チーム名。`<br>` 等の HTML タグを含む場合がある。Dashboard から自由編集可。**Graphic でのみ使う**。 |

CSV 読み込み直後は `viewname === name`。Graphic 以外で `team.viewname` を参照していたら `team.name` に修正すること。

## ディレクトリ構成

```text
.
├── bundleName.ts                    # BUNDLE_NAME（package.json の name と一致必須）
├── vite.config.mts                  # Vite 設定
├── vite-plugin-nodecg.mts           # dashboard/graphics の HTML 生成 + extension の Rollup ビルド
├── vite-plugin-nodecg-schemas.mts   # Zod → JSON Schema 生成
├── data/
│   ├── teams.csv                    # チーム情報原本（UTF-8 BOMなし）
│   ├── cast.json                    # 実況・解説担当者候補リスト
│   └── screenshots/                 # （現状未使用。将来の用途に応じて削除可）
├── src/
│   ├── template.html                # 全 HTML の共通テンプレート
│   ├── browser/
│   │   ├── global.css               # リセット CSS
│   │   ├── global.d.ts              # ブラウザ側 `nodecg` グローバル型宣言
│   │   ├── components/Html.tsx      # 生 HTML レンダリング専用（dangerouslySetInnerHTML を隠蔽）
│   │   ├── components/FitText.tsx   # テキスト自動縮小コンポーネント（side / champions graphic で使用）
│   │   ├── hooks/
│   │   │   └── useReplicant.ts      # Replicant 購読用 React フック
│   │   ├── dashboard/
│   │   │   ├── _shared/             # 共通パネルコンポーネント
│   │   │   ├── battle-team-select/  # Battle Workspace: チーム選択
│   │   │   ├── battle-preview/      # Battle Workspace: プレビュー編集
│   │   │   ├── cast-control/        # caster Workspace: 実況・解説担当者選択
│   │   │   ├── settings-csv-reload/ # CSV 再読込パネル
│   │   │   └── settings-cast-upload/ # 担当者リスト読込パネル
│   │   └── graphics/
│   │       ├── _shared/             # under/side/cast 共通コンポーネント + CSS
│   │       ├── under/               # 配信画面下部
│   │       ├── side/                # 会場左右分割
│   │       ├── champions/           # チャンピオンズ表示用
│   │       ├── cast/                # 実況・解説担当者表示（メインレイアウト）
│   │       └── cast-replay/         # 実況・解説担当者表示（リプレイレイアウト）
│   ├── extension/
│   │   ├── index.ts          # Extension エントリポイント・HTTP エンドポイント定義
│   │   ├── csv.ts            # RFC4180 パーサ
│   │   ├── loadTeams.ts      # CSV → TeamsPool 変換
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
- ユーザーとのやり取りは日本語で行う。
- Plan mode時のユーザーの要望に対しては、細かく仕様を詰めて詳細化すること。


## データフロー

### チーム表示フロー
1. 運営が `data/teams.csv`（UTF-8 BOMなし）にチーム情報を書く
2. Extension 起動時に CSV を読み、`teamsPool` Replicant を初期化（永続値があればスキップ）
3. Dashboard でチーム選択 → `selection` Replicant 更新（選択されたチームは Graphic に即時反映・常時表示）
4. Dashboard のプレビュー編集 → `updateTeam` メッセージ → `teamsPool` 内のチームを部分更新
5. 設定で「CSV 再読込」→ `reloadTeamsCsv` メッセージ → CSV から `teamsPool` を強制上書き（編集破棄）

## 重要な挙動メモ

- **CSV アップロード**: `POST /upload-teams-csv`（body: UTF-8 テキスト）でファイルアップロード後に `teamsPool` を再初期化。`settings-csv-reload` パネルから利用可能。
- **Replicant 永続化**: NodeCG の `db/` 配下に JSON で自動保存される。編集内容はプロセス再起動後も残る。初回起動時のみ CSV から初期化。
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
