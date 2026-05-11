═══════════════════════════════════════════════════════
KATHAROS — AI SESSION CONTEXT DOCUMENT
Version: 0.4 (public) / 4.0 (internal)
Last updated: [update this manually each session]
Owner: Adam (Slovak student, visual-concrete learner)
═══════════════════════════════════════════════════════

── WHAT IS KATHAROS ───────────────────────────────────
Katharos is a browser extension that sits above the
input box on AI chat platforms. It intercepts the
user's prompt, enhances it via OpenAI API, and returns
a refined version the user can accept or cancel.

It is both a school project and a long-term company
vision. Public version is 0.4, internal is 4.0.
Going on GitHub as a public release.

── CORE FEATURES ──────────────────────────────────────
1. ENHANCE
   User types a prompt, clicks Katharos box, AI
   refines it. Shows diff:
   - Red   = vague parts removed
   - Green = retained and improved
   - Blue  = added context
   User clicks "Use this" or "Cancel".

2. REFINE
   Before enhancing, AI asks up to 5 dynamic questions
   (generated per topic, never static) to gather
   missing context. Questions have word-chip answers.
   "Something else..." expands a short text input.

3. RESPONSE COUNTER
   Counts AI responses in the chat. At 6-7 responses,
   the Katharos box shows a flashing "!" warning.
   On click, warns user that AI is losing context and
   offers to generate a summary.

4. UPDATE / LAUNCH
   Generates a summary of the conversation and pastes
   it into the SAME chat as a new message.
   Resets the counter. Never opens a new tab.

── WHAT KATHAROS IS NOT ───────────────────────────────
- Does not replace the AI chat interface
- Does not open new tabs or windows for summaries
- Does not auto-submit anything without user approval
- Is not a chatbot itself

── TARGET PLATFORMS ───────────────────────────────────
Must work on ALL of these from day one:
- chatgpt.com / chat.openai.com
- claude.ai
- gemini.google.com

Multi-platform support is a hard requirement built
into the architecture. It cannot be added later.

── FILE ARCHITECTURE ──────────────────────────────────
RULE: This structure is locked. No file may be added,
removed, or renamed without explicit instruction from
Adam in that session.

config.js
  — Holds the OpenAI API key and exports it.
  — Nothing else lives here.
  — Only API files (analyse, refine, enhance) may
    import from this file.

adapters/
  base.js
    — Shared logic all adapters inherit.
    — Owns the MutationObserver for page injection.
    — Observer DISCONNECTS after injection is complete.
    — Provides the watching mechanism — adapters
      provide the selectors.
    — Does NOT handle response counting.

  chatgpt.js
    — ChatGPT-specific DOM selectors only.
    — Defines: input box selector, injection point
      selector, response element selector for counter.
    — Must follow all base.js adapter rules (see below).

  claude.js
    — Claude-specific DOM selectors only.
    — Same structure as chatgpt.js.

  gemini.js
    — Gemini-specific DOM selectors only.
    — Same structure as chatgpt.js.

core/
  analyse.js
    — API call #1.
    — Input: raw user prompt.
    — Job: identify what is vague, missing, or unclear.
    — Output: analysis object passed to refine.js
      or enhance.js.
    — Imports API key from config.js only.

  refine.js
    — API call #2.
    — Input: analysis from analyse.js.
    — Job: generate up to 5 targeted questions
      with word-chip answers for the user.
    — Output: questions array passed to UI.
    — Imports API key from config.js only.

  enhance.js
    — API call #3.
    — Input: original prompt + refine answers (if any).
    — Job: produce the final improved prompt.
    — Output: enhanced prompt string passed to UI.
    — Imports API key from config.js only.

  counter.js
    — Separate from base.js. Runs its own
      MutationObserver that stays alive indefinitely.
    — Each adapter provides the response element
      selector — counter.js does everything else.
    — Tracks count, triggers warning at 6-7 responses,
      resets after Update/Launch.
    — Does NOT disconnect until page is closed.

ui/
  box.js
    — Injects the Katharos box into the page.
    — Owns: box hover behavior, glow animation,
      "!" warning state.
    — Handles its own click/hover events only.
    — Does NOT call other UI files directly.

  popup.js
    — Owns: enhance/cancel popup logic.
    — Handles its own button events only.
    — Does NOT call other UI files directly.

  refine.js
    — Owns: refine panel (slides in from right),
      question display, word-chip interactions,
      "Something else..." text input expansion.
    — Handles its own events only.
    — Does NOT call other UI files directly.

  diff.js
    — Owns: red/green/blue highlight diff display.
    — Purely visual — no event listeners.

  warning.js
    — Owns: flashing "!" warning display and
      the summary trigger interaction.
    — Handles its own events only.
    — Does NOT call other UI files directly.

