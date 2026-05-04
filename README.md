# address-to-latlon

住所リストを緯度経度に変換する Next.js 製ユーティリティアプリケーションです。`output: 'export'` 設定でビルドされた静的ファイルを Netlify へデプロイできます。

## 開発環境の準備

1. Node.js 18 以上を用意します（Next.js 14 の LTS 推奨バージョン）。
2. 依存パッケージをインストールします。

   ```bash
   npm install
   ```

3. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

   http://localhost:3000/?auth_debug

## ビルド

静的サイトを生成するには `next build` を実行します。`next.config.js` で `output: 'export'` が設定されているため、ビルド後に `out/` ディレクトリへ静的ファイルが出力されます。

```bash
npm run build
```

ローカルでビルド成果物を確認したい場合は、任意の静的ファイルサーバー（例：`npx serve out`）で `out/` を配信するとブラウザーで挙動をチェックできます。

## デプロイ

このリポジトリは GitHub へ push し、Netlify 側の Git 連携で自動デプロイする前提です。GitHub Actions での GitHub Pages デプロイは使いません。

### リポジトリ側設定

- `netlify.toml` で Netlify のビルド設定を管理しています。
- ビルドコマンドは `npm run build` です。
- 公開ディレクトリは `out` です。
- `NETLIFY_NEXT_PLUGIN_SKIP=true` を指定し、Next.js ランタイムではなく静的書き出し結果をそのまま配信します。
- `out/` は生成物なので、Netlify 運用ではコミット不要です。

### Netlify 側で必要な設定

1. Netlify で `Add new project` からこの GitHub リポジトリを接続します。
2. Production branch を `main` に設定します。
3. Build command と Publish directory は `netlify.toml` の値を使います。
4. 以後は `main` への push ごとに Netlify が自動でビルドとデプロイを実行します。
