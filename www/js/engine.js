/* Bible Crosswords engine: KJV indexing, clue making and freeform grid building.
   Runs in the browser (window.CWEngine) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CWEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Words that make poor crossword answers (function words and archaic helpers).
  const STOP = new Set((
    'the and of that unto shall he his they them with for not all which was were thou thee thy thine ye said have ' +
    'hath from this their him her upon are when there then but also into out will one even let came come what because ' +
    'before did had those these who whom whose may might an by as it is be in on at so to my me we us our no nor or if ' +
    'art wilt shalt doth didst hast hadst saith thereof therefore wherefore whereas hither thither every any some such ' +
    'than own more most very how where why yet now again after about over under among against through until till while ' +
    'being been made make went go gone according behold thus like up down she its itself himself herself themselves ' +
    'yourselves ourselves myself thyself mine none other others another same both each either neither shalt canst ' +
    'couldest wouldest shouldest mayest dost hadst wast wert would could should must can cannot do does done doing ' +
    'say says saying spake speak spoken speaketh unto also whither whence wherein whereby wherewith herein thereby ' +
    'therein thereto thereon therewith hereafter heretofore lest though although whether because till unto ' +
    'which wherein shall shouldest were thereunto mayest an nay yea verily surely lo oh o ah alas also ' +
    'took take taken taketh gave give given giveth set sent put brought bring bringeth told tell went goeth cometh ' +
    'came comest seen see seeth saw hear heard heareth know knew known knoweth called call calleth found find ' +
    'things thing many much great little whole half part away forth back off far near never ever always often ' +
    'seemed seem seemeth found way ways having hast hath hadst ' +
    'above across along amid around below beneath beside besides between beyond during except inside onto outside past ' +
    'round since toward towards underneath within without get got gotten held hold holdeth else few less least only ' +
    'whatsoever whosoever whoso whereupon thereupon howbeit notwithstanding moreover furthermore likewise otherwise ' +
    'certain ever two three upon unto thence hence whereof whereto wherewithal therewith hereby thyself yourselves ' +
    'went goest gone going came coming comest cometh become became becometh done doeth didst made maketh makest ' +
    'stood stand standeth sat sit sitteth lay laid lie lieth rose arose turned turn returned return gave giveth ' +
    'shew shewed sheweth spoken spake speaketh answered answer answereth asked ask asketh began begin ' +
    'used use uses using whom whoever wherever whatever came neither either rather already also among amongst ' +
    'thus yea nay therefore hereof thereof aught naught anything nothing something everything another unto ' +
    'side till sore much bring brought taketh tooke your yours ours theirs hers fro thereat whereat').split(/\s+/));

  function RNG(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  const WORD_RE = /[A-Za-z]+/g;

  // ---------- Bible model ----------
  function Bible(names, books) {
    this.names = names; this.books = books;
    this.vb = []; this.vc = []; this.vv = []; this.text = [];
    this.bookStart = []; this.chapStart = [];
    const lower = {};
    names.forEach((n, i) => { lower[n.toLowerCase()] = i; });
    // Common alternates used in references
    lower['psalm'] = lower['psalms']; lower['song of songs'] = lower['song of solomon'];
    this.lookup = lower;
    let id = 0;
    for (let b = 0; b < books.length; b++) {
      this.bookStart.push(id); this.chapStart.push([]);
      for (let c = 0; c < books[b].length; c++) {
        this.chapStart[b].push(id);
        for (let v = 0; v < books[b][c].length; v++) {
          this.vb.push(b); this.vc.push(c + 1); this.vv.push(v + 1); this.text.push(books[b][c][v]); id++;
        }
      }
    }
    this.N = id;
    this._index = null;
  }
  Bible.prototype.id = function (b, c, v) {
    const cs = this.chapStart[b]; if (!cs || c < 1 || c > cs.length) return -1;
    if (v < 1 || v > this.books[b][c - 1].length) return -1;
    return cs[c - 1] + v - 1;
  };
  Bible.prototype.chapterRange = function (b, c1, c2) {
    const start = this.chapStart[b][c1 - 1];
    const last = this.books[b][c2 - 1].length;
    return [start, this.chapStart[b][c2 - 1] + last - 1];
  };
  // "1 Samuel 17:4-5" -> {b,c,v,v2}
  Bible.prototype.parseRef = function (s) {
    const m = /^\s*(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(s);
    if (!m) return null;
    const b = this.lookup[m[1].toLowerCase()];
    if (b === undefined) return null;
    const c = +m[2], v = +m[3], v2 = m[4] ? +m[4] : v;
    if (this.id(b, c, v) < 0 || this.id(b, c, v2) < 0 || v2 < v) return null;
    return { b: b, c: c, v: v, v2: v2 };
  };
  Bible.prototype.refText = function (r) {
    return this.names[r.b] + ' ' + r.c + ':' + r.v + (r.v2 && r.v2 !== r.v ? '-' + r.v2 : '');
  };
  Bible.prototype.refOf = function (id) { return { b: this.vb[id], c: this.vc[id], v: this.vv[id], v2: this.vv[id] }; };
  Bible.prototype.passage = function (r) {
    const out = [];
    for (let v = r.v; v <= (r.v2 || r.v); v++) out.push(this.books[r.b][r.c - 1][v - 1]);
    return out.join(' ');
  };

  // Global word index (built lazily): word -> verse ids; proper-noun detection.
  Bible.prototype.index = function () {
    if (this._index) return this._index;
    const post = new Map(); const cap = new Map(); const tot = new Map();
    for (let id = 0; id < this.N; id++) {
      const t = this.text[id]; WORD_RE.lastIndex = 0; let m; const seen = new Set();
      while ((m = WORD_RE.exec(t))) {
        let w = m[0];
        // skip contraction tails like ’s
        if (m.index > 0 && (t[m.index - 1] === '’' || t[m.index - 1] === "'")) continue;
        const lw = w.toLowerCase();
        tot.set(lw, (tot.get(lw) || 0) + 1);
        if (w[0] >= 'A' && w[0] <= 'Z' && m.index > 0) {
          const prev = t.slice(Math.max(0, m.index - 3), m.index);
          if (!/[.?!:]\s*$/.test(prev) && !/^\s*$/.test(prev)) cap.set(lw, (cap.get(lw) || 0) + 1);
        }
        if (!seen.has(lw)) { seen.add(lw); let a = post.get(lw); if (!a) { a = []; post.set(lw, a); } a.push(id); }
      }
    }
    this._index = { post: post, cap: cap, tot: tot };
    return this._index;
  };
  Bible.prototype.isProper = function (lw) {
    const ix = this.index(); const t = ix.tot.get(lw) || 0; const c = ix.cap.get(lw) || 0;
    return t > 0 && c / t > 0.7;
  };

  // ---------- Clue making ----------
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Make a fill-in-the-blank clue from verse text for `word` (lowercase letters, may be phrase).
  function makeFillClue(text, word) {
    const pat = word.split(/\s+/).map(escapeRe).join('\\s+');
    const re = new RegExp('(^|[^A-Za-z])(' + pat + ')(?![A-Za-z])', 'i');
    const m = re.exec(text);
    if (!m) return null;
    const pos = m.index + m[1].length;
    // Clause segmentation
    const segs = []; let s = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === ';' || ch === ':' || ch === '.' || ch === '?' || ch === '!') {
        // don't split inside "3:4" like numbers (not present in KJV text, but be safe)
        segs.push([s, i + 1]); s = i + 1;
      }
    }
    if (s < text.length) segs.push([s, text.length]);
    let k = segs.findIndex((g) => pos >= g[0] && pos < g[1]);
    if (k < 0) k = segs.length - 1;
    let a = k, b = k;
    const wc = (x, y) => (text.slice(segs[x][0], segs[y][1]).match(/[A-Za-z]+/g) || []).length;
    let flip = true;
    while (wc(a, b) < 8 && (a > 0 || b < segs.length - 1)) {
      if ((flip && b < segs.length - 1) || a === 0) b++; else a--;
      flip = !flip;
    }
    let st = segs[a][0], en = segs[b][1];
    let snippet = text.slice(st, en);
    let lead = false, tail = false;
    // Trim long snippets to a window of words around the target.
    const toks = []; let mm; const wr = /[A-Za-z’']+/g;
    while ((mm = wr.exec(snippet))) toks.push([mm.index, mm.index + mm[0].length]);
    if (toks.length > 22) {
      const rel = pos - st;
      let ti = toks.findIndex((t) => rel >= t[0] && rel < t[1]); if (ti < 0) ti = 0;
      let from = Math.max(0, ti - 9), to = Math.min(toks.length - 1, from + 17);
      from = Math.max(0, to - 17);
      lead = from > 0; tail = to < toks.length - 1;
      snippet = snippet.slice(toks[from][0], toks[to][1]);
    }
    snippet = snippet.trim().replace(/^[,;:.\s]+/, '').replace(/[,;:\s]+$/, '');
    if (/^(And|But|For|Then|So|Now|Or)\s/.test(snippet) && snippet.split(' ').length > 9) {
      // keep as is; the KJV voice is part of the charm
    }
    const re2 = new RegExp('(^|[^A-Za-z])(' + pat + ')(?![A-Za-z])', 'gi');
    let blanked = snippet.replace(re2, (all, p1) => p1 + '___');
    if (blanked.indexOf('___') < 0) return null;
    const others = (blanked.replace(/___/g, '').match(/[A-Za-z]+/g) || []).length;
    if (others < 4) return null;
    if (lead) blanked = '…' + blanked;
    if (tail) blanked = blanked + '…';
    return '“' + blanked + '”';
  }

  // ---------- Candidate selection ----------
  function versePoolFromScope(bible, scope) {
    // scope: [[bookIndex, c1, c2], ...] -> sorted array of verse ids
    const ids = [];
    scope.forEach((s) => {
      const r = bible.chapterRange(s[0], s[1], s[2]);
      for (let i = r[0]; i <= r[1]; i++) ids.push(i);
    });
    return ids;
  }
  function versePoolFromKeywords(bible, kws) {
    const ix = bible.index(); const set = new Set();
    kws.forEach((k) => { const p = ix.post.get(k.toLowerCase()); if (p) p.forEach((id) => set.add(id)); });
    return Array.from(set).sort((a, b) => a - b);
  }

  const WEAK = new Set(('lord god jesus christ israel people land house king son sons children man men day days ' +
    'hand hands earth heaven waters name word words things before thereof among').split(' '));

  // Score words in a verse pool for thematic relevance.
  function scoreWords(bible, pool, opts) {
    const ix = bible.index(); const counts = new Map();
    const poolSet = new Set(pool);
    for (const id of pool) {
      const t = bible.text[id]; WORD_RE.lastIndex = 0; let m; const seen = new Set();
      while ((m = WORD_RE.exec(t))) {
        if (m.index > 0 && (t[m.index - 1] === '’' || t[m.index - 1] === "'")) continue;
        const lw = m[0].toLowerCase();
        if (seen.has(lw)) continue; seen.add(lw);
        counts.set(lw, (counts.get(lw) || 0) + 1);
      }
    }
    const N = bible.N; const out = [];
    counts.forEach((cnt, w) => {
      if (w.length < 3 || w.length > 15 || STOP.has(w)) return;
      if (opts && opts.exclude && opts.exclude.has(w)) return;
      const df = ix.post.get(w).length;
      let sc = cnt * Math.log(N / df);
      if (bible.isProper(w)) sc *= 1.6;
      if (WEAK.has(w)) sc *= 0.35;
      if (df > 1500 && !bible.isProper(w)) sc *= 0.5;
      if (/(eth|est)$/.test(w) && w.length > 5) sc *= 0.55; // archaic verb endings
      if (w.length >= 4 && w.length <= 10) sc *= 1.15;
      out.push({ w: w, score: sc, poolSet: poolSet });
    });
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  // ---------- Grid building ----------
  function Grid(N) {
    this.N = N; this.cells = new Array(N * N).fill(''); this.acc = new Uint8Array(N * N); this.dwn = new Uint8Array(N * N);
    this.byLetter = {}; this.words = []; this.nA = 0; this.nD = 0;
    this.minR = N; this.maxR = -1; this.minC = N; this.maxC = -1;
  }
  Grid.prototype.check = function (word, r, c, dir, maxW, maxH) {
    const N = this.N, L = word.length; const dr = dir === 'A' ? 0 : 1, dc = dir === 'A' ? 1 : 0;
    const er = r + dr * (L - 1), ec = c + dc * (L - 1);
    if (r < 0 || c < 0 || er >= N || ec >= N) return -1;
    if (this.words.length) {
      const nW = Math.max(this.maxC, ec) - Math.min(this.minC, c) + 1;
      const nH = Math.max(this.maxR, er) - Math.min(this.minR, r) + 1;
      if (nW > maxW || nH > maxH) return -1;
    }
    const br = r - dr, bc = c - dc;
    if (br >= 0 && bc >= 0 && this.cells[br * N + bc]) return -1;
    const ar = er + dr, ac = ec + dc;
    if (ar < N && ac < N && this.cells[ar * N + ac]) return -1;
    let cross = 0;
    for (let i = 0; i < L; i++) {
      const rr = r + dr * i, cc = c + dc * i, k = rr * N + cc; const ch = this.cells[k];
      if (ch) {
        if (ch !== word[i]) return -1;
        if (dir === 'A' ? this.acc[k] : this.dwn[k]) return -1;
        cross++;
      } else {
        if (dir === 'A') {
          if (rr > 0 && this.cells[k - N]) return -1;
          if (rr < N - 1 && this.cells[k + N]) return -1;
        } else {
          if (cc > 0 && this.cells[k - 1]) return -1;
          if (cc < N - 1 && this.cells[k + 1]) return -1;
        }
      }
    }
    if (this.words.length && cross === 0) return -1;
    if (cross === L) return -1;
    return cross;
  };
  Grid.prototype.place = function (word, r, c, dir, meta) {
    const N = this.N, L = word.length; const dr = dir === 'A' ? 0 : 1, dc = dir === 'A' ? 1 : 0;
    for (let i = 0; i < L; i++) {
      const k = (r + dr * i) * N + (c + dc * i);
      if (!this.cells[k]) { this.cells[k] = word[i]; (this.byLetter[word[i]] = this.byLetter[word[i]] || []).push(k); }
      if (dir === 'A') this.acc[k] = 1; else this.dwn[k] = 1;
    }
    this.minR = Math.min(this.minR, r); this.minC = Math.min(this.minC, c);
    this.maxR = Math.max(this.maxR, r + dr * (L - 1)); this.maxC = Math.max(this.maxC, c + dc * (L - 1));
    this.words.push({ word: word, r: r, c: c, dir: dir, meta: meta });
    if (dir === 'A') this.nA++; else this.nD++;
  };
  // All valid placements of word that cross existing letters.
  Grid.prototype.placements = function (word, maxW, maxH) {
    const N = this.N, res = []; const seen = new Set();
    for (let i = 0; i < word.length; i++) {
      const list = this.byLetter[word[i]]; if (!list) continue;
      for (const k of list) {
        const r0 = Math.floor(k / N), c0 = k % N;
        if (!this.acc[k]) { // place across through k
          const c = c0 - i; const key = 'A' + r0 + ',' + c;
          if (!seen.has(key)) { seen.add(key); const x = this.check(word, r0, c, 'A', maxW, maxH); if (x > 0) res.push({ r: r0, c: c, dir: 'A', cross: x }); }
        }
        if (!this.dwn[k]) {
          const r = r0 - i; const key = 'D' + r + ',' + c0;
          if (!seen.has(key)) { seen.add(key); const x = this.check(word, r, c0, 'D', maxW, maxH); if (x > 0) res.push({ r: r, c: c0, dir: 'D', cross: x }); }
        }
      }
    }
    return res;
  };

  /* Build a freeform grid.
     cands: [{ans:'MOSES', pri:Number, ...}] in rough priority order.
     opts: {minA, minD, maxW, maxH, rng, target} */
  function buildGrid(cands, opts) {
    const rng = opts.rng; const maxW = opts.maxW || 27, maxH = opts.maxH || 27;
    const N = Math.max(maxW, maxH) * 2 + 2; const g = new Grid(N);
    const pool = cands.slice();
    // First word: a long, high-priority entry
    let fi = pool.findIndex((x) => x.ans.length >= 7 && x.ans.length <= 11);
    if (fi < 0) fi = 0;
    const first = pool.splice(fi, 1)[0];
    g.place(first.ans, N >> 1, (N >> 1) - (first.ans.length >> 1), 'A', first);
    if (opts.onPlace) opts.onPlace(first);
    const used = new Set([first.ans]);
    const target = opts.target || (opts.minA + opts.minD + 4);
    let fails = 0; let phase2 = false; const maxWords = opts.maxWords || target;
    while (pool.length) {
      if (!phase2 && g.words.length >= target && g.nA >= opts.minA && g.nD >= opts.minD) {
        if (maxWords <= target) break;
        phase2 = true; fails = 0;
      }
      if (g.words.length >= maxWords) break;
      const wantDir = g.nA < opts.minA && g.nA <= g.nD ? 'A' : g.nD < opts.minD && g.nD < g.nA ? 'D' : (g.nA <= g.nD ? 'A' : 'D');
      let best = null, bestScore = -1e9, bestIdx = -1;
      const sample = Math.min(pool.length, opts.sample || 90);
      const cx = (g.minC + g.maxC) / 2, cy = (g.minR + g.maxR) / 2;
      for (let s = 0; s < sample; s++) {
        const cand = pool[s];
        if (used.has(cand.ans)) continue;
        if (opts.canPlace && !opts.canPlace(cand)) continue;
        const pls = g.placements(cand.ans, maxW, maxH);
        for (const p of pls) {
          const L = cand.ans.length;
          const mr = p.r + (p.dir === 'D' ? L / 2 : 0), mc = p.c + (p.dir === 'A' ? L / 2 : 0);
          const dist = Math.abs(mr - cy) + Math.abs(mc - cx);
          const grow = Math.max(0, g.minR - p.r) + Math.max(0, g.minC - p.c) +
            Math.max(0, (p.dir === 'D' ? p.r + L - 1 : p.r) - g.maxR) + Math.max(0, (p.dir === 'A' ? p.c + L - 1 : p.c) - g.maxC);
          if (phase2 && p.cross < 2) continue;
          const cw = opts.crossW || 14;
          const sc = p.cross * cw + p.cross * p.cross * (opts.crossSq || 0) + (p.dir === wantDir ? 9 : 0) + (cand.pri || 0) * 3 - dist * 0.25 - grow * 0.9 + L * 0.35 + rng() * 6 - s * 0.03;
          if (sc > bestScore) { bestScore = sc; best = p; bestIdx = s; }
        }
      }
      if (!best) {
        // rotate the pool so new candidates get a chance
        fails++;
        if (fails > Math.ceil(pool.length / sample) + 1) break;
        pool.push.apply(pool, pool.splice(0, sample));
        continue;
      }
      fails = 0;
      const cand = pool.splice(bestIdx, 1)[0];
      g.place(cand.ans, best.r, best.c, best.dir, cand);
      used.add(cand.ans);
      if (opts.onPlace) opts.onPlace(cand, used);
      // drop near-duplicates (plural/singular) of the placed answer
      for (let i = pool.length - 1; i >= 0; i--) {
        const a = pool[i].ans;
        if (a === cand.ans || a === cand.ans + 'S' || cand.ans === a + 'S' || a === cand.ans + 'ES' || cand.ans === a + 'ES') pool.splice(i, 1);
      }
    }
    return g;
  }

  // Convert a Grid into a compact puzzle object; verifies every run is a placed word.
  function finalize(g) {
    const N = g.N, r0 = g.minR, c0 = g.minC, H = g.maxR - g.minR + 1, W = g.maxC - g.minC + 1;
    const rows = [];
    for (let r = 0; r < H; r++) {
      let s = '';
      for (let c = 0; c < W; c++) { const ch = g.cells[(r + r0) * N + (c + c0)]; s += ch || '.'; }
      rows.push(s);
    }
    // verify runs
    const at = (r, c) => (r >= 0 && c >= 0 && r < H && c < W && rows[r][c] !== '.');
    const startSet = new Map();
    g.words.forEach((w) => startSet.set(w.dir + (w.r - r0) + ',' + (w.c - c0), w));
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (!at(r, c)) continue;
      if (!at(r, c - 1) && at(r, c + 1)) {
        let L = 0; while (at(r, c + L)) L++;
        const w = startSet.get('A' + r + ',' + c);
        if (!w || w.word.length !== L) return null;
      }
      if (!at(r - 1, c) && at(r + 1, c)) {
        let L = 0; while (at(r + L, c)) L++;
        const w = startSet.get('D' + r + ',' + c);
        if (!w || w.word.length !== L) return null;
      }
    }
    // numbering
    let num = 0; const numAt = {};
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (startSet.has('A' + r + ',' + c) || startSet.has('D' + r + ',' + c)) numAt[r + ',' + c] = ++num;
    }
    const words = g.words.map((w) => {
      const r = w.r - r0, c = w.c - c0;
      return { n: numAt[r + ',' + c], d: w.dir, r: r, c: c, a: w.word, meta: w.meta };
    });
    words.sort((a, b) => (a.d === b.d ? a.n - b.n : a.d === 'A' ? -1 : 1));
    return { w: W, h: H, rows: rows, words: words };
  }

  // Normalize an answer phrase -> grid answer + enumeration
  function normAnswer(phrase) {
    const parts = phrase.trim().toUpperCase().split(/\s+/);
    return { ans: parts.join(''), en: parts.map((p) => p.length).join(',') };
  }

  return {
    STOP: STOP, RNG: RNG, hashStr: hashStr, shuffle: shuffle, Bible: Bible,
    makeFillClue: makeFillClue, versePoolFromScope: versePoolFromScope, versePoolFromKeywords: versePoolFromKeywords,
    scoreWords: scoreWords, buildGrid: buildGrid, finalize: finalize, normAnswer: normAnswer
  };
});
