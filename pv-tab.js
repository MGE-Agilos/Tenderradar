/* Onglet « e-Procurement » : casestudy op een kleine steekproef van openingsverslagen (BOSA). */
(function () {
  "use strict";
  const PV = window.PV || [];
  const host = document.getElementById("tab-eprocurement");
  if (!host) return;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = new Intl.NumberFormat("nl-BE");
  const eur = v => (v == null ? "–" : "€ " + nf.format(Math.round(v)));
  const LEDEN = new Set((window.DATA?.membres || []).map(m => m.bce));
  const ext = (url, txt) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt)}</a>`;

  const nOff = PV.reduce((s, c) => s + c.offres.length, 0);
  const nBce = PV.reduce((s, c) => s + c.offres.filter(o => o.bce).length, 0);
  const nGun = PV.filter(c => c.attribution).length;
  const nNoTed = PV.filter(c => !c.ted).length;
  const nLid = PV.reduce((s, c) => s + c.offres.filter(o => LEDEN.has(o.bce)).length, 0);

  document.getElementById("pvKpis").innerHTML = [
    [nf.format(PV.length), "Opdrachten met openingsverslag"],
    [nf.format(nOff), "Ingediende offertes"],
    [Math.round(100 * nBce / (nOff || 1)) + "%", "Inschrijvers met geldig KBO-nummer"],
    [`${nGun} / ${PV.length}`, "Met gepubliceerde gunning"],
    [`${nNoTed} / ${PV.length}`, "Niet op TED gepubliceerd"],
  ].map(([v, l]) => `<div class="card"><div class="kpi-value">${esc(v)}</div><div class="kpi-label">${esc(l)}</div></div>`).join("");

  let sel = PV.find(c => c.attribution)?.ref || PV[0]?.ref;
  const statut = c => !c.attribution ? '<span class="chip outline">gunning niet gepubliceerd</span>'
    : c.attribution.statut === "gegund" ? '<span class="chip ok">gegund</span>'
    : `<span class="chip warn">${esc(c.attribution.statut || "onbekend")}</span>`;

  function render() {
    document.getElementById("tblPv").innerHTML = `<thead><tr><th>Opdracht</th><th class="num">Offertes</th><th>Status</th></tr></thead><tbody>` +
      PV.map(c => `<tr data-k="${esc(c.ref)}" class="${c.ref === sel ? "sel" : ""}"><td>${esc(c.titre)}<div class="small muted">${esc(c.acheteur)} · opening ${esc(c.ouverture)}${c.ted ? "" : ' · <span class="chip outline">niet op TED</span>'}</div></td><td class="num">${c.offres.length}</td><td>${statut(c)}</td></tr>`).join("") + "</tbody>";
    const c = PV.find(x => x.ref === sel), d = document.getElementById("pvDetail");
    if (!c) { d.innerHTML = '<p class="muted">Kies een opdracht.</p>'; return; }
    const metPrijs = c.offres.some(o => o.prix != null);
    const rol = o => !c.attribution ? '<span class="chip outline">onbekend</span>'
      : o.gagnant ? '<span class="chip ok">gewonnen</span>'
      : c.attribution.statut === "gegund" ? '<span class="chip bad">niet gekozen</span>' : '<span class="chip outline">geen gunning</span>';
    d.innerHTML = `<p class="eyebrow">Ref. ${esc(c.ref)}</p><h3>${esc(c.titre)}</h3>
      <dl class="kv"><dt>Aanbesteder</dt><dd>${esc(c.acheteur)}</dd><dt>Indiening</dt><dd>${esc(c.deadline)}</dd><dt>Opening</dt><dd>${esc(c.ouverture)}</dd><dt>CPV</dt><dd>${esc(c.cpv)}</dd><dt>Op TED</dt><dd>${c.ted ? "ja" : "nee"}</dd>
      <dt>Bron</dt><dd>${ext(c.url, "aankondiging")}${c.attribution ? " · " + ext(c.attribution.url, "gunning") : ""}</dd></dl>
      ${c.attribution && c.attribution.statut !== "gegund" ? `<div class="banner warn small"><div>De opdracht werd <strong>${esc(c.attribution.statut)}</strong>. De gunningsaankondiging vermeldt toch alle offertes${metPrijs ? " met hun prijs" : ""}.</div></div>` : ""}
      <div class="section-title">Alle inschrijvers volgens het openingsverslag</div>
      <div class="tbl-wrap" style="box-shadow:none"><table class="tbl"><thead><tr><th>Onderneming</th><th>Resultaat</th>${metPrijs ? '<th class="num">Offerte</th>' : ""}</tr></thead><tbody>
      ${c.offres.map(o => `<tr><td>${esc(o.nom)} ${LEDEN.has(o.bce) ? '<span class="chip emph">lid</span>' : ""}<div class="small muted">${o.bce ? "KBO " + esc(o.bce) : "geen Belgisch KBO-nummer"}</div></td><td>${rol(o)}</td>${metPrijs ? `<td class="num">${eur(o.prix)}</td>` : ""}</tr>`).join("")}
      </tbody></table></div>
      <p class="small muted">Het openingsverslag bevat geen prijzen. Bedragen verschijnen alleen wanneer de gunningsaankondiging ze vermeldt.</p>`;
  }
  document.getElementById("tblPv").addEventListener("click", e => {
    const tr = e.target.closest("tr[data-k]"); if (!tr) return; sel = tr.dataset.k; render();
  });
  if (nLid) document.getElementById("pvLeden").textContent = `${nLid === 1 ? "1 van deze offertes komt" : nLid + " van deze offertes komen"} van een (gesimuleerd) lid. Met het echte ledenbestand ziet de federatie voor elk lid waar het meedong en tegen wie.`;
  render();
})();
