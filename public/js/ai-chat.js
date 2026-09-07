/* ============================================================
   LEGRAND — AI Concierge chat widget
   Floating assistant powered by the /api/ai/chat endpoint.
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);

  const wrap = $('.ai-chat');
  if (!wrap) return;

  const fab = $('#aiChatFab');
  const panel = $('.ai-chat-panel', wrap);
  const body = $('#aiChatBody');
  const form = $('#aiForm');
  const input = $('#aiInput');
  const HISTORY_KEY = 'legrand-ai-history';

  const WELCOME =
    "Jambo! 👋 I'm the LeGrand concierge. Ask me about our bedsitter stays in Siaya — prices, amenities, locations — and I'll help you pick the perfect one.";
  const SUGGESTIONS = [
    'Which stay is cheapest?',
    'Recommend a family-friendly stay',
    'Which stays are near Siaya Hotel?',
    'Do all stays have WiFi?',
  ];

  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // Tiny formatter: **bold** + line breaks (escape first, then format)
  function format(text) {
    return esc(text).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }

  let history = [];
  try {
    history = JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    history = [];
  }

  // Keep every trigger (FAB + navbar buttons) in sync with the panel state
  function syncTriggers(expanded) {
    fab.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    fab.setAttribute('aria-label', expanded ? 'Close the AI assistant' : 'Chat with the AI assistant');
    document.querySelectorAll('[data-ai-open]').forEach((el) => el.setAttribute('aria-expanded', expanded ? 'true' : 'false'));
  }

  // ---------------- Open / close ----------------
  function open() {
    wrap.classList.add('open');
    syncTriggers(true);
    body.scrollTop = body.scrollHeight;
    setTimeout(() => input && input.focus(), 250);
  }
  function close() {
    wrap.classList.remove('open');
    syncTriggers(false);
  }
  fab.addEventListener('click', () => (wrap.classList.contains('open') ? close() : open()));
  $('.ai-chat-close', wrap).addEventListener('click', close);

  // Esc closes the chat when it's open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) close();
  });

  // Navbar "AI Concierge" trigger (and any [data-ai-open] element) opens the chat
  document.querySelectorAll('[data-ai-open]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open();
    })
  );

  // ---------------- Rendering ----------------
  function botBubble(text) {
    return `<div class="ai-msg ai-msg-bot"><div class="ai-bubble">${format(text)}</div></div>`;
  }
  function userBubble(text) {
    return `<div class="ai-msg ai-msg-user"><div class="ai-bubble">${format(text)}</div></div>`;
  }

  function renderAll() {
    body.innerHTML = '';
    if (!history.length) {
      body.insertAdjacentHTML(
        'beforeend',
        botBubble(WELCOME) +
          '<div class="ai-suggestions" id="aiSuggestions">' +
          SUGGESTIONS.map((s) => `<button type="button">${esc(s)}</button>`).join('') +
          '</div>'
      );
      const sg = $('#aiSuggestions', body);
      if (sg) sg.addEventListener('click', onSuggestion);
    } else {
      history.forEach((m) =>
        body.insertAdjacentHTML('beforeend', m.role === 'assistant' ? botBubble(m.text) : userBubble(m.text))
      );
    }
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'ai-msg ai-msg-bot';
    el.innerHTML = '<div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  // ---------------- Sending ----------------
  function onSuggestion(e) {
    const b = e.target.closest('button');
    if (!b) return;
    $('#aiSuggestions', body)?.remove();
    send(b.textContent);
  }

  async function send(raw) {
    const text = String(raw || '').trim();
    if (!text || form.classList.contains('busy')) return;

    form.classList.add('busy');
    input.value = '';
    $('#aiSuggestions', body)?.remove();

    history.push({ role: 'user', text });
    body.insertAdjacentHTML('beforeend', userBubble(text));
    body.scrollTop = body.scrollHeight;

    const typing = showTyping();
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      const reply = String(data.reply || '').trim() || "I'm sorry, I didn't catch that. Could you rephrase?";
      history.push({ role: 'assistant', text: reply });
      body.insertAdjacentHTML('beforeend', botBubble(reply));
    } catch (err) {
      console.error('[ai-chat]', err);
      typing.remove();
      body.insertAdjacentHTML(
        'beforeend',
        botBubble("Hmm, I couldn't reach the assistant just now. Please try again in a moment.")
      );
    } finally {
      form.classList.remove('busy');
      body.scrollTop = body.scrollHeight;
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
      } catch (e) {}
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
  });

  // ---------------- Init ----------------
  renderAll();
})();
