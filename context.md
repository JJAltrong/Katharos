# Katharos — Chrome Extension Context

## What It Is
A Chrome extension that enhances AI prompts before sending. It takes what the user typed, refines it into a more precise prompt, and shows both side by side. The user can accept the refined version, refine it further, or cancel.

Supported platforms: ChatGPT (chatgpt.com), Claude (claude.ai)

---

## File Structure
```
/katharos2.0_for_chrome
├── manifest.json          ← Manifest V3. Declares permissions, host matches, content scripts.
├── background.js          ← Service worker. Handles all API calls to OpenAI/Anthropic.
├── content.js             ← Runs on the AI platform page. Injects the UI, reads/writes the prompt textarea.
├── styles.css             ← All visual styles. Dark theme.
├── config.js              ← GITIGNORED. Holds the API key via KATHAROS_CONFIG.apiKey
├── config.example.js      ← Template for config.js. No real key.
└── logo_transparent.png
```

---

## How It Works
1. content.js detects the page and waits for the prompt textarea (`#prompt-textarea` on ChatGPT)
2. It injects a Katharos button next to the input
3. User clicks the button → popup opens with a spinner
4. content.js sends the prompt to background.js via `chrome.runtime.sendMessage`
5. background.js calls the OpenAI/Anthropic API and returns the refined prompt
6. Popup shows: original prompt (top) vs refined prompt (bottom)
7. User clicks **Use This** → `content.js` writes the refined prompt back into the textarea
8. User clicks **Refine** → clarifying questions panel slides in
9. User clicks **Cancel** → popup closes, nothing changes

---

## API Setup
- API key lives in `config.js` as `KATHAROS_CONFIG.apiKey`
- `config.js` is loaded before `content.js` in manifest.json
- `background.js` reads the key and makes the API call
- `config.js` is gitignored — never committed to GitHub

---

## Design System
```
--k-bg:        #080B14   ← deep dark background
--k-surface:   #0D1117   ← cards / panels
--k-primary:   #38BDF8   ← cyan
--k-secondary: #2563EB   ← deep blue
--k-glow:      #60A5FA   ← glow / animation
--k-text:      #F1F5F9   ← primary text
--k-muted:     #64748B   ← secondary text
--k-warning:   #FBBF24   ← amber (warnings only)
```
All CSS classes are prefixed with `.katharos-` to avoid conflicts with the host page.

---

## Key Constraints
- Manifest V3 — no `eval`, no remote scripts
- content.js cannot call APIs directly — all API calls go through background.js via message passing
- ChatGPT textarea selector: `#prompt-textarea`
- Claude textarea selector: `div[contenteditable="true"]` — requires InputEvent dispatch after writing or the Send button stays disabled
- Styles are injected programmatically in content.js (not just via manifest) to survive page CSP restrictions