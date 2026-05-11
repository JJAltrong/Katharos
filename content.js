// ═══════════════════════════════════════════════════════════════
//  KATHAROS 2.0 — content.js
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var LOGO_URL           = chrome.runtime.getURL('logo_transparent.png');
  var RESPONSE_THRESHOLD = 6;

  var state = {
    phase:          'idle',
    originalPrompt: '',
    refinedPrompt:  '',
    responseCount:  0,
    countingActive: false,
    observer:       null,
  };

  // ═══════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    waitForElement('#prompt-textarea', buildBox);
  }

  function waitForElement(selector, cb, ms) {
    ms = ms || 600;
    var el = document.querySelector(selector);
    if (el) { cb(el); return; }
    var t = setInterval(function() {
      var found = document.querySelector(selector);
      if (found) { clearInterval(t); cb(found); }
    }, ms);
  }

  // ═══════════════════════════════════════════════════════════
  //  BOX — anchored to textarea via rAF loop
  // ═══════════════════════════════════════════════════════════
  function buildBox(editor) {
    if (document.getElementById('katharos-box')) return;
  
    var box = document.createElement('div');
    box.className = 'katharos-box';
    box.id        = 'katharos-box';
  
    var wave = document.createElement('div');
    wave.className = 'katharos-wave';
    box.appendChild(wave);
  
    var logo = document.createElement('img');
    logo.src       = LOGO_URL;
    logo.className = 'katharos-logo';
    logo.alt       = 'K';
    box.appendChild(logo);
  
    var txt = document.createElement('span');
    txt.className   = 'katharos-enhance-text';
    txt.textContent = 'ENHANCE';
    box.appendChild(txt);
  
    // Walk up to the form that wraps the textarea
    var container = editor.closest('form') || editor.parentElement;
  
    // Make container relative so absolute children position against it
    container.style.position = 'relative';
    container.appendChild(box);
  
    box.addEventListener('mouseenter', function() {
      if (state.phase === 'idle')    box.classList.add('hovered');
      if (state.phase === 'warning') showTooltip(box);
    });
    box.addEventListener('mouseleave', function() {
      box.classList.remove('hovered');
      removeTooltip();
    });
    box.addEventListener('click', onBoxClick);
  }

  function setWarningBox() {
    var box = document.getElementById('katharos-box');
    if (!box) return;
    box.classList.add('warning');
    var logo = box.querySelector('.katharos-logo');
    if (logo) logo.style.opacity = '0';
    if (!box.querySelector('.katharos-warning-icon')) {
      var icon = document.createElement('span');
      icon.className   = 'katharos-warning-icon';
      icon.textContent = '!';
      box.appendChild(icon);
    }
  }

  function restoreIdleBox() {
    var box = document.getElementById('katharos-box');
    if (!box) return;
    box.classList.remove('warning', 'hovered');
    var logo = box.querySelector('.katharos-logo');
    if (logo) logo.style.opacity = '';
    var icon = box.querySelector('.katharos-warning-icon');
    if (icon) icon.remove();
    state.phase = 'idle';
  }

  function hideBox() {
    var box = document.getElementById('katharos-box');
    if (box) box.style.visibility = 'hidden';
  }

  function showBox() {
    var box = document.getElementById('katharos-box');
    if (box) box.style.visibility = 'visible';
  }

  function onBoxClick() {
    if (state.phase === 'warning') { openUpdatePopup(); return; }
    if (state.phase !== 'idle')    return;
    var prompt = getPrompt();
    if (!prompt) { showBanner('Type something first.'); return; }
    state.originalPrompt = prompt;
    openMainPopup();
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════
  function getPrompt() {
    var el =
      document.querySelector('#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"][data-id="root"]') ||
      document.querySelector('div[contenteditable="true"]');
    if (!el) return '';
    return (el.innerText || el.textContent || '')
      .replace(/[\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function injectPrompt(text) {
    var el =
      document.querySelector('#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"]');
    if (!el) return;
    el.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function showBanner(msg) {
    removeBanner();
    var b = document.createElement('div');
    b.className   = 'katharos-banner';
    b.id          = 'katharos-banner';
    b.textContent = '\u26a0  ' + msg;
    document.body.appendChild(b);
    setTimeout(removeBanner, 2800);
  }
  function removeBanner() {
    var el = document.getElementById('katharos-banner');
    if (el) el.remove();
  }

  function showTooltip(box) {
    if (document.getElementById('katharos-tooltip')) return;
    var tip = document.createElement('div');
    tip.className   = 'katharos-tooltip';
    tip.id          = 'katharos-tooltip';
    tip.textContent = 'AI may be losing focus \u2014 click';
    box.appendChild(tip);
    requestAnimationFrame(function() { tip.classList.add('visible'); });
  }
  function removeTooltip() {
    var el = document.getElementById('katharos-tooltip');
    if (el) el.remove();
  }

  function parseHighlights(text) {
    if (!text) return '';
    return text
      .replace(/\[RED:([^\]]+)\]/g,   '<span class="katharos-hl katharos-hl--red">$1</span>')
      .replace(/\[GREEN:([^\]]+)\]/g, '<span class="katharos-hl katharos-hl--green">$1</span>')
      .replace(/\[BLUE:([^\]]+)\]/g,  '<span class="katharos-hl katharos-hl--blue">$1</span>');
  }

  function safeParseJSON(str) {
    if (!str) return null;
    var cleaned = str
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    try { return JSON.parse(cleaned); } catch(e) {}
    var match = cleaned.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch(e) {} }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  //  API
  // ═══════════════════════════════════════════════════════════
  function callAPI(system, userMessage) {
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        { type: 'ANTHROPIC_REQUEST', system: system, userMessage: userMessage },
        function(res) {
          if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
          if (!res || !res.success)     return reject(new Error((res && res.error) || 'Unknown error'));
          resolve(res.data.content[0].text);
        }
      );
    });
  }

  // ─────────────────────────────────────────────────────────
  //  API #1 — Structured prompt refine
  //  Output: clean flowing natural text. No bracket labels.
  //  Role + experience shaped silently from answers.
  // ─────────────────────────────────────────────────────────
  function apiRefine(prompt, answers) {
    answers = answers || null;

    var experienceClue = '';
    var goalClue       = '';

    if (answers) {
      var level = answers['knowledge_level'] || '';
      var goal  = answers['goal']            || '';

      if      (/beginner|no experience|never|complete/i.test(level))
        experienceClue = 'with 20+ years of experience making complex topics accessible to complete beginners, building understanding from absolute zero';
      else if (/some|basic|little/i.test(level))
        experienceClue = 'with 15+ years of experience bridging foundational knowledge into practical understanding';
      else if (/intermediate/i.test(level))
        experienceClue = 'with deep expertise in both theory and hands-on application';
      else if (/advanced|expert|quite/i.test(level))
        experienceClue = 'with research-level mastery of the subject';

      if      (/exam|test|study/i.test(goal))
        goalClue = ', specializing in exam preparation and high-retention teaching strategies';
      else if (/fun|interest|curiosity|enjoy/i.test(goal))
        goalClue = ', who makes learning genuinely engaging and memorable';
      else if (/work|professional|job|career/i.test(goal))
        goalClue = ', with strong focus on practical real-world application';
      else if (/understand|comprehend|learn|grasp/i.test(goal))
        goalClue = ', who excels at building deep conceptual understanding step by step';
      else if (/teach|explain to|present|share/i.test(goal))
        goalClue = ', skilled at helping people explain concepts clearly to others';
    }

    var roleInstruction = experienceClue
      ? 'Detect the topic and assign the most relevant expert role title (e.g. "a mathematician", "a lawyer"). Internally apply this experience profile to shape the depth, tone and approach of the whole prompt: "' + experienceClue + goalClue + '". Never mention this profile in the output.'
      : 'Detect the topic and assign the most relevant expert role title (mathematician, lawyer, doctor, software engineer, historian, chef, etc.).';

    var answersBlock = answers
      ? 'User clarifying answers:\n' + JSON.stringify(answers, null, 2) + '\n\nUse ALL of these answers to shape the prompt.'
      : 'No clarifying answers yet. Use smart broadly applicable defaults.';

    var system =
      'You are Katharos, a prompt engineering AI.\n\n'
      + 'Transform the rough user prompt into a single, detailed, naturally written prompt.\n\n'
      + 'STRICT OUTPUT RULES:\n'
      + '- Start with "Act as [role]." — just the role title, nothing else on that line\n'
      + '- Then write the rest as ONE flowing paragraph of natural prose\n'
      + '- NO labels like [GOAL], [CONTEXT], [FORMAT], [CONSTRAINTS] — none at all\n'
      + '- NO bullet points, NO numbered lists, NO headers\n'
      + '- The prompt should read like a thoughtful human wrote it\n'
      + '- Be detailed and specific — expand on what needs to happen, how to approach it, what good output looks like\n'
      + '- Minimum 3 sentences after the role line. Aim for 5-7 sentences of rich detail.\n\n'
      + 'Role instruction: ' + roleInstruction + '\n\n'
      + answersBlock + '\n\n'
      + 'For the tagging:\n'
      + '- original_tagged: wrap vague or weak parts of the original in [RED:text]\n'
      + '- refined_tagged: wrap naturally improved parts in [GREEN:text], newly added context in [BLUE:text]\n'
      + '- refined_plain: the complete prompt as clean plain text, no tags\n\n'
      + 'Return ONLY valid JSON, no markdown:\n'
      + '{"original_tagged":"...","refined_tagged":"...","refined_plain":"..."}';

    return callAPI(system, 'Original prompt: "' + prompt + '"').then(safeParseJSON);
  }

  // ─────────────────────────────────────────────────────────
  //  API #2 — Generate 7-9 questions covering all 6 blocks
  // ─────────────────────────────────────────────────────────
  function apiQuestions(prompt) {
    var system =
      'You are Katharos. Generate 7-9 targeted clarifying questions for this prompt.\n\n'
      + 'MANDATORY question order — include ALL:\n'
      + '1. id "goal" — Why do you need this?\n'
      + '2. id "knowledge_level" — How familiar are you with [topic]? (name the actual topic)\n'
      + '3. id "use_case" — What will you do with this knowledge?\n'
      + '4. id "format" — How do you want the answer structured?\n'
      + '5. id "length" — How detailed should the response be?\n'
      + '6. id "tone" — What communication style do you prefer?\n'
      + '7. id "avoid" — Anything you want excluded or avoided?\n'
      + '8-9. Add 1-2 topic-specific questions with short descriptive ids.\n\n'
      + 'Rules:\n'
      + '- Options: 2-5 words, specific to topic, 4-6 per question\n'
      + '- Do NOT include "Something else" in options — added automatically\n'
      + '- Return ONLY valid JSON, no markdown\n\n'
      + 'Format: {"analysis":"1-2 sentences on what is missing","questions":[{"id":"goal","question":"text","options":["A","B","C","D"]},...]}';

    return callAPI(system, 'Prompt: "' + prompt + '"').then(safeParseJSON);
  }

  // ─────────────────────────────────────────────────────────
  //  API #3 — Conversation summary
  // ─────────────────────────────────────────────────────────
  function apiSummary() {
    var convo  = getConversationText();
    var system =
      'You are Katharos. Summarize this AI conversation into a concise context update the user will paste back into the chat.\n'
      + 'Start with exactly: "CONTEXT UPDATE: Here is where we are:"\n'
      + 'Then cover in bullet points: the main goal, key decisions, important facts, current status or next step.\n'
      + 'Max 180 words. Plain text only, no markdown.';
    return callAPI(system, 'Conversation:\n' + convo);
  }

  function getConversationText() {
    var msgs = document.querySelectorAll('[data-message-author-role]');
    return Array.from(msgs).slice(-20).map(function(m) {
      var role = m.getAttribute('data-message-author-role');
      var text = (m.innerText || '').trim().substring(0, 600);
      return (role === 'user' ? 'User' : 'AI') + ': ' + text;
    }).join('\n\n');
  }

  // ═══════════════════════════════════════════════════════════
  //  MAIN POPUP
  // ═══════════════════════════════════════════════════════════
  function openMainPopup() {
    closeAll();
    var overlay = makeOverlay();
    var popup   = document.createElement('div');
    popup.className = 'katharos-popup';
    popup.id        = 'katharos-popup';
    popup.innerHTML =
      '<div class="katharos-popup-header">'
      + '<img src="' + LOGO_URL + '" class="katharos-popup-logo" alt="K">'
      + '<span class="katharos-popup-title">KATHAROS</span>'
      + '</div>'
      + '<div class="katharos-popup-body" id="katharos-main-body">'
      + '<div class="katharos-spinner-wrap"><div class="katharos-spinner"></div>'
      + '<span class="katharos-spinner-text">Katharos is thinking...</span></div>'
      + '</div>'
      + '<div class="katharos-popup-footer" id="katharos-main-footer" style="display:none">'
      + '<button class="katharos-btn katharos-btn--ghost" id="btn-refine">REFINE \u25b6</button>'
      + '<button class="katharos-btn katharos-btn--primary" id="btn-use">USE THIS</button>'
      + '<button class="katharos-btn katharos-btn--ghost" id="btn-cancel">CANCEL</button>'
      + '</div>';

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('active'); });

    popup.querySelector('#btn-use').addEventListener('click', onUseThis);
    popup.querySelector('#btn-cancel').addEventListener('click', onCancel);
    popup.querySelector('#btn-refine').addEventListener('click', openRefinePanel);

    apiRefine(state.originalPrompt, null)
      .then(function(result) {
        if (!result) { renderPopupError(); return; }
        state.refinedPrompt = result.refined_plain;
        renderPopupContent(result);
      })
      .catch(renderPopupError);
  }

  function renderPopupContent(result) {
    var body = document.getElementById('katharos-main-body');
    if (!body) return;
    body.innerHTML =
      '<div class="katharos-section">'
      + '<div class="katharos-section-label">Previous Prompt</div>'
      + '<div class="katharos-prompt-text">' + parseHighlights(result.original_tagged) + '</div>'
      + '</div>'
      + '<div class="katharos-divider"></div>'
      + '<div class="katharos-section">'
      + '<div class="katharos-section-label">Better Prompt</div>'
      + '<div class="katharos-prompt-text">' + parseHighlights(result.refined_tagged) + '</div>'
      + '</div>';
    document.getElementById('katharos-main-footer').style.display = 'flex';
  }

  function renderPopupError() {
    var body = document.getElementById('katharos-main-body');
    if (body) body.innerHTML = '<p class="katharos-error">Something went wrong. Please try again.</p>';
  }

  // ═══════════════════════════════════════════════════════════
  //  REFINE PANEL
  // ═══════════════════════════════════════════════════════════
  function openRefinePanel() {
    var popup = document.getElementById('katharos-popup');
    if (popup) popup.classList.add('blurred');

    hideBox();

    var panel = document.createElement('div');
    panel.className = 'katharos-panel';
    panel.id        = 'katharos-panel';
    panel.innerHTML =
      '<div class="katharos-panel-header">'
      + '<span class="katharos-panel-title">REFINE</span>'
      + '<button class="katharos-panel-close" id="btn-panel-close">\u2715</button>'
      + '</div>'
      + '<div class="katharos-panel-body" id="katharos-panel-body">'
      + '<div class="katharos-spinner-wrap"><div class="katharos-spinner"></div>'
      + '<span class="katharos-spinner-text">Analyzing your prompt...</span></div>'
      + '</div>'
      + '<div class="katharos-panel-footer" id="katharos-panel-footer" style="display:none">'
      + '<button class="katharos-btn katharos-btn--primary katharos-btn--full" id="btn-panel-use">USE \u2713</button>'
      + '</div>';

    var overlay = document.getElementById('katharos-overlay');
    if (overlay) overlay.appendChild(panel);

    requestAnimationFrame(function() { panel.classList.add('active'); });
    panel.querySelector('#btn-panel-close').addEventListener('click', closePanel);

    apiQuestions(state.originalPrompt)
      .then(function(result) {
        if (!result) {
          document.getElementById('katharos-panel-body').innerHTML =
            '<p class="katharos-error">Could not generate questions. Try again.</p>';
          return;
        }
        renderRefinePanel(result);
      })
      .catch(function() {
        document.getElementById('katharos-panel-body').innerHTML =
          '<p class="katharos-error">Something went wrong.</p>';
      });
  }

  function renderRefinePanel(data) {
    var body = document.getElementById('katharos-panel-body');
    if (!body) return;

    var html =
      '<div class="katharos-analysis">'
      + '<div class="katharos-analysis-icon">\uD83E\uDDE0</div>'
      + '<div class="katharos-analysis-text">' + (data.analysis || '') + '</div>'
      + '</div>'
      + '<div id="katharos-questions">';

    (data.questions || []).forEach(function(q, i) {
      html +=
        '<div class="katharos-question" data-qi="' + i + '" data-id="' + (q.id || i) + '">'
        + '<div class="katharos-question-text">Q' + (i + 1) + ': ' + q.question + '</div>'
        + '<div class="katharos-chips" data-qi="' + i + '">';
      (q.options || []).forEach(function(opt) {
        html += '<button class="katharos-chip" data-value="' + opt + '" data-qi="' + i + '">' + opt + '</button>';
      });
      html +=
        '<button class="katharos-chip katharos-chip--else" data-qi="' + i + '">Something else...</button>'
        + '</div>'
        + '<div class="katharos-else-expand" id="else-' + i + '" style="display:none">'
        + '<textarea class="katharos-else-input" placeholder="Describe briefly..." rows="2"></textarea>'
        + '</div>'
        + '</div>';
    });

    html += '</div>';
    body.innerHTML = html;

    body.querySelectorAll('.katharos-chip:not(.katharos-chip--else)').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var qi = chip.dataset.qi;
        body.querySelectorAll('.katharos-chips[data-qi="' + qi + '"] .katharos-chip')
            .forEach(function(c) { c.classList.remove('selected'); });
        chip.classList.add('selected');
        var f = document.getElementById('else-' + qi);
        if (f) f.style.display = 'none';
      });
    });

    body.querySelectorAll('.katharos-chip--else').forEach(function(chip) {
      chip.addEventListener('click', function() {
        var qi    = chip.dataset.qi;
        var field = document.getElementById('else-' + qi);
        var open  = field.style.display !== 'none';
        body.querySelectorAll('.katharos-chips[data-qi="' + qi + '"] .katharos-chip')
            .forEach(function(c) { c.classList.remove('selected'); });
        if (open) {
          field.style.display = 'none';
        } else {
          field.style.display = 'block';
          chip.classList.add('selected');
          field.querySelector('textarea').focus();
        }
      });
    });

    document.getElementById('katharos-panel-footer').style.display = 'block';
    document.getElementById('btn-panel-use').addEventListener('click', onPanelUse);
  }

  function onPanelUse() {
    var answers = {};
    document.querySelectorAll('.katharos-question').forEach(function(qEl) {
      var id       = qEl.dataset.id;
      var selected = qEl.querySelector('.katharos-chip.selected');
      if (!selected) return;
      if (selected.classList.contains('katharos-chip--else')) {
        var input = qEl.querySelector('.katharos-else-input');
        var val   = input ? input.value.trim() : '';
        if (val) answers[id] = val;
      } else {
        answers[id] = selected.dataset.value;
      }
    });

    closePanel();

    var body   = document.getElementById('katharos-main-body');
    var footer = document.getElementById('katharos-main-footer');
    if (body) body.innerHTML =
      '<div class="katharos-spinner-wrap"><div class="katharos-spinner"></div>'
      + '<span class="katharos-spinner-text">Building your refined prompt...</span></div>';
    if (footer) footer.style.display = 'none';

    apiRefine(state.originalPrompt, answers)
      .then(function(result) {
        if (!result) { renderPopupError(); return; }
        state.refinedPrompt = result.refined_plain;
        renderPopupContent(result);
      })
      .catch(renderPopupError);
  }

  function closePanel() {
    var panel = document.getElementById('katharos-panel');
    var popup = document.getElementById('katharos-popup');
    if (panel) { panel.classList.remove('active'); setTimeout(function() { panel.remove(); }, 360); }
    if (popup) popup.classList.remove('blurred');
    showBox();
  }

  // ═══════════════════════════════════════════════════════════
  //  USE THIS / CANCEL
  // ═══════════════════════════════════════════════════════════
  function onUseThis() {
    injectPrompt(state.refinedPrompt);
    closeAll();
    restoreIdleBox();
    startResponseCounter();
  }

  function onCancel() {
    closeAll();
    restoreIdleBox();
  }

  // ═══════════════════════════════════════════════════════════
  //  RESPONSE COUNTER
  // ═══════════════════════════════════════════════════════════
  function startResponseCounter() {
    state.responseCount  = 0;
    state.countingActive = true;
    if (state.observer) { state.observer.disconnect(); state.observer = null; }

    var container = document.querySelector('main') || document.body;

    state.observer = new MutationObserver(function(mutations) {
      if (!state.countingActive) return;
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          var isAssistant =
            (node.getAttribute && node.getAttribute('data-message-author-role') === 'assistant') ||
            (node.querySelector && node.querySelector('[data-message-author-role="assistant"]'));
          if (isAssistant) {
            state.responseCount++;
            if (state.responseCount >= RESPONSE_THRESHOLD) {
              state.countingActive = false;
              state.observer.disconnect();
              triggerWarning();
              return;
            }
          }
        }
      }
    });

    state.observer.observe(container, { childList: true, subtree: true });
  }

  function triggerWarning() {
    if (state.phase === 'warning') return;
    state.phase = 'warning';
    setWarningBox();
  }

  // ═══════════════════════════════════════════════════════════
  //  UPDATE POPUP
  // ═══════════════════════════════════════════════════════════
  function openUpdatePopup() {
    closeAll();
    var overlay = makeOverlay();
    var popup   = document.createElement('div');
    popup.className = 'katharos-popup';
    popup.id        = 'katharos-popup';
    popup.innerHTML =
      '<div class="katharos-popup-header">'
      + '<span class="katharos-update-icon">\u26a1</span>'
      + '<span class="katharos-popup-title">UPDATE READY</span>'
      + '</div>'
      + '<div class="katharos-popup-body">'
      + '<p class="katharos-update-desc">Your AI is starting to lose track.<br>'
      + 'Katharos will compress your progress so the conversation stays sharp.</p>'
      + '<div id="katharos-update-body">'
      + '<button class="katharos-btn katharos-btn--primary katharos-btn--full" id="btn-generate">GENERATE UPDATE</button>'
      + '</div></div>';

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('active'); });
    popup.querySelector('#btn-generate').addEventListener('click', onGenerateUpdate);
  }

  function onGenerateUpdate() {
    var updateBody = document.getElementById('katharos-update-body');
    updateBody.innerHTML =
      '<div class="katharos-spinner-wrap"><div class="katharos-spinner"></div>'
      + '<span class="katharos-spinner-text">Compressing your progress...</span></div>';

    apiSummary()
      .then(function(summary) {
        updateBody.innerHTML =
          '<div class="katharos-summary-text">' + summary + '</div>'
          + '<div class="katharos-update-footer">'
          + '<button class="katharos-btn katharos-btn--primary" id="btn-update-use">USE THIS</button>'
          + '<button class="katharos-btn katharos-btn--ghost" id="btn-update-cancel">CANCEL</button>'
          + '</div>';
        document.getElementById('btn-update-use').addEventListener('click', function() {
          injectPrompt(summary);
          closeAll();
          restoreIdleBox();
          startResponseCounter();
        });
        document.getElementById('btn-update-cancel').addEventListener('click', function() {
          closeAll();
          state.phase = 'warning';
          setWarningBox();
        });
      })
      .catch(function() {
        updateBody.innerHTML =
          '<p class="katharos-error">Could not generate summary. Please try again.</p>';
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════════
  function makeOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'katharos-overlay';
    overlay.id        = 'katharos-overlay';
    return overlay;
  }

  function closeAll() {
    var overlay = document.getElementById('katharos-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 280);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();