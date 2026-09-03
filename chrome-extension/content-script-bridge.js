// テスト対象ページ（iframe内のサイト）に document_start で差し込まれる。
// chrome.storage.local に保存済みのデバイス情報を読み、ページ自身のJSコンテキストで
// navigator / screen / viewport を上書きするコードを <script> タグとして注入する。
//
// 注意: content script は「隔離ワールド」で動くため window.navigator を直接上書きしても
// ページ側のJSからは見えない。そのため上書き処理自体を文字列化してページの
// メインワールドに <script> として挿入している。

(function () {
  const host = location.hostname;
  const key = `deviceConfig:${host}`;

  chrome.storage.local.get([key], (res) => {
    const cfg = res && res[key];
    if (!cfg) return;

    const script = document.createElement('script');
    script.textContent = `(${overrideNavigator.toString()})(${JSON.stringify(cfg)});`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  });

  function overrideNavigator(cfg) {
    try {
      const define = (obj, prop, value) =>
        Object.defineProperty(obj, prop, { get: () => value, configurable: true });

      define(navigator, 'userAgent', cfg.userAgent);
      define(navigator, 'platform', cfg.platform);
      define(navigator, 'vendor', cfg.vendor);
      define(navigator, 'maxTouchPoints', cfg.touch ? 5 : 0);
      define(window, 'devicePixelRatio', cfg.dpr);
      define(screen, 'width', cfg.width);
      define(screen, 'height', cfg.height);
      define(screen, 'availWidth', cfg.width);
      define(screen, 'availHeight', cfg.height);

      let meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'viewport';
        (document.head || document.documentElement).appendChild(meta);
      }
      meta.setAttribute('content', `width=${cfg.width}, initial-scale=1`);
    } catch (e) {
      console.warn('[DevicePreviewSync] override failed', e);
    }
  }
})();
