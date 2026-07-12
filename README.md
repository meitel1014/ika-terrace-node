# デジフェス 配信グラフィック（ika-terrace-node）

スプラトゥーン 3 大会用 NodeCG 配信グラフィックシステムです。チーム情報を管理・表示します。

## 会場 PC セットアップ手順（Windows 11）

開発環境が入っていない素の Windows PC で動かすための手順です。

### 1. このリポジトリの準備

#### Git がインストール済みの場合

```powershell
git clone git@github.com:meitel1014/dezifes-node.git
cd dezifes-node
```

#### Git がない場合

1. リポジトリの ZIP をダウンロードして展開（画面右上の「<> Code」→「Download ZIP」）
<img width="400" alt="image" src="https://github.com/user-attachments/assets/ef9b37c6-9a9c-4a6e-934f-3fbf5e231de7" />

2. PowerShell で展開先のフォルダに移動

```powershell
cd C:\Users\<ユーザー名>\Downloads\dezifes-node
```

### 2. Node.js と git のインストール

Node.js
1. https://nodejs.org/ にアクセスし、**v24 LTS**（推奨版）のインストーラーをダウンロード
2. インストーラーを実行（設定はすべてデフォルトのまま「Next」で OK）
3. インストール完了後、**PowerShell** を開いて以下を実行し、バージョンが表示されれば成功

```powershell
node -v
# v24.x.x と表示されれば OK
```

git
1. https://git-scm.com/install/windows にアクセスし、インストーラーをダウンロード
2. インストーラーを実行
インストール中、「Windows Explorer Extension」のチェックを外すこと
その他の設定はすべてデフォルトのまま「Next」で OK

### 3. pnpm の有効化

Node.js に同梱されている Corepack で pnpm を有効化します。PowerShell で実行してください。

```powershell
corepack enable
```

> **エラーが出る場合**: PowerShell を **管理者として実行** してからもう一度 `corepack enable` を試してください。

> それでも実行できない場合こちらを参照。
> https://qiita.com/araiWorks/items/6964e85a73bff3ff705c

### 4. 依存関係のインストール

```powershell
pnpm install
```

```powershell
pnpm approve-builds
```

初回は数分かかります。

### 5. ビルド

```powershell
pnpm build
```

エラーなく完了すれば準備完了です。

### 6. 各種ファイルの配置

`data` フォルダ内に、Discord 上のリンクから落としてきたデータをコピーします。

### 7. 起動

```powershell
npx nodecg start
```

ダウンロードして展開したフォルダ内の `start.bat` をダブルクリックして実行することでも起動できます。

起動後、ブラウザで http://localhost:9090 にアクセスします。

### 8. OBS への取り込み

1. 開いたサイトで右上の「GRAPHICS」をクリック
2. 使用するグラフィックの「COPY URL」をクリック
3. OBS で「ソース」→「＋」→「ブラウザ」を追加
4. URL に上記の Graphics URL を入力
5. 幅 `1920`、高さ `1080` に設定
6. 「カスタム CSS」は空にする（デフォルトの body 背景色指定を消すため）

#### グラフィック一覧

| グラフィック名 | 用途 |
|---|---|
| `battle` | 対戦表示用 |
| `cast` | 実況・解説担当者表示（メインレイアウト） |
| `cast-replay` | 実況・解説担当者表示（リプレイレイアウト） |

## 運営操作ガイド

### ダッシュボードの構成

ダッシュボードには 3 つのタブ（Workspace）があります。

- **BATTLE** — チーム選択・プレビュー編集パネル
- **設定** — チーム情報 CSV の再読込・アップロード / 担当者リスト読込
- **caster** — 実況・解説担当者の選択

### 試合前 - 基本的な操作の流れ

1. **チーム選択** パネルでアルファ・ブラボーのチームを選ぶ → 配信画面に即時反映される
2. **プレビュー編集** パネルで内容を確認（必要なら「編集」ボタンで修正）

### チーム情報 CSV の更新

設定タブの「CSV 再読込・アップロード」パネルには 2 つの方法があります。

| 操作 | 説明 |
|---|---|
| **チーム情報 CSV 再読込** ボタン | サーバー上の `data/teams.csv` を再読み込み。**編集内容はすべて破棄**されます |
| **参照…** ボタン（ファイル選択） | ローカル PC から CSV ファイルを選択してアップロード。再読込と同じく、編集内容は上書きされます |

## トラブルシューティング

### `pnpm` コマンドが見つからない

```powershell
corepack enable
```

を管理者権限の PowerShell で実行してください。

### ビルドでエラーが出る

Node.js のバージョンが v22 以上であることを確認してください。

```powershell
node -v
```

### 起動後にブラウザでアクセスできない

- `npx nodecg start` が正常に起動しているか確認
- Windows ファイアウォールのダイアログが出たら「許可」を選択
- URL が `http://localhost:9090` であることを確認（`https` ではない）

### 同じ LAN 内の別 PC からアクセスしたい

起動 PC の IP アドレスを確認し、`http://<IPアドレス>:9090` でアクセスできます。

```powershell
ipconfig
```

で IPv4 アドレスを確認してください（例: `192.168.1.100`）。

## ライセンス

MIT（詳細は [LICENSE](./LICENSE) を参照）
