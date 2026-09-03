# Device Preview Tool

GitHub Pages上のプレビューUI + Chrome拡張機能（Manifest V3）で、iframe内サイトの
画面サイズ・User-Agent・Client Hints・navigator情報をデバイスごとに切り替えて確認するツール。

## 構成

```
device-preview-tool/
├── github-pages/
│   └── index.html          # デバイス切替UI + iframe（GitHub Pagesで公開）
└── chrome-extension/
    ├── manifest.json        # MV3定義
    ├── background.js        # declarativeNetRequestで UA/CHヘッダー書き換え
    ├── content-script-page.js    # GitHub Pages側: postMessage中継
    └── content-script-bridge.js  # テスト対象ページ側: navigator/screen上書き
```

## 仕組み

1. `github-pages/index.html` でデバイスボタンを押すと、
   - `iframe` の幅・高さ（CSS）をデバイスサイズに変更 → **レイアウト崩れの確認はこれだけで可能**
   - `window.postMessage` で拡張機能へ `{targetOrigin, userAgent, width, height, ...}` を送信
2. `content-script-page.js`（GitHub Pagesにのみ挿入）がメッセージを `background.js` に中継
3. `background.js` が
   - `declarativeNetRequest.updateDynamicRules` で対象オリジン宛てリクエストの
     `User-Agent` / `sec-ch-ua*` ヘッダーを書き換えるルールを追加
   - デバイス情報（UA/幅/高さ/DPR/タッチの有無）を `chrome.storage.local` に保存
   - 完了を `content-script-page.js` 経由でページへACK
4. ACKを受け取ってから `iframe.src` を読み込み → 新しいUAでリクエストされる
5. 対象ページ側では `content-script-bridge.js`（`document_start`, 全フレーム）が
   保存済みデバイス情報を読み、`navigator.userAgent` / `platform` / `maxTouchPoints` /
   `devicePixelRatio` / `screen.width|height` と `<meta name="viewport">` を
   ページ自身のJSコンテキストへ注入したスクリプトで上書き

## セットアップ手順

1. **GitHub Pages公開**
   - `github-pages/index.html` をリポジトリにpushし、Settings → Pages で公開
   - 公開URL（例: `https://your-name.github.io/device-preview/`）を控える

2. **manifest.jsonの書き換え**
   - `chrome-extension/manifest.json` の `content_scripts[0].matches` を
     手順1の実際のURLパターンに変更
     ```json
     "matches": ["https://your-name.github.io/device-preview/*"]
     ```

3. **拡張機能を読み込み**
   - `chrome://extensions` → 右上「デベロッパーモード」ON
   - 「パッケージ化されていない拡張機能を読み込む」→ `chrome-extension` フォルダを選択

4. **動作確認**
   - 手順1のGitHub PagesのURLをChromeで開く
   - 「テスト対象URL」に検証したいサイト（例: `http://localhost:3000` のローカル開発サーバー）を入力
   - デバイスボタンをクリック → サイドバーに「拡張機能: 同期OK」と表示されればUA同期成功

## 制約・注意点

- **フレーム埋め込み制限**: 対象サイトが `X-Frame-Options: DENY` や
  `Content-Security-Policy: frame-ancestors` を送出している場合、iframeでの表示はブロックされる
  （多くのローカル開発サーバーでは問題なし。本番の他社サイト検証には使えない場合がある）
- **navigator上書きのタイミング**: `content-script-bridge.js` は `document_start` で
  ベストエフォート的に注入するため、対象ページの最初期に実行されるインラインスクリプトより
  後になる可能性がゼロではない（多くのケースでは問題なく先行して適用される）
- **User-Agentクライアントヒント**: `navigator.userAgentData`（`getHighEntropyValues`等）まで
  完全に一致させたい場合は、`content-script-bridge.js` 内で `userAgentData` オブジェクトも
  同様に上書きする実装を追加してください（この雛形ではヘッダーとnavigator基本プロパティのみ対応）
- **ホスト権限**: `<all_urls>` を要求しているため、検証用途のみで使い、不要になったら
  拡張機能を無効化/削除することを推奨
