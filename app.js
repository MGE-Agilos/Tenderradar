/* Tenderradar demo — vanilla JS, data from data.js (window.DATA). */
(function () {
  "use strict";
  const D = window.DATA;
  const ACH = D.acheteurs;
  const KMO = new Set(["sme", "small", "micro", "medium"]);
  const SECTS = [...new Set(D.avis.map(a => a.sect))].sort();
  let sect = "Alle";

  // ── helpers ────────────────────────────────────────────────────────────
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("nl-BE");
  const pct = x => (x == null ? "–" : Math.round(x * 100) + "%");
  const eur = v => {
    if (v == null) return "–";
    if (v >= 1e9) return "€ " + (v / 1e9).toLocaleString("nl-BE", { maximumFractionDigits: 1 }) + " mld";
    if (v >= 1e6) return "€ " + (v / 1e6).toLocaleString("nl-BE", { maximumFractionDigits: 1 }) + " mln";
    if (v >= 1e3) return "€ " + Math.round(v / 1e3) + "k";
    return "€ " + Math.round(v);
  };
  const median = arr => {
    const a = arr.filter(v => v != null).sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const mean = arr => { const a = arr.filter(v => v != null); return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; };
  const tedLink = id => `<a href="https://ted.europa.eu/nl/notice/-/detail/${esc(id)}" target="_blank" rel="noopener">${esc(id)}</a>`;
  const avis = () => (sect === "Alle" ? D.avis : D.avis.filter(a => a.sect === sect));
  const kmoShare = list => {
    let k = 0, n = 0;
    list.forEach(a => a.gagn.forEach(g => { if (g.taille) { n++; if (KMO.has(g.taille)) k++; } }));
    return n ? k / n : null;
  };

  // ── tooltip ────────────────────────────────────────────────────────────
  const tip = $("#tip");
  function bindTip(el, html) {
    el.addEventListener("mousemove", e => {
      tip.innerHTML = html; tip.hidden = false;
      const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + "px"; tip.style.top = (e.clientY + 14) + "px";
    });
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
  }

  // ── charts (SVG, single series) ────────────────────────────────────────
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  // Rounded data-end only (4px), anchored to the baseline.
  const hBarPath = (x, y, w, h, r = 4) => { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };
  const vBarPath = (x, y, w, h, r = 4) => { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };

  function barsH(host, rows, fmt, tipFmt) {
    host.innerHTML = "";
    const W = 560, lw = 190, rowH = 30, bh = 16, vw = 60;
    const H = rows.length * rowH + 4;
    const max = Math.max(...rows.map(r => r.v), 0) || 1;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": host.previousElementSibling?.previousElementSibling?.textContent || "grafiek" });
    rows.forEach((r, i) => {
      const y = i * rowH + 2, w = Math.max(1, (W - lw - vw) * r.v / max);
      const g = svgEl("g", {});
      const lbl = svgEl("text", { x: lw - 10, y: y + rowH / 2 + 4, "text-anchor": "end", class: "lbl" }); lbl.textContent = r.l;
      g.append(lbl, svgEl("path", { d: hBarPath(lw, y + (rowH - bh) / 2, w, bh), class: "bar" + (r.dim ? " dim" : "") }));
      const val = svgEl("text", { x: lw + w + 6, y: y + rowH / 2 + 4, class: "val" }); val.textContent = fmt(r.v);
      g.append(val, svgEl("rect", { x: 0, y, width: W, height: rowH, class: "hit" }));
      bindTip(g, tipFmt(r));
      svg.append(g);
    });
    host.append(svg);
  }

  function barsV(host, rows, tipFmt) {
    host.innerHTML = "";
    const W = 560, H = 230, pl = 36, pb = 26, pt = 10;
    const max = Math.max(...rows.map(r => r.v), 0) || 1;
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Gunningen per kwartaal" });
    const grid = svgEl("g", { class: "grid" });
    for (let v = 0; v <= top; v += step) {
      const y = pt + (H - pt - pb) * (1 - v / top);
      grid.append(svgEl("line", { x1: pl, x2: W, y1: y, y2: y }));
      const t = svgEl("text", { x: pl - 6, y: y + 4, "text-anchor": "end" }); t.textContent = nf.format(v); grid.append(t);
    }
    svg.append(grid);
    const slot = (W - pl) / rows.length, bw = Math.min(28, slot - 6);
    rows.forEach((r, i) => {
      const h = (H - pt - pb) * r.v / top, x = pl + i * slot + (slot - bw) / 2, y = H - pb - h;
      const g = svgEl("g", {});
      g.append(svgEl("path", { d: vBarPath(x, y, bw, Math.max(h, 1)), class: "bar" + (r.dim ? " dim" : "") }));
      if (i % 2 === 0 || rows.length <= 8) { const t = svgEl("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle" }); t.textContent = r.l; g.append(t); }
      g.append(svgEl("rect", { x: pl + i * slot, y: pt, width: slot, height: H - pt - pb, class: "hit" }));
      bindTip(g, tipFmt(r));
      svg.append(g);
    });
    host.append(svg);
  }
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= raw); }

  // ── filters & tabs ─────────────────────────────────────────────────────
  function renderFilter() {
    $("#sectFilter").innerHTML = ["Alle", ...SECTS].map(s => `<button type="button" aria-pressed="${s === sect}" data-s="${esc(s)}">${esc(s)}</button>`).join("");
  }
  $("#sectFilter").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    sect = b.dataset.s; renderFilter(); renderAll();
  });
  function showTab() {
    const t = (location.hash || "#barometer").slice(1);
    document.querySelectorAll(".tab").forEach(s => { s.hidden = s.id !== "tab-" + t; });
    document.querySelectorAll(".topnav a").forEach(a => a.classList.toggle("active", a.dataset.tab === t));
    $("#filters").hidden = t === "over";
  }
  window.addEventListener("hashchange", showTab);

  // ── 1. Sectorbarometer ─────────────────────────────────────────────────
  function renderBarometer() {
    const L = avis();
    const nOff = mean(L.map(a => a.off));
    const winners = L.flatMap(a => a.gagn);
    const bceShare = winners.length ? winners.filter(g => g.bce).length / winners.length : null;
    $("#heroLead").textContent = `${nf.format(L.length)} gunningen door ${nf.format(new Set(L.map(a => a.ach)).size)} Belgische aanbesteders sinds januari 2024${sect === "Alle" ? "" : " · " + sect}. Bron: TED, bijgewerkt op ${D.genere}.`;
    const kpis = [
      [nf.format(L.length), "Gunningen"],
      [eur(median(L.map(a => a.val))), "Mediane waarde per gunning"],
      [nOff == null ? "–" : nOff.toLocaleString("nl-BE", { maximumFractionDigits: 1 }), "Gemiddeld aantal offertes"],
      [pct(L.filter(a => a.off === 1).length / (L.filter(a => a.off != null).length || 1)), "Opdrachten met één offerte"],
      [pct(kmoShare(L)), "Winnaars die kmo zijn"],
      [pct(L.filter(a => a.prix).length / (L.length || 1)), "Gegund op prijs alleen"],
      [pct(bceShare), "Winnaars met geldig KBO-nummer"],
    ];
    $("#kpis").innerHTML = kpis.map(([v, l]) => `<div class="card"><div class="kpi-value">${esc(v)}</div><div class="kpi-label">${esc(l)}</div></div>`).join("");

    // per quarter
    const q = {};
    L.forEach(a => { const d = a.date; const k = d.slice(0, 4) + "-K" + (Math.floor((+d.slice(5, 7) - 1) / 3) + 1); q[k] = (q[k] || 0) + 1; });
    const curQ = (() => { const d = D.genere; return d.slice(0, 4) + "-K" + (Math.floor((+d.slice(5, 7) - 1) / 3) + 1); })();
    const qs = Object.keys(q).sort().map(k => ({ l: "’" + k.slice(2, 4) + " " + k.slice(5), k, v: q[k], dim: k === curQ }));
    barsV($("#chQuarter"), qs, r => `${esc(r.k)}<br><b>${nf.format(r.v)}</b> gunningen${r.dim ? "<br>lopend kwartaal, onvolledig" : ""}`);

    // per sector (always all sectors; highlight selection)
    const bySect = SECTS.map(s => ({ l: s, v: D.avis.filter(a => a.sect === s).length, dim: sect !== "Alle" && s !== sect })).sort((a, b) => b.v - a.v);
    barsH($("#chSector"), bySect, v => nf.format(v), r => `${esc(r.l)}<br><b>${nf.format(r.v)}</b> gunningen`);
    const byKmo = SECTS.map(s => ({ l: s, v: kmoShare(D.avis.filter(a => a.sect === s)) || 0, dim: sect !== "Alle" && s !== sect })).sort((a, b) => b.v - a.v);
    barsH($("#chKmo"), byKmo, v => pct(v), r => `${esc(r.l)}<br><b>${pct(r.v)}</b> van de winnaars is kmo`);
    const byOff = SECTS.map(s => ({ l: s, v: mean(D.avis.filter(a => a.sect === s).map(a => a.off)) || 0, dim: sect !== "Alle" && s !== sect })).sort((a, b) => b.v - a.v);
    const f1 = v => v.toLocaleString("nl-BE", { maximumFractionDigits: 1 });
    barsH($("#chOff"), byOff, f1, r => `${esc(r.l)}<br><b>${f1(r.v)}</b> offertes gemiddeld`);
  }

  // ── 2. Aanbesteders ────────────────────────────────────────────────────
  let aanbSort = { k: "score", dir: -1 };
  function aanbRows() {
    const by = {};
    avis().forEach(a => (by[a.ach] = by[a.ach] || []).push(a));
    return Object.entries(by).filter(([, l]) => l.length >= 5).map(([k, l]) => {
      const off = mean(l.map(a => a.off));
      const comp = {
        conc: off == null ? null : Math.min(off / 5, 1),
        kmo: kmoShare(l),
        lots: l.filter(a => a.lots > 1).length / l.length,
        kwal: l.filter(a => !a.prix).length / l.length,
      };
      const parts = Object.values(comp).filter(v => v != null);
      return { k, naam: ACH[k] || k, n: l.length, off, ...comp, score: parts.length ? Math.round(100 * parts.reduce((s, v) => s + v, 0) / parts.length) : null };
    });
  }
  function renderAanbesteders() {
    const q = $("#qAanb").value.trim().toLowerCase();
    let rows = aanbRows().filter(r => !q || r.naam.toLowerCase().includes(q));
    rows.sort((a, b) => { const x = a[aanbSort.k], y = b[aanbSort.k]; if (typeof x === "string") return aanbSort.dir * x.localeCompare(y); return aanbSort.dir * ((x ?? -1) - (y ?? -1)); });
    $("#aanbCount").textContent = `${rows.length} aanbesteders`;
    const cols = [["naam", "Aanbesteder", ""], ["n", "Gunningen", "num"], ["off", "Gem. offertes", "num"], ["kmo", "Kmo-winnaars", "num"], ["lots", "Met percelen", "num"], ["kwal", "Niet enkel prijs", "num"], ["score", "Kmo-score", ""]];
    const head = "<thead><tr>" + cols.map(([k, l, c]) => `<th class="${c}" data-sort="${k}"${aanbSort.k === k ? ` aria-sort="${aanbSort.dir < 0 ? "descending" : "ascending"}"` : ""}>${l}${aanbSort.k === k ? (aanbSort.dir < 0 ? " ↓" : " ↑") : ""}</th>`).join("") + "</tr></thead>";
    const shown = rows.slice(0, 150);
    const body = shown.map(r => `<tr><td>${esc(r.naam)}</td><td class="num">${r.n}</td><td class="num">${r.off == null ? "–" : r.off.toLocaleString("nl-BE", { maximumFractionDigits: 1 })}</td><td class="num">${pct(r.kmo)}</td><td class="num">${pct(r.lots)}</td><td class="num">${pct(r.kwal)}</td><td><div class="score"><div class="meter"><i style="width:${r.score || 0}%"></i></div><b>${r.score ?? "–"}</b></div></td></tr>`).join("");
    $("#tblAanb").innerHTML = head + "<tbody>" + (body || `<tr><td colspan="7" class="empty">Geen aanbesteders gevonden.</td></tr>`) + "</tbody>" + (rows.length > shown.length ? `<caption class="more" style="caption-side:bottom">Eerste 150 van ${rows.length} getoond.</caption>` : "");
  }
  $("#tblAanb").addEventListener("click", e => {
    const th = e.target.closest("th[data-sort]"); if (!th) return;
    const k = th.dataset.sort; aanbSort = { k, dir: aanbSort.k === k ? -aanbSort.dir : (k === "naam" ? 1 : -1) }; renderAanbesteders();
  });
  $("#qAanb").addEventListener("input", renderAanbesteders);

  // ── 3. Leden ───────────────────────────────────────────────────────────
  const LEDEN = new Map(D.membres.map(m => [m.bce, m]));
  let lidSel = null;
  function winsOf(bce, list) { return list.filter(a => a.gagn.some(g => g.bce === bce)); }
  function renderLeden() {
    const L = avis();
    const rows = D.membres.map(m => { const w = winsOf(m.bce, L); return { m, w, val: w.reduce((s, a) => s + (a.val || 0), 0), ach: new Set(w.map(a => a.ach)).size }; })
      .filter(r => r.w.length).sort((a, b) => b.w.length - a.w.length);
    const allWins = L.filter(a => a.gagn.some(g => LEDEN.has(g.bce)));
    $("#ledenKpis").innerHTML = [
      [nf.format(rows.length) + " / " + D.membres.length, "Leden met minstens één gunning"],
      [pct(allWins.length / (L.length || 1)), "Gunningen gewonnen door een lid"],
      [pct(rows.filter(r => r.m.kmo).length / (rows.length || 1)), "Winnende leden die kmo zijn"],
    ].map(([v, l]) => `<div class="card"><div class="kpi-value">${esc(v)}</div><div class="kpi-label">${esc(l)}</div></div>`).join("");
    $("#tblLeden").innerHTML = `<thead><tr><th>Lid (gesimuleerd)</th><th title="Grootte zoals de aanbesteder ze in TED opgeeft; niet altijd correct">Grootte (TED)</th><th class="num">Gunningen</th><th class="num">Aanbesteders</th></tr></thead><tbody>` +
      (rows.map(r => `<tr data-k="${esc(r.m.bce)}" class="${r.m.bce === lidSel ? "sel" : ""}"><td>${esc(r.m.nom)}<div class="small muted">KBO ${esc(r.m.bce)}</div></td><td>${r.m.kmo == null ? '<span class="chip outline">onbekend</span>' : r.m.kmo ? '<span class="chip emph">kmo</span>' : '<span class="chip">groot</span>'}</td><td class="num">${r.w.length}</td><td class="num">${r.ach}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Geen gunningen voor leden in deze subsector.</td></tr>`) + "</tbody>";
    renderLid();
  }
  function renderLid() {
    const host = $("#lidDetail");
    const m = LEDEN.get(lidSel);
    if (!m) { host.innerHTML = '<p class="muted">Kies een lid om zijn gunningen en concurrenten te zien.</p>'; return; }
    const L = avis(), w = winsOf(m.bce, L);
    // Concurrenten: andere winnaars bij dezelfde aanbesteders binnen dezelfde CPV-klasse.
    const markt = new Set(w.map(a => a.ach + "|" + a.cpv.slice(0, 5)));
    const conc = {};
    L.forEach(a => { if (!markt.has(a.ach + "|" + a.cpv.slice(0, 5))) return; a.gagn.forEach(g => { const k = g.bce || g.nom; if (g.bce === m.bce) return; conc[k] = conc[k] || { nom: g.nom, n: 0, lid: LEDEN.has(g.bce) }; conc[k].n++; }); });
    const top = Object.values(conc).sort((a, b) => b.n - a.n).slice(0, 8);
    host.innerHTML = `<p class="eyebrow">Lid · KBO ${esc(m.bce)}</p><h3>${esc(m.nom)}</h3>
      <dl class="kv"><dt>Gunningen</dt><dd>${w.length}</dd><dt>Gekende waarde</dt><dd>${eur(w.reduce((s, a) => s + (a.val || 0), 0))}</dd><dt>Aanbesteders</dt><dd>${new Set(w.map(a => a.ach)).size}</dd></dl>
      <div class="section-title">Laatste gunningen</div><ul>${w.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(a => `<li>${esc(a.titre)}<div class="small muted">${esc(ACH[a.ach] || "")} · ${esc(a.date)} · ${tedLink(a.id)}</div></li>`).join("")}</ul>
      <div class="section-title">Wie wint er nog op dezelfde markt</div>
      <p class="small muted">Andere winnaars bij dezelfde aanbesteders in dezelfde CPV-klasse. Wie meedong en verloor staat niet op TED: daarvoor is het proces-verbaal van opening van e-Procurement nodig.</p>
      <ul>${top.map(c => `<li>${esc(c.nom)} ${c.lid ? '<span class="chip emph">lid</span>' : ""} <span class="small muted">· ${c.n}×</span></li>`).join("") || "<li class='muted'>Geen andere winnaars gevonden.</li>"}</ul>`;
  }
  $("#tblLeden").addEventListener("click", e => { const tr = e.target.closest("tr[data-k]"); if (!tr) return; lidSel = tr.dataset.k; renderLeden(); });

  // ── 4. Signalen ────────────────────────────────────────────────────────
  let signSel = null;
  function appels() { return sect === "Alle" ? D.appels : D.appels.filter(a => a.sect === sect); }
  function renderSignalen() {
    const L = appels();
    $("#tblSign").innerHTML = `<thead><tr><th>Lopende oproep</th><th>Deadline</th><th class="num">Leden</th></tr></thead><tbody>` +
      (L.map(a => `<tr data-k="${esc(a.id)}" class="${a.id === signSel ? "sel" : ""}"><td>${esc(a.titre)}<div class="small muted">${esc(ACH[a.ach] || "")} · ${esc(a.sect)}</div></td><td class="num">${esc(a.limite)}</td><td class="num">${a.signaux.length ? `<span class="chip emph">${a.signaux.length}</span>` : '<span class="chip outline">0</span>'}</td></tr>`).join("") || `<tr><td colspan="3" class="empty">Geen lopende oproepen in deze subsector.</td></tr>`) + "</tbody>";
    const a = D.appels.find(x => x.id === signSel), host = $("#signDetail");
    if (!a) { host.innerHTML = '<p class="muted">Kies een oproep om de betrokken leden te zien.</p>'; return; }
    host.innerHTML = `<p class="eyebrow">Oproep · ${tedLink(a.id)}</p><h3>${esc(a.titre)}</h3>
      <dl class="kv"><dt>Aanbesteder</dt><dd>${esc(ACH[a.ach] || "")}</dd><dt>Deadline</dt><dd>${esc(a.limite)}</dd><dt>Geraamde waarde</dt><dd>${eur(a.est)}</dd><dt>Percelen</dt><dd>${a.lots}</dd><dt>CPV</dt><dd>${esc(a.cpv)}</dd></dl>
      ${a.desc ? `<p class="small">${esc(a.desc)}${a.desc.length >= 400 ? "…" : ""}</p>` : ""}
      <div class="section-title">Signaal naar ${a.signaux.length} leden</div>
      <ul>${a.signaux.map(b => { const m = LEDEN.get(b); return `<li>${esc(m.nom)} ${m.kmo ? '<span class="chip emph">kmo</span>' : ""}</li>`; }).join("") || "<li class='muted'>Geen lid met een passend profiel.</li>"}</ul>
      ${a.lots === 1 && a.signaux.filter(b => LEDEN.get(b).kmo).length >= 2 ? '<div class="banner info small"><div>Eén perceel en meerdere kmo-leden met dit profiel: kandidaat voor een <strong>consortium</strong> (bouwsteen 3).</div></div>' : ""}`;
  }
  $("#tblSign").addEventListener("click", e => { const tr = e.target.closest("tr[data-k]"); if (!tr) return; signSel = tr.dataset.k; renderSignalen(); });

  // ── Over ───────────────────────────────────────────────────────────────
  $("#overBody").innerHTML = `
    <h2>Wat deze demo toont</h2>
    <p>De federatielaag uit de nota: wat een federatie kan bouwen bovenop publieke aanbestedingsdata, en een commerciële speler niet. Alles draait op de officiële, gratis TED-API, zonder scraping van e-Procurement.</p>
    <div class="section-title">Data</div>
    <ul>
      <li>${esc(D.source)}: ${nf.format(D.avis.length)} gunningen en ${nf.format(D.appels.length)} lopende oproepen.</li>
      <li>Subsectoren: hypothese op basis van de hoofd-CPV-code (48/72 software, 30/32 ICT-hardware, 31 elektrotechniek, 38 meettechnologie, 42 machinebouw, 50/51 onderhoud en installatie). In een echt project gebeurt deze vertaling samen met de sectorexperts.</li>
      <li>KBO-koppeling: ${nf.format(D.stats_bce.avec_bce)} van ${nf.format(D.stats_bce.gagnants)} winnaars (${pct(D.stats_bce.avec_bce / D.stats_bce.gagnants)}) hebben een geldig Belgisch ondernemingsnummer (controlecijfer modulo 97). De rest zijn vooral buitenlandse winnaars of ontbrekende nummers.</li>
      <li>Ledenbestand: <strong>gesimuleerd</strong>, ${D.membres.length} willekeurig gekozen Belgische winnaars. Met het echte ledenbestand (KBO-nummer) werkt dezelfde koppeling meteen.</li>
    </ul>
    <div class="section-title">Grenzen van TED alleen</div>
    <ul>
      <li>Alleen opdrachten boven de Europese drempels; het grootste deel van de Belgische opdrachten staat enkel op e-Procurement.</li>
      <li>TED toont wie wint, niet wie meedong en verloor. Het proces-verbaal van opening (e-Procurement) heeft die informatie, maar geen officiële koppeling.</li>
      <li>Waarden van raamovereenkomsten zijn maxima en vertekenen totalen; daarom toont de demo medianen.</li>
    </ul>
    <div class="section-title">Volgende stappen</div>
    <ul>
      <li>AI-relevantiescore per lid en per oproep, op basis van het bestek (zoals in onze tool RFP Automation).</li>
      <li>Echt ledenbestand en vertaling sector naar CPV met de sectorexperts.</li>
      <li>Aanvulling met e-Procurement via een leverancier met API (optie A uit de nota).</li>
    </ul>`;

  function renderAll() { renderBarometer(); renderAanbesteders(); renderLeden(); renderSignalen(); }
  renderFilter(); renderAll(); showTab();
})();
