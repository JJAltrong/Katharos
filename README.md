# Katharos
A Chrome extension that enhances your AI prompts before you send them.

Katharos takes what you typed, refines it into a more precise prompt, and shows you both side by side — so you can see exactly what changed and why. Supports ChatGPT and Claude.

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `katharos` folder

---

## Setup

Katharos requires an OpenAI API key to work.

1. Copy `config.example.js` and rename it to `config.js`
2. Open `config.js` and replace `YOUR_OPENAI_API_KEY_HERE` with your actual key
3. Get a key at [platform.openai.com](https://platform.openai.com)

`config.js` is gitignored — your key stays local and never gets shared.

---

## Usage

1. Go to ChatGPT
2. Type your prompt
3. Click the **Katharos button** next to the input
4. Review the original vs. refined prompt
5. Click **Use This** to replace your prompt, or **Refine** to go deeper

---

## Tech
- Vanilla JS · Chrome Extensions Manifest V3
- OpenAI API (gpt-4o)

## Comments from designer
There are few things that I want to add as a user-based-modifications, or a system, that can be modified by user for their needs. Or possibility to change colors. 