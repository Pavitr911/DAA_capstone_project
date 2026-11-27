/* Graph-coloring engine: conflict-graph builder, backtracking solver, heuristics, verifier */
const GC = {
  /* "Name: Math, Physics" = a student. "Math -- Physics" = a direct conflict edge. */
  build(text) {
    const idx = new Map(), names = [], studs = [], extra = [];
    const get = s => { const k = s.toLowerCase(); if (!idx.has(k)) { idx.set(k, names.length); names.push(s); } return idx.get(k); };
    text.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line[0] === '#') return;
      if (line.includes('--')) {
        const ids = [...new Set(line.split('--').map(s => s.trim()).filter(Boolean).map(get))];
        if (ids.length > 1) extra.push(ids);
        return;
      }
      const i = line.indexOf(':');
      const ids = [...new Set((i < 0 ? line : line.slice(i + 1)).split(',').map(s => s.trim()).filter(Boolean).map(get))];
      if (ids.length) studs.push({ name: (i > 0 && line.slice(0, i).trim()) || 'Student ' + (studs.length + 1), ids });
    });
    const n = names.length, adj = names.map(() => new Set()), w = names.map(() => Array(n).fill(0)), cnt = Array(n).fill(0);
    studs.forEach(s => s.ids.forEach(a => { cnt[a]++; s.ids.forEach(b => { if (a !== b) { adj[a].add(b); w[a][b]++; } }); }));
    extra.forEach(r => r.forEach(a => r.forEach(b => { if (a !== b) adj[a].add(b); })));
    return { names, adj, studs, students: studs.length, cnt, w };
  },

  verify(adj, color, cap = 0) {
    const ok = adj.every((s, i) => [...s].every(j => color[i] !== color[j]));
    if (!cap) return ok;
    const size = {}; color.forEach(c => { size[c] = (size[c] || 0) + 1; });
    return ok && Object.values(size).every(x => x <= cap);
  },

  /* Welsh-Powell greedy: highest degree first, lowest legal slot */
  greedy(adj, cap = 0) {
    const t = performance.now(), n = adj.length, color = Array(n).fill(-1), size = [];
    [...Array(n).keys()].sort((a, b) => adj[b].size - adj[a].size).forEach(v => {
      let c = 0;
      while ([...adj[v]].some(u => color[u] === c) || (cap && (size[c] || 0) >= cap)) c++;
      color[v] = c; size[c] = (size[c] || 0) + 1;
    });
    return { color, k: n ? Math.max(...color) + 1 : 0, ms: performance.now() - t };
  },

  /* DSATUR: always color the subject whose neighbors already use the most distinct slots */
  dsatur(adj, cap = 0) {
    const t = performance.now(), n = adj.length, color = Array(n).fill(-1), sat = adj.map(() => new Set()), size = [];
    for (let d = 0; d < n; d++) {
      let b = -1;
      for (let v = 0; v < n; v++) if (color[v] < 0 && (b < 0 || sat[v].size > sat[b].size || (sat[v].size === sat[b].size && adj[v].size > adj[b].size))) b = v;
      let c = 0;
      while (sat[b].has(c) || (cap && (size[c] || 0) >= cap)) c++;
      color[b] = c; size[c] = (size[c] || 0) + 1; adj[b].forEach(u => sat[u].add(c));
    }
    return { color, k: n ? Math.max(...color) + 1 : 0, ms: performance.now() - t };
  },

  /* Backtracking: smallest k with a valid coloring; cap = max subjects per slot (0 = none) */
  solve(adj, cap = 0, limitMs = 4000, maxLog = 6000) {
    const n = adj.length, t0 = performance.now();
    const order = [...Array(n).keys()].sort((a, b) => adj[b].size - adj[a].size);

    let lb = 1; // lower bound: greedy clique size, or ceil(n / cap) if larger
    for (const s of order) {
      const q = [s];
      for (const v of order) if (!q.includes(v) && q.every(u => adj[u].has(v))) q.push(v);
      lb = Math.max(lb, q.length);
    }
    if (cap) lb = Math.max(lb, Math.ceil(n / cap));

    const color = Array(n).fill(-1), size = Array(n + 1).fill(0), log = [], attempts = [];
    let nodes = 0, backs = 0, total = 0, timeout = false;
    const push = (t, v, c, k) => { total++; if (log.length < maxLog) log.push([t, v, c, k]); };

    // a = assign, x = rejected (clash or full slot), b = backtrack (undo)
    const rec = (i, k, used) => {
      if (i === n) return true;
      const v = order[i];
      for (let c = 0; c < Math.min(k, used + 1); c++) { // only open the next unused slot: no symmetric duplicates
        if (++nodes % 1024 === 0 && performance.now() - t0 > limitMs) { timeout = true; return false; }
        let ok = true;
        for (const u of adj[v]) if (color[u] === c) { ok = false; break; }
        if (ok && cap && size[c] >= cap) ok = false;
        if (!ok) { push('x', v, c, k); continue; }
        color[v] = c; size[c]++; push('a', v, c, k);
        if (rec(i + 1, k, Math.max(used, c + 1))) return true;
        if (timeout) return false;
        color[v] = -1; size[c]--; backs++; push('b', v, c, k);
      }
      return false;
    };

    let k = n <= 30 ? (cap ? Math.ceil(n / cap) : 1) : lb; // small inputs: show the full search
    for (; k <= n; k++) {
      color.fill(-1); size.fill(0);
      const n0 = nodes, ok = rec(0, k, 0);
      attempts.push({ k, ok, t: timeout, nodes: nodes - n0 });
      if (ok || timeout) break;
    }
    if (timeout) { const g = GC.greedy(adj, cap); g.color.forEach((c, i) => { color[i] = c; }); k = g.k; }
    return { color: color.slice(), k, lb, cap, nodes, backs, total, log, attempts, optimal: !timeout, ms: performance.now() - t0 };
  }
};
