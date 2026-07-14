# Dashboard パネル構成

| Workspace | パネル | 表示名 | 幅 |
|---|---|---|---|
| Battle | `battle-team-select` | チーム選択 | 4 |
| Battle | `battle-preview` | プレビュー編集 | 8 |
| 設定 | `settings-win-target` | 設定｜必要勝利数 | 4 |
| 設定 | `settings-csv-reload` | 設定｜チーム情報再読込 | 4 |
| 設定 | `settings-cast-upload` | 設定｜担当者リスト読込 | 4 |
| caster | `cast-control` | 実況・解説 担当者 | 6 |

チームは単一プールで管理する（モード分岐なし）。選択されたチームは Graphic に即時反映され常時表示される（表示/非表示の切り替えは無い）。

## 実装パターン

- **Battle パネル**: `_shared/` コンポーネントを `index.tsx` から直接 render する（薄いラッパー）。
- **独立パネル**（`settings-csv-reload` 等）: `index.tsx` + `App.tsx` の 2 ファイル構成。
- **`_shared/` ディレクトリ**: `index.tsx` がないためエントリとして認識されない。共通コンポーネント・CSS のみ配置。
- **HTML 生成**: `{name}/index.tsx` を置くとビルド時に `dashboard/{name}.html` が自動生成される。手動で HTML を書かない。

## `_shared/` コンポーネントの実装メモ

- **PreviewEditPanel**: アルファ/ブラボーを単一 `<table>` で横並びにして行高を揃える（2 列グリッドでは編集行の高さがズレる）。スペーサー列（`preview-spacer-col`、`min-width: 16px`、`border: none`）でサイド間の空白を確保。編集可能な項目はチーム表示名（`viewname`）とプレイヤー名のみ。
- **CSV アップロード**: `settings-csv-reload` パネルはファイル選択で `POST /upload-teams-csv` へ送信。`useReloadButton` フックで再読込ボタンの状態管理（`idle` / `loading` / `done` / `error`）を共通化。
- **スプレッドシート再読込**: 同パネルに「スプレッドシートから再読込」ボタンを併設（`reloadTeamsFromSheets` メッセージ）。失敗時は既存の `teamsPool` を変更しない。
- **担当者リスト読込**: `settings-cast-upload` パネルはファイル選択で `POST /upload-cast-json` へ送信し `castCandidates` を再初期化。`data/cast.json` からの再読込（`reloadCastJson` メッセージ）も併設。
- **必要勝利数**: `settings-win-target` パネルは BO1/BO3/BO5 のトグルボタンで `winTarget` Replicant（`1`/`2`/`3`）を直接書き込む。優勝判定（`champion`）は Extension が導出するため、パネルは `winTarget` を書くだけ。
- **cast-control**: `castMembers`（実況=`announcer` / 解説=`commentator` / オペレーター / オブザーバ）を編集し、`setCastMembers` メッセージで一括適用する（`castCandidates` を候補として参照）。
