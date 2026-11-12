/* Rondleiding (guided tour) — spotlight + popover, vanilla JS. */
(function () {
  "use strict";
  const KEY = "tenderradar-tour-gezien";
  const go = tab => { if (location.hash !== "#" + tab) location.hash = tab; };
  const clickFirst = sel => { const r = document.querySelector(sel); if (r && !r.classList.contains("sel")) r.click(); };

  const STEPS = [
    { tab: "barometer", title: "Welkom bij Tenderradar",
      body: "Deze demo toont wat een sectorfederatie kan bouwen bovenop publieke aanbestedingsdata: inzichten voor de hele sector, niet alleen alerts voor één bedrijf.<br><br>De data komt echt uit TED (Belgische gunningen sinds 2024). Het <strong>ledenbestand is gesimuleerd</strong>.<br><br>Deze rondleiding duurt een minuut." },
    { tab: "barometer", sel: ".topnav", title: "Vijf onderdelen",
      body: "Sectorbarometer, Aanbesteders, Leden en Signalen volgen de bouwstenen uit de nota. Onder <em>Over de demo</em> staan de bronnen en aannames." },
    { tab: "barometer", sel: "#filters", title: "Kies een subsector",
      body: "Deze filter geldt voor alle onderdelen. Klik op een subsector om alle cijfers, tabellen en oproepen daarop te beperken. <em>Alle</em> toont het hele perimeter." },
    { tab: "barometer", sel: "#kpis", title: "De sector in één oogopslag",
      body: "Aantal gunningen, mediane waarde, concurrentie (gemiddeld aantal offertes, aandeel met één offerte), aandeel kmo-winnaars en opdrachten die enkel op prijs gegund worden." },
    { tab: "barometer", sel: "#chQuarter", title: "Beweeg over de grafieken",
      body: "Ga met de muis over een staaf om de exacte waarde te zien. Het lopende kwartaal staat in grijs: het is nog niet volledig." },
    { tab: "aanbesteders", sel: "#tblAanb", title: "Kmo-vriendelijkheid per aanbesteder",
      body: "Elke aanbesteder krijgt een score van 0 tot 100: concurrentie, kmo-winnaars, opdeling in percelen en kwaliteit naast prijs. <strong>Klik op een kolomtitel</strong> om te sorteren, of zoek een aanbesteder bij naam.<br><br>Dit is bewijsmateriaal voor belangenbehartiging." },
    { tab: "leden", sel: "#lidDetail", before: () => clickFirst("#tblLeden tbody tr[data-k]"), title: "Uw leden op de overheidsmarkt",
      body: "<strong>Klik op een lid</strong> in de tabel: rechts verschijnen zijn gunningen en wie er nog wint bij dezelfde aanbesteders. Leden worden gekoppeld via hun KBO-nummer.<br><br>Dit kan geen commerciële speler: die kent uw leden niet." },
    { tab: "signalen", sel: "#signDetail", before: () => clickFirst("#tblSign tbody tr[data-k]"), title: "Gerichte signalen",
      body: "Elke lopende oproep wordt vergeleken met het profiel van elk lid, zonder dat leden zelf filters instellen. <strong>Klik op een oproep</strong> om de betrokken leden te zien.<br><br>Wanneer meerdere kmo-leden passen, stelt de tool een consortium voor." },
    { tab: "opdrachten", sel: "#tblOpd", title: "Alle opdrachten in één lijst",
      body: "TED en e-Procurement samen. Het label toont de bron. <strong>Filter op <em>Alle inschrijvers</em></strong> om de opdrachten te zien waarvan het openingsverslag bekend is: daar ziet u niet alleen wie won, maar ook wie verloor.<br><br>Zoek op een onderneming om al haar opdrachten te vinden." },
    { tab: "over", sel: "#overBody", title: "Bronnen en grenzen",
      body: "Hier leest u welke data gebruikt is, wat TED niet toont (de verliezende inschrijvers, opdrachten onder de drempel) en wat de volgende stappen zijn.<br><br>U kunt deze rondleiding altijd opnieuw starten met de knop <em>Rondleiding</em> bovenaan." },
  ];

  let i = 0, lastFocus = null;
  const shade = document.createElement("div"); shade.className = "tour-shade";
  const spot = document.createElement("div"); spot.className = "tour-spot";
  const pop = document.createElement("div");
  pop.className = "tour-pop"; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-modal", "true"); pop.setAttribute("aria-labelledby", "tourTitle"); pop.tabIndex = -1;
  shade.hidden = spot.hidden = pop.hidden = true;
  document.body.append(shade, spot, pop);

  function place() {
    const s = STEPS[i];
    const el = s.sel && document.querySelector(s.sel);
    const vw = window.innerWidth, vh = window.innerHeight, m = 12;
    pop.classList.toggle("center", !el);
    if (!el) {
      spot.hidden = true; shade.classList.add("on");
      pop.style.left = Math.max(m, (vw - pop.offsetWidth) / 2) + "px";
      pop.style.top = Math.max(m, (vh - pop.offsetHeight) / 2) + "px";
      return;
    }
    shade.classList.remove("on");
    const r = el.getBoundingClientRect(), pad = 6;
    spot.hidden = false;
    Object.assign(spot.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: Math.min(r.height, vh) + pad * 2 + "px" });
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let top = r.bottom + pad + 10;
    if (top + ph > vh - m) top = r.top - pad - 10 - ph;          // above
    if (top < m) top = Math.max(m, vh - ph - m);                  // fallback: bottom of viewport
    let left = Math.min(Math.max(m, r.left), vw - pw - m);
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }

  function render() {
    const s = STEPS[i];
    go(s.tab);
    // laisse l'onglet s'afficher avant de cibler l'element
    requestAnimationFrame(() => {
      if (s.before) s.before();
      const el = s.sel && document.querySelector(s.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 40) window.scrollTo({ top: window.scrollY + r.top - 110, behavior: "instant" });
      } else window.scrollTo({ top: 0, behavior: "instant" });
      pop.innerHTML = `
        <button type="button" class="tour-x" aria-label="Rondleiding sluiten" data-a="close">×</button>
        <p class="eyebrow">Stap ${i + 1} van ${STEPS.length}</p>
        <h2 id="tourTitle">${s.title}</h2>
        <div class="tour-body">${s.body}</div>
        <div class="tour-dots" aria-hidden="true">${STEPS.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("")}</div>
        <div class="tour-actions">
          ${i > 0 ? '<button type="button" class="btn small" data-a="prev">Vorige</button>' : '<button type="button" class="btn small ghost" data-a="close">Overslaan</button>'}
          <button type="button" class="btn small primary" data-a="next">${i === STEPS.length - 1 ? "Aan de slag" : "Volgende"}</button>
        </div>`;
      pop.hidden = false;
      place();
      pop.querySelector('[data-a="next"]').focus();
    });
  }

  function start() {
    lastFocus = document.activeElement; i = 0;
    shade.hidden = false; document.body.classList.add("touring");
    render();
  }
  function stop() {
    shade.hidden = spot.hidden = pop.hidden = true; shade.classList.remove("on");
    document.body.classList.remove("touring");
    try { localStorage.setItem(KEY, "1"); } catch (e) { /* stockage indisponible : sans effet */ }
    go("barometer"); window.scrollTo({ top: 0 });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  pop.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a === "next") { if (i < STEPS.length - 1) { i++; render(); } else stop(); }
    else if (a === "prev" && i > 0) { i--; render(); }
    else if (a === "close") stop();
  });
  shade.addEventListener("click", stop);
  document.addEventListener("keydown", e => {
    if (pop.hidden) return;
    if (e.key === "Escape") stop();
    else if (e.key === "ArrowRight") pop.querySelector('[data-a="next"]').click();
    else if (e.key === "ArrowLeft" && i > 0) { i--; render(); }
    else if (e.key === "Tab") { // garde le focus dans la fenetre
      const f = [...pop.querySelectorAll("button")]; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("resize", () => { if (!pop.hidden) place(); });
  window.addEventListener("scroll", () => { if (!pop.hidden) place(); }, { passive: true });

  document.getElementById("tourBtn").addEventListener("click", start);
  let vu = false;
  try { vu = localStorage.getItem(KEY) === "1"; } catch (e) { /* ignore */ }
  if (!vu && !/[?&]notour\b/.test(location.search)) setTimeout(start, 400);
})();
