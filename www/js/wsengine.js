/* Give Me the Bible Word Search — word selection and square-grid building.
   Runs in the browser (window.WSEngine) and in Node (module.exports). Needs CWEngine (engine.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.WSEngine = factory(root.CWEngine);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  // Words kept out of puzzles for a family-friendly game (they still appear in the Bible reader).
  const AVOID = new Set(('whore whores whoredom whoredoms whoring whorish whoremonger whoremongers bastard bastards piss pisseth ' +
    'sodomite sodomites harlotry concubine concubines lust lusts lusted lusteth adultery adulteress adulterer adulterers adulteries ' +
    'fornication fornicator fornicators foreskin foreskins teats menstruous rape raped ravished uncircumcised circumcised circumcise breasts breast ' +
    'naked nakedness dung urine stink stinketh vomit womb wombs loins thigh thighs kill killed slay slain slew murder murderer ass asses harlot harlots ' +
    'bowels issue flux leper lepers leprosy hanged gallows').split(/\s+/));
  // Ordinary words that make weak search words.
  const WEAK = new Set(('the and his her she but thy thee thou was are had him for not you our its were then lest unto that this with from them they ' +
    'have hath shall which there their into when what who whom whose upon also than these those been did doth didst hast art ' +
    'unto all one two three four five six seven eight nine ten twenty thirty forty fifty hundred thousand thousands hundreds ' +
    'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth year years month months ' +
    'men man thing things time times place places side round about every according likewise nevertheless however ' +
    'wherefore therefore saying said saith spake spoken answered behold also again because before after should would could ' +
    'shalt wilt hast hadst dost doest didst canst mayest art wast wert let made make maketh came come cometh went goeth gone ' +
    'took taken given gave give brought bring set sent put told heard hear seen saw see know knew known called found ' +
    'among within without upon thereof whereof herein therein hither thither whither thence hence yea nay verily surely ' +
    'great little much many more most none any some such other another each every same own very also even only ' +
    'good evil right left like unto mine thine shew shewed day days night nights hand hands head eyes eye face ' +
    'eat ate eaten drink sort keep kept choose chosen build built spread together former latter end ends power cause sweet sir hour ' +
    'estate appointed understood declared formed dried shined spring sevens yielding thereupon whatsoever lord god ' +
    'kind help dry divide living hundredth serve intreat houses command observe die well send work walk sake warm understand ' +
    'ground thick secret sight gods fat meat male female lie dead whole rest gone flesh need sore cast cut fall ' +
    'answering besought straightway fell nigh led seeing knowing whereunto manner concerning once able enter here making open ones ' +
    'fourteen pieces holds edge villages afterward easier thought apart pay rise think write please present begat died bare ' +
    'sixty seventy eighty ninety seventeenth threescore fourscore score order hurt loud standing fine top look true low long old new ' +
    'sides spare written writing mark young upward throughout thousands generations').split(/\s+/));
  const isArchaicVerb = (w) => w.length > 4 && /(eth|est|edst)$/.test(w);

  function resolveScope(bible, theme) {
    if (theme._pool) return theme._pool;
    let pool;
    if (theme.ids) pool = theme.ids.slice().sort((a, b) => a - b);
    else if (theme.scope) {
      const sc = theme.scope.map((s) => [bible.lookup[s[0].toLowerCase()], s[1], s[2]]);
      sc.forEach((s, i) => { if (s[0] === undefined) throw new Error('bad scope book ' + theme.scope[i][0]); });
      pool = E.versePoolFromScope(bible, sc);
      if (theme.kw) { const kp = new Set(E.versePoolFromKeywords(bible, theme.kw)); pool = pool.filter((id) => kp.has(id)); }
    } else if (theme.kw || theme.list) pool = E.versePoolFromKeywords(bible, theme.kw || theme.list);
    else { pool = []; for (let i = 0; i < bible.N; i++) pool.push(i); }
    Object.defineProperty(theme, '_pool', { value: pool, enumerable: false, writable: true });
    return pool;
  }

  // Simple stem so LAMB / LAMBS and BLESS / BLESSED are not both chosen.
  function stem(w) {
    w = w.toLowerCase();
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /ey$/.test(w)) return w.slice(0, -2) + 'y';
    if (w.length > 5 && /(ing|eth|est)$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /(ed|es)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  // Words that stand out in a set of verses. minCount: times a word must occur there.
  function scorePool(bible, pool, minCount) {
    const ix = bible.index(); const counts = new Map(); const RE = /[A-Za-z]+/g;
    for (const id of pool) {
      const t = bible.text[id]; RE.lastIndex = 0; let m; const seen = new Set();
      while ((m = RE.exec(t))) {
        if (m.index > 0 && (t[m.index - 1] === '\u2019' || t[m.index - 1] === "'")) continue;
        const lw = m[0].toLowerCase(); if (seen.has(lw)) continue; seen.add(lw);
        counts.set(lw, (counts.get(lw) || 0) + 1);
      }
    }
    const N = bible.N; const out = [];
    counts.forEach((cnt, w) => {
      if (cnt < minCount || w.length < 3 || w.length > 15) return;
      if (WEAK.has(w) || E.STOP.has(w) || AVOID.has(w) || isArchaicVerb(w)) return;
      const df = ix.post.get(w).length, proper = bible.isProper(w);
      if (!proper && /(ed|ly)$/.test(w) && w.length > 4) return;      // past tenses and adverbs make dull search words
      if (!proper && df > 450) return;                                // everyday words found everywhere
      let sc = Math.min(cnt, 12) * Math.log(N / df);
      if (proper) sc *= 1.5;
      if (w.length >= 4 && w.length <= 10) sc *= 1.15;
      out.push({ w, score: sc, proper, share: cnt / df });
    });
    out.sort((a, b) => b.score - a.score);
    return out;
  }
  const wordRe = (w) => new RegExp('(^|[^A-Za-z])' + w + '(?![A-Za-z])', 'i');

  // Earliest verse in `ids` whose text contains the whole word.
  function verseWith(bible, ids, w) {
    const re = wordRe(w);
    for (const id of ids) if (re.test(bible.text[id])) return id;
    return -1;
  }

  let curatedCache = null;
  function prepareCurated(bible, lines) {
    if (curatedCache && curatedCache.bible === bible) return curatedCache.list;
    const out = [];
    (lines || []).forEach((line) => {
      const p = line.split('|'); if (p.length < 3) return;
      const a = p[0].toUpperCase();
      if (!/^[A-Z]+$/.test(a)) return;              // single words only
      const ref = bible.parseRef(p[2]); if (!ref) return;
      const ids = []; for (let v = ref.v; v <= ref.v2; v++) ids.push(bible.id(ref.b, ref.c, v));
      out.push({ a, ids });
    });
    curatedCache = { bible, list: out };
    return out;
  }

  /* Choose `count` words for a theme. Each word comes with the verse it is found in.
     opts: {rng, maxLen, minLen, curated (prepared), ban:Set of upper-case words to avoid} */
  function selectWords(bible, theme, count, opts) {
    const rng = opts.rng || Math.random; const maxLen = opts.maxLen || 13, minLen = opts.minLen || 3;
    const pool = resolveScope(bible, theme); const poolSet = new Set(pool);
    const ix = bible.index();
    const cands = new Map(); // A -> {a, pri, id}
    const add = (w, pri, prefIds) => {
      const lw = w.toLowerCase(); const A = lw.toUpperCase();
      if (!/^[a-z]+$/.test(lw) || lw.length < minLen || lw.length > maxLen) return;
      if (AVOID.has(lw) || (opts.ban && opts.ban.has(A))) return;
      if (!ix.post.has(lw)) return;
      let id = -1;
      if (prefIds) id = verseWith(bible, prefIds, lw);
      if (id < 0) id = verseWith(bible, (ix.post.get(lw) || []).filter((x) => poolSet.has(x)), lw);
      if (id < 0 && (theme.list || theme.kw || theme.whole)) id = verseWith(bible, ix.post.get(lw) || [], lw);
      if (id < 0) return;
      const ex = cands.get(A);
      if (!ex || ex.pri < pri) cands.set(A, { a: A, pri, id });
    };
    const isKw = !!(theme.kw && !theme.scope && !theme.list);
    const singular = (lw) => stem(lw) === lw ? 0.9 : 0;
    // 1. The theme's own word list (topical themes)
    if (theme.list) theme.list.forEach((w) => add(w, 4 + singular(w.toLowerCase()) + rng() * 2));
    if (theme.kw && !theme.scope) theme.kw.forEach((w) => add(w, 4.5 + singular(w.toLowerCase()) + rng()));
    if (theme.more) theme.more.forEach((w) => add(w, 3.6 + singular(w.toLowerCase()) + rng() * 2.4));
    // 2. Hand-picked names and key words whose verse lies in the theme
    const cur = opts.curated || [];
    cur.forEach((c) => {
      if (theme.whole) add(c.a, 2.5 + rng() * 2.2, c.ids);
      else if (theme.list || isKw) { if (c.ids.every((id) => poolSet.has(id))) add(c.a, 1.2 + rng() * 1.5, c.ids); }
      else if (c.ids.some((id) => poolSet.has(id))) add(c.a, 3 + rng() * 2.2, c.ids);
    });
    // 3. Words that stand out in the theme's passages
    if (!theme.whole || !cur.length) {
      const sw = scorePool(bible, pool, theme.ids ? 1 : isKw || theme.list ? 3 : 2).slice(0, 220);  // highlighted verses: a word needs to appear only once
      const top = sw.length ? sw[0].score : 1;
      sw.forEach((x, i) => {
        if ((isKw || theme.list) && x.proper) return;   // names in topical themes come from the hand-picked list
        // In topic themes, prefer words that mostly occur in the topic's verses.
        const focus = isKw ? (x.share >= 0.12 ? 0 : x.share >= 0.05 ? -1.6 : -3.2) : 0;
        add(x.w, focus + (theme.list ? 0.5 : isKw ? 2 : 1.2) + 2 * (x.score / top) + (x.proper ? 0.5 : 0) + rng() * 1.2 - i * 0.004);
      });
    }
    const list = Array.from(cands.values()).sort((a, b) => b.pri - a.pri);
    // Pick, avoiding words that share a stem or contain one another.
    const out = []; const stems = new Set();
    for (const c of list) {
      if (out.length >= count) break;
      const s = stem(c.a);
      if (stems.has(s)) continue;
      const rev = c.a.split('').reverse().join('');
      if (out.some((o) => o.a.indexOf(c.a) >= 0 || c.a.indexOf(o.a) >= 0 || o.a.indexOf(rev) >= 0 || rev.indexOf(o.a) >= 0)) continue;
      stems.add(s); out.push(c);
    }
    return out.map((c) => ({ a: c.a, ref: [bible.vb[c.id], bible.vc[c.id], bible.vv[c.id]] }));
  }

  // Directions: 0 →, 1 ↓, 2 ↘, 3 ↗, 4 ←, 5 ↑, 6 ↖, 7 ↙
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const LEVELS = { easy: [0, 1], medium: [0, 1, 2, 3], hard: [0, 1, 2, 3, 4, 5, 6, 7] };
  // Filler letters roughly follow English/KJV letter frequency (no Q, X, Z, J so stray letters look natural).
  const FILL = 'EEEEEEEEEEETTTTTTTTAAAAAAAAHHHHHHHOOOOOOOONNNNNNNSSSSSSIIIIIIRRRRRRDDDDDLLLLLUUUUFFFMMMWWWYYGGCCBBPPVK';

  // Size a square grid for a word list.
  function gridSizeFor(words) {
    const letters = words.reduce((s, w) => s + w.length, 0), longest = words.reduce((m, w) => Math.max(m, w.length), 0);
    return Math.max(longest, 8, Math.min(24, Math.ceil(Math.sqrt(letters * 1.75))));
  }

  /* Place every word in an N×N grid. words: array of upper-case strings. Returns {n, rows, place:[[i,r,c,d]]} or null. */
  function buildGrid(words, n, level, rng) {
    const dirs = LEVELS[level] || LEVELS.hard;
    const order = words.map((w, i) => i).sort((a, b) => words[b].length - words[a].length || rng() - 0.5);
    for (let attempt = 0; attempt < 60; attempt++) {
      const g = new Array(n * n).fill(''); const place = new Array(words.length);
      const dirUse = new Array(8).fill(0);
      let ok = true;
      for (const wi of order) {
        const w = words[wi]; const opts = [];
        for (const d of dirs) {
          const [dr, dc] = DIRS[d];
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
            if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
            let cross = 0, bad = false;
            for (let k = 0; k < w.length; k++) {
              const ch = g[(r + dr * k) * n + c + dc * k];
              if (ch) { if (ch !== w[k]) { bad = true; break; } cross++; }
            }
            if (bad || cross === w.length) continue;
            // Prefer some crossings, spread directions, and a little randomness.
            opts.push({ r, c, d, s: Math.min(cross, 2) * 1.2 - dirUse[d] * 0.35 + rng() * 2.2 });
          }
        }
        if (!opts.length) { ok = false; break; }
        let best = opts[0]; for (const o of opts) if (o.s > best.s) best = o;
        const [dr, dc] = DIRS[best.d];
        for (let k = 0; k < w.length; k++) g[(best.r + dr * k) * n + best.c + dc * k] = w[k];
        place[wi] = [wi, best.r, best.c, best.d]; dirUse[best.d]++;
      }
      if (!ok) continue;
      if (!fillGrid(g, n, words, place, rng)) continue;
      const rows = []; for (let r = 0; r < n; r++) rows.push(g.slice(r * n, r * n + n).join(''));
      return { n, rows, place };
    }
    return null;
  }

  // Count where a word can be read in the grid (all 8 directions).
  function occurrences(g, n, w) {
    const hits = [];
    for (let d = 0; d < 8; d++) {
      const [dr, dc] = DIRS[d];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const er = r + dr * (w.length - 1), ec = c + dc * (w.length - 1);
        if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
        let k = 0; while (k < w.length && g[(r + dr * k) * n + c + dc * k] === w[k]) k++;
        if (k === w.length) hits.push([r, c, d]);
      }
    }
    return hits;
  }
  // A palindrome is read once forwards and once backwards along the same cells; count those as one.
  function distinct(hits, w) {
    if (w !== w.split('').reverse().join('')) return hits.length;
    return Math.ceil(hits.length / 2);
  }

  // Fill empty squares so each listed word appears exactly once.
  function fillGrid(g, n, words, place, rng) {
    const fixed = new Array(n * n).fill(false);
    place.forEach(([wi, r, c, d]) => { const [dr, dc] = DIRS[d]; for (let k = 0; k < words[wi].length; k++) fixed[(r + dr * k) * n + c + dc * k] = true; });
    for (let i = 0; i < g.length; i++) if (!g[i]) g[i] = FILL[Math.floor(rng() * FILL.length)];
    for (let round = 0; round < 40; round++) {
      let dup = false;
      for (let wi = 0; wi < words.length; wi++) {
        const w = words[wi]; const hits = occurrences(g, n, w);
        if (distinct(hits, w) <= 1) continue;
        dup = true;
        const [, pr, pc, pd] = place[wi];
        hits.forEach(([r, c, d]) => {
          if (r === pr && c === pc && d === pd) return;
          const [dr, dc] = DIRS[d]; const free = [];
          for (let k = 0; k < w.length; k++) { const i = (r + dr * k) * n + c + dc * k; if (!fixed[i]) free.push(i); }
          if (free.length) { const i = free[Math.floor(rng() * free.length)]; g[i] = FILL[Math.floor(rng() * FILL.length)]; }
        });
      }
      if (!dup) return true;
    }
    return false;
  }

  /* Make a whole puzzle. opts: {seed, count, level, maxLen, curated, n (optional fixed size), ban} */
  function makePuzzle(bible, theme, opts) {
    const rng = E.RNG(opts.seed >>> 0);
    const words = selectWords(bible, theme, opts.count, { rng, maxLen: opts.maxLen || (opts.n || 15), curated: opts.curated, ban: opts.ban });
    if (words.length < Math.min(opts.count, opts.minCount || opts.count)) return null;
    let n = opts.n || gridSizeFor(words.map((w) => w.a));
    for (let grow = 0; grow < 6; grow++) {
      const g = buildGrid(words.map((w) => w.a), n, opts.level || 'hard', rng);
      if (g) return { n: g.n, rows: g.rows, words: g.place.map(([wi, r, c, d]) => ({ a: words[wi].a, r, c, d, ref: words[wi].ref })) };
      if (opts.n && grow === 0 && !opts.allowGrow) return null;
      n++;
    }
    return null;
  }

  return { DIRS, LEVELS, AVOID, resolveScope, prepareCurated, selectWords, gridSizeFor, buildGrid, occurrences, distinct, makePuzzle, stem };
});
