/* Onglet « Opdrachten » : TED en e-Procurement (BOSA) samen in één lijst. */
(function () {
  "use strict";
  if (location.hash === "#eprocurement") location.replace("#opdrachten"); // oude link
  const D = window.DATA, PV = window.PV || [];
  const host = document.getElementById("tab-opdrachten");
  if (!host || !D) return;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("nl-BE");
  const eur = v => (v == null ? "–" : "€ " + nf.format(Math.round(v)));
  const ext = (url, txt) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt)}</a>`;
  const LEDEN = new Set(D.membres.map(m => m.bce));
  const KMO = new Set(["sme", "small", "micro", "medium"]);
  const SECT = { "48": "Software & digitale diensten", "72": "Software & digitale diensten", "30": "ICT-hardware & telecom", "32": "ICT-hardware & telecom", "31": "Elektrotechniek & energie", "38": "Meet- & labotechnologie", "42": "Machinebouw", "50": "Onderhoud & installatie", "51": "Onderhoud & installatie" };

  // ── Eén gemeenschappelijk formaat voor beide bronnen ────────────────
  const rows = [];
  PV.forEach(c => rows.push({
    k: "pv:" + c.ref, bron: "e-Procurement", alleInschrijvers: true, ted: c.ted,
    titre: c.titre, ach: c.acheteur, date: c.attribution?.date || c.ouverture, cpv: c.cpv,
    sect: SECT[(c.cpv || "").slice(0, 2)] || "Andere",
    statut: c.attribution ? c.attribution.statut : "gunning niet gepubliceerd",
    offres: c.offres.length,
    partijen: c.offres.map(o => ({ nom: o.nom, bce: o.bce, res: !c.attribution ? "onbekend" : o.gagnant ? "gewonnen" : c.attribution.statut === "gegund" ? "niet gekozen" : "geen gunning", prix: o.prix })),
    liens: [["aankondiging", c.url], ...(c.attribution ? [["gunning", c.attribution.url]] : [])],
    meta: [["Opening", c.ouverture], ["Op TED", c.ted ? "ja" : "nee"]],
  }));
  D.avis.forEach(a => rows.push({
    k: "ted:" + a.id, bron: "TED", alleInschrijvers: false, ted: true,
    titre: a.titre, ach: D.acheteurs[a.ach] || "", date: a.date, cpv: a.cpv, sect: a.sect,
    statut: "gegund", offres: a.off, val: a.val,
    partijen: a.gagn.map(g => ({ nom: g.nom, bce: g.bce, res: "gewonnen", kmo: g.taille ? KMO.has(g.taille) : null })),
    liens: [["TED-aankondiging", `https://ted.europa.eu/nl/notice/-/detail/${a.id}`]],
    meta: [["Waarde", eur(a.val)], ["Percelen", a.lots], ["Enkel prijs", a.prix ? "ja" : "nee"]],
  }));
  rows.sort((x, y) => (y.alleInschrijvers - x.alleInschrijvers) || String(y.date).localeCompare(String(x.date)));

  let bron = "Alle", sel = rows[0]?.k;
  const sect = () => document.querySelector('#sectFilter button[aria-pressed="true"]')?.dataset.s || "Alle";
  const statutChip = r => r.statut === "gegund" ? '<span class="chip ok">gegund</span>'
    : r.statut === "gunning niet gepubliceerd" ? '<span class="chip outline">gunning niet gepubliceerd</span>'
    : `<span class="chip warn">${esc(r.statut)}</span>`;
  const resChip = s => ({ "gewonnen": '<span class="chip ok">gewonnen</span>', "niet gekozen": '<span class="chip bad">niet gekozen</span>' }[s] || `<span class="chip outline">${esc(s)}</span>`);

  function zichtbaar() {
    const q = $("#qOpd").value.trim().toLowerCase(), s = sect();
    return rows.filter(r => (s === "Alle" || r.sect === s)
      && (bron === "Alle" || (bron === "Alle inschrijvers" ? r.alleInschrijvers : r.bron === bron))
      && (!q || (r.titre + " " + r.ach + " " + r.partijen.map(p => p.nom).join(" ")).toLowerCase().includes(q)));
  }

  function render() {
    const L = zichtbaar(), toon = L.slice(0, 150);
    const nPv = L.filter(r => r.alleInschrijvers).length;
    $("#opdKpis").innerHTML = [
      [nf.format(L.length), "Opdrachten in de selectie"],
      [nf.format(L.length - nPv), "Uit TED: winnaar bekend"],
      [nf.format(nPv), "Uit e-Procurement: alle inschrijvers"],
      [nf.format(L.filter(r => !r.ted).length), "Niet op TED gepubliceerd"],
    ].map(([v, l]) => `<div class="card"><div class="kpi-value">${esc(v)}</div><div class="kpi-label">${esc(l)}</div></div>`).join("");
    $("#bronFilter").innerHTML = ["Alle", "TED", "e-Procurement", "Alle inschrijvers"].map(b => `<button type="button" aria-pressed="${b === bron}" data-b="${b}">${b}</button>`).join("");
    $("#tblOpd").innerHTML = `<thead><tr><th>Opdracht</th><th>Bron</th><th class="num">Offertes</th><th>Status</th></tr></thead><tbody>` +
      (toon.map(r => `<tr data-k="${esc(r.k)}" class="${r.k === sel ? "sel" : ""}"><td>${esc(r.titre)}<div class="small muted">${esc(r.ach)} · ${esc(r.date)}</div></td>
        <td>${r.bron === "TED" ? '<span class="chip info">TED</span>' : '<span class="chip emph">e-Procurement</span>'}${r.bron !== "TED" && r.ted ? ' <span class="chip info">TED</span>' : ""}</td>
        <td class="num">${r.offres ?? "–"}</td><td>${statutChip(r)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Geen opdrachten in deze selectie.</td></tr>`) + "</tbody>" +
      (L.length > toon.length ? `<caption class="more" style="caption-side:bottom">Eerste 150 van ${nf.format(L.length)} getoond: verfijn met de zoekbalk of de filters.</caption>` : "");
    detail();
  }

  function detail() {
    const r = rows.find(x => x.k === sel), d = $("#opdDetail");
    if (!r) { d.innerHTML = '<p class="muted">Kies een opdracht.</p>'; return; }
    const metPrijs = r.partijen.some(p => p.prix != null);
    d.innerHTML = `<p class="eyebrow">${esc(r.bron)}${r.bron !== "TED" && r.ted ? " · ook op TED" : ""}</p><h3>${esc(r.titre)}</h3>
      <dl class="kv"><dt>Aanbesteder</dt><dd>${esc(r.ach)}</dd><dt>Datum</dt><dd>${esc(r.date)}</dd><dt>CPV</dt><dd>${esc(r.cpv)}</dd>
      ${r.meta.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt>Offertes</dt><dd>${r.offres ?? "–"}</dd>
      <dt>Bron</dt><dd>${r.liens.map(([t, u]) => ext(u, t)).join(" · ")}</dd></dl>
      ${r.statut !== "gegund" && r.statut !== "gunning niet gepubliceerd" ? `<div class="banner warn small"><div>De opdracht werd <strong>${esc(r.statut)}</strong>.${metPrijs ? " De gunningsaankondiging vermeldt toch alle offertes met hun prijs." : ""}</div></div>` : ""}
      <div class="section-title">${r.alleInschrijvers ? "Alle inschrijvers (openingsverslag)" : "Winnaar(s)"}</div>
      <div class="tbl-wrap" style="box-shadow:none"><table class="tbl"><thead><tr><th>Onderneming</th><th>Resultaat</th>${metPrijs ? '<th class="num">Offerte</th>' : ""}</tr></thead><tbody>
      ${r.partijen.slice(0, 15).map(p => `<tr><td>${esc(p.nom)} ${LEDEN.has(p.bce) ? '<span class="chip emph">lid</span>' : ""}<div class="small muted">${p.bce ? "KBO " + esc(p.bce) : "geen Belgisch KBO-nummer"}</div></td><td>${resChip(p.res)}</td>${metPrijs ? `<td class="num">${eur(p.prix)}</td>` : ""}</tr>`).join("") || '<tr><td colspan="3" class="muted">Geen winnaar vermeld.</td></tr>'}
      ${r.partijen.length > 15 ? `<tr><td colspan="3" class="muted">+ ${r.partijen.length - 15} andere${r.alleInschrijvers ? " inschrijvers" : " winnaars (raamovereenkomst)"}</td></tr>` : ""}
      </tbody></table></div>
      <p class="small muted">${r.alleInschrijvers
        ? "Het openingsverslag toont iedereen die een offerte indiende, ook wie verloor. Het bevat geen prijzen; bedragen staan er alleen als de gunning ze vermeldt."
        : `TED toont alleen de winnaar${r.offres ? ` (${r.offres} offertes ontvangen)` : ""}. Wie verloor staat in het openingsverslag van e-Procurement.`}</p>`;
  }

  $("#tblOpd").addEventListener("click", e => { const tr = e.target.closest("tr[data-k]"); if (!tr) return; sel = tr.dataset.k; render(); });
  $("#bronFilter").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bron = b.dataset.b; render(); });
  $("#qOpd").addEventListener("input", render);
  $("#sectFilter").addEventListener("click", () => setTimeout(render, 0));
  render();
})();
