# address-to-latlon

住所リストを緯度経度に変換する Next.js 製ユーティリティアプリケーションです。`output: 'export'` 設定でビルドされた静的ファイルを任意の静的ホスティングに配置できます。

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
