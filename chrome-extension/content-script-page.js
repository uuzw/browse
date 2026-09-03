// GitHub Pages（Device Preview Tool）からの postMessage を受け取り、
// background service worker に中継する。処理結果はページへ ACK として返す。
// PING/SET_DEVICE いずれも同じ経路で中継する。

console.debug('[DevicePreviewSync] content-script-page.js injected on', location.href);

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'device-preview-tool') return;
  if (event.data.type !== 'SET_DEVICE' && event.data.type !== 'PING') return;

  console.debug('[DevicePreviewSync] relaying to background:', event.data.type, event.data.requestId);

  chrome.runtime.sendMessage(event.data, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[DevicePreviewSync] background did not respond:', chrome.runtime.lastError.message);
    }
    window.postMessage({
      source: 'device-preview-extension',
      type: event.data.type === 'PING' ? 'PONG' : 'ACK',
      requestId: event.data.requestId,
      ok: !!(response && response.ok)
    }, '*');
  });
});
