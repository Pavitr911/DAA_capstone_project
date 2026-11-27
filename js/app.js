(() => {
const $ = id => document.getElementById(id), $$ = s => [...document.querySelectorAll(s)];
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAMPLE = `Aarav: Mathematics, Physics, Computer Science
Diya: Mathematics, Chemistry, English
Kabir: Physics, Electronics, Mathematics
Meera: Biology, Chemistry, Statistics
Rohan: Computer Science, Statistics, Economics
Sneha: English, History, Economics
Vikram: Physics, Chemistry, Statistics
Anaya: Biology, English, History
Ishaan: Electronics, Computer Science, Statistics
Tara: Economics, History, Mathematics
Arjun: Chemistry, Biology, Physics`;
const POOL = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Economics', 'History', 'Statistics', 'Electronics', 'Geography', 'Psychology', 'Accounting'];
const SESS = ['Morning · 9:00 – 12:00', 'Afternoon · 2:00 – 5:00', 'Evening · 6:00 – 9:00'];
const col = c => c < 0 ? 'var(--soft)' : `hsl(${(c * 137.5 + 250) % 360} 90% 66%)`;
const svg = $('graph'), say = t => { $('status').textContent = t; }, nm = i => G.names[i];
const shortN = (t, n) => esc(t.length > n ? t.slice(0, n - 1) + '…' : t);
let G, R, pos = [], cur = [], flash = null, timer = null, drag = -1, rows = [], info = [];
let si = 0, last = 0, paused = false, live = false;

/* ---------- graph drawing ---------- */
const layout = () => {
  const n = G.names.length;
  pos = G.names.map((_, i) => { const a = 2 * Math.PI * i / n - Math.PI / 2; return { x: 360 + Math.cos(a) * 250, y: 240 + Math.sin(a) * 170 }; });
};
const draw = () => {
  const n = G.names.length, r = n > 24 ? 13 : 21; let s = '';
  G.adj.forEach((set, i) => set.forEach(j => {
    if (j < i) return;
    const bad = flash && ((flash.v === i && flash.u === j) || (flash.v === j && flash.u === i)), w = G.w[i][j];
    s += `<line x1="${pos[i].x}" y1="${pos[i].y}" x2="${pos[j].x}" y2="${pos[j].y}" style="stroke:${bad ? '#e5484d' : 'var(--ink)'};stroke-opacity:${bad ? 1 : .28};stroke-width:${bad ? 4.5 : Math.min(1.2 + (w || 1) * .8, 6)}"><title>${esc(nm(i))} – ${esc(nm(j))}: ${w ? w + ' common student' + (w > 1 ? 's' : '') : 'manual conflict'}</title></line>`;
  }));
  G.names.forEach((t, i) => {
    const c = cur[i], f = flash && flash.v === i, p = pos[i];
    s += `<g class="node" data-i="${i}"><circle cx="${p.x}" cy="${p.y}" r="${r}" style="fill:${col(c)};stroke:${f ? '#e5484d' : 'var(--ink)'};stroke-width:${f ? 4 : 2}"/>` +
      `<text x="${p.x}" y="${p.y}" dy=".35em" text-anchor="middle" font-size="${r > 15 ? 13 : 10}" font-weight="800" style="fill:#17123a">${c >= 0 ? c + 1 : ''}</text>` +
      `<text x="${p.x}" y="${p.y + r + 14}" text-anchor="middle" font-size="11.5" font-weight="600" style="fill:var(--ink)">${shortN(t, 15)}</text></g>`;
  });
  svg.innerHTML = s;
};

/* ---------- step-by-step replay of the backtracking search ---------- */
const prog = p => { $('bar').style.width = p * 100 + '%'; };
const halt = () => { clearTimeout(timer); timer = null; };
const finish = () => {
  halt(); live = false; paused = false; $('pause').textContent = 'Pause'; cur = R.color.slice(); flash = null; draw(); prog(1);
  say(`Done: ${R.k} exam slot${R.k > 1 ? 's' : ''} ${R.optimal ? 'is the minimum, every smaller k failed.' : 'found. The time limit hit, so it may not be minimal.'}`);
};
const step = () => {
  if (si >= R.log.length) return finish();
  const [t, v, c, k] = R.log[si++]; let m;
  if (k !== last) { cur.fill(-1); last = k; }
  flash = null;
  if (t === 'a') { cur[v] = c; m = `${nm(v)} gets Slot ${c + 1}`; }
  else if (t === 'x') {
    const u = [...G.adj[v]].find(u => cur[u] === c); flash = { v, u };
    m = u === undefined ? `${nm(v)} cannot use Slot ${c + 1}: it is full (max ${R.cap})` : `${nm(v)} cannot use Slot ${c + 1}: clashes with ${nm(u)}`;
  } else { cur[v] = -1; m = `backtrack: ${nm(v)} is un-assigned`; }
  say(`Trying k = ${k} · step ${si}/${R.log.length}${R.total > R.log.length ? ' (replay capped)' : ''} · ${m}`);
  draw(); prog(si / R.log.length);
};
const loop = () => { halt(); if (paused || !live) return; step(); if (live) timer = setTimeout(loop, 805 - $('speed').value); };
const begin = () => { si = 0; last = 0; live = true; cur = Array(G.names.length).fill(-1); };
const play = () => { halt(); if (!R) return; begin(); paused = false; $('pause').textContent = 'Pause'; loop(); };

/* ---------- timetable ---------- */
const dayFor = n => {
  const d = new Date(($('start').value || new Date().toISOString().slice(0, 10)) + 'T00:00'), skip = $('wk').checked;
  for (;;) {
    if (skip && (d.getDay() === 0 || d.getDay() === 6)) { d.setDate(d.getDate() + 1); continue; }
    if (n-- === 0) return d;
    d.setDate(d.getDate() + 1);
  }
};
const fmt = (d, o) => d.toLocaleDateString('en-GB', o);
const renderTable = () => {
  const per = +$('per').value; let h = ''; rows = []; info = [];
  for (let c = 0; c < R.k; c++) {
    const ids = G.names.map((_, i) => i).filter(i => R.color[i] === c), ses = SESS[c % per];
    const ds = fmt(dayFor(Math.floor(c / per)), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const ppl = ids.reduce((a, i) => a + G.cnt[i], 0); info[c] = { ds, ses };
    ids.forEach(i => rows.push([c + 1, ds, ses, nm(i), G.cnt[i]]));
    h += `<div class="slot" style="--c:${col(c)}"><div class="sh">Slot ${c + 1}<span>${ids.length} subject${ids.length > 1 ? 's' : ''} · ${ppl} student${ppl === 1 ? '' : 's'}</span></div>` +
      `<div class="sb"><small>${ds} · ${ses}</small>${ids.map(i => `<em>${esc(nm(i))}<small>${G.cnt[i]}</small></em>`).join('')}</div></div>`;
  }
  $('slots').innerHTML = h;
  const days = Math.ceil(R.k / per), a = fmt(dayFor(0), { day: 'numeric', month: 'short' }), b = fmt(dayFor(days - 1), { day: 'numeric', month: 'short', year: 'numeric' });
  $('period').textContent = `Exam period ${a} to ${b} · ${R.k} slots over ${days} exam day${days > 1 ? 's' : ''}${R.cap ? ` · max ${R.cap} subjects per slot` : ''}. Small numbers are enrolled students.`;
  const ok = GC.verify(G.adj, R.color, R.cap);
  $('verify').className = 'banner ' + (ok ? 'ok' : 'no');
  $('verify').textContent = ok ? `Verified: no student has two exams in the same slot (${G.names.length} subjects in ${R.k} slots).` : 'Clash detected: a constraint is broken.';
  renderStu();
};

/* ---------- extra views ---------- */
const renderMatrix = () => {
  const n = G.names.length, o = [...Array(n).keys()].sort((a, b) => R.color[a] - R.color[b] || a - b);
  let h = '<table class="mx"><tr><td class="x"></td>' + o.map(j => `<th style="--c:${col(R.color[j])}" title="${esc(nm(j))}"><span>${shortN(nm(j), 12)}</span></th>`).join('') + '</tr>';
  o.forEach(i => {
    h += `<tr><th class="r" style="--c:${col(R.color[i])}">${shortN(nm(i), 14)}</th>` + o.map(j => {
      if (i === j) return `<td class="d" style="--c:${col(R.color[i])}">${R.color[i] + 1}</td>`;
      if (!G.adj[i].has(j)) return '<td></td>';
      const w = G.w[i][j];
      return `<td class="e" style="--a:${Math.min(100, 35 + w * 18)}%" title="${esc(nm(i))} × ${esc(nm(j))}: ${w ? w + ' common' : 'manual conflict'}">${w || '•'}</td>`;
    }).join('') + '</tr>';
  });
  $('mx').innerHTML = h + '</table>';
};
const renderCmp = () => {
  const g = GC.greedy(G.adj, R.cap), d = GC.dsatur(G.adj, R.cap);
  const L = [['Greedy (Welsh–Powell)', g, 'Fast, never backs up'], ['DSATUR', d, 'Most constrained subject first'], ['Backtracking (used)', R, R.optimal ? 'Exact, proves the minimum' : 'Time limit reached']];
  const mx = Math.max(...L.map(x => x[1].k));
  $('cmp').innerHTML = L.map(([t, o, note]) => `<div class="cmp"><div><b>${t}</b><small>${note}</small></div><div class="b"><i style="width:${o.k / mx * 100}%">${o.k} slots</i></div><span>${o.ms.toFixed(2)} ms</span></div>`).join('') +
    `<p class="hint">${g.k > R.k || d.k > R.k ? 'The heuristics needed more slots than backtracking on this input.' : 'The heuristics matched the minimum here, but only backtracking guarantees it.'}</p>`;
};
const renderStu = () => {
  const s = G.studs[+$('stu').value || 0];
  if (!s) { $('stuOut').innerHTML = '<p class="hint">Add students to see personal timetables.</p>'; return; }
  const L = s.ids.map(i => [R.color[i], i]).sort((a, b) => a[0] - b[0]);
  $('stuOut').innerHTML = `<p class="hint" style="margin-top:10px">${esc(s.name)} sits ${L.length} exam${L.length > 1 ? 's' : ''}, each in a different slot.</p>` +
    L.map(([c, i]) => `<div class="ex" style="--c:${col(c)}"><b>Slot ${c + 1}</b><span>${esc(nm(i))}</span><small>${info[c].ds} · ${info[c].ses}</small></div>`).join('');
};

/* ---------- main flow ---------- */
const generate = () => {
  halt(); live = false; G = GC.build($('data').value);
  if (!G.names.length) {
    R = null; svg.innerHTML = ''; ['slots', 'legend', 'attempts', 'mx', 'cmp', 'stuOut', 'stu', 'period'].forEach(id => { $(id).innerHTML = ''; });
    $('verify').className = 'banner no'; $('verify').textContent = 'No data yet.';
    say('Add at least one student per line, for example  Asha: Maths, Physics'); return;
  }
  R = GC.solve(G.adj, Math.max(0, parseInt($('cap').value) || 0)); layout(); cur = R.color.slice();
  const n = G.names.length, E = G.adj.reduce((a, s) => a + s.size, 0) / 2;
  Object.entries({ sN: n, sS: G.students, sE: E, sD: n > 1 ? `(${Math.round(E / (n * (n - 1) / 2) * 100)}% dense)` : '', sL: R.lb, sK: R.k + (R.optimal ? '' : '*'), sV: R.nodes.toLocaleString(), sB: R.backs.toLocaleString(), sT: R.ms.toFixed(1) + ' ms' })
    .forEach(([k, v]) => { $(k).textContent = v; });
  $('legend').innerHTML = Array.from({ length: R.k }, (_, c) => `<span class="chip"><i style="background:${col(c)}"></i>Slot ${c + 1}</span>`).join('');
  $('attempts').innerHTML = R.attempts.map(a => `<span class="chip ${a.t ? 'no' : a.ok ? 'ok' : 'no'}">k = ${a.k}: ${a.t ? 'timed out' : a.ok ? 'feasible' : 'impossible'} · ${a.nodes.toLocaleString()} nodes</span>`).join('');
  $('stu').innerHTML = G.studs.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join('');
  renderTable(); renderMatrix(); renderCmp(); play();
};

/* ---------- events ---------- */
$('go').onclick = generate;
$('sample').onclick = () => { $('data').value = SAMPLE; generate(); };
$('clear').onclick = () => { $('data').value = ''; generate(); };
$('random').onclick = () => {
  const r = n => Math.floor(Math.random() * n), shuf = a => [...a].sort(() => Math.random() - .5);
  const pool = shuf(POOL).slice(0, 8 + r(5));
  $('data').value = Array.from({ length: 16 + r(10) }, (_, i) => `Student ${i + 1}: ` + shuf(pool).slice(0, 2 + r(3)).join(', ')).join('\n');
  generate();
};
$('up').onclick = () => $('file').click();
$('file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader(); rd.onload = () => { $('data').value = rd.result; generate(); }; rd.readAsText(f); e.target.value = '';
};
$('replay').onclick = play;
$('pause').onclick = () => { if (!live) return; paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause'; loop(); };
$('step').onclick = () => { if (!R) return; if (!live) begin(); paused = true; $('pause').textContent = 'Resume'; halt(); step(); };
$('skip').onclick = () => { if (R) finish(); };
$('stu').onchange = () => R && renderStu();
['start', 'per', 'wk'].forEach(id => { $(id).onchange = () => R && renderTable(); });
$('cap').onchange = generate;
$$('[data-tab]').forEach(b => { b.onclick = () => { $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); $$('.pane').forEach(p => { p.hidden = p.id !== 'p-' + b.dataset.tab; }); }; });
$('csv').onclick = () => {
  if (!R) return;
  const q = v => `"${String(v).replace(/"/g, '""')}"`, a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([['Slot,Date,Session,Subject,Students enrolled', ...rows.map(r => r.map(q).join(','))].join('\n')], { type: 'text/csv' }));
  a.download = 'exam-timetable.csv'; a.click();
};
$('print').onclick = () => window.print();
const setTheme = t => { document.documentElement.dataset.theme = t; $('theme').textContent = t === 'dark' ? 'Light mode' : 'Dark mode'; };
$('theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* drag subjects to rearrange the graph */
svg.addEventListener('pointerdown', e => { const g = e.target.closest('.node'); if (g) drag = +g.dataset.i; });
addEventListener('pointermove', e => {
  if (drag < 0) return;
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  pos[drag] = { x: Math.max(24, Math.min(696, q.x)), y: Math.max(24, Math.min(430, q.y)) }; draw();
});
addEventListener('pointerup', () => { drag = -1; });

/* start: next Monday, sample data, theme from system */
const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
const p2 = n => String(n).padStart(2, '0');
$('start').value = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
$('data').value = SAMPLE; generate();
})();
