# GitHub PagesでiPhone用PWAを公開する手順

Macは不要です。Win11とブラウザだけでできます。

## 1. GitHubでリポジトリを作る

1. GitHubにログイン
2. 右上の `+` から `New repository`
3. Repository name を入力

例:

```text
contrast-guideline-reader
```

4. `Public` を選択
5. `Create repository`

## 2. ファイルをアップロード

GitHubの作成直後の画面で `uploading an existing file` を選びます。

以下のフォルダ内のファイルを、フォルダ構造ごとアップロードしてください。

```text
C:\contrast_guideline\iphone_pwa_pdf_reader
```

アップロードする主なファイル:

```text
index.html
style.css
app.js
sw.js
manifest.webmanifest
.nojekyll
assets/books/contrast_guideline.pdf
assets/toc/contrast_guideline_toc.json
assets/icons/icon.svg
assets/vendor/pdfjs/pdf.min.mjs
assets/vendor/pdfjs/pdf.worker.min.mjs
```

最後に `Commit changes` を押します。

## 3. GitHub Pagesを有効化

1. リポジトリの `Settings`
2. 左メニューの `Pages`
3. `Build and deployment`
4. Source: `Deploy from a branch`
5. Branch: `main`
6. Folder: `/ (root)`
7. `Save`

数分待つとURLが表示されます。

URL例:

```text
https://ユーザー名.github.io/contrast-guideline-reader/
```

## 4. iPhoneでホーム画面に追加

1. iPhoneのSafariでGitHub PagesのURLを開く
2. PDFが表示されるまで待つ
3. 共有ボタンを押す
4. `ホーム画面に追加`
5. 追加されたアイコンから起動

初回表示後、PDF・目次・アプリ本体はキャッシュされます。機内モードでも開けるか確認してください。

## 注意

PDF.jsやPDF本体を含めて全てローカル同梱しているため、外部CDNは不要です。
