"use strict";
/* ============================================================
   JEUX DE VOCABULAIRE (à charger après moteur.js, seulement dans les pages qui s'en servent)
   Pour un thème de vocabulaire avec jeux:true (et un dessin par mot dans e) :
   🏷️ étiquettes à placer · ➕ mots croisés · 🏹 mots fléchés.
   Ces jeux servent à s'entraîner : ils ne donnent pas d'autocollant.
   ============================================================ */
const JEUX = (() => {
  const modes = [
    {id:"etiquettes", nom:"🏷️ Étiquettes", d:"Place le bon mot sous chaque dessin"},
    {id:"croises",    nom:"➕ Mots croisés", d:"Une grille avec des dessins pour indices"},
    {id:"fleches",    nom:"🏹 Mots fléchés", d:"Le dessin est dans la grille, la flèche montre où écrire"},
  ];
  const NB_ETIQ = 8, NB_GRILLE = 8;
  const pareil = (a, b) => norm(a).replace(/[\s-]/g, "") === norm(b).replace(/[\s-]/g, "");
  const lettres = w => w.en.toUpperCase();
  const pourGrille = t => t.mots.filter(w => /^[a-z]+$/i.test(w.en));   // pas d'espace ni de tiret dans une grille

  /* ---------- 🏷️ étiquettes ---------- */
  function etiquettes(t, niveau){
    niveau = niveau || "facile";
    const liste = tirage(t, NB_ETIQ);
    const autres = melange(t.mots.filter(w => !liste.includes(w))).slice(0, 2);
    app.innerHTML = `<div class="pile" style="--c:${t.c}">
      <div class="haut"><button class="retour" id="ret">← ${t.nom}</button>
        <span class="niveaux"><button class="hp ${niveau==="facile"?"":"eteint"}" data-niv="facile">Facile</button><button class="hp ${niveau==="dur"?"":"eteint"}" data-niv="dur">Difficile</button></span></div>
      <h2>🏷️ Étiquettes</h2>
      <p class="doux">${niveau==="facile" ? "Glisse chaque mot sous le bon dessin (ou clique sur un mot, puis sous un dessin). Attention, il y a 2 mots en trop !" : "Écris le mot anglais sous chaque dessin."}</p>
      ${niveau==="facile" ? `<div class="banque" id="banque" aria-label="Mots à placer">${melange(liste.concat(autres)).map((w,n) => `<button class="puce" draggable="true" id="p${n}">${esc(w.en)}</button>`).join("")}</div>` : ""}
      <div class="planche">${liste.map((w,n) => `<div class="etiq"><div class="dess">${w.e}</div>
        ${niveau==="facile" ? `<span class="trou" data-i="${n}" tabindex="0" role="button" aria-label="Étiquette ${n+1}"></span>`
          : `<input class="trou-in" data-i="${n}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Étiquette ${n+1}">`}</div>`).join("")}</div>
      <div class="haut"><span></span><button class="btn" style="--c:${t.c}" id="ok">Vérifier</button></div>
      <div id="fb"></div></div>`;
    $("#ret").onclick = () => ecranTheme(t);
    app.querySelectorAll("[data-niv]").forEach(b => b.onclick = () => etiquettes(t, b.dataset.niv));
    if (niveau==="facile") glisser(); else {
      const ins = [...app.querySelectorAll(".trou-in")]; ins[0].focus();
      ins.forEach((inp, n) => inp.onkeydown = e => { if (e.key==="Enter"){ e.preventDefault(); n < ins.length-1 ? ins[n+1].focus() : $("#ok").click(); } });
    }
    $("#ok").onclick = () => {
      const zones = liste.map((w,n) => app.querySelector(`[data-i="${n}"]`));
      const reps = zones.map(z => niveau==="facile" ? z.textContent : z.value);
      if (reps.some(r => !r.trim())) { toast("Il reste des étiquettes vides"); return; }
      let bons = 0;
      liste.forEach((w,n) => { const z = zones[n], juste = pareil(reps[n], w.en);
        z.classList.remove("plein"); z.classList.add(juste ? "ok" : "ko"); if (juste) bons++;
        else z.insertAdjacentHTML("afterend", `<span class="corrige">${esc(w.en)}</span>`);
        z.insertAdjacentHTML("afterend", `<span class="doux petit">${esc(w.fr)}</span>`);
        if (niveau==="dur") z.disabled = true; });
      app.querySelectorAll(".puce").forEach(p => p.disabled = true); $("#ok").remove();
      const parfait = bons===liste.length;
      $("#fb").innerHTML = `<div class="pile"><div class="retourq ${parfait?"ok":"ko"}">${bons} / ${liste.length} ${parfait ? "Bravo, sans faute !" : "Les bonnes réponses sont écrites en vert."}</div>
        <div class="haut" style="justify-content:flex-end;flex-wrap:wrap;gap:10px">
          <button class="btn clair" id="encore">Autres dessins</button>
          ${niveau==="facile" ? `<button class="btn" style="--c:${t.c}" id="dur">Passer au difficile →</button>` : ""}</div></div>`;
      $("#encore").onclick = () => etiquettes(t, niveau);
      if ($("#dur")) $("#dur").onclick = () => etiquettes(t, "dur");
    };
  }

  /* glisser-déposer (ou clic puis clic) des .puce dans les .trou — même geste que les leçons à trous */
  function glisser(){
    const banque = $("#banque"); let choisi = null;
    const vide = tr => { if (tr.firstChild){ banque.appendChild(tr.firstChild); tr.classList.remove("plein"); } };
    const place = (p, tr) => { const ancien = p.parentElement; vide(tr); tr.appendChild(p); tr.classList.add("plein");
      if (ancien.classList.contains("trou") && ancien!==tr) ancien.classList.remove("plein"); p.classList.remove("sel"); choisi = null; };
    app.querySelectorAll(".puce").forEach(p => {
      p.ondragstart = e => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; };
      p.onclick = e => { e.stopPropagation(); if (p.parentElement.classList.contains("trou")) { vide(p.parentElement); return; }
        app.querySelectorAll(".puce.sel").forEach(q => q.classList.remove("sel")); p.classList.add("sel"); choisi = p; };
    });
    app.querySelectorAll(".trou").forEach(tr => {
      tr.ondragover = e => { e.preventDefault(); tr.classList.add("survol"); };
      tr.ondragleave = () => tr.classList.remove("survol");
      tr.ondrop = e => { e.preventDefault(); tr.classList.remove("survol"); const p = document.getElementById(e.dataTransfer.getData("text/plain")); if (p) place(p, tr); };
      const act = () => choisi ? place(choisi, tr) : vide(tr);
      tr.onclick = act; tr.onkeydown = e => { if (e.key==="Enter"||e.key===" "){ e.preventDefault(); act(); } };
    });
    banque.ondragover = e => e.preventDefault();
    banque.ondrop = e => { e.preventDefault(); const p = document.getElementById(e.dataTransfer.getData("text/plain"));
      if (p && p.parentElement.classList.contains("trou")) vide(p.parentElement); };
  }

  /* ---------- fabrication d'une grille ----------
     fleche=false : mots croisés classiques ; fleche=true : chaque mot a une case-indice juste avant sa 1re lettre.
     Renvoie { mots:[{w, r, c, dir, L}], let:Map("r,c"→lettre), ind:Map("r,c"→[n° de mot]), r0, c0, H, W } */
  function fabrique(liste, fleche){
    const maxW = fleche ? 10 : 13, maxH = fleche ? 12 : 13;
    let meilleure = null;
    for (let essai = 0; essai < 60; essai++){
      const ordre = melange(liste).sort((a,b) => lettres(b).length - lettres(a).length + (Math.random()-.5)*3);
      const L = new Map(), D = new Map(), I = new Map(), mots = [];
      let r0=0, r1=0, c0=0, c1=0;
      const k = (r,c) => r+","+c;
      const pose = (w, r, c, dir) => {
        const m = lettres(w), dr = dir==="d"?1:0, dc = dir==="a"?1:0;
        for (let i=0;i<m.length;i++){ const q = k(r+dr*i, c+dc*i); L.set(q, m[i]); D.set(q, (D.get(q)||"")+dir); }
        r0=Math.min(r0,r); c0=Math.min(c0,c); r1=Math.max(r1,r+dr*(m.length-1)); c1=Math.max(c1,c+dc*(m.length-1));
        if (fleche){ const q = k(r-dr, c-dc); I.set(q, (I.get(q)||[]).concat(mots.length)); r0=Math.min(r0,r-dr); c0=Math.min(c0,c-dc); }
        mots.push({w, r, c, dir, L:m.length});
      };
      const score = (w, r, c, dir) => {
        const m = lettres(w), dr = dir==="d"?1:0, dc = dir==="a"?1:0; let x = 0;
        const avant = k(r-dr, c-dc), apres = k(r+dr*m.length, c+dc*m.length);
        if (L.has(avant) || L.has(apres)) return -1;
        if (fleche){ const ind = I.get(avant); if (ind && (ind.length>=2 || ind.some(n => mots[n].dir===dir))) return -1; }
        for (let i=0;i<m.length;i++){
          const rr = r+dr*i, cc = c+dc*i, q = k(rr,cc);
          if (I.has(q)) return -1;
          if (L.has(q)){ if (L.get(q)!==m[i] || D.get(q).includes(dir)) return -1; x++; }
          else if (L.has(k(rr+dc, cc+dr)) || L.has(k(rr-dc, cc-dr))) return -1;
        }
        const nr0 = Math.min(r0, r-(fleche?dr:0)), nc0 = Math.min(c0, c-(fleche?dc:0));
        const nr1 = Math.max(r1, r+dr*(m.length-1)), nc1 = Math.max(c1, c+dc*(m.length-1));
        if (nr1-nr0+1 > maxH || nc1-nc0+1 > maxW) return -1;
        return x;
      };
      for (const w of ordre){
        if (mots.length >= NB_GRILLE) break;
        if (!mots.length){ if (lettres(w).length <= maxW-1){ pose(w, 0, 0, "a"); } continue; }
        let opts = [];
        const m = lettres(w);
        for (const [q, ch] of L) for (let i=0;i<m.length;i++) if (m[i]===ch){
          const [r,c] = q.split(",").map(Number);
          for (const dir of ["a","d"]){ const rr = dir==="d" ? r-i : r, cc = dir==="a" ? c-i : c;
            const s = score(w, rr, cc, dir); if (s > 0) opts.push({rr, cc, dir, s}); }
        }
        if (!opts.length) continue;
        const max = Math.max(...opts.map(o => o.s)); opts = melange(opts.filter(o => o.s===max));
        pose(w, opts[0].rr, opts[0].cc, opts[0].dir);
      }
      const g = { mots, let:L, ind:I, r0, c0, H:r1-r0+1, W:c1-c0+1 };
      const val = mots.length*1000 - g.H*g.W - Math.abs(mots.filter(m=>m.dir==="a").length - mots.length/2)*20;
      if (!meilleure || val > meilleure.val) meilleure = {...g, val};
      if (mots.length >= NB_GRILLE && essai > 15) break;
    }
    return meilleure;
  }

  /* ---------- affichage et saisie communs aux deux grilles ---------- */
  function jouerGrille(t, fleche){
    const g = fabrique(pourGrille(t), fleche);
    const k = (r,c) => r+","+c;
    const num = new Map(); let n = 0;
    if (!fleche) [...g.mots].sort((a,b) => a.r-b.r || a.c-b.c).forEach(m => { const q = k(m.r,m.c); if (!num.has(q)) num.set(q, ++n); m.n = num.get(q); });
    const cellsDe = m => Array.from({length:m.L}, (_,i) => k(m.r + (m.dir==="d"?i:0), m.c + (m.dir==="a"?i:0)));
    let html = "";
    for (let r = g.r0; r < g.r0+g.H; r++) for (let c = g.c0; c < g.c0+g.W; c++){
      const q = k(r,c);
      if (g.let.has(q)) html += `<div class="case">${num.has(q) ? `<span class="num">${num.get(q)}</span>` : ""}<input data-q="${q}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Case"></div>`;
      else if (fleche && g.ind.has(q)){
        const ids = g.ind.get(q);
        html += `<button class="case cind${ids.length>1?" deux":""}" data-ind="${ids.join(" ")}">${ids.map(i => { const m = g.mots[i];
          return `<span class="ind">${m.w.e}<b>${m.dir==="a"?"→":"↓"}</b></span>`; }).join("")}</button>`;
      }
      else html += `<div class="case ${fleche?"noire":"vide"}"></div>`;
    }
    const liste = d => g.mots.filter(m => m.dir===d).sort((a,b) => a.n-b.n).map(m =>
      `<button class="def" data-mot="${g.mots.indexOf(m)}"><b>${m.n}</b><span class="mini">${m.w.e}</span><span class="doux">${m.L} lettres</span><span class="fr">${esc(m.w.fr)}</span></button>`).join("");
    app.innerHTML = `<div class="pile" style="--c:${t.c}">
      <div class="haut"><button class="retour" id="ret">← ${t.nom}</button><button class="hp" id="aide" aria-pressed="false">💡 Voir le français</button></div>
      <h2>${fleche ? "🏹 Mots fléchés" : "➕ Mots croisés"}</h2>
      <p class="doux">${fleche ? "Chaque dessin est un indice : écris son nom en anglais dans le sens de la flèche. Clique sur un dessin pour commencer." : "Écris le nom de chaque dessin dans la grille, en anglais. Clique sur un dessin pour aller à sa place."}</p>
      <div class="zoom" id="zoom"><span class="doux">Choisis une case pour commencer.</span></div>
      <div class="grille${fleche?" fl":""}" style="--n:${g.W}">${html}</div>
      ${fleche ? "" : `<div class="defs"><div><h3>Horizontal →</h3>${liste("a")}</div><div><h3>Vertical ↓</h3>${liste("d")}</div></div>`}
      <div class="haut" style="justify-content:flex-end;flex-wrap:wrap;gap:10px">
        <button class="btn clair" id="sol">Voir la solution</button>
        <button class="btn clair" id="neuf">Nouvelle grille</button>
        <button class="btn" style="--c:${t.c}" id="ok">Vérifier</button></div>
      <div id="fb"></div></div>`;
    $("#ret").onclick = () => ecranTheme(t);
    $("#neuf").onclick = () => jouerGrille(t, fleche);
    $("#aide").onclick = e => { const on = app.firstElementChild.classList.toggle("aide"); e.currentTarget.setAttribute("aria-pressed", on); montre(); };

    const inp = q => app.querySelector(`input[data-q="${q}"]`);
    const motsDe = q => g.mots.filter(m => cellsDe(m).includes(q));
    let actif = null;   // mot en cours
    const montre = () => {
      app.querySelectorAll(".case.actif").forEach(x => x.classList.remove("actif"));
      if (!actif) return;
      cellsDe(actif).forEach(q => inp(q).parentElement.classList.add("actif"));
      $("#zoom").innerHTML = `<span class="gros">${actif.w.e}</span><span><b>${actif.n ? actif.n + " " : ""}${actif.dir==="a" ? "→ horizontal" : "↓ vertical"}</b><br>
        <span class="doux">${actif.L} lettres${app.firstElementChild.classList.contains("aide") ? " · " + esc(actif.w.fr) : ""}</span></span>`;
    };
    const choisit = (m, q) => { actif = m; montre(); inp(q || cellsDe(m)[0]).focus(); };
    app.querySelectorAll(".grille input").forEach(el => {
      const q = el.dataset.q;
      el.onfocus = () => { el.select(); if (!actif || !cellsDe(actif).includes(q)){ const ms = motsDe(q); actif = ms.find(m => actif && m.dir===actif.dir) || ms[0]; montre(); } };
      el.onclick = () => { const ms = motsDe(q); if (ms.length > 1 && actif && document.activeElement===el && el.dataset.vu){ actif = ms.find(m => m!==actif); montre(); } el.dataset.vu = 1; };
      el.onblur = () => delete el.dataset.vu;
      el.oninput = () => {
        const v = el.value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase(); el.value = v;
        el.parentElement.classList.remove("ok","ko");
        if (v && actif){ const cs = cellsDe(actif), i = cs.indexOf(q); if (i < cs.length-1) inp(cs[i+1]).focus(); }
      };
      el.onkeydown = e => {
        if (!actif) return; const cs = cellsDe(actif), i = cs.indexOf(q);
        if (e.key==="Backspace" && !el.value && i > 0){ e.preventDefault(); const p = inp(cs[i-1]); p.value = ""; p.focus(); }
        const fl = {ArrowRight:[0,1], ArrowLeft:[0,-1], ArrowDown:[1,0], ArrowUp:[-1,0]}[e.key];
        if (fl){ e.preventDefault(); const [r,c] = q.split(",").map(Number), d = inp(k(r+fl[0], c+fl[1]));
          if (d){ const dir = fl[0] ? "d" : "a"; const m = motsDe(d.dataset.q).find(m => m.dir===dir); if (m) actif = m; d.focus(); montre(); } }
        if (e.key==="Enter"){ e.preventDefault(); $("#ok").click(); }
      };
    });
    app.querySelectorAll("[data-ind]").forEach(b => b.onclick = () => {
      const ids = b.dataset.ind.split(" ").map(Number);
      const i = ids.length > 1 && actif === g.mots[ids[0]] ? ids[1] : ids[0];
      choisit(g.mots[i]);
    });
    app.querySelectorAll("[data-mot]").forEach(b => b.onclick = () => choisit(g.mots[+b.dataset.mot]));

    const verifie = () => {
      let vides = 0;
      for (const [q, ch] of g.let){ const el = inp(q); el.parentElement.classList.remove("ok","ko");
        if (!el.value) vides++; else el.parentElement.classList.add(el.value===ch ? "ok" : "ko"); }
      const trouves = g.mots.filter(m => cellsDe(m).every(q => inp(q).value===g.let.get(q))).length;
      const fini = trouves===g.mots.length;
      $("#fb").innerHTML = `<div class="retourq ${fini?"ok":"ko"}">${fini ? `Bravo, grille terminée : ${trouves} mots sur ${trouves} !`
        : `${trouves} mot${trouves>1?"s":""} sur ${g.mots.length} trouvé${trouves>1?"s":""}.${app.querySelector(".case.ko") ? " Les lettres en rouge sont à corriger." : ""}${vides ? " Il reste des cases vides." : ""}`}</div>`;
      if (fini) $("#fb").insertAdjacentHTML("beforeend", `<button class="btn" style="--c:${t.c};margin-top:10px" id="neuf2">Une autre grille →</button>`);
      if ($("#neuf2")) $("#neuf2").onclick = () => jouerGrille(t, fleche);
    };
    $("#ok").onclick = verifie;
    $("#sol").onclick = () => { for (const [q, ch] of g.let) inp(q).value = ch; verifie();
      $("#fb").insertAdjacentHTML("afterbegin", `<p class="doux">Voici la solution. Lis bien les mots, puis essaie une nouvelle grille !</p>`); };
    return g;
  }

  return { modes, etiquettes, croises: t => jouerGrille(t, false), fleches: t => jouerGrille(t, true), fabrique, pourGrille };
})();
