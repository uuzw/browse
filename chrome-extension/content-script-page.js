// GitHub Pages（Device Preview Tool）からの postMessage を受け取り、
// background service worker に中継する。処理結果はページへ ACK として返す。

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'device-preview-tool') return;
  if (event.data.type !== 'SET_DEVICE') return;

  chrome.runtime.sendMessage(event.data, (response) => {
    window.postMessage({
      source: 'device-preview-extension',
      type: 'ACK',
      requestId: event.data.requestId,
      ok: !!(response && response.ok)
    }, '*');
  });
});