styles/
  base.css    — CSS variables and shared styles only.
  box.css     — Box and animations.
  popup.css   — Popup styles.
  refine.css  — Refine panel styles.
  diff.css    — Highlight diff styles.

manifest.json
  — Permissions, host_permissions for all target
    sites, content script declarations.
  — Nothing else.

── HOW FILES COMMUNICATE ──────────────────────────────
UI files NEVER call each other directly.
If one UI file needs to trigger something in another,
it fires a custom browser event. The other file
listens for that event independently.

Example:
  box.js fires → "katharos:open-popup"
  popup.js listens for → "katharos:open-popup"

This prevents the tangled dependencies that caused
full breakage on small changes in previous versions.

── ADAPTER RULES (all adapters must follow) ───────────
1. Define your input box selector.
2. Define your injection point selector.
3. Define your response element selector for counter.
4. Never start any action until base.js confirms
   the element exists on the page.
5. Tell base.js when to disconnect the observer —
   immediately after injection is complete.
6. If your selector stops working, fail gracefully
   and log a clear error. Never crash silently.

── KNOWN FRAGILITY — DOCUMENT THIS ────────────────────
The response counter watches the DOM for new elements.
If any target platform changes their HTML structure,
the counter will break silently.
This is a known and accepted risk. Each adapter's
response selector must be clearly commented so it
can be quickly updated when platforms change.

── API ────────────────────────────────────────────────
Provider: OpenAI
Key: stored in config.js only, never hardcoded
     anywhere else in the codebase.

Call #1 — analyse.js   — diagnose the raw prompt
Call #2 — refine.js    — generate questions from diagnosis
Call #3 — enhance.js   — produce final improved prompt

── COLOR PALETTE (locked) ─────────────────────────────
Background:      #080B14
Surface/Cards:   #0D1117
Primary Accent:  #38BDF8  (cyan)
Secondary:       #2563EB  (deep blue)
Gradient:        #38BDF8 → #2563EB
Glow/Animation:  #60A5FA
Text Primary:    #F1F5F9
Text Secondary:  #64748B
Warning/Update:  #FBBF24  (amber — ONLY for "!" warning)
Highlight Red:   #F87171  (vague/removed parts in diff)
Highlight Green: #34D399  (retained/improved in diff)
Highlight Blue:  #60A5FA  (added context in diff)

── LOGO ───────────────────────────────────────────────
Sharp angular K, cyan-to-blue gradient, glowing effect.
File: logo.png — lives in root, referenced in manifest.

── UI BEHAVIOR RULES (locked) ─────────────────────────
- Box is small, top-right, above input, right-aligned
- Box pulses with cyan glow animation always
- Hover: logo fades, "ENHANCE" text appears
- Refine panel slides in from the right, blurs background
- Response counter resets after every Update/Launch
- Summary pastes into SAME chat, never a new tab
- Questions are dynamically generated, never static
- "Something else..." on each question = short text input
- Max 5 refine questions per session

── WORKING RULES FOR AI (cannot be overridden) ────────
1. Never touch a file outside the one explicitly named
   in the current instruction.
2. Never assume what a DOM selector looks like on any
   platform — ask Adam if unknown.
3. Never combine responsibilities into one file for
   convenience. The architecture above is the law.
4. Console.log after every logical section for
   debugging. This is not optional.
5. Before writing any code, explain in plain English
   what the block does and why it exists.
6. If a change in one file could affect another file,
   flag it explicitly before writing any code.
7. One feature per session. Define → confirm → build
   → test. Then and only then move to the next.
8. UI files communicate via custom events only.
   Never import one UI file into another.
9. Only analyse.js, refine.js, and enhance.js may
   import from config.js.
10. counter.js and base.js are separate concerns.
    Never merge them.

── BUILD STATUS ───────────────────────────────────────
Update these manually as features are completed.

[ ] config.js created
[ ] manifest.json complete
[ ] base.js adapter logic working
[ ] chatgpt.js adapter working
[ ] claude.js adapter working
[ ] gemini.js adapter working
[ ] counter.js working on all 3 platforms
[ ] box.js injection working
[ ] analyse.js API call working
[ ] refine.js API call working
[ ] enhance.js API call working
[ ] popup.js working
[ ] ui/refine.js working
[ ] diff.js working
[ ] warning.js working
[ ] All styles complete
[ ] Custom event system tested between UI files
[ ] Tested on ChatGPT
[ ] Tested on Claude
[ ] Tested on Gemini
[ ] Ready for public 0.4 release on GitHub

── SESSION HANDOFF BLOCK ──────────────────────────────
Paste this at the start of any new AI session:

"This is Katharos 0.4, a browser extension for
enhancing AI prompts. Read CONTEXT.md fully before
doing anything. The architecture is locked. Do not
suggest changes to file structure. Do not touch files
outside the one named in my instruction. Ask before
assuming any DOM selector. One feature at a time."

═══════════════════════════════════════════════════════