// ─── Katharos Background Service Worker ───────────────
const API_KEY = KATHAROS_CONFIG.apiKey;
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL   = 'gpt-4o-mini';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'ANTHROPIC_REQUEST') return;

  const timeout = setTimeout(() => {
    sendResponse({ success: false, error: 'Request timed out after 20s' });
  }, 20000);

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model:    MODEL,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user',   content: request.userMessage }
      ],
      max_tokens: 1024
    })
  })
    .then(r => r.json())
    .then(data => {
      clearTimeout(timeout);
      if (data.error) {
        console.error('[Katharos] API error:', data.error);
        sendResponse({ success: false, error: data.error.message || 'API error' });
        return;
      }
      if (!data.choices || !data.choices[0]) {
        sendResponse({ success: false, error: 'Empty response from API' });
        return;
      }
      sendResponse({
        success: true,
        data: {
          content: [{ text: data.choices[0].message.content }]
        }
      });
    })
    .catch(err => {
      clearTimeout(timeout);
      console.error('[Katharos] Fetch error:', err);
      sendResponse({ success: false, error: err.message });
    });

  return true;
});