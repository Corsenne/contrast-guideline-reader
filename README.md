# iPhone PWA PDF Reader

MacなしでiPhoneから使うための、オフライン対応PWA版PDFリーダーです。

SafariでURLを開き、共有メニューからホーム画面に追加すると、アプリ風に起動できます。

## 機能

- PDFを表示
- 横スワイプでページ送り
- 前へ/次へボタン
- 現在ページ / 総ページ数表示
- JSON目次からページジャンプ
- 最後に読んだページを保存
- 手動マーカー追加
- マーカー一覧からページジャンプ
- マーカー削除
- PDF本体に注釈を書き込まない
- 初回読み込み後のオフライン利用

## ファイル構成

```text
iphone_pwa_pdf_reader/
├─ index.html
├─ style.css
├─ app.js
├─ sw.js
├─ manifest.webmanifest
├─ README.md
└─ assets/
   ├─ books/
   │  ├─ contrast_guideline.pdf
   │  ├─ contrast_guideline.pdf.b64
   │  └─ pdf_chunks/
   ├─ toc/
   │  └─ contrast_guideline_toc.json
   └─ icons/
      └─ icon.svg
```

## iPhoneで使う流れ

1. このフォルダをGitHub Pages / Cloudflare Pages / NetlifyなどでHTTPS公開する
2. iPhoneのSafariで公開URLを開く
3. PDFが表示されるまで一度待つ
4. Safariの共有ボタンから「ホーム画面に追加」
5. ホーム画面のアイコンから起動する

初回表示後、アプリ本体・PDF・目次JSON・PDF.jsはService Workerでキャッシュされます。

GitHub PagesへのアップロードではPDFをBase64テキスト化し、`assets/books/pdf_chunks/` に分割したファイルを読み込みます。ローカルには元PDFも残しています。

## ローカル確認

Windows上で動作確認する場合:

```powershell
cd C:\contrast_guideline\iphone_pwa_pdf_reader
python -m http.server 8080
```

ブラウザで以下を開きます。

```text
http://localhost:8080
```

Service Workerの本番動作にはHTTPSが必要です。`localhost` では開発用途として動きます。

## データ保存

- 最終ページ: `localStorage`
- マーカー: `IndexedDB`

保存されるマーカー項目:

- `id`
- `bookId`
- `pdfPage`
- `selectedText`
- `color`
- `note`
- `rects`
- `createdAt`
- `updatedAt`

`rects` は将来的な座標ハイライト用で、現時点では `null` です。

## 注意

このPWAはネイティブiPhoneアプリではありません。App Store配布やTestFlight配布は不要で、Safariのホーム画面追加で使う形です。

PDF.jsはCDNから初回取得し、Service Workerでキャッシュします。PDF本体とアプリ本体はGitHub Pages上のファイルだけで読み込めます。
