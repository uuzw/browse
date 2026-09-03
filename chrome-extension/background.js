// SET_DEVICE メッセージを受け取り、対象オリジン向けの declarativeNetRequest
// 動的ルール（User-Agent / Client Hints ヘッダー書き換え）を更新する。
// あわせて navigator/screen 側で使うデバイス情報を chrome.storage.local に保存する。

const RULE_ID = 1;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== 'SET_DEVICE') return;

  (async () => {
    try {
      const host = new URL(msg.targetOrigin).hostname;

      const requestHeaders = [
        { header: 'User-Agent', operation: 'set', value: msg.userAgent },
        { header: 'sec-ch-ua-mobile', operation: 'set', value: msg.secChUaMobile },
        { header: 'sec-ch-ua-platform', operation: 'set', value: msg.secChUaPlatform }
      ];
      if (msg.secChUa) {
        requestHeaders.push({ header: 'sec-ch-ua', operation: 'set', value: msg.secChUa });
      }

      const rule = {
        id: RULE_ID,
        priority: 1,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: {
          requestDomains: [host],
          resourceTypes: [
            'main_frame', 'sub_frame', 'xmlhttprequest',
            'script', 'stylesheet', 'image', 'font', 'media'
          ]
        }
      };

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID],
        addRules: [rule]
      });

      await chrome.storage.local.set({
        [`deviceConfig:${host}`]: {
          userAgent: msg.userAgent,
          platform: msg.platform,
          vendor: msg.vendor,
          width: msg.width,
          height: msg.height,
          dpr: msg.dpr,
          touch: msg.touch
        }
      });

      sendResponse({ ok: true, requestId: msg.requestId });
    } catch (err) {
      console.error('[DevicePreviewSync] failed to apply device config', err);
      sendResponse({ ok: false, error: String(err), requestId: msg.requestId });
    }
  })();

  return true; // 非同期でsendResponseを呼ぶことを示す
});
