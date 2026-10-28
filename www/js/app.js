/* Give Me the Bible Word Search — main application */
(function () {
  'use strict';
  const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  const THEMES = window.THEMES, CATS = window.THEME_CATS, PUZ = window.WS_PUZZLES || [];
  const LEVELS = {
    easy: { name: 'Easy', help: 'Words read across and down.' },
    medium: { name: 'Medium', help: 'Across, down and diagonally.' },
    hard: { name: 'Hard', help: 'All eight directions, including backwards.' }
  };
  const LV = ['easy', 'medium', 'hard'];
  const $ = (s, el) => (el || document).querySelector(s);
  const screen = $('#screen');
  const modalRoot = $('#modal-root');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- icons ----------
  const sv = (d, w) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const I = {
    exit: sv('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9 16l-4-4 4-4"/><path d="M5 12h11"/>'),
    back: sv('<path d="M15 18l-6-6 6-6"/>'),
    hint: sv('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>'),
    save: sv('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/><path d="M8 21v-7h8v7"/>'),
    list: sv('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    more: sv('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', 2.6),
    plus: sv('<path d="M12 5v14M5 12h14"/>', 2.4), minus: sv('<path d="M5 12h14"/>', 2.4),
    prev: sv('<path d="M15 18l-6-6 6-6"/>', 2.4), next: sv('<path d="M9 18l6-6-6-6"/>', 2.4),
    book: sv('<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h6M8 13h4"/>'),
    close: sv('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
    user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    print: sv('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>'),
    marker: sv('<path d="m9 11 6-6 4 4-6 6"/><path d="M9 11 5 15v4h4l4-4"/><path d="M3 21h18"/>'),
    fit: sv('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')
  };

  // ---------- storage & profiles ----------
  const G = {
    get(k, d) { try { const v = localStorage.getItem('ws.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ws.' + k, JSON.stringify(v)); return true; } catch (e) { toast('Could not save: storage is full or unavailable.'); return false; } },
    del(k) { try { localStorage.removeItem('ws.' + k); } catch (e) { /* ignore */ } }
  };
  const PER_PROFILE = ['settings', 'saves', 'done', 'randomOpts', 'randomCount', 'readerPos', 'libcat', 'zoom.m', 'zoom.d', 'hl', 'hlLast'];
  if (!G.get('profiles')) { const id = 'u' + Date.now().toString(36); G.set('profiles', [{ id, name: 'Player 1', created: Date.now() }]); G.set('profile', id); }
  let pid = G.get('profile');
  if (!G.get('profiles').some((p) => p.id === pid)) { pid = G.get('profiles')[0].id; G.set('profile', pid); }
  const profiles = () => G.get('profiles', []);
  const profileName = () => (profiles().find((p) => p.id === pid) || { name: 'Player' }).name;
  const store = {
    get(k, d) { return G.get('u.' + pid + '.' + k, d); },
    set(k, v) { return G.set('u.' + pid + '.' + k, v); },
    del(k) { G.del('u.' + pid + '.' + k); }
  };

  const defaults = { theme: 'light', size: 'normal', level: 'medium', color: 'yellow', cycle: false, v: 1 };
  let settings = {};
  function loadSettings() { settings = Object.assign({}, defaults, store.get('settings', {})); }
  loadSettings();
  function saveSettings() { store.set('settings', settings); }
  function applyLook() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.size = settings.size;
  }
  applyLook();

  const saves = () => store.get('saves', {});
  function putSave(s) { const all = saves(); all[s.key] = s; store.set('saves', all); }
  function dropSave(key) { const all = saves(); delete all[key]; store.set('saves', all); }
  const records = () => store.get('done', []);
  const sig = (p) => { let h = 2166136261; const s = p.rows.join('') + p.words.map((w) => w.a).join(','); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

  // ---------- KJV (lazy) ----------
  let kjvReady = null, bible = null;
  function loadKJV() {
    if (kjvReady) return kjvReady;
    kjvReady = new Promise((res, rej) => {
      if (window.KJV) return res();
      const s = document.createElement('script'); s.src = 'data/kjv.js'; s.onload = () => res(); s.onerror = () => rej(new Error('KJV failed to load'));
      document.head.appendChild(s);
    }).then(() => { bible = bible || new CWEngine.Bible(window.KJV_BOOKS, window.KJV); return bible; });
    return kjvReady;
  }
  const refStr = (r) => BOOKS[r[0]] + ' ' + r[1] + ':' + r[2];
  const passStr = (p) => BOOKS[p[0]] + ' ' + p[1] + (p[2] !== p[1] ? '–' + p[2] : '');
  const vref = (id) => BOOKS[bible.vb[id]] + ' ' + bible.vc[id] + ':' + bible.vv[id];

  // ---------- platform ----------
  function exitApp() {
    confirmBox('Exit Give Me the Bible Word Search?', 'Your puzzle progress is saved automatically.', 'Exit', () => {
      if (game) game.persist();
      if (window.desktop && window.desktop.exit) window.desktop.exit();
      else if (window.Android && window.Android.exit) window.Android.exit();
      else if (window.iOS) { home(); toast('Progress saved. Swipe up from the bottom of the screen to close the app.'); } // Apple does not allow apps to close themselves
      else { window.close(); setTimeout(() => toast('Close this browser tab to exit.'), 300); }
    });
  }
  function doPrint() {
    if (window.desktop && window.desktop.print) window.desktop.print();
    else if (window.Android && window.Android.print) window.Android.print();
    else if (window.iOS) window.iOS.print();
    else window.print();
  }

  // ---------- UI helpers ----------
  function bar(title, sub, opts) {
    opts = opts || {};
    return '<header class="bar">' +
      (opts.back ? '<button class="btn icon" data-act="back" aria-label="Back">' + I.back + '</button>' : '') +
      '<div style="flex:1;min-width:0"><h1>' + esc(title) + '</h1>' + (opts.subHtml ? '<div class="sub">' + opts.subHtml + '</div>' : sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
      (opts.extra || '') +
      '<button class="btn" data-act="exit" aria-label="Exit app">' + I.exit + '<span class="lbl">Exit</span></button>' +
      '</header>';
  }
  function wireBar(onBack) {
    screen.querySelectorAll('[data-act="exit"]').forEach((b) => (b.onclick = exitApp));
    const bb = screen.querySelector('[data-act="back"]'); if (bb) bb.onclick = onBack;
  }
  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function modal(html, onMount) {
    const sc = document.createElement('div'); sc.className = 'scrim';
    sc.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    modalRoot.appendChild(sc);
    const close = () => sc.remove();
    sc.addEventListener('click', (e) => { if (e.target === sc) close(); });
    sc.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
    if (onMount) onMount(sc, close);
    const f = sc.querySelector('input[type="text"]') || sc.querySelector('.actions .btn.primary') || sc.querySelector('button'); if (f) f.focus();
    return close;
  }
  function confirmBox(title, text, okLabel, onOk) {
    modal('<h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + esc(okLabel) + '</button></div>',
      (sc, close) => { sc.querySelector('[data-ok]').onclick = () => { close(); onOk(); }; });
  }
  function promptBox(title, label, value, okLabel, onOk) {
    modal('<h2>' + esc(title) + '</h2><div class="field"><label for="pb">' + esc(label) + '</label><input type="text" id="pb" maxlength="40" value="' + esc(value || '') + '"></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + esc(okLabel) + '</button></div>',
    (sc, close) => {
      const inp = sc.querySelector('#pb'); const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } close(); onOk(v); };
      sc.querySelector('[data-ok]').onclick = ok; inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
      setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  }
  function busy(msg) {
    const d = document.createElement('div'); d.className = 'loading';
    d.innerHTML = '<div>' + esc(msg) + '</div>';
    document.body.appendChild(d);
    return () => d.remove();
  }
  function menu(anchor, items) {
    closePops();
    const m = document.createElement('div'); m.className = 'pop'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<button role="menuitem" data-i="' + i + '">' + esc(it[0]) + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    m.style.top = Math.min(r.bottom + 6, window.innerHeight - m.offsetHeight - 8) + 'px';
    m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    m.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; m.remove(); items[+b.dataset.i][1](); };
    setTimeout(() => document.addEventListener('pointerdown', closePopsOutside, { capture: true }), 0);
  }
  function closePops() { document.querySelectorAll('.pop').forEach((p) => p.remove()); document.removeEventListener('pointerdown', closePopsOutside, { capture: true }); }
  function closePopsOutside(e) { if (!e.target.closest('.pop')) closePops(); }
  const fmtTime = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const segHtml = (id, val, opts) => '<div class="seg" id="' + id + '">' + opts.map((o) => '<button data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
  const swatchHtml = (id, val) => '<div class="hlsw" id="' + id + '" role="radiogroup" aria-label="Highlighter colour">' + HL_COLORS.map((c) =>
    '<button role="radio" data-c="' + c[0] + '" aria-checked="' + (c[0] === val) + '" title="' + c[1] + '" aria-label="' + c[1] + '" style="background:rgb(' + c[2].join(',') + ')"></button>').join('') + '</div>';

  // ---------- navigation ----------
  let current = null; const history = [];
  function go(view, args, replace) {
    if (game && view !== 'puzzle') { game.stop(); }
    if (current && !replace) history.push(current);
    current = { view, args };
    closePops();
    VIEWS[view](args || {});
  }
  function back() {
    const prev = history.pop();
    if (!prev) return go('title', {}, true);
    if (game && prev.view !== 'puzzle') game.stop();
    current = prev; VIEWS[prev.view](prev.args || {});
  }
  function home() { history.length = 0; current = null; go('title', {}, true); }

  // ---------- views ----------
  const VERSES = [['Psalms', 119, 105, 'Thy word is a lamp unto my feet, and a light unto my path.'], ['Matthew', 7, 7, 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.'], ['Proverbs', 3, 5, 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'], ['Jeremiah', 29, 13, 'And ye shall seek me, and find me, when ye shall search for me with all your heart.'], ['Joshua', 1, 9, 'Be strong and of a good courage; be not afraid.'], ['Lamentations', 3, 23, 'They are new every morning: great is thy faithfulness.'], ['Acts', 17, 11, 'They received the word with all readiness of mind, and searched the scriptures daily.'], ['2 Timothy', 2, 15, 'Study to shew thyself approved unto God.']];
  const VIEWS = {};

  VIEWS.title = function () {
    const svs = Object.values(saves()).filter((s) => !s.done).sort((a, b) => b.updated - a.updated);
    const recent = svs[0];
    const done = records().length;
    const hl = store.get('hl', { folders: [], items: [] });
    const vd = VERSES[Math.floor(Date.now() / 86400000) % VERSES.length];
    const tiles = (w) => w.split('').map((c) => '<span class="st">' + c + '</span>').join('');
    const markHtml = '<div class="srow">' + tiles('GIVE') + '<span class="ssp"></span>' + tiles('ME') + '</div>' +
      '<div class="srow">' + tiles('THE') + '<span class="ssp"></span><span class="sfound">' + tiles('BIBLE') + '</span></div>';
    screen.innerHTML =
      '<div class="title-screen"><div class="title-card">' +
      '<div class="tc-head"><div class="title-mark" aria-hidden="true">' + markHtml + '</div>' +
      '<h1><small>Give Me the Bible</small>Word Search</h1><p class="tag">King James Version</p>' +
      '<div class="who">' + I.user + '<span>Playing as <b>' + esc(profileName()) + '</b></span><button class="btn quiet" data-go="profiles">Switch player</button></div></div>' +
      '<div class="tc-menu"><nav class="menu-list">' +
      (recent ? '<button class="btn primary" data-go="continue"><span>Continue puzzle<small>' + esc(recent.title) + ' – ' + Math.round((recent.pct || 0) * 100) + '% found</small></span></button>' : '') +
      '<button class="btn ' + (recent ? '' : 'primary') + '" data-go="library"><span>Puzzle library<small>200 themed puzzles from Genesis to Revelation, 20–25 words each</small></span></button>' +
      '<button class="btn" data-go="random"><span>New random puzzle<small>Choose the theme and how many words – a new puzzle every time</small></span></button>' +
      '<button class="btn" data-go="saved"><span>Saved puzzles<small>' + plural(svs.length, 'puzzle') + ' in progress</small></span></button>' +
      '<button class="btn" data-go="record"><span>Completed puzzles<small>' + done + ' finished</small></span></button>' +
      '<button class="btn" data-go="bible"><span>Read the Bible<small>The complete King James Bible</small></span></button>' +
      '<button class="btn" data-go="highlights"><span>My highlights<small>' + plural(hl.items.length, 'verse') + ' saved in ' + plural(hl.folders.length, 'folder') + '</small></span></button>' +
      '<button class="btn" data-go="settings"><span>Settings<small>Difficulty, highlighter colours, text size, reset</small></span></button>' +
      '</nav>' +
      '<div class="title-foot">' +
      '<button class="btn" data-act="exit">' + I.exit + '<span class="lbl">Exit</span></button></div></div>' +
      '<div class="tc-info">' +
      '<div class="verse-of-day">“' + esc(vd[3]) + '”<cite>' + vd[0] + ' ' + vd[1] + ':' + vd[2] + '</cite></div>' +
      '<footer class="studio"><img src="img/poppyegg-logo.png" alt="Poppy Egg Studio" width="900" height="543"><p>© 2026 Poppy Egg Studio LLC. All rights reserved.</p></footer></div>' +
      '</div></div>';
    wireBar();
    screen.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => {
      const g = b.dataset.go;
      if (g === 'continue') openSave(recent.key); else go(g);
    }));
  };

  // ----- profiles -----
  VIEWS.profiles = function () {
    const list = profiles();
    const stat = (id) => { const d = G.get('u.' + id + '.done', []); const s = Object.keys(G.get('u.' + id + '.saves', {})).length; return plural(d.length, 'puzzle') + ' completed, ' + s + ' in progress'; };
    screen.innerHTML = bar('Players', plural(list.length, 'player') + ' on this device', { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:720px">' +
      '<p class="cat-sub">Each player has their own saved puzzles, completed record, highlights and settings.</p>' +
      '<div class="plist" style="grid-template-columns:1fr">' + list.map((p) =>
        '<div class="pitem" style="grid-template-columns:40px 1fr auto">' + '<span class="pnum">' + I.user + '</span>' +
        '<span><b>' + esc(p.name) + (p.id === pid ? ' <span class="badge">Playing now</span>' : '') + '</b><span class="d">' + stat(p.id) + '</span></span>' +
        '<span class="row-actions">' + (p.id !== pid ? '<button class="btn primary" data-play="' + p.id + '">Play as ' + esc(p.name) + '</button>' : '') +
        '<button class="btn icon" data-menu="' + p.id + '" aria-label="More for ' + esc(p.name) + '">' + I.more + '</button></span></div>').join('') + '</div>' +
      '<p style="margin-top:16px"><button class="btn primary" id="addp">' + I.plus + '<span>Add a player</span></button></p>' +
      '</div></div>';
    wireBar(back);
    $('#addp').onclick = () => promptBox('Add a player', 'Name', '', 'Add player', (name) => {
      const id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      const l = profiles(); l.push({ id, name, created: Date.now() }); G.set('profiles', l);
      switchProfile(id); toast('Welcome, ' + name + '!');
    });
    screen.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => { switchProfile(b.dataset.play); toast('Now playing as ' + profileName()); }));
    screen.querySelectorAll('[data-menu]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.menu; const p = profiles().find((x) => x.id === id);
      menu(b, [
        ['Rename', () => promptBox('Rename player', 'Name', p.name, 'Save', (name) => { const l = profiles(); l.find((x) => x.id === id).name = name; G.set('profiles', l); VIEWS.profiles(); })],
        ['Delete player', () => {
          if (profiles().length === 1) { toast('Add another player before deleting the only one.'); return; }
          confirmBox('Delete ' + p.name + '?', 'This removes their saved puzzles, completed record, highlights and settings from this device.', 'Delete player', () => {
            const l = profiles().filter((x) => x.id !== id); G.set('profiles', l);
            PER_PROFILE.forEach((k) => G.del('u.' + id + '.' + k));
            if (id === pid) switchProfile(l[0].id); else VIEWS.profiles();
          });
        }]
      ]);
    }));
  };
  function switchProfile(id) {
    if (game) { game.persist(); game.stop(); game = null; }
    pid = id; G.set('profile', id); loadSettings(); applyLook();
    history.length = 0; current = null; go('title', {}, true);
  }

  // ----- library -----
  const premadeKey = (id, lv) => 'p' + id + lv[0];
  VIEWS.library = function (args) {
    const cat = args.cat || store.get('libcat', 'law');
    const lv = settings.level;
    const svs = saves(); const doneSet = new Set(records().map((r) => r.key));
    const c = CATS.find((x) => x.id === cat) || CATS[0];
    const list = PUZ.filter((p) => p.cat === c.id);
    const nDone = PUZ.filter((p) => doneSet.has(premadeKey(p.id, lv))).length;
    screen.innerHTML = bar('Puzzle library', '200 puzzles – ' + nDone + ' completed on ' + LEVELS[lv].name, { back: true }) +
      '<div class="tabs" role="tablist">' + CATS.map((x) => '<button class="tab" role="tab" aria-selected="' + (x.id === c.id) + '" data-cat="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div>' +
      '<div class="scroll"><div class="wrap">' +
      '<div class="stylebar"><span class="lab">Difficulty</span>' + segHtml('lvl', lv, LV.map((k) => [k, LEVELS[k].name])) + '<span class="help">' + esc(LEVELS[lv].help) + ' Each level is its own puzzle, with the same words.</span></div>' +
      '<div class="cat-head">' + esc(c.name) + '</div><p class="cat-sub">' + esc(c.sub) + '</p><div class="plist">' +
      list.map((p) => {
        const key = premadeKey(p.id, lv); const s = svs[key];
        const st = doneSet.has(key) ? '<span class="pstat done">Completed</span>' : s ? '<span class="pstat prog">' + Math.round((s.pct || 0) * 100) + '%</span>' : '<span class="pstat">' + p.words.length + ' words</span>';
        return '<button class="pitem" data-id="' + p.id + '"><span class="pnum">' + p.id + '</span><span><b>' + esc(p.title) + '</b><span class="d">' + esc(p.desc) + '</span></span>' + st + '</button>';
      }).join('') + '</div></div></div>';
    wireBar(back);
    screen.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { store.set('libcat', b.dataset.cat); current.args = { cat: b.dataset.cat }; VIEWS.library({ cat: b.dataset.cat }); }));
    $('#lvl').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; settings.level = b.dataset.v; saveSettings(); VIEWS.library({ cat: c.id }); };
    screen.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => openPremade(+b.dataset.id, lv)));
  };

  // ----- random -----
  VIEWS.random = function () {
    const groups = CATS.map((c) => '<optgroup label="' + esc(c.name) + '">' + THEMES.filter((t) => t.cat === c.id).map((t) => '<option value="' + t.id + '">' + esc(t.title) + '</option>').join('') + '</optgroup>').join('');
    const last = Object.assign({ src: 'any', count: 20, level: settings.level }, store.get('randomOpts', {}));
    screen.innerHTML = bar('New random puzzle', 'Endless word searches from the KJV', { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:640px"><div class="panel">' +
      '<div class="field"><label for="rsrc">Draw words from</label><select id="rsrc"><option value="any">Any theme (surprise me)</option><option value="whole">All of Scripture</option>' + groups + '</select></div>' +
      '<div class="field"><label for="rcount">How many words</label>' +
      '<div class="countrow"><button class="btn icon" id="rminus" aria-label="Fewer words">' + I.minus + '</button><input type="range" id="rcount" min="5" max="40" step="1" value="' + last.count + '"><button class="btn icon" id="rplus" aria-label="More words">' + I.plus + '</button><output id="rcountv" for="rcount"></output></div>' +
      '<span class="help" id="rsize"></span></div>' +
      '<div class="field"><span class="lab">Difficulty</span>' + segHtml('rlvl', last.level, LV.map((k) => [k, LEVELS[k].name])) + '<span class="help" id="rlvlh"></span></div>' +
      '<button class="btn primary" id="rgo" style="width:100%;min-height:52px">Make my puzzle</button></div></div></div>';
    wireBar(back);
    const sel = $('#rsrc'); sel.value = last.src; let level = last.level;
    const range = $('#rcount');
    const paint = () => {
      const n = +range.value; $('#rcountv').textContent = n + ' words';
      const side = Math.max(10, Math.min(24, Math.ceil(Math.sqrt(n * 6.5 * 1.75))));
      $('#rsize').textContent = 'The grid grows with the word count: about ' + side + ' × ' + side + ' letters for ' + n + ' words.';
      $('#rlvlh').textContent = LEVELS[level].help;
    };
    paint();
    range.oninput = paint;
    $('#rminus').onclick = () => { range.value = Math.max(5, +range.value - 1); paint(); };
    $('#rplus').onclick = () => { range.value = Math.min(40, +range.value + 1); paint(); };
    $('#rlvl').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; level = b.dataset.v; $('#rlvl').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); paint(); };
    $('#rgo').onclick = () => { const o = { src: sel.value, count: +range.value, level }; store.set('randomOpts', o); makeRandom(o); };
  };

  // ----- saved -----
  VIEWS.saved = function () {
    const svs = Object.values(saves()).filter((s) => !s.done).sort((a, b) => b.updated - a.updated);
    screen.innerHTML = bar('Saved puzzles', plural(svs.length, 'puzzle') + ' in progress', { back: true }) +
      '<div class="scroll"><div class="wrap">' + (svs.length ? '<div class="plist">' + svs.map((s) =>
        '<div class="pitem" style="grid-template-columns:1fr auto auto"><button class="btn quiet" style="justify-content:flex-start;text-align:left" data-open="' + esc(s.key) + '"><span><b>' + esc(s.title) + '</b><span class="d">' + esc(s.sub || '') + ' – saved ' + fmtDate(s.updated) + ', ' + fmtTime(s.secs) + ' played</span></span></button>' +
        '<span class="pstat prog">' + Math.round((s.pct || 0) * 100) + '%</span><button class="btn icon quiet" aria-label="Delete save" data-del="' + esc(s.key) + '">' + I.close + '</button></div>').join('') + '</div>'
        : '<p class="empty">No puzzles in progress. Start one from the library or make a random puzzle; progress saves automatically.</p><button class="btn primary" data-go="library">Open the puzzle library</button>') +
      '</div></div>';
    wireBar(back);
    screen.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => openSave(b.dataset.open)));
    screen.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => confirmBox('Delete this saved puzzle?', 'Your progress on it will be lost.', 'Delete', () => { dropSave(b.dataset.del); VIEWS.saved(); })));
    const lg = screen.querySelector('[data-go]'); if (lg) lg.onclick = () => go('library');
  };

  // ----- record -----
  VIEWS.record = function () {
    const rec = records().slice().sort((a, b) => b.date - a.date);
    const solved = rec.filter((r) => !r.auto);
    const lib = new Set(solved.filter((r) => /^p\d+[emh]$/.test(r.key)).map((r) => r.key.slice(0, -1))).size;
    const noHint = solved.filter((r) => !r.hints).length;
    const words = solved.reduce((s, r) => s + (r.words || 0), 0);
    const lib20 = solved.filter((r) => /^p/.test(r.key)).map((r) => r.secs);
    const best = lib20.length ? Math.min.apply(null, lib20) : null;
    screen.innerHTML = bar('Completed puzzles', esc(profileName()) + '’s record', { back: true }) +
      '<div class="scroll"><div class="wrap">' +
      '<div class="stats"><div class="stat"><b>' + solved.length + '</b>puzzles solved</div><div class="stat"><b>' + lib + '/200</b>library themes solved</div><div class="stat"><b>' + words + '</b>words found</div><div class="stat"><b>' + noHint + '</b>solved without hints</div><div class="stat"><b>' + (best ? fmtTime(best) : '–') + '</b>fastest library puzzle</div><div class="stat"><b>' + (rec.length - solved.length) + '</b>auto-completed</div></div>' +
      (rec.length ? '<div style="overflow:auto"><table class="rec"><thead><tr><th>Puzzle</th><th>Result</th><th>Date</th><th>Time</th><th>Hints</th></tr></thead><tbody>' +
        rec.map((r) => '<tr><td>' + esc(r.title) + '<div class="d">' + esc([r.level ? LEVELS[r.level].name : '', r.words ? r.words + ' words' : ''].filter(Boolean).join(' – ')) + '</div></td><td>' + (r.auto ? '<span class="tag-auto">Auto-completed</span>' : '<span class="tag-solved">Solved</span>') + '</td><td>' + fmtDate(r.date) + '</td><td>' + fmtTime(r.secs) + '</td><td>' + (r.auto ? '–' : (r.hints || 0)) + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="empty">Finished puzzles will be listed here with the date, your time and the hints you used.</p>') +
      (rec.length ? '<p style="margin-top:20px"><button class="btn" id="clr">Clear record</button></p>' : '') +
      '</div></div>';
    wireBar(back);
    const c = $('#clr'); if (c) c.onclick = () => confirmBox('Clear your completed record?', 'This removes the history of finished puzzles for ' + profileName() + '. Saved puzzles are kept.', 'Clear record', () => { store.set('done', []); VIEWS.record(); });
  };

  // ----- settings -----
  VIEWS.settings = function () {
    const seg = (id, val, opts) => '<div class="seg" data-key="' + id + '">' + opts.map((o) => '<button data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
    screen.innerHTML = bar('Settings', 'For ' + profileName(), { back: true }) +
      '<div class="scroll"><div class="wrap" style="max-width:720px">' +
      '<div class="panel"><h2>Puzzles</h2>' +
      '<div class="field"><span class="lab">Difficulty</span>' + seg('level', settings.level, LV.map((k) => [k, LEVELS[k].name])) +
      '<span class="help">Easy: across and down. Medium: adds diagonals. Hard: all eight directions, including backwards. Used for the library and as the starting choice for random puzzles.</span></div>' +
      '<div class="field"><span class="lab">Highlighter colour for found words</span>' + swatchHtml('setcol', settings.color) +
      '<span class="help">The same 10 colours as the Bible highlighter. You can also change colour while you play.</span></div>' +
      '<div class="field"><span class="lab">Use the next colour for each word found</span>' + seg('cycle', settings.cycle, [[false, 'Off'], [true, 'On']]) + '</div></div>' +
      '<div class="panel"><h2>Display</h2>' +
      '<div class="field"><span class="lab">Colours</span>' + seg('theme', settings.theme, [['light', 'Daylight'], ['dark', 'Evening']]) + '</div>' +
      '<div class="field"><span class="lab">Text size</span>' + seg('size', settings.size, [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']]) + '</div></div>' +
      '<div class="panel"><h2>Reset</h2><p class="help" style="margin-top:0">These affect only ' + esc(profileName()) + '. Other players are not changed.</p>' +
      '<div class="btnrow"><button class="btn" id="resetGame">Reset the entire game</button><button class="btn" id="resetHl">Delete all highlights</button><button class="btn" id="players">' + I.user + '<span>Manage players</span></button></div></div>' +
      '<div class="panel"><h2>About</h2><p>Give Me the Bible Word Search 1.0.2. © 2026 Poppy Egg Studio LLC. All rights reserved.</p><p>Scripture: King James Version, the 66 books of the Old and New Testaments. Fonts: Atkinson Hyperlegible and EB Garamond (SIL Open Font License).</p>' +
      '</div>' +
      '</div></div>';
    wireBar(back);
    screen.querySelectorAll('.seg[data-key]').forEach((sg) => (sg.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const k = sg.dataset.key; let v = b.dataset.v;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      sg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      settings[k] = v; saveSettings(); applyLook();
    }));
    $('#setcol').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; settings.color = b.dataset.c; saveSettings(); $('#setcol').querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x === b)); };
    $('#resetGame').onclick = () => confirmBox('Reset the entire game?', 'This erases every saved puzzle, your completed record and your random-puzzle count for ' + profileName() + '. Highlights and settings are kept.', 'Reset game', () => { store.set('saves', {}); store.set('done', []); store.set('randomCount', 0); toast('Game reset. Every puzzle is new again.'); });
    $('#resetHl').onclick = () => confirmBox('Delete all highlights?', 'Every highlighted verse and folder for ' + profileName() + ' will be removed.', 'Delete highlights', () => { store.set('hl', { folders: [], items: [] }); toast('Highlights deleted'); });
    $('#players').onclick = () => go('profiles');
  };

  // ---------- highlights ----------
  // The same 10 colours are used for Bible highlights and for marking found words.
  const HL_COLORS = [['yellow', 'Yellow', [255, 226, 102]], ['green', 'Green', [140, 214, 140]], ['blue', 'Blue', [140, 186, 240]], ['pink', 'Pink', [244, 164, 196]], ['orange', 'Orange', [255, 178, 102]],
    ['purple', 'Purple', [190, 160, 235]], ['teal', 'Teal', [110, 210, 200]], ['red', 'Red', [240, 130, 120]], ['lavender', 'Lavender', [215, 200, 245]], ['gray', 'Gray', [190, 192, 198]]];
  const rgbOf = (c) => (HL_COLORS.find((x) => x[0] === c) || HL_COLORS[0])[2];
  const colorName = (c) => (HL_COLORS.find((x) => x[0] === c) || [c, c])[1];
  function hlData() { const d = store.get('hl', null) || { folders: [], items: [] }; return d; }
  function hlSave(d) { store.set('hl', d); }
  function hlColorOf(d) { const m = {}; d.items.forEach((it) => { if (!m[it.v] || m[it.v].t < it.t) m[it.v] = it; }); return m; }

  // ---------- Bible reader ----------
  VIEWS.bible = function (args) {
    const stop = busy('Opening the Bible…');
    loadKJV().then(() => { stop(); renderBible(args); }).catch(() => { stop(); toast('The Bible text could not be loaded.'); });
  };
  let selected = new Set();
  function renderBible(args) {
    const pos = Object.assign({ b: 0, c: 1, hl: null }, store.get('readerPos', {}), args);
    const fromPuzzle = !!args.fromPuzzle;
    const nCh = window.KJV[pos.b].length;
    selected = new Set();
    screen.innerHTML = bar('Holy Bible', 'King James Version', { back: true, extra: (fromPuzzle ? '<button class="btn" data-act="topuzzle">' + I.back + '<span class="lbl">Back to puzzle</span></button>' : '') + '<button class="btn" data-act="hls">' + I.marker + '<span class="lbl">My highlights</span></button>' }) +
      '<div class="reader-tools"><select id="rb" aria-label="Book"><optgroup label="Old Testament">' + BOOKS.slice(0, 39).map((n, i) => '<option value="' + i + '">' + n + '</option>').join('') +
      '</optgroup><optgroup label="New Testament">' + BOOKS.slice(39).map((n, i) => '<option value="' + (i + 39) + '">' + n + '</option>').join('') + '</optgroup></select>' +
      '<select id="rc" aria-label="Chapter">' + Array.from({ length: nCh }, (_, i) => '<option value="' + (i + 1) + '">Chapter ' + (i + 1) + '</option>').join('') + '</select>' +
      '<input class="grow" type="search" id="rs" placeholder="Search the Bible (e.g. still waters)" aria-label="Search the Bible"></div>' +
      '<div class="scroll" id="rbody"></div><div class="selbar" id="selbar" hidden></div>';
    wireBar(back);
    const tp = screen.querySelector('[data-act="topuzzle"]'); if (tp) tp.onclick = back;
    screen.querySelector('[data-act="hls"]').onclick = () => go('highlights');
    $('#rb').value = pos.b; $('#rc').value = pos.c;
    $('#rb').onchange = (e) => { current.args = { b: +e.target.value, c: 1, fromPuzzle }; renderBible(current.args); };
    $('#rc').onchange = (e) => { current.args = { b: pos.b, c: +e.target.value, fromPuzzle }; renderBible(current.args); };
    $('#rs').onkeydown = (e) => { if (e.key === 'Enter') searchBible(e.target.value, fromPuzzle); };
    store.set('readerPos', { b: pos.b, c: pos.c });
    const verses = window.KJV[pos.b][pos.c - 1];
    const base = bible.id(pos.b, pos.c, 1);
    const colors = hlColorOf(hlData());
    const body = $('#rbody');
    body.innerHTML = '<article class="chapter"><h2>' + BOOKS[pos.b] + ' ' + pos.c + '</h2><p class="help reader-help">Tap verses to select them, then highlight and save them to a folder.</p>' +
      verses.map((t, i) => { const id = base + i; const col = colors[id]; return '<p class="v' + (pos.hl && i + 1 >= pos.hl[0] && i + 1 <= pos.hl[1] ? ' hl' : '') + (col ? ' mark-' + col.c : '') + '" id="v' + (i + 1) + '" data-id="' + id + '"><sup>' + (i + 1) + '</sup>' + esc(t) + '</p>'; }).join('') +
      '<div class="chapter-nav"><button class="btn" id="pc">' + I.prev + '<span>Previous chapter</span></button><button class="btn" id="nc"><span>Next chapter</span>' + I.next + '</button></div></article>';
    body.onclick = (e) => {
      const p = e.target.closest('p.v'); if (!p) return;
      const id = +p.dataset.id;
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      p.classList.toggle('sel', selected.has(id));
      updateSelBar();
    };
    const step = (d) => {
      let b = pos.b, c = pos.c + d;
      if (c < 1) { b--; if (b < 0) return; c = window.KJV[b].length; }
      if (c > window.KJV[b].length) { b++; if (b >= 66) return; c = 1; }
      current.args = { b, c, fromPuzzle }; renderBible(current.args);
    };
    $('#pc').onclick = () => step(-1); $('#nc').onclick = () => step(1);
    if (pos.hl) { const el = $('#v' + pos.hl[0]); if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 30); } else body.scrollTop = 0;
  }
  function updateSelBar() {
    const sb = $('#selbar'); if (!sb) return;
    if (!selected.size) { sb.hidden = true; return; }
    const colors = hlColorOf(hlData()); const anyMarked = Array.from(selected).some((id) => colors[id]);
    sb.hidden = false;
    sb.innerHTML = '<span><b>' + plural(selected.size, 'verse') + '</b> selected</span>' +
      '<button class="btn primary" id="hlsave">' + I.marker + '<span>Highlight and save</span></button>' +
      (anyMarked ? '<button class="btn" id="hlrem">Remove highlight</button>' : '') +
      '<button class="btn" id="hlcancel">Cancel</button>';
    $('#hlsave').onclick = () => highlightDialog(Array.from(selected), () => { const a = current.args; renderBible(Object.assign({}, a, { hl: null })); });
    const rm = $('#hlrem'); if (rm) rm.onclick = () => { const d = hlData(); d.items = d.items.filter((it) => !selected.has(it.v)); hlSave(d); toast('Highlight removed'); renderBible(Object.assign({}, current.args, { hl: null })); };
    $('#hlcancel').onclick = () => { selected.clear(); document.querySelectorAll('p.v.sel').forEach((p) => p.classList.remove('sel')); updateSelBar(); };
  }
  function highlightDialog(ids, done) {
    const d = hlData();
    const last = store.get('hlLast', { c: 'yellow', f: d.folders.length ? d.folders[0].id : '' });
    modal('<h2>Highlight ' + plural(ids.length, 'verse') + '</h2>' +
      '<div class="field"><span class="lab">Colour</span><div class="seg swatches" id="hlc">' + HL_COLORS.map((c) => '<button data-v="' + c[0] + '" aria-pressed="' + (c[0] === last.c) + '"><i class="chip-' + c[0] + '"></i>' + c[1] + '</button>').join('') + '</div></div>' +
      '<div class="field"><label for="hlf">Save in folder</label><select id="hlf">' + d.folders.map((f) => '<option value="' + f.id + '">' + esc(f.name) + '</option>').join('') + '<option value="__new">New folder…</option></select></div>' +
      '<div class="field" id="newf" hidden><label for="hln">New folder name</label><input type="text" id="hln" maxlength="40" placeholder="e.g. Promises of God"></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Save highlight</button></div>',
    (sc, close) => {
      let color = last.c;
      const fsel = sc.querySelector('#hlf'); fsel.value = d.folders.some((f) => f.id === last.f) ? last.f : (d.folders.length ? d.folders[0].id : '__new');
      const showNew = () => { sc.querySelector('#newf').hidden = fsel.value !== '__new'; if (fsel.value === '__new') sc.querySelector('#hln').focus(); };
      showNew(); fsel.onchange = showNew;
      sc.querySelector('#hlc').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; color = b.dataset.v; sc.querySelectorAll('#hlc button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
      sc.querySelector('[data-ok]').onclick = () => {
        let fid = fsel.value;
        if (fid === '__new') {
          const name = sc.querySelector('#hln').value.trim(); if (!name) { sc.querySelector('#hln').focus(); return; }
          fid = 'f' + Date.now().toString(36); d.folders.push({ id: fid, name, created: Date.now() });
        }
        const t = Date.now();
        ids.forEach((v) => {
          const ex = d.items.find((it) => it.v === v && it.f === fid);
          if (ex) { ex.c = color; ex.t = t; } else d.items.push({ v, f: fid, c: color, t });
        });
        hlSave(d); store.set('hlLast', { c: color, f: fid });
        close(); toast(plural(ids.length, 'verse') + ' saved to “' + d.folders.find((f) => f.id === fid).name + '”'); done();
      };
    });
  }
  function searchBible(q, fromPuzzle) {
    q = q.trim(); if (q.length < 2) return;
    const words = q.toLowerCase().split(/\s+/);
    const res = [];
    for (let i = 0; i < bible.N && res.length < 300; i++) {
      const t = bible.text[i].toLowerCase();
      if (words.every((w) => t.indexOf(w) >= 0)) res.push(i);
    }
    const body = $('#rbody'); selected.clear(); updateSelBar();
    body.onclick = null;
    body.innerHTML = '<div class="results"><p><b>' + res.length + (res.length >= 300 ? '+' : '') + '</b> ' + (res.length === 1 ? 'verse contains' : 'verses contain') + ' “' + esc(q) + '”.</p>' +
      res.map((id) => '<button class="result" data-id="' + id + '"><b>' + vref(id) + '</b><br><span>' + esc(bible.text[id]) + '</span></button>').join('') + '</div>';
    body.scrollTop = 0;
    body.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => {
      const id = +b.dataset.id; current.args = { b: bible.vb[id], c: bible.vc[id], hl: [bible.vv[id], bible.vv[id]], fromPuzzle }; renderBible(current.args);
    }));
  }

  // ----- highlights screens -----
  VIEWS.highlights = function () {
    loadKJV().then(() => {
      const d = hlData();
      const count = (fid) => d.items.filter((it) => it.f === fid).length;
      screen.innerHTML = bar('My highlights', plural(d.items.length, 'highlighted verse'), { back: true }) +
        '<div class="scroll"><div class="wrap" style="max-width:820px">' +
        (d.folders.length ? '<div class="plist">' + d.folders.map((f) =>
          '<button class="pitem" data-f="' + f.id + '"><span class="pnum">' + I.marker + '</span><span><b>' + esc(f.name) + '</b><span class="d">' + plural(count(f.id), 'verse') + '</span></span><span class="pstat">Open</span></button>').join('') + '</div>' +
          '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="allpz">Make a word search from all my highlights</button><button class="btn" id="exportall">' + I.save + '<span>Export highlights</span></button><button class="btn" id="newfold">' + I.plus + '<span>New folder</span></button></div>'
          : '<p class="empty">You have no highlights yet. Open the Bible, tap one or more verses, then choose “Highlight and save” to keep them in a folder.</p><div class="btnrow"><button class="btn primary" id="openb">' + I.book + '<span>Open the Bible</span></button><button class="btn" id="newfold">' + I.plus + '<span>New folder</span></button></div>') +
        '</div></div>';
      wireBar(back);
      screen.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => go('folder', { f: b.dataset.f })));
      const nf = $('#newfold'); if (nf) nf.onclick = () => promptBox('New folder', 'Folder name', '', 'Create folder', (name) => { const dd = hlData(); dd.folders.push({ id: 'f' + Date.now().toString(36), name, created: Date.now() }); hlSave(dd); VIEWS.highlights(); });
      const ob = $('#openb'); if (ob) ob.onclick = () => go('bible');
      const ap = $('#allpz'); if (ap) ap.onclick = () => makeHighlightPuzzle(Array.from(new Set(d.items.map((it) => it.v))), 'All my highlights');
      const ex = $('#exportall'); if (ex) ex.onclick = () => exportDialog(null);
    });
  };
  VIEWS.folder = function (args) {
    loadKJV().then(() => {
      const d = hlData(); const f = d.folders.find((x) => x.id === args.f);
      if (!f) { back(); return; }
      const items = d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v);
      screen.innerHTML = bar(f.name, plural(items.length, 'highlighted verse'), { back: true, extra: '<button class="btn icon" id="fmenu" aria-label="Folder options">' + I.more + '</button>' }) +
        '<div class="scroll"><div class="wrap" style="max-width:820px">' +
        (items.length ? '<div class="btnrow" style="margin-bottom:14px"><button class="btn primary" id="mkpz">Make a word search from these verses</button><button class="btn" id="exportf">' + I.save + '<span>Export this folder</span></button></div>' +
          items.map((it) => '<div class="hlv mark-' + it.c + '"><div class="hlv-top"><button class="ref" data-open="' + it.v + '">' + vref(it.v) + '</button><span class="row-actions"><button class="btn quiet colorbtn" data-col="' + it.v + '" aria-label="Change colour"><i class="chip-' + it.c + '"></i>' + colorName(it.c) + '</button><button class="btn icon quiet" data-rm="' + it.v + '" aria-label="Remove from folder">' + I.close + '</button></span></div><p class="scripture">' + esc(bible.text[it.v]) + '</p></div>').join('')
          : '<p class="empty">This folder is empty. Highlight verses in the Bible and choose this folder to add them.</p><button class="btn primary" id="openb">' + I.book + '<span>Open the Bible</span></button>') +
        '</div></div>';
      wireBar(back);
      const ob = $('#openb'); if (ob) ob.onclick = () => go('bible');
      screen.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => { const id = +b.dataset.open; go('bible', { b: bible.vb[id], c: bible.vc[id], hl: [bible.vv[id], bible.vv[id]] }); }));
      screen.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const dd = hlData(); dd.items = dd.items.filter((it) => !(it.f === f.id && it.v === +b.dataset.rm)); hlSave(dd); VIEWS.folder(args); }));
      const mk = $('#mkpz'); if (mk) mk.onclick = () => makeHighlightPuzzle(items.map((it) => it.v), f.name);
      const exf = $('#exportf'); if (exf) exf.onclick = () => exportDialog(f.id);
      screen.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => menu(b, HL_COLORS.map((c) => [c[1], () => {
        const dd = hlData(); const it = dd.items.find((x) => x.f === f.id && x.v === +b.dataset.col); if (it) { it.c = c[0]; it.t = Date.now(); hlSave(dd); } VIEWS.folder(args);
      }]))));
      $('#fmenu').onclick = (e) => menu(e.currentTarget, [
        ['Rename folder', () => promptBox('Rename folder', 'Folder name', f.name, 'Save', (name) => { const dd = hlData(); dd.folders.find((x) => x.id === f.id).name = name; hlSave(dd); VIEWS.folder(args); })],
        ['Delete folder', () => confirmBox('Delete “' + f.name + '”?', 'The folder and its highlights will be removed.', 'Delete folder', () => { const dd = hlData(); dd.folders = dd.folders.filter((x) => x.id !== f.id); dd.items = dd.items.filter((it) => it.f !== f.id); hlSave(dd); back(); })]
      ]);
    });
  };
  // ----- exporting highlights -----
  function exportDialog(folderId) {
    const d = hlData();
    const folders = folderId ? d.folders.filter((f) => f.id === folderId) : d.folders;
    const count = d.items.filter((it) => folders.some((f) => f.id === it.f)).length;
    const canShare = !!((window.Android && window.Android.shareText) || window.iOS);
    modal('<h2>Export highlights</h2><p>' + plural(count, 'verse') + ' from ' + (folderId ? '\u201C' + esc(folders[0].name) + '\u201D' : plural(folders.length, 'folder')) + '.</p>' +
      '<div class="field"><span class="lab">Format</span><div class="seg" id="exfmt"><button data-v="txt" aria-pressed="true">Text document (.txt)</button><button data-v="csv" aria-pressed="false">Spreadsheet (.csv)</button></div>' +
      '<span class="help">Text is easy to read, print or paste into notes. The spreadsheet opens in Excel, Google Sheets or Numbers.</span></div>' +
      '<div class="actions"><button class="btn" data-close>Cancel</button><button class="btn" id="excopy">Copy to clipboard</button>' + (canShare ? '<button class="btn" id="exshare">Share\u2026</button>' : '') + '<button class="btn primary" id="exsave">' + I.save + 'Save file</button></div>',
    (sc, close) => {
      let fmt = 'txt';
      sc.querySelector('#exfmt').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fmt = b.dataset.v; sc.querySelectorAll('#exfmt button').forEach((x) => x.setAttribute('aria-pressed', x === b)); };
      const build = () => buildExport(folders, fmt);
      const fname = () => 'Bible-highlights' + (folderId ? '-' + folders[0].name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') + '.' + fmt;
      sc.querySelector('#exsave').onclick = () => { saveTextFile(fname(), build(), fmt === 'csv' ? 'text/csv' : 'text/plain'); close(); };
      sc.querySelector('#excopy').onclick = () => { copyText(build()); close(); };
      const sh = sc.querySelector('#exshare'); if (sh) sh.onclick = () => { (window.iOS || window.Android).shareText(folderId ? folders[0].name : 'My Bible highlights', build()); close(); };
    });
  }
  function buildExport(folders, fmt) {
    const d = hlData();
    if (fmt === 'csv') {
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const rows = [['Folder', 'Reference', 'Book', 'Chapter', 'Verse', 'Colour', 'Highlighted on', 'Text']];
      folders.forEach((f) => d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v).forEach((it) => rows.push([f.name, vref(it.v), BOOKS[bible.vb[it.v]], bible.vc[it.v], bible.vv[it.v], colorName(it.c), new Date(it.t).toISOString().slice(0, 10), bible.text[it.v]])));
      return '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
    }
    let out = 'My Bible Highlights \u2013 King James Version\r\n' + profileName() + ' \u2013 exported ' + fmtDate(Date.now()) + '\r\n';
    folders.forEach((f) => {
      const items = d.items.filter((it) => it.f === f.id).sort((a, b) => a.v - b.v);
      out += '\r\n' + f.name.toUpperCase() + ' (' + plural(items.length, 'verse') + ')\r\n' + '-'.repeat(Math.min(60, f.name.length + 12)) + '\r\n';
      items.forEach((it) => { out += '\r\n' + vref(it.v) + '  [' + colorName(it.c) + ']\r\n' + bible.text[it.v] + '\r\n'; });
    });
    return out;
  }
  function saveTextFile(name, text, mime) {
    if (window.desktop && window.desktop.saveFile) {
      window.desktop.saveFile(name, text).then((p) => { if (p) toast('Saved to ' + p); }).catch(() => toast('The file could not be saved.'));
    } else if (window.Android && window.Android.saveText) {
      window.Android.saveText(name, mime, text); // opens Android's "save to" picker
    } else if (window.iOS) {
      window.iOS.saveText(name, mime, text); // opens the iOS "Save to Files" picker
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' })); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Downloaded ' + name);
    }
  }
  function copyText(text) {
    const fallback = () => { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } t.remove(); toast(ok ? 'Copied to the clipboard' : 'Copying is not available here.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Copied to the clipboard'), fallback); else fallback();
  }
  window.onAndroidSaved = function (ok) { toast(ok ? 'Highlights saved' : 'The file was not saved.'); };


  // ---------- making puzzles ----------
  let curatedPrep = null;
  const curatedWords = () => curatedPrep || (curatedPrep = WSEngine.prepareCurated(bible, window.CURATED || []));
  function buildPuzzle(theme, count, level, title, sub) {
    const seed = (Math.random() * 4294967295) >>> 0;
    const res = WSEngine.makePuzzle(bible, theme, { seed, count, level, curated: curatedWords(), minCount: Math.min(count, 5), allowGrow: true, maxLen: 14 });
    if (!res) return null;
    const passages = theme.scope ? theme.scope.map((s) => [bible.lookup[s[0].toLowerCase()], s[1], s[2]]) : [];
    return { key: 'r' + Date.now().toString(36), title, sub, level, random: true, n: res.n, rows: res.rows, passages,
      words: res.words.map((w) => ({ a: w.a, r: w.r, c: w.c, d: w.d, ref: w.ref })), asked: count };
  }
  function makeRandom(o) {
    const stop = busy('Building your word search…');
    setTimeout(() => loadKJV().then(() => {
      let theme;
      if (o.src === 'whole') theme = { title: 'All of Scripture', whole: true };
      else if (o.src === 'any') theme = THEMES[Math.floor(Math.random() * THEMES.length)];
      else theme = THEMES.find((t) => String(t.id) === String(o.src)) || THEMES[0];
      const n = store.get('randomCount', 0) + 1;
      const puz = buildPuzzle(theme, o.count, o.level, 'Random: ' + theme.title, 'Random puzzle no. ' + n + ' – ' + LEVELS[o.level].name);
      stop();
      if (!puz) { toast('That theme could not make a puzzle. Try another.'); return; }
      store.set('randomCount', n);
      if (puz.words.length < o.count) toast('This theme has ' + puz.words.length + ' good words, so your puzzle has ' + puz.words.length + '.');
      go('puzzle', { puz });
    }).catch((e) => { stop(); toast('Could not build a puzzle: ' + e.message); }), 40);
  }
  function makeHighlightPuzzle(ids, name) {
    if (ids.length < 1) { toast('Highlight a verse or two first.'); return; }
    const o = Object.assign({ count: 20, level: settings.level }, store.get('randomOpts', {}));
    const stop = busy('Building a word search from your verses…');
    setTimeout(() => loadKJV().then(() => {
      const puz = buildPuzzle({ title: name, ids: ids }, o.count, o.level, 'Highlights: ' + name, plural(ids.length, 'highlighted verse') + ' – ' + LEVELS[o.level].name);
      stop();
      if (!puz || puz.words.length < 5) { toast('These verses don’t have enough words for a puzzle yet. Add a few more verses.'); return; }
      go('puzzle', { puz });
    }).catch((e) => { stop(); toast('Could not build a puzzle: ' + e.message); }), 40);
  }

  // ---------- verse popup ----------
  function showVerse(word) {
    loadKJV().then(() => {
      const [b, c, v] = word.ref;
      const pat = new RegExp('(^|[^A-Za-z])(' + word.a + ')(?![A-Za-z])', 'gi');
      const text = esc(window.KJV[b][c - 1][v - 1]).replace(pat, (all, p1, w) => p1 + '<mark class="wmark">' + w + '</mark>');
      modal('<h2>' + esc(refStr(word.ref)) + '</h2><div class="scripture"><sup>' + v + '</sup>' + text + '</div>' +
        '<div class="actions"><button class="btn" data-close>Close</button><button class="btn primary" data-open>' + I.book + 'Open chapter</button></div>',
      (sc, close) => {
        sc.querySelector('[data-open]').onclick = () => { close(); if (game) game.persist(); go('bible', { b, c, hl: [v, v], fromPuzzle: !!game }); };
      });
    }).catch(() => toast('The Bible text could not be loaded.'));
  }
  function openPassage(p) { loadKJV().then(() => { if (game) game.persist(); go('bible', { b: p[0], c: p[1], fromPuzzle: !!game }); }); }

  // ---------- puzzle opening ----------
  function puzzleFromPremade(id, lv) {
    const p = PUZ.find((x) => x.id === id); if (!p) return null;
    const g = p.grids[lv];
    return { key: premadeKey(id, lv), id, title: p.title, sub: 'Puzzle ' + id + ' of 200 – ' + LEVELS[lv].name, level: lv, n: g.n, rows: g.rows, passages: p.passages,
      words: p.words.map((w, i) => ({ a: w[0], ref: [w[1], w[2], w[3]], r: g.place[i][0], c: g.place[i][1], d: g.place[i][2] })) };
  }
  function validSave(puz, s) { return s && Array.isArray(s.found) && s.sig === sig(puz) && s.found.every((f) => f.i >= 0 && f.i < puz.words.length); }
  function openPremade(id, lv) {
    const puz = puzzleFromPremade(id, lv); if (!puz) return;
    let s = saves()[puz.key];
    if (s && !validSave(puz, s)) { dropSave(puz.key); s = null; }
    const isDone = records().some((r) => r.key === puz.key);
    if (isDone && !s) {
      modal('<h2>' + esc(puz.title) + '</h2><p>You have completed this puzzle on ' + LEVELS[lv].name + '. Would you like to solve it again?</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Solve again</button></div>',
        (sc, close) => { sc.querySelector('[data-ok]').onclick = () => { close(); go('puzzle', { puz }); }; });
      return;
    }
    go('puzzle', { puz, save: s });
  }
  function openSave(key) {
    const s = saves()[key]; if (!s) return;
    const m = /^p(\d+)([emh])$/.exec(key);
    const puz = m ? puzzleFromPremade(+m[1], { e: 'easy', m: 'medium', h: 'hard' }[m[2]]) : s.puz;
    if (!puz || !validSave(puz, s)) { dropSave(key); toast('That puzzle was updated, so it starts fresh.'); if (puz) go('puzzle', { puz }); return; }
    go('puzzle', { puz, save: s });
  }

  // ---------- printing ----------
  function printPuzzle(puz, withAnswers) {
    let root = document.getElementById('print-root');
    if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    const n = puz.n; const letters = puz.rows.join('');
    const inWord = new Set(); if (withAnswers) puz.words.forEach((w) => w.cells.forEach((i) => inWord.add(i)));
    const cellIn = Math.min(0.45, 7.2 / n);
    let g = '<table class="pws" style="--pc:' + cellIn + 'in">';
    for (let r = 0; r < n; r++) {
      g += '<tr>';
      for (let c = 0; c < n; c++) { const i = r * n + c; g += '<td' + (inWord.has(i) ? ' class="on"' : '') + '>' + letters[i] + '</td>'; }
      g += '</tr>';
    }
    g += '</table>';
    const pass = puz.passages && puz.passages.length ? '<p class="psub">Theme passages: ' + puz.passages.map(passStr).join('; ') + '</p>' : '';
    const list = puz.words.slice().sort((a, b) => a.a < b.a ? -1 : 1).map((w) => '<li><span class="box"></span><b>' + w.a + '</b> <i>' + esc(refStr(w.ref)) + '</i></li>').join('');
    root.innerHTML = '<h1>' + esc(puz.title) + (withAnswers ? ' – Answer key' : '') + '</h1><p class="psub">Give Me the Bible Word Search – King James Version – ' + esc(LEVELS[puz.level || 'hard'].name) + ' – ' + plural(puz.words.length, 'word') + '</p>' + pass + g +
      '<ol class="pwords">' + list + '</ol><p class="pcopy">© 2026 Poppy Egg Studio LLC. All rights reserved.</p>';
    setTimeout(doPrint, 60);
  }

  // ---------- the game ----------
  let game = null;
  VIEWS.puzzle = function (args) {
    if (game && game.puz.key === args.puz.key) { game.mount(); return; }
    if (game) game.stop();
    game = new Game(args.puz, args.save);
    game.mount();
  };

  function Game(puz, save) {
    this.puz = puz; const n = this.n = puz.n;
    this.letters = puz.rows.join('');
    puz.words.forEach((w) => { const [dr, dc] = WSEngine.DIRS[w.d]; w.cells = []; for (let k = 0; k < w.a.length; k++) w.cells.push((w.r + dr * k) * n + w.c + dc * k); });
    if (save) { this.found = save.found.slice(); this.secs = save.secs || 0; this.hints = save.hints || 0; this.color = save.color || settings.color; }
    else this.reset();
    this.done = this.found.length === puz.words.length;
    this.timer = null; this.drag = null; this.anchor = -1; this.flash = null; this.miss = null; this.pick = -1; this.cursor = -1;
    this.cellPx = store.get(zoomKey(), 0);
  }
  Game.prototype.reset = function () { this.found = []; this.secs = 0; this.hints = 0; this.color = settings.color; this.done = false; this.autoDone = false; this.anchor = -1; this.pick = -1; };
  Game.prototype.isFound = function (i) { return this.found.some((f) => f.i === i); };
  Game.prototype.mount = function () {
    const p = this.puz;
    const pass = p.passages && p.passages.length
      ? '<div class="passages"><span class="lab">Theme passages</span> ' + p.passages.map((x, i) => '<button class="ref" data-pass="' + i + '">' + esc(passStr(x)) + '</button>').join(' ') + '</div>'
      : '<div class="passages help">Words from across the Bible. Tap a reference to read its verse.</div>';
    screen.innerHTML = bar(p.title, p.sub, {
      back: true,
      subHtml: '<span id="timer" aria-label="Time played" style="font-variant-numeric:tabular-nums">' + fmtTime(this.secs) + '</span><span class="hide-narrow"> – ' + esc(p.sub) + '</span>',
      extra: '<button class="btn" data-act="hints" aria-haspopup="menu">' + I.hint + '<span class="lbl">Hints</span></button>' +
        '<button class="btn" data-act="more" aria-haspopup="menu" aria-label="Restart, auto-complete or print">' + I.more + '<span class="lbl">Puzzle</span></button>' +
        '<button class="btn" data-act="save" aria-label="Save for later">' + I.save + '<span class="lbl">Save for later</span></button>'
    }) +
      '<div class="ws">' +
      '<div class="boardwrap" id="bw"><div class="board" id="board"></div>' +
      '<div class="zoom"><button class="btn icon" id="zin" aria-label="Zoom in">' + I.plus + '</button><button class="btn icon" id="zout" aria-label="Zoom out">' + I.minus + '</button><button class="btn icon" id="zfit" aria-label="Fit the grid to the screen">' + I.fit + '</button></div></div>' +
      '<aside class="wpanel" id="wpanel">' +
      '<div class="wp-top"><div class="wcount" id="wcount" aria-live="polite"></div>' + pass + '</div>' +
      '<div class="wp-colors"><span class="lab">Highlighter</span>' + swatchHtml('hlsw', this.color) +
      '<label class="opt"><input type="checkbox" id="cyc"' + (settings.cycle ? ' checked' : '') + '> Next colour for each word</label></div>' +
      '<ul class="wlist" id="wlist"></ul>' +
      '</aside></div>';
    wireBar(() => { this.persist(); back(); });
    $('[data-act="hints"]').onclick = (e) => this.hintMenu(e.currentTarget);
    $('[data-act="more"]').onclick = (e) => this.moreMenu(e.currentTarget);
    $('[data-act="save"]').onclick = () => { this.persist(true); toast('Saved. Find it under Saved puzzles.'); home(); };
    $('#zin').onclick = () => this.zoom(1.15); $('#zout').onclick = () => this.zoom(1 / 1.15);
    $('#zfit').onclick = () => { this.cellPx = 0; store.del(zoomKey()); this.fitCells(); };
    $('#hlsw').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; this.setColor(b.dataset.c); };
    $('#cyc').onchange = (e) => { settings.cycle = e.target.checked; saveSettings(); };
    screen.querySelectorAll('[data-pass]').forEach((b) => (b.onclick = () => openPassage(p.passages[+b.dataset.pass])));
    $('#wlist').onclick = (e) => {
      const rb = e.target.closest('.ref'); if (rb) { showVerse(p.words[+rb.dataset.ref]); return; }
      const li = e.target.closest('[data-w]'); if (!li) return;
      const i = +li.dataset.w; this.pick = this.pick === i ? -1 : i; this.renderList();
    };
    this.buildBoard(); this.renderList();
    this.fitCells();
    this.start();
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = (e) => this.onKey(e);
    document.addEventListener('keydown', this.keyHandler);
    this.setupPointer();
  };
  Game.prototype.setColor = function (c) {
    this.color = c;
    const sw = $('#hlsw'); if (sw) sw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', x.dataset.c === c));
    this.draw();
  };
  Game.prototype.renderList = function () {
    const ul = $('#wlist'); if (!ul) return;
    const words = this.puz.words;
    const order = words.map((w, i) => i).sort((a, b) => words[a].a < words[b].a ? -1 : 1);
    ul.innerHTML = order.map((i) => {
      const w = words[i]; const f = this.found.find((x) => x.i === i);
      return '<li data-w="' + i + '" class="' + (f ? 'found' : '') + (i === this.pick ? ' picked' : '') + '">' +
        '<i class="dot" style="' + (f ? 'background:rgb(' + rgbOf(f.c).join(',') + ')' : '') + '"></i>' +
        '<button class="wbtn" aria-pressed="' + (i === this.pick) + '" aria-label="' + w.a + (f ? ', found' : '') + '"><b>' + w.a + '</b>' + (f && f.rev ? ' <small>(revealed)</small>' : '') + '</button>' +
        '<button class="ref" data-ref="' + i + '">' + esc(refStr(w.ref)) + '</button></li>';
    }).join('');
    const nf = this.found.length, nt = words.length;
    $('#wcount').innerHTML = '<b>' + nf + '</b> of ' + nt + ' words found' + (this.pick >= 0 && !this.isFound(this.pick) ? '<span class="help"> – Hints will help with ' + words[this.pick].a + '</span>' : '');
  };

  // ----- grid geometry: everything in whole device pixels -----
  // The canvas fills the board area; the grid is drawn at a whole-pixel offset with a thick outer border,
  // equal squares and equal 1-device-pixel lines, so it stays a perfect square at any display scaling.
  Game.prototype.buildBoard = function () {
    const b = $('#board');
    b.innerHTML = '<canvas id="grid" role="img" aria-label="Word search grid, ' + this.n + ' by ' + this.n + ' letters"></canvas>';
    this.cv = b.firstChild; this.ctx = this.cv.getContext('2d'); this.panX = 0; this.panY = 0;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.draw());
  };
  Game.prototype.geom = function () {
    const dpr = window.devicePixelRatio || 1;
    const cell = Math.max(10, Math.round(this.cellPx * dpr));
    const line = Math.max(1, Math.round(dpr));
    const border = Math.max(3, Math.round(4 * dpr));
    const pitch = cell + line;
    const size = 2 * border + this.n * cell + (this.n - 1) * line;
    return { dpr, cell, line, border, pitch, size };
  };
  Game.prototype.viewSize = function () {
    const dpr = window.devicePixelRatio || 1; const bw = $('#bw');
    return { vw: Math.floor(bw.clientWidth * dpr), vh: Math.floor(bw.clientHeight * dpr) };
  };
  // Grid above the word list (phones held upright): zoom buttons sit in a strip under the grid.
  const stackedLayout = () => window.matchMedia('(max-width: 860px)').matches && !window.matchMedia('(max-height: 520px) and (orientation: landscape)').matches;
  Game.prototype.fitCells = function () {
    const bw = $('#bw'); if (!bw) return;
    let px = this.cellPx;
    if (!px) {
      const narrow = stackedLayout(); // phones keep a strip below the grid for the zoom buttons
      const avail = Math.min(bw.clientWidth - (narrow ? 8 : 20), bw.clientHeight - (narrow ? 50 : 20)) - 8 - (this.n - 1);
      px = Math.floor(avail / this.n);
      px = Math.max(16, Math.min(60, px));
    }
    this.setCell(px, true);
  };
  Game.prototype.setCell = function (px, center) {
    px = Math.max(12, Math.min(90, Math.round(px)));
    const g0 = this.cv ? this.geom() : null;
    this.cellPx = px;
    if (g0 && !center) { // zoom around the middle of the view
      const v = this.viewSize(), g = this.geom();
      const cx = (v.vw / 2 - this.panX) / g0.size, cy = (v.vh / 2 - this.panY) / g0.size;
      this.panX = Math.round(v.vw / 2 - cx * g.size); this.panY = Math.round(v.vh / 2 - cy * g.size);
      this.clampPan();
    }
    if (center) this.centerGrid();
    this.draw();
  };
  Game.prototype.zoom = function (f) { this.setCell(this.cellPx * f); store.set(zoomKey(), this.cellPx); };
  Game.prototype.centerGrid = function () {
    const g = this.geom(), v = this.viewSize();
    const narrow = stackedLayout();
    this.panX = Math.round((v.vw - g.size) / 2); this.panY = narrow ? Math.round(4 * g.dpr) : Math.round((v.vh - g.size) / 2);
    this.clampPan();
  };
  Game.prototype.clampPan = function () {
    const g = this.geom(), v = this.viewSize(), m = Math.round((stackedLayout() ? 4 : 10) * g.dpr);
    if (g.size + 2 * m <= v.vw) this.panX = Math.round((v.vw - g.size) / 2); else this.panX = Math.min(m, Math.max(v.vw - g.size - m, this.panX));
    if (g.size + 2 * m <= v.vh) this.panY = stackedLayout() ? Math.round(4 * g.dpr) : Math.round((v.vh - g.size) / 2); else this.panY = Math.min(m, Math.max(v.vh - g.size - m, this.panY));
    this.panX = Math.round(this.panX); this.panY = Math.round(this.panY);
  };
  Game.prototype.snapCanvas = function () {
    const cv = this.cv, board = cv.parentNode; const dpr = window.devicePixelRatio || 1;
    board.style.left = '0px'; board.style.top = '0px';
    const r = cv.getBoundingClientRect();
    const fx = r.left * dpr - Math.round(r.left * dpr), fy = r.top * dpr - Math.round(r.top * dpr);
    if (Math.abs(fx) > 0.01) board.style.left = (-fx / dpr) + 'px';
    if (Math.abs(fy) > 0.01) board.style.top = (-fy / dpr) + 'px';
  };
  // Grid square under a screen point. clamp: snap to the nearest square when outside.
  Game.prototype.cellAtPoint = function (cx, cy, clamp) {
    const g = this.geom(); const r = this.cv.getBoundingClientRect();
    const x = (cx - r.left) * g.dpr - this.panX - g.border, y = (cy - r.top) * g.dpr - this.panY - g.border;
    let c = Math.floor(x / g.pitch), rr = Math.floor(y / g.pitch);
    if (!clamp && (c < 0 || rr < 0 || c >= this.n || rr >= this.n)) return -1;
    c = Math.max(0, Math.min(this.n - 1, c)); rr = Math.max(0, Math.min(this.n - 1, rr));
    return rr * this.n + c;
  };
  Game.prototype.draw = function () {
    if (!this.cv || !document.getElementById('grid')) return;
    const g = this.geom(), v = this.viewSize(), cv = this.cv, ctx = this.ctx, n = this.n;
    if (cv.width !== v.vw || cv.height !== v.vh) { cv.width = v.vw; cv.height = v.vh; }
    cv.style.width = (v.vw / g.dpr) + 'px'; cv.style.height = (v.vh / g.dpr) + 'px';
    this.snapCanvas();
    const dark = settings.theme === 'dark';
    const BORDER = dark ? '#C9A24A' : '#1C1D24', CELL = dark ? '#F4F1E6' : '#FFFFFF', LINE = dark ? '#CDC5AF' : '#D6D0BF', INK = '#1C1D24';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, v.vw, v.vh);
    const ox = this.panX, oy = this.panY, B = g.border, inner = g.size - 2 * B;
    ctx.fillStyle = BORDER; ctx.fillRect(ox, oy, g.size, g.size);                       // thick outer border
    ctx.fillStyle = CELL; ctx.fillRect(ox + B, oy + B, inner, inner);                     // playing area
    ctx.fillStyle = LINE;                                                                   // inner lines
    for (let i = 1; i < n; i++) { const p = B + i * g.pitch - g.line; ctx.fillRect(ox + p, oy + B, g.line, inner); ctx.fillRect(ox + B, oy + p, inner, g.line); }
    const mid = (i) => [ox + B + (i % n) * g.pitch + g.cell / 2, oy + B + Math.floor(i / n) * g.pitch + g.cell / 2];
    const capsule = (a, b, rgb, alpha, width) => {
      const [x1, y1] = mid(a), [x2, y2] = mid(b);
      ctx.strokeStyle = 'rgba(' + rgb.join(',') + ',' + alpha + ')'; ctx.lineWidth = g.cell * (width || 0.8); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 + (a === b ? 0.01 : 0), y2); ctx.stroke();
    };
    ctx.save(); ctx.beginPath(); ctx.rect(ox + B, oy + B, inner, inner); ctx.clip();      // highlights never cross the border
    for (const f of this.found) { const w = this.puz.words[f.i]; capsule(w.cells[0], w.cells[w.cells.length - 1], rgbOf(f.c), 0.62); }
    if (this.miss) capsule(this.miss[0], this.miss[1], [150, 150, 160], 0.35);
    if (this.drag) capsule(this.drag.a, this.drag.b, rgbOf(this.color), 0.5);
    else if (this.anchor >= 0) capsule(this.anchor, this.anchor, rgbOf(this.color), 0.6);
    if (this.flash) { // hint: ring around the first letter of a word
      const [x, y] = mid(this.flash.cell); ctx.strokeStyle = '#B8860B'; ctx.lineWidth = Math.max(2, Math.round(g.cell * 0.09));
      ctx.beginPath(); ctx.arc(x, y, g.cell * 0.46, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.cursor >= 0) { // keyboard cursor
      const x = ox + B + (this.cursor % n) * g.pitch, y = oy + B + Math.floor(this.cursor / n) * g.pitch, t = Math.max(2, Math.round(2 * g.dpr));
      ctx.strokeStyle = '#2F4F86'; ctx.lineWidth = t; ctx.strokeRect(x + t / 2, y + t / 2, g.cell - t, g.cell - t);
    }
    ctx.restore();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(g.cell * 0.56) + 'px Atkinson, sans-serif';
    for (let i = 0; i < n * n; i++) {
      const [x, y] = mid(i);
      if (x < -g.cell || y < -g.cell || x > v.vw + g.cell || y > v.vh + g.cell) continue;
      ctx.fillText(this.letters[i], x, y + g.cell * 0.04);
    }
  };

  // ----- finding words -----
  // One finger or the mouse: drag across a word (or tap its first and last letter).
  // Two fingers: move and pinch-zoom the grid. Mouse wheel scrolls a zoomed grid; Ctrl + wheel zooms.
  Game.prototype.setupPointer = function () {
    const cv = this.cv; const pts = new Map(); let pinch = null, panStart = null;
    const snapEnd = (a, b) => {
      const n = this.n, ar = Math.floor(a / n), ac = a % n; let br = Math.floor(b / n), bc = b % n;
      const dr = br - ar, dc = bc - ac, len = Math.max(Math.abs(dr), Math.abs(dc));
      if (!len) return a;
      const sr = Math.round(dr / len), sc = Math.round(dc / len);
      let k = len; while (k > 0 && (ar + sr * k < 0 || ar + sr * k >= n || ac + sc * k < 0 || ac + sc * k >= n)) k--;
      return (ar + sr * k) * n + ac + sc * k;
    };
    cv.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        const i = this.cellAtPoint(e.clientX, e.clientY, false);
        this.cursor = -1;
        if (i >= 0 && !this.done) { this.drag = { a: i, b: i, moved: false }; this.draw(); }
        else panStart = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
      }
      if (pts.size === 2) { // second finger: stop selecting, start pinch/move
        this.drag = null; panStart = null;
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), c: this.cellPx, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, px: this.panX, py: this.panY };
        this.draw();
      }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dpr = window.devicePixelRatio || 1;
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.d > 0) this.setCell(pinch.c * d / pinch.d);
        this.panX = Math.round(this.panX + (((a.x + b.x) / 2) - pinch.mx) * dpr); this.panY = Math.round(this.panY + (((a.y + b.y) / 2) - pinch.my) * dpr);
        pinch.mx = (a.x + b.x) / 2; pinch.my = (a.y + b.y) / 2; this.clampPan(); this.draw(); return;
      }
      if (panStart) { this.panX = Math.round(panStart.px + (e.clientX - panStart.x) * dpr); this.panY = Math.round(panStart.py + (e.clientY - panStart.y) * dpr); this.clampPan(); this.draw(); return; }
      if (!this.drag) return;
      const i = this.cellAtPoint(e.clientX, e.clientY, true);
      const b = snapEnd(this.drag.a, i);
      if (b !== this.drag.b) { this.drag.b = b; this.drag.moved = true; this.draw(); }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pinch) { if (pts.size < 2) { pinch = null; store.set(zoomKey(), this.cellPx); } return; }
      panStart = null;
      const d = this.drag; this.drag = null;
      if (!d || e.type === 'pointercancel') { this.draw(); return; }
      if (d.a === d.b && !d.moved) this.tap(d.a);
      else if (d.a !== d.b) { this.anchor = -1; this.tryWord(d.a, d.b); }
      else this.draw();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) { this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); return; }
      const dpr = window.devicePixelRatio || 1;
      this.panX = Math.round(this.panX - (e.shiftKey ? e.deltaY : e.deltaX) * dpr); this.panY = Math.round(this.panY - (e.shiftKey ? 0 : e.deltaY) * dpr);
      this.clampPan(); this.draw();
    }, { passive: false });
  };
  // Tap the first letter, then the last letter.
  Game.prototype.tap = function (i) {
    if (this.done) return;
    if (this.anchor < 0) { this.anchor = i; this.draw(); return; }
    if (this.anchor === i) { this.anchor = -1; this.draw(); return; }
    const a = this.anchor, n = this.n, dr = Math.floor(i / n) - Math.floor(a / n), dc = i % n - a % n;
    if (dr && dc && Math.abs(dr) !== Math.abs(dc)) { this.anchor = i; this.draw(); return; } // not in a line: start again here
    this.anchor = -1; this.tryWord(a, i);
  };
  Game.prototype.tryWord = function (a, b) {
    const words = this.puz.words;
    const hit = words.findIndex((w, i) => !this.isFound(i) && ((w.cells[0] === a && w.cells[w.cells.length - 1] === b) || (w.cells[0] === b && w.cells[w.cells.length - 1] === a)));
    if (hit < 0) {
      this.miss = [a, b]; this.draw();
      clearTimeout(this.missT); this.missT = setTimeout(() => { this.miss = null; this.draw(); }, 450);
      return;
    }
    this.markFound(hit, false);
  };
  Game.prototype.markFound = function (i, revealed) {
    const f = { i, c: this.color }; if (revealed) f.rev = 1;
    this.found.push(f);
    if (this.flash && this.flash.word === i) this.flash = null;
    if (this.pick === i) this.pick = -1;
    if (settings.cycle) { const k = HL_COLORS.findIndex((x) => x[0] === this.color); this.setColor(HL_COLORS[(k + 1) % HL_COLORS.length][0]); }
    this.draw(); this.renderList(); this.persist();
    const li = document.querySelector('#wlist [data-w="' + i + '"]'); if (li) { li.classList.add('pop-in'); }
    if (!revealed) toast(this.puz.words[i].a + ' – ' + refStr(this.puz.words[i].ref));
    if (this.found.length === this.puz.words.length) this.finish();
  };
  Game.prototype.target = function () {
    const words = this.puz.words;
    if (this.pick >= 0 && !this.isFound(this.pick)) return this.pick;
    const left = words.map((w, i) => i).filter((i) => !this.isFound(i));
    return left.length ? left[Math.floor(Math.random() * left.length)] : -1;
  };
  Game.prototype.hintMenu = function (anchor) {
    menu(anchor, [
      ['Show where a word starts', () => {
        if (this.done) return; const i = this.target(); if (i < 0) return;
        this.hints++; this.flash = { cell: this.puz.words[i].cells[0], word: i }; this.pick = i; this.renderList(); this.draw(); this.persist();
        toast(this.puz.words[i].a + ' starts at the circled letter.');
        clearTimeout(this.flashT); this.flashT = setTimeout(() => { this.flash = null; this.draw(); }, 6000);
      }],
      ['Reveal a word', () => { if (this.done) return; const i = this.target(); if (i < 0) return; this.hints++; this.markFound(i, true); toast(this.puz.words[i].a + ' is now highlighted.'); }],
      '-',
      ['Tip: tap a word in the list first to get a hint for that word', () => {}]
    ]);
  };
  Game.prototype.moreMenu = function (anchor) {
    menu(anchor, [
      ['Restart this puzzle', () => confirmBox('Restart this puzzle?', 'Found words, hints and the timer start over.', 'Restart puzzle', () => { this.reset(); this.mount(); this.persist(); toast('Puzzle restarted'); })],
      ['Auto-complete this puzzle', () => confirmBox('Auto-complete this puzzle?', 'Every word will be highlighted. It is added to your completed record marked “Auto-completed”.', 'Auto-complete', () => {
        this.autoDone = true; const words = this.puz.words;
        words.forEach((w, i) => { if (!this.isFound(i)) this.found.push({ i, c: 'gray', rev: 1 }); });
        this.draw(); this.renderList(); this.finish(); })],
      '-',
      ['Print this puzzle', () => printPuzzle(this.puz, false)],
      ['Print the answer key', () => printPuzzle(this.puz, true)]
    ]);
  };
  Game.prototype.onKey = function (e) {
    if (modalRoot.children.length || !document.getElementById('grid')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) && e.key !== 'Escape') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = this.n; const k = e.key;
    const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k];
    if (mv) {
      e.preventDefault(); if (this.cursor < 0) this.cursor = this.anchor >= 0 ? this.anchor : 0;
      const r = Math.max(0, Math.min(n - 1, Math.floor(this.cursor / n) + mv[0])), c = Math.max(0, Math.min(n - 1, this.cursor % n + mv[1]));
      this.cursor = r * n + c; this.draw(); return;
    }
    if ((k === 'Enter' || k === ' ') && this.cursor >= 0) { e.preventDefault(); this.tap(this.cursor); return; }
    if (k === 'Escape') { this.anchor = -1; this.cursor = -1; closePops(); this.draw(); }
  };
  Game.prototype.persist = function (force) {
    if (this.done) return;
    const s = { key: this.puz.key, title: this.puz.title, sub: this.puz.sub, sig: sig(this.puz), found: this.found, secs: this.secs, hints: this.hints, color: this.color, pct: this.found.length / this.puz.words.length, updated: Date.now() };
    if (this.puz.random) s.puz = stripPuz(this.puz);
    putSave(s);
  };
  function zoomKey() { return 'zoom.' + (window.innerWidth < 700 ? 'm' : 'd'); }
  function stripPuz(p) { return { key: p.key, title: p.title, sub: p.sub, level: p.level, random: true, n: p.n, rows: p.rows, passages: p.passages, words: p.words.map((w) => ({ a: w.a, r: w.r, c: w.c, d: w.d, ref: w.ref })) }; }
  Game.prototype.start = function () {
    this.stop();
    if (this.done) return;
    this.timer = setInterval(() => {
      if (document.hidden || modalRoot.children.length) return;
      this.secs++; const t = $('#timer'); if (t) t.textContent = fmtTime(this.secs);
      if (this.secs % 15 === 0) this.persist();
    }, 1000);
  };
  Game.prototype.stop = function () { if (this.timer) clearInterval(this.timer); this.timer = null; };
  Game.prototype.finish = function () {
    if (this.done) return;
    this.done = true; this.stop(); this.anchor = -1; this.flash = null;
    dropSave(this.puz.key);
    const rec = records();
    rec.push({ key: this.puz.key, title: this.puz.title, level: this.puz.level, words: this.puz.words.length, date: Date.now(), secs: this.secs, hints: this.hints, auto: !!this.autoDone });
    store.set('done', rec);
    this.draw();
    const m = /^p(\d+)([emh])$/.exec(this.puz.key);
    const lv = this.puz.level;
    const nextP = m ? PUZ.find((p) => p.id === +m[1] + 1) : null;
    modal('<h2>' + (this.autoDone ? 'Puzzle auto-completed' : 'Well done!') + '</h2>' +
      (this.autoDone ? '<p>All the words are highlighted. <b>' + esc(this.puz.title) + '</b> is in your completed record, marked “Auto-completed”.</p>' :
        '<p>You found all ' + this.puz.words.length + ' words in <b>' + esc(this.puz.title) + '</b> in ' + fmtTime(this.secs) + (this.hints ? ' using ' + plural(this.hints, 'hint') : ' without any hints') + '.</p>' +
        '<p class="scripture" style="font-size:1.1em">“And ye shall seek me, and find me, when ye shall search for me with all your heart.” <span style="font-family:var(--sans);font-size:.75em;color:var(--rubric)">Jeremiah 29:13</span></p>') +
      '<div class="actions"><button class="btn" data-close>Look at the grid</button><button class="btn" data-lib>Puzzle library</button>' +
      (nextP ? '<button class="btn primary" data-next>Next puzzle</button>' : '<button class="btn primary" data-rand>Another random puzzle</button>') + '</div>',
    (sc, close) => {
      sc.querySelector('[data-lib]').onclick = () => { close(); home(); go('library'); };
      const nx = sc.querySelector('[data-next]'); if (nx) nx.onclick = () => { close(); openPremade(nextP.id, lv); };
      const r = sc.querySelector('[data-rand]'); if (r) r.onclick = () => { close(); go('random'); };
    });
  };

  // Android hardware back button support
  window.onAndroidBack = function () {
    if (document.querySelector('.pop')) { closePops(); return true; }
    if (modalRoot.children.length) { modalRoot.lastChild.remove(); return true; }
    if (current && current.view !== 'title') { if (game && current.view === 'puzzle') game.persist(); back(); return true; }
    exitApp(); return true;
  };
  window.onAndroidPause = function () { if (game && !game.done) game.persist(); };
  window.onAndroidResume = function () {};
  window.addEventListener('beforeunload', () => { if (game && !game.done) game.persist(); });
  window.addEventListener('resize', () => { if (game && current && current.view === 'puzzle' && document.getElementById('grid')) { if (!store.get(zoomKey(), 0)) { game.cellPx = 0; game.fitCells(); } else { game.clampPan(); game.draw(); } } });

  // ---------- start screen (Poppy Egg Studio presents) ----------
  // Shown once each time the app opens; tap, click or press a key to skip.
  function startScreen(done) {
    const el = document.createElement('div'); el.className = 'start'; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.setAttribute('aria-label', 'Poppy Egg Studio presents. Tap to start.');
    el.innerHTML = '<picture><source media="(max-aspect-ratio: 1/1)" srcset="img/poppyegg-start-tall.png">' +
      '<img src="img/poppyegg-start-wide.png" alt=""></picture>';
    document.body.appendChild(el); el.focus();
    let gone = false;
    const finish = () => {
      if (gone) return; gone = true; clearTimeout(timer); document.removeEventListener('keydown', onKey, true);
      done(); el.classList.add('out'); setTimeout(() => el.remove(), 450);
    };
    const onKey = (e) => { e.preventDefault(); finish(); };
    const timer = setTimeout(finish, 3000);
    el.addEventListener('click', finish); document.addEventListener('keydown', onKey, true);
  }

  // boot
  go('title', {}, true);
  if (!/[?&]nostart\b/.test(location.search)) startScreen(() => { const b = document.querySelector('.menu-list .btn'); if (b) b.focus({ preventScroll: true }); });
  setTimeout(() => loadKJV().catch(() => {}), 600);
  window.__ws = { go, get settings() { return settings; }, get game() { return game; }, switchProfile, printPuzzle, openPremade, makeRandom };
})();
