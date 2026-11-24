"use strict";
/* ============================================================
   MOTEUR COMMUN — Luka's sticker book
   Mécanique partagée par toutes les matières : écrans, exercices,
   autocollants, sauvegarde. Le contenu est dans <matière>/index.html.
   ⚠ Ne jamais changer CLE : toute la progression de Luka y est stockée.
   ============================================================ */
const THEMES = [];
let PAGE = { titre:"Luka's sticker book", e:"" };
const MAITRISE = 3;      // bonnes réponses pour gagner l'autocollant d'un mot
const NB_Q = 10;         // questions par série
const CLE = "lukaEnglish.v1";

/* découpe un texte en morceaux : {txt} ou {ok:[...]} */
function decoupe(texte){
  const parts = []; let n = 0;
  texte.replace(/\[([^\]]+)\]|([^\[]+)/g, (m, trou, txt) => { parts.push(trou ? {i:n++, ok:trou.split("|")} : {txt}); return ""; });
  return parts;
}
const sansAccent = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const normT = s => s.toLowerCase().replace(/[’`]/g,"'").replace(/[()]/g,"").replace(/\s+/g," ").trim();

function ecranSvt(t){
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← Accueil</button>
    <div class="entete"><h1>${t.e} ${t.nom}</h1><div class="compteur">⭐ ${acquis(t)} / ${t.mots.length}</div></div>
    <p class="doux">Facile : glisse les mots dans les trous. Difficile : tape-les toi-même. Réussis le niveau difficile sans faute pour gagner l'autocollant.</p>
    <div class="themes">${t.textes.map(x => { const n = etat.m[t.id+":"+x.id] || 0; return `
      <div class="theme" style="--c:${t.c};grid-template-columns:auto 1fr auto">
        <span class="gros" aria-hidden="true">${n>=2 ? x.e : "📝"}</span>
        <span><h2 style="font-size:1.2rem">${esc(x.titre)}</h2><span class="doux">${n>=2 ? "Maîtrisé ⭐" : n===1 ? "Facile réussi, essaie le difficile !" : "À apprendre"}</span></span>
        <span class="niveaux"><button class="btn clair" data-t="${x.id}" data-n="facile">Facile</button><button class="btn" style="--c:${t.c}" data-t="${x.id}" data-n="dur">Difficile</button></span>
      </div>`; }).join("")}
    </div>
    <button class="mode" id="alb"><b>🗂️ Mon album</b><span>Une leçon maîtrisée = un autocollant</span></button>
  </div>`;
  $("#ret").onclick = accueil; $("#alb").onclick = () => album(t);
  app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => trous(t, t.textes.find(x => x.id===b.dataset.t), b.dataset.n));
}

function trous(t, x, niveau){
  const parts = decoupe(x.texte), blancs = parts.filter(p => p.ok);
  let html = "";
  if (niveau==="facile"){
    const autres = melange(t.textes.filter(y => y!==x).flatMap(y => decoupe(y.texte).filter(p => p.ok).map(p => p.ok[0]))
      .filter(m => !blancs.some(b => normT(b.ok[0])===normT(m))));
    const pioche = melange(blancs.map(b => b.ok[0]).concat([...new Set(autres)].slice(0, 2)));
    html = `<div class="banque" id="banque" aria-label="Mots à placer">${pioche.map((m,n) => `<button class="puce" draggable="true" id="p${n}">${esc(m)}</button>`).join("")}</div>`;
  }
  const corps = parts.map(p => p.txt !== undefined ? esc(p.txt).replace(/\n/g,"<br>")
    : niveau==="facile" ? `<span class="trou" data-i="${p.i}" tabindex="0" role="button" aria-label="Trou ${p.i+1}"></span>`
    : `<input class="trou-in" data-i="${p.i}" autocomplete="off" spellcheck="false" style="width:${Math.max(6, p.ok[0].length+2)}ch" aria-label="Trou ${p.i+1}">`).join("");
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <div class="haut"><button class="retour" id="ret">← ${t.nom}</button><span class="hp">${niveau==="facile" ? "Facile" : "Difficile"}</span></div>
    <h2>${x.e} ${esc(x.titre)}</h2>
    <p class="doux">${niveau==="facile" ? "Glisse chaque mot dans le bon trou avec la souris (ou clique sur un mot, puis sur un trou). Attention, il y a des mots en trop !" : "Tape le mot qui manque dans chaque trou. Les majuscules ne comptent pas."}</p>
    ${html}
    <div class="texte">${corps}</div>
    <div class="haut"><span></span><button class="btn" style="--c:${t.c}" id="ok">Vérifier</button></div>
    <div id="fb"></div>
  </div>`;
  $("#ret").onclick = () => ecranTheme(t);

  if (niveau==="facile"){
    const banque = $("#banque"); let choisi = null;
    const place = (puce, trou) => {
      if (trou.firstChild) banque.appendChild(trou.firstChild);
      trou.appendChild(puce); trou.classList.add("plein"); puce.classList.remove("sel"); choisi = null;
    };
    const vide = trou => { if (trou.firstChild){ banque.appendChild(trou.firstChild); trou.classList.remove("plein"); } };
    app.querySelectorAll(".puce").forEach(p => {
      p.ondragstart = e => { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "move"; };
      p.onclick = e => { e.stopPropagation(); if (p.parentElement.classList.contains("trou")) { vide(p.parentElement); return; }
        app.querySelectorAll(".puce.sel").forEach(q => q.classList.remove("sel")); p.classList.add("sel"); choisi = p; };
    });
    app.querySelectorAll(".trou").forEach(tr => {
      tr.ondragover = e => { e.preventDefault(); tr.classList.add("survol"); };
      tr.ondragleave = () => tr.classList.remove("survol");
      tr.ondrop = e => { e.preventDefault(); tr.classList.remove("survol"); const p = document.getElementById(e.dataTransfer.getData("text/plain"));
        if (p){ const ancien = p.parentElement; place(p, tr); if (ancien.classList.contains("trou") && ancien!==tr) ancien.classList.remove("plein"); } };
      const act = () => choisi ? place(choisi, tr) : vide(tr);
      tr.onclick = act; tr.onkeydown = e => { if (e.key==="Enter"||e.key===" "){ e.preventDefault(); act(); } };
    });
    banque.ondragover = e => e.preventDefault();
    banque.ondrop = e => { e.preventDefault(); const p = document.getElementById(e.dataTransfer.getData("text/plain"));
      if (p && p.parentElement.classList.contains("trou")) vide(p.parentElement); };
  } else {
    const ins = [...app.querySelectorAll(".trou-in")]; ins[0].focus();
    ins.forEach((inp, n) => inp.onkeydown = e => { if (e.key==="Enter"){ e.preventDefault(); n < ins.length-1 ? ins[n+1].focus() : $("#ok").click(); } });
  }

  $("#ok").onclick = () => {
    let bons = 0, accents = false;
    const reps = blancs.map(b => {
      const z = app.querySelector(`[data-i="${b.i}"]`);
      return niveau==="facile" ? (z.textContent || "") : z.value;
    });
    if (reps.some(r => !r.trim())) { toast("Il reste des trous à remplir"); return; }
    blancs.forEach((b, n) => {
      const z = app.querySelector(`[data-i="${b.i}"]`), r = normT(reps[n]);
      const art = v => v.replace(/^(le |la |les |l'|un |une |des )/,"");
      let juste = b.ok.some(o => normT(o)===r || (niveau==="dur" && art(normT(o))===art(r)));
      if (!juste && niveau==="dur" && b.ok.some(o => sansAccent(normT(o))===sansAccent(r))) { juste = true; accents = true; }
      z.classList.remove("plein"); z.classList.add(juste ? "ok" : "ko");
      if (juste) bons++;
      else z.insertAdjacentHTML("afterend", `<span class="corrige">${esc(b.ok[0])}</span>`);
      if (niveau==="dur") z.disabled = true;
    });
    app.querySelectorAll(".puce").forEach(p => p.disabled = true);
    $("#ok").remove();
    const parfait = bons===blancs.length, cle = t.id+":"+x.id, avant = etat.m[cle] || 0;
    let gagne = false;
    if (parfait){ const val = niveau==="dur" ? 2 : 1; if (val > avant){ etat.m[cle] = val; sauver(); gagne = val===2; } }
    $("#fb").innerHTML = `<div class="pile">
      <div class="retourq ${parfait?"ok":"ko"}">${bons} / ${blancs.length} ${parfait ? (gagne ? `Bravo, nouvel autocollant : <span class="gagne" style="display:inline-block">${x.e}</span>` : "Bravo, sans faute !") : "Les bonnes réponses sont écrites en vert à côté des erreurs."}
      ${accents ? `<br><span style="font-weight:400">💡 Attention aux accents : c'est compté juste, mais regarde bien l'orthographe dans ta leçon.</span>` : ""}</div>
      <div class="haut" style="justify-content:flex-end;flex-wrap:wrap;gap:10px">
        <button class="btn clair" id="encore">Recommencer</button>
        ${niveau==="facile" && parfait ? `<button class="btn" style="--c:${t.c}" id="dur">Passer au difficile →</button>` : `<button class="btn" style="--c:${t.c}" id="liste">Autres leçons</button>`}
      </div></div>`;
    $("#encore").onclick = () => trous(t, x, niveau);
    if ($("#dur")) $("#dur").onclick = () => trous(t, x, "dur");
    if ($("#liste")) $("#liste").onclick = () => ecranTheme(t);
  };
}


function chemin(n, id){ for (const o of n.opts){ if (o.a===id) return [o]; if (o.n){ const r = chemin(o.n, id); if (r) return [o, ...r]; } } return null; }

const figure = id => `<div class="fig"><img src="photos/${id}.jpg" alt="" onerror="this.remove()">${DESSINS[id]}</div>`;

function arbre(n, surligne){
  return `<div class="noeud"><div class="q">${esc(n.q)}</div><div class="branches">${n.opts.map(o => {
    const on = surligne && surligne.includes(o);
    return `<div class="branche"><div class="crit ${on?"on":""}">${esc(o.t)}</div><span class="fl ${on?"on":""}" aria-hidden="true">→</span>${o.n ? arbre(o.n, surligne) : `<div class="feuille ${on?"on":""}">${esc(ANIMAUX[o.a].nom)}</div>`}</div>`;
  }).join("")}</div></div>`;
}

function ecranCles(t){
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← Accueil</button>
    <div class="entete"><h1>🔑 Clés de détermination</h1><div class="compteur">⭐ ${acquis(t)} / ${t.mots.length}</div></div>
    <p class="doux">Facile : on te pose les questions de la clé une par une. Difficile : tu lis la clé tout seul et tu écris le nom de l'animal. Réussis le difficile pour gagner l'autocollant de l'animal.</p>
    <div class="themes">${CLES.map(c => { const n = c.animaux.filter(id => niv(t,{en:id})>=2).length; return `
      <div class="theme" style="--c:${t.c};grid-template-columns:auto 1fr auto">
        <span class="gros" aria-hidden="true">${c.e}</span>
        <span><h2 style="font-size:1.2rem">${esc(c.titre)}</h2><span class="doux">${n} / ${c.animaux.length} animaux trouvés</span></span>
        <span class="niveaux"><button class="btn clair" data-c="${c.id}" data-n="voir">Voir la clé</button><button class="btn clair" data-c="${c.id}" data-n="facile">Facile</button><button class="btn" style="--c:${t.c}" data-c="${c.id}" data-n="dur">Difficile</button></span>
      </div>`; }).join("")}
    </div>
    <button class="mode" id="alb"><b>🗂️ Mon album</b><span>Un animal identifié sans aide = un autocollant</span></button>
  </div>`;
  $("#ret").onclick = accueil; $("#alb").onclick = () => album(t);
  app.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
    const c = CLES.find(x => x.id===b.dataset.c);
    if (b.dataset.n==="voir") return voirCle(t, c);
    identifie({ t, c, niveau:b.dataset.n, qs:melange(c.animaux), i:0, res:[], nouveaux:[] });
  });
}

function voirCle(t, c){
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← Clés de détermination</button>
    <h1>${c.e} ${esc(c.titre)}</h1>
    <p class="doux">On lit la clé de gauche à droite : à chaque étape, on choisit la case qui correspond à l'animal observé.</p>
    <div class="cle">${arbre(c.racine)}</div>
    <div class="album">${c.animaux.map(id => `<div class="sticker oui" style="aspect-ratio:auto"><span class="mini">${DESSINS[id]}</span><b>${esc(ANIMAUX[id].nom)}</b></div>`).join("")}</div>
  </div>`;
  $("#ret").onclick = () => ecranTheme(t);
}

function entCle(s){
  return `<div class="haut"><button class="retour" id="ret">← Clés</button>
    <div class="points">${s.qs.map((q,n) => `<i class="${n<s.res.length ? (s.res[n]?"ok":"ko") : (n===s.i?"ici":"")}"></i>`).join("")}</div></div>`;
}

function identifie(s){
  const id = s.qs[s.i], t = s.t;
  if (s.niveau==="facile"){
    let noeud = s.c.racine, erreurs = 0, pas = [];
    const etape = () => {
      app.innerHTML = `<div class="pile" style="--c:${t.c}">${entCle(s)}
        <div class="question"><p class="consigne">Observe bien cet animal et suis la clé « ${esc(s.c.titre)} »</p>${figure(id)}</div>
        ${pas.length ? `<div class="pas">${pas.map(p => `<span>${esc(p)}</span>`).join(" → ")}</div>` : ""}
        <h2 style="font-size:1.3rem">${esc(noeud.q)}</h2>
        <div class="choix">${noeud.opts.map((o,n) => `<button data-o="${n}">${esc(o.t)}</button>`).join("")}</div>
        <div id="fb"></div></div>`;
      $("#ret").onclick = () => ecranTheme(t);
      const bon = chemin(noeud, id)[0];
      app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
        const o = noeud.opts[+b.dataset.o];
        if (o!==bon){ erreurs++; b.classList.add("ko"); b.disabled = true;
          $("#fb").innerHTML = `<div class="retourq ko">Ce n'est pas ça. Regarde encore le dessin et essaie une autre case.</div>`; return; }
        pas.push(o.t);
        if (o.n){ noeud = o.n; etape(); return; }
        app.querySelectorAll("[data-o]").forEach(x => x.disabled = true); b.classList.add("ok");
        const juste = erreurs===0; s.res.push(juste);
        if (juste){ const k2 = t.id+":"+id; if ((etat.m[k2]||0) < 1){ etat.m[k2] = 1; sauver(); } }
        $("#fb").innerHTML = `<div class="pile"><div class="retourq ${juste?"ok":"ko"}">C'est : ${esc(ANIMAUX[id].nom)} ! ${juste ? "Sans erreur, bravo." : "Trouvé, avec un peu d'aide."}</div>
          <button class="btn" style="--c:${t.c};align-self:flex-end" id="next">${s.i===s.qs.length-1 ? "Voir mon score" : "Animal suivant →"}</button></div>`;
        suite(s);
      });
    };
    etape();
  } else {
    app.innerHTML = `<div class="pile" style="--c:${t.c}">${entCle(s)}
      <div class="question"><p class="consigne">Utilise la clé pour trouver le nom de cet animal, puis écris-le</p>${figure(id)}</div>
      <div class="cle" id="cle">${arbre(s.c.racine)}</div>
      <div class="saisie"><input id="rep" autocomplete="off" spellcheck="false" placeholder="Nom de l'animal…" aria-label="Nom de l'animal"><button class="btn" style="--c:${t.c}" id="ok">Valider</button></div>
      <div id="fb"></div></div>`;
    $("#ret").onclick = () => ecranTheme(t);
    const inp = $("#rep"); inp.focus();
    const valide = () => {
      if (!inp.value.trim()) return;
      inp.disabled = true; $("#ok").disabled = true;
      const a = ANIMAUX[id], art = v => v.replace(/^(le |la |les |l'|un |une |des )/,"");
      const r = sansAccent(art(normT(inp.value)));
      const juste = [a.nom].concat(a.alt||[]).some(x => sansAccent(art(normT(x)))===r);
      s.res.push(juste);
      if (juste){ const k2 = t.id+":"+id, av = etat.m[k2]||0; if (av < 2){ etat.m[k2] = 2; sauver(); s.nouveaux.push(id); } }
      $("#cle").innerHTML = arbre(s.c.racine, chemin(s.c.racine, id));
      $("#fb").innerHTML = `<div class="pile"><div class="retourq ${juste?"ok":"ko"}">${juste ? `Bravo ! C'est bien : ${esc(a.nom)}.` : `Non, c'est : ${esc(a.nom)}.`} <span class="doux">Le bon chemin est surligné dans la clé.</span>
        ${juste && s.nouveaux.includes(id) ? `<br>Nouvel autocollant : <span class="mini gagne" style="display:inline-block;width:70px;vertical-align:middle">${DESSINS[id]}</span>` : ""}</div>
        <button class="btn" style="--c:${t.c};align-self:flex-end" id="next">${s.i===s.qs.length-1 ? "Voir mon score" : "Animal suivant →"}</button></div>`;
      suite(s);
    };
    $("#ok").onclick = valide; inp.onkeydown = e => { if (e.key==="Enter") valide(); };
  }
}

function suite(s){
  const n = $("#next"); n.focus();
  n.onclick = () => { s.i++; if (s.i < s.qs.length) return identifie(s);
    const bons = s.res.filter(Boolean).length;
    app.innerHTML = `<div class="pile bilan" style="--c:${s.t.c}">
      <h2>${bons===s.res.length ? "Parfait, tu sais utiliser cette clé !" : bons >= s.res.length*0.6 ? "Bien joué !" : "Regarde la clé encore une fois, puis réessaie."}</h2>
      <div class="score">${bons} / ${s.res.length}</div>
      ${s.nouveaux.length ? `<p>Nouveaux autocollants :</p><div class="nouveaux">${s.nouveaux.map(id => `<span class="mini gagne" style="width:80px">${DESSINS[id]}</span>`).join("")}</div>` : ""}
      <div class="haut" style="justify-content:center;flex-wrap:wrap">
        <button class="btn clair" id="th">← Clés</button>
        ${s.niveau==="facile" ? `<button class="btn" style="--c:${s.t.c}" id="dur">Essayer en difficile</button>` : ""}
        <button class="btn" style="--c:${s.t.c}" id="enc">Rejouer</button>
      </div></div>`;
    $("#th").onclick = () => ecranTheme(s.t);
    $("#enc").onclick = () => identifie({...s, qs:melange(s.c.animaux), i:0, res:[], nouveaux:[]});
    if ($("#dur")) $("#dur").onclick = () => identifie({...s, niveau:"dur", qs:melange(s.c.animaux), i:0, res:[], nouveaux:[]});
  };
}


/* ---------- sauvegarde ---------- */
let etat = { m:{} };     // m["an:dog"] = nombre de bonnes réponses (0..3)
try { const s = JSON.parse(localStorage.getItem(CLE) || "null"); if (s && s.m) etat = s; } catch(e) {}
function sauver(){ try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch(e) {} }
const k = (t,w) => t.id + ":" + w.en;
const niv = (t,w) => etat.m[k(t,w)] || 0;
const seuil = t => t.maitrise || MAITRISE;
const acquis = t => t.mots.filter(w => niv(t,w) >= seuil(t)).length;
const totalAcquis = () => THEMES.reduce((s,t) => s + acquis(t), 0);
const totalMots = () => THEMES.reduce((s,t) => s + t.mots.length, 0);

/* ---------- outils ---------- */
const $ = s => document.querySelector(s);
const app = $("#app");
const melange = a => { a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const norm = s => s.toLowerCase().replace(/[’`]/g,"'").replace(/[.!?,"]/g,"").replace(/\s+/g," ").trim();
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function toast(t){ const d=document.createElement("div"); d.className="toast"; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2200); }

/* ---------- voix anglaise ---------- */
let voix = null;
const parle = "speechSynthesis" in window;
function chercheVoix(){ if(!parle) return; const v = speechSynthesis.getVoices();
  voix = v.find(x=>/en-GB/i.test(x.lang)) || v.find(x=>/^en/i.test(x.lang)) || null; }
if (parle){ chercheVoix(); speechSynthesis.onvoiceschanged = chercheVoix; }
function dire(t){ if(!parle) return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t);
  u.lang="en-GB"; if(voix) u.voice=voix; u.rate=.85; speechSynthesis.speak(u); }
const boutonSon = t => parle ? `<button class="hp" data-dire="${esc(t)}" aria-label="Écouter ${esc(t)}">🔊 Écouter</button>` : "";
document.addEventListener("click", e => { const b=e.target.closest("[data-dire]"); if(b){ e.stopPropagation(); dire(b.dataset.dire); } });

/* ---------- choix des mots : les moins connus d'abord ---------- */
function tirage(t, n){
  const tri = melange(t.mots).sort((a,b) => niv(t,a) - niv(t,b));
  const pris = tri.slice(0, Math.min(n, tri.length));
  while (pris.length < n) pris.push(t.mots[Math.floor(Math.random()*t.mots.length)]);
  return melange(pris);
}
function intrus(t, w, champ){
  const autres = melange(t.mots.filter(x => x[champ] !== w[champ])).slice(0,3);
  return melange([w, ...autres]);
}

/* ============================================================
   ÉCRANS
   ============================================================ */
function accueil(ch){
  aller(ch || "");
  // chapitres : ordre donné dans demarrer({chapitres:[...]}), puis ceux trouvés dans les thèmes
  const noms = [...new Set([...(PAGE.chapitres||[]), ...THEMES.map(t => t.chapitre).filter(Boolean)])];
  const groupes = noms.map(n => ({ nom:n, themes:THEMES.filter(t => t.chapitre===n) })).filter(g => g.themes.length);
  const sans = THEMES.filter(t => !t.chapitre);
  if (sans.length) groupes.push({ nom:"", themes:sans });
  const tuile = t => `
      <button class="theme" style="--c:${t.c}" data-theme="${t.id}">
        <span class="gros" aria-hidden="true">${t.e}</span>
        <span><h2>${t.nom}</h2><span class="doux">${acquis(t)} / ${t.mots.length} autocollants</span>
        <span class="barre"><i style="width:${Math.round(acquis(t)/t.mots.length*100)}%"></i></span></span>
      </button>`;
  app.innerHTML = `<div class="pile">
    <a class="retour" href="../">← Toutes les matières</a>
    <div class="entete">
      <div><h1>${PAGE.e} ${esc(PAGE.titre)}</h1><p class="doux">Chaque mot ou règle que tu maîtrises te rapporte un autocollant.</p></div>
      <div class="compteur">⭐ ${totalAcquis()} / ${totalMots()} autocollants</div>
    </div>
    ${groupes.map(g => `<section class="chapitre${ch && slug(g.nom)===ch ? " cible" : ""}" id="${g.nom ? "ch-"+slug(g.nom) : "ch-autres"}">
      ${g.nom ? `<h2 class="chap"><a href="#${slug(g.nom)}">${esc(g.nom)}</a></h2>` : ""}
      <div class="themes">${g.themes.map(tuile).join("")}</div>
    </section>`).join("")}
    <div class="pied">
      <button class="btn clair" id="exp">💾 Sauvegarder ma progression</button>
      <button class="btn clair" id="imp">📂 Restaurer une sauvegarde</button>
    </div>
  </div>`;
  app.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => ecranTheme(THEMES.find(t=>t.id===b.dataset.theme)));
  $("#exp").onclick = exporter; $("#imp").onclick = () => $("#fichier").click();
  if (ch){ const el = document.getElementById("ch-"+ch); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({block:"start"}), 0); }
}

const MODES = [
  {id:"carte", nom:"📖 Apprendre", d:"Retourne les cartes pour réviser"},
  {id:"choix", nom:"🔤 Trouve le mot", d:"Choisis le bon mot anglais"},
  {id:"sens",  nom:"🇫🇷 Ça veut dire…", d:"Choisis la bonne traduction"},
  {id:"ecrire",nom:"✏️ Lettres manquantes", d:"Écris le mot en entier"},
  {id:"ecoute",nom:"👂 Dictée", d:"Écoute et écris le mot", son:true},
  {id:"phrase",nom:"🧩 Remets la phrase", d:"Clique les mots dans l'ordre"},
  {id:"image", nom:"🖼️ Le dessin", d:"Regarde le dessin et écris le mot", img:true},   // thèmes avec img:true (un dessin par mot)
];

function ecranTheme(t){
  aller(lien(t));
  if (t.cle) return ecranCles(t);
  if (t.trous) return ecranSvt(t);
  if (t.gram) return ecranGram(t);
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← Accueil</button>
    <div class="entete"><h1>${t.e} ${t.nom}</h1><div class="compteur">⭐ ${acquis(t)} / ${t.mots.length}</div></div>
    <div class="modes">
      <button class="mode defi" data-mode="defi"><b>🏆 Le grand défi</b><span>${NB_Q} questions mélangées : c'est là qu'on gagne le plus d'autocollants</span></button>
      ${MODES.filter(m => (!m.son || parle) && (!m.img || t.img)).map(m => `<button class="mode" data-mode="${m.id}"><b>${m.nom}</b><span>${m.d}</span></button>`).join("")}
      ${t.jeux && typeof JEUX !== "undefined" ? JEUX.modes.map(m => `<button class="mode" data-mode="${m.id}"><b>${m.nom}</b><span>${m.d}</span></button>`).join("") : ""}
      <button class="mode" data-mode="album"><b>🗂️ Mon album</b><span>Tous les autocollants du thème</span></button>
    </div>
  </div>`;
  $("#ret").onclick = accueil;
  app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    const m = b.dataset.mode;
    if (m==="album") album(t); else if (m==="carte") cartes(t, 0, melange(t.mots));
    else if (typeof JEUX !== "undefined" && JEUX[m]) JEUX[m](t); else serie(t, m);
  });
}

/* ---------- cartes ---------- */
function cartes(t, i, liste){
  const w = liste[i];
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <div class="haut"><button class="retour" id="ret">← ${t.nom}</button><span class="doux">${i+1} / ${liste.length}</span></div>
    <div class="flip" id="flip" role="button" tabindex="0" aria-label="Retourner la carte">
      <div class="in">
        <div class="face"><div class="emo">${w.e||"❓"}</div><div class="mot">${esc(w.fr)}</div><p class="doux">Clique pour voir en anglais</p></div>
        <div class="face dos"><div class="emo">${w.e||"🇬🇧"}</div><div class="mot">${esc(w.en)}</div>${boutonSon(w.en)}</div>
      </div>
    </div>
    <div class="haut">
      <button class="btn clair" id="prec" ${i===0?"disabled":""}>← Précédente</button>
      <button class="btn" style="--c:${t.c}" id="suiv">${i===liste.length-1?"Terminer":"Suivante →"}</button>
    </div>
  </div>`;
  const f = $("#flip");
  const tourne = () => { f.classList.toggle("vu"); if (f.classList.contains("vu")) dire(w.en); };
  f.onclick = tourne; f.onkeydown = e => { if (e.key===" "||e.key==="Enter"){ e.preventDefault(); tourne(); } };
  $("#ret").onclick = () => ecranTheme(t);
  $("#prec").onclick = () => cartes(t, i-1, liste);
  $("#suiv").onclick = () => i===liste.length-1 ? ecranTheme(t) : cartes(t, i+1, liste);
}

/* ---------- séries notées ---------- */
function serie(t, mode){
  if (t.gram){
    const comp = mode==="defi" ? melange(t.mots) : [t.mots.find(w => w.en===mode)];
    const qs = Array.from({length:NB_Q}, (_,n) => { const w = comp[n % comp.length]; return {w, g:(t.gen||GRAM.GEN)[w.en]()}; });
    return question({ t, mode, qs: mode==="defi" ? melange(qs) : qs, i:0, res:[], nouveaux:[] });
  }
  const types = mode==="defi" ? ["choix","sens","ecrire"].concat(parle?["ecoute"]:[], t.img?["image"]:[]) : [mode];
  let qs;
  if (mode==="phrase") qs = melange(t.phrases).map(p => ({type:"phrase", p}));
  else qs = tirage(t, NB_Q).map((w,n) => ({type: types[n % types.length], w}));
  if (mode==="defi"){ qs = melange(qs); const p = melange(t.phrases)[0]; qs.splice(NB_Q-1, 1, {type:"phrase", p}); }
  const s = { t, mode, qs, i:0, res:[], nouveaux:[] };
  question(s);
}

function entete(s){
  return `<div class="haut"><button class="retour" id="ret">← ${s.t.nom}</button>
    <div class="points">${s.qs.map((q,n) => `<i class="${n<s.res.length ? (s.res[n]?"ok":"ko") : (n===s.i?"ici":"")}"></i>`).join("")}</div></div>`;
}

function question(s){
  if (s.t.gram) return questionGram(s);
  const q = s.qs[s.i], w = q.w, t = s.t;
  let corps = "";
  if (q.type==="choix"){
    const ops = intrus(t, w, "en");
    corps = `<div class="question"><p class="consigne">Comment dit-on en anglais ?</p><div class="emo">${w.e||""}</div><div class="mot">${esc(w.fr)}</div></div>
      <div class="choix">${ops.map(o => `<button data-v="${esc(o.en)}">${esc(o.en)}</button>`).join("")}</div>`;
  } else if (q.type==="sens"){
    const ops = intrus(t, w, "fr");
    corps = `<div class="question"><p class="consigne">Que veut dire ce mot ?</p><div class="mot">${esc(w.en)}</div>${boutonSon(w.en)}</div>
      <div class="choix">${ops.map(o => `<button data-v="${esc(o.fr)}">${esc(o.fr)}</button>`).join("")}</div>`;
  } else if (q.type==="image"){
    corps = `<div class="question"><p class="consigne">Écris le nom de ce que tu vois, en anglais</p><div class="emo">${w.e||""}</div>
        <div class="indice" aria-label="Nombre de lettres">${[...w.en].map(c => /[a-z]/i.test(c) ? "_" : c===" " ? "&nbsp;" : esc(c)).join(" ")}</div></div>
      <div class="saisie"><input id="rep" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Écris ici…" aria-label="Ta réponse"><button class="btn" style="--c:${t.c}" id="ok">Valider</button></div>`;
  } else if (q.type==="ecrire" || q.type==="ecoute"){
    const indice = q.type==="ecrire" ? lettresCachees(w.en) : "";
    corps = `<div class="question">${q.type==="ecrire"
        ? `<p class="consigne">Écris le mot anglais en entier</p><div class="emo">${w.e||""}</div><div class="mot">${esc(w.fr)}</div><div class="indice" aria-label="Indice">${indice}</div>`
        : `<p class="consigne">Écoute bien, puis écris le mot</p><div class="emo">🎧</div>${boutonSon(w.en)}`}</div>
      <div class="saisie"><input id="rep" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Écris ici…" aria-label="Ta réponse"><button class="btn" style="--c:${t.c}" id="ok">Valider</button></div>`;
  } else {
    corps = `<div class="question"><p class="consigne">Clique sur les mots pour remettre la phrase dans l'ordre</p>${boutonSon(q.p)}</div>
      <div class="ligne" id="ligne" aria-label="Ta phrase"></div>
      <div class="tuiles" id="tuiles">${melange(q.p.split(" ").map((m,n)=>({m,n}))).map(o => `<button class="tuile" data-n="${o.n}">${esc(o.m)}</button>`).join("")}</div>
      <button class="btn" style="--c:${t.c}; align-self:center" id="ok">Valider</button>`;
  }
  app.innerHTML = `<div class="pile" style="--c:${t.c}">${entete(s)}${corps}<div id="fb"></div></div>`;
  $("#ret").onclick = () => ecranTheme(t);

  if (q.type==="choix" || q.type==="sens"){
    const bonne = q.type==="choix" ? w.en : w.fr;
    app.querySelectorAll(".choix button").forEach(b => b.onclick = () => {
      app.querySelectorAll(".choix button").forEach(x => { x.disabled = true; if (x.dataset.v===bonne) x.classList.add("ok"); });
      const juste = b.dataset.v === bonne; if (!juste) b.classList.add("ko");
      fin(s, juste, `${esc(w.en)} = ${esc(w.fr)}`, w.en);
    });
  } else if (q.type==="ecrire" || q.type==="ecoute" || q.type==="image"){
    const inp = $("#rep"); inp.focus();
    if (q.type==="ecoute") setTimeout(() => dire(w.en), 300);
    const valide = () => { if (!inp.value.trim()) return; inp.disabled = true; $("#ok").disabled = true;
      fin(s, norm(inp.value)===norm(w.en), `${esc(w.en)} = ${esc(w.fr)}`, w.en); };
    $("#ok").onclick = valide; inp.onkeydown = e => { if (e.key==="Enter") valide(); };
  } else {
    const ligne = $("#ligne"), tuiles = $("#tuiles");
    [ligne, tuiles].forEach(z => z.onclick = e => { const b = e.target.closest(".tuile"); if (!b || b.disabled) return;
      (b.parentElement===tuiles ? ligne : tuiles).appendChild(b); });
    $("#ok").onclick = () => {
      const rep = [...ligne.querySelectorAll(".tuile")].map(b => b.textContent).join(" ");
      if (!rep) return;
      app.querySelectorAll(".tuile").forEach(b => b.disabled = true); $("#ok").disabled = true;
      fin(s, norm(rep)===norm(q.p), esc(q.p), q.p);
    };
  }
}

function lettresCachees(mot){
  let lettres = [...mot].map((c,n) => /[a-z]/i.test(c) ? n : -1).filter(n => n>0);
  const cache = new Set(melange(lettres).slice(0, Math.max(1, Math.round(lettres.length*0.45))));
  return [...mot].map((c,n) => c===" " ? "&nbsp;" : cache.has(n) ? "_" : esc(c.toUpperCase())).join(" ");
}

function fin(s, juste, rappel, aDire, astuce){
  const q = s.qs[s.i];
  s.res.push(juste);
  if (juste && q.w){
    const cle = k(s.t, q.w), avant = etat.m[cle] || 0;
    const max = seuil(s.t);
    etat.m[cle] = Math.min(max, avant + 1); sauver();
    if (avant < max && etat.m[cle] === max) s.nouveaux.push(q.w);
  }
  if (!juste && !s.t.muet) dire(aDire);
  const gagne = juste && q.w && s.nouveaux.includes(q.w) && s.nouveaux[s.nouveaux.length-1]===q.w;
  $("#fb").innerHTML = `<div class="pile">
    <div class="retourq ${juste?"ok":"ko"}">${juste ? (gagne ? `Bravo ! Nouvel autocollant : <span class="gagne" style="display:inline-block">${q.w.e||"⭐"}</span>` : "Bravo !") : "Pas tout à fait. La bonne réponse :"} <span class="doux">${rappel}</span>${!juste && astuce ? `<br><span style="font-weight:400">💡 ${esc(astuce)}</span>` : ""}</div>
    <button class="btn" style="--c:${s.t.c}; align-self:flex-end" id="next">${s.i===s.qs.length-1 ? "Voir mon score" : "Question suivante →"}</button></div>`;
  const n = $("#next"); n.focus();
  n.onclick = () => { s.i++; s.i < s.qs.length ? question(s) : bilan(s); };
}

function bilan(s){
  const bons = s.res.filter(Boolean).length, tot = s.res.length;
  const msg = bons===tot ? "Parfait, rien à redire !" : bons >= tot*0.7 ? "Très bien joué !" : bons >= tot*0.4 ? "Pas mal, encore un petit effort." : "On recommence ? Tu peux réviser avec les cartes.";
  app.innerHTML = `<div class="pile bilan" style="--c:${s.t.c}">
    <h2>${msg}</h2><div class="score">${bons} / ${tot}</div>
    ${s.nouveaux.length ? `<p>Nouveaux autocollants :</p><div class="nouveaux">${s.nouveaux.map(w => `<span class="gagne" title="${esc(w.en)}">${w.e||"⭐"}</span>`).join("")}</div>` : ""}
    <div class="haut" style="justify-content:center;flex-wrap:wrap">
      <button class="btn clair" id="th">← ${s.t.nom}</button>
      <button class="btn" style="--c:${s.t.c}" id="enc">Rejouer</button>
    </div></div>`;
  $("#th").onclick = () => ecranTheme(s.t); $("#enc").onclick = () => serie(s.t, s.mode);
}


/* ---------- écrans de grammaire ---------- */
function ecranGram(t){
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← Accueil</button>
    <div class="entete"><h1>${t.e} ${t.titre||"The verb to be"}</h1><div class="compteur">⭐ ${acquis(t)} / ${t.mots.length}</div></div>
    <div class="modes">
      ${t.id==="tb" ? `<button class="mode" data-mode="regle"><b>📖 La règle</b><span>Le tableau à connaître</span></button>` : ""}
      <button class="mode defi" data-mode="defi"><b>🏆 Le grand défi</b><span>${NB_Q} questions de tous les types, comme une évaluation</span></button>
      ${t.mots.map(w => `<button class="mode" data-mode="${w.en}"><b>${w.e} ${esc(w.fr)}</b><span>${"●".repeat(niv(t,w))}${"○".repeat(seuil(t)-niv(t,w))}</span></button>`).join("")}
      <button class="mode" data-mode="album"><b>🗂️ Mon album</b><span>Une règle maîtrisée = un autocollant</span></button>
    </div></div>`;
  $("#ret").onclick = accueil;
  app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
    const m = b.dataset.mode; m==="album" ? album(t) : m==="regle" ? regle(t) : serie(t, m);
  });
}

function regle(t){
  const L = [["I","am","'m","am not","'m not","Am I…?"],["You","are","'re","are not","aren't","Are you…?"],
    ["He / She / It","is","'s","is not","isn't","Is he / she / it…?"],["We","are","'re","are not","aren't","Are we…?"],
    ["You","are","'re","are not","aren't","Are you…?"],["They","are","'re","are not","aren't","Are they…?"]];
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← To be</button>
    <h1>To be = être</h1>
    <div style="overflow-x:auto"><table class="regle">
      <thead><tr><th></th><th>Affirmative</th><th>Contractée</th><th>Négative</th><th>Contractée</th><th>Question</th></tr></thead>
      <tbody>${L.map(l => `<tr>${l.map((c,n) => n===0 ? `<th>${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>
    <div class="note"><b>Réponses courtes</b><br>Are you happy? <b>Yes, I am.</b> / <b>No, I'm not.</b><br>Is she French? <b>Yes, she is.</b> / <b>No, she isn't.</b></div>
    <div class="note"><b>Attention</b><br>Après Yes, on ne contracte jamais : « Yes, I am. » et pas « Yes, I'm. »<br>« amn't » n'existe pas !</div>
    <button class="btn" style="--c:${t.c};align-self:flex-start" id="go">Je m'entraîne →</button>
  </div>`;
  $("#ret").onclick = () => ecranTheme(t); $("#go").onclick = () => serie(t, "defi");
}

function questionGram(s){
  const q = s.qs[s.i], g = q.g, t = s.t;
  let corps = `<div class="question"><p class="consigne">${esc(g.consigne)}</p>${g.kind!=="ordre" ? `<div class="phr">${g.html}</div>` : ""}</div>`;
  if (g.kind==="qcm") corps += `<div class="choix ${g.choix.length>4?"six":""}">${g.choix.map(c => `<button data-v="${c}">${c}</button>`).join("")}</div>`;
  if (g.kind==="texte") corps += `<div class="saisie"><input id="rep" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Écris ici…" aria-label="Ta réponse"><button class="btn" style="--c:${t.c}" id="ok">Valider</button></div>`;
  if (g.kind==="ordre") corps += `<div class="ligne" id="ligne" aria-label="Ta phrase"></div>
    <div class="tuiles" id="tuiles">${melange(g.mots.map((m,n)=>({m,n}))).map(o => `<button class="tuile">${esc(o.m)}</button>`).join("")}</div>
    <button class="btn" style="--c:${t.c};align-self:center" id="ok">Valider</button>`;
  app.innerHTML = `<div class="pile" style="--c:${t.c}">${entete(s)}${corps}<div id="fb"></div></div>`;
  $("#ret").onclick = () => ecranTheme(t);

  if (g.kind==="qcm"){
    app.querySelectorAll(".choix button").forEach(b => b.onclick = () => {
      app.querySelectorAll(".choix button").forEach(x => { x.disabled = true; if (x.dataset.v===g.bonne) x.classList.add("ok"); });
      const juste = b.dataset.v===g.bonne; if (!juste) b.classList.add("ko");
      fin(s, juste, esc(g.rappel), g.rappel, g.astuce);
    });
  }
  if (g.kind==="texte"){
    const inp = $("#rep"); inp.focus();
    const valide = () => {
      const v = inp.value.trim(); if (!v) return;
      inp.disabled = true; $("#ok").disabled = true;
      const bon = g.nombre!==undefined ? Math.abs(parseFloat(v.replace(",",".").replace(/\s/g,"")) - g.nombre) < 1e-9 : g.ok.some(o => norm(o)===norm(v));
      if (bon && g.q && !/\?\s*$/.test(v)) return fin(s, false, esc(g.rappel), g.rappel, "Presque ! Il manquait le point d'interrogation.");
      fin(s, bon, esc(g.rappel), g.rappel, g.astuce);
    };
    $("#ok").onclick = valide; inp.onkeydown = e => { if (e.key==="Enter") valide(); };
  }
  if (g.kind==="ordre"){
    const ligne = $("#ligne"), tuiles = $("#tuiles");
    [ligne, tuiles].forEach(z => z.onclick = e => { const b = e.target.closest(".tuile"); if (!b || b.disabled) return;
      (b.parentElement===tuiles ? ligne : tuiles).appendChild(b); });
    $("#ok").onclick = () => {
      const rep = [...ligne.querySelectorAll(".tuile")].map(b => b.textContent).join(" ");
      if (!rep) return;
      app.querySelectorAll(".tuile").forEach(b => b.disabled = true); $("#ok").disabled = true;
      fin(s, rep.toLowerCase()===g.cible.toLowerCase(), esc(g.rappel), g.rappel);
    };
  }
}

/* ---------- album ---------- */
function album(t){
  app.innerHTML = `<div class="pile" style="--c:${t.c}">
    <button class="retour" id="ret">← ${t.nom}</button>
    <div class="entete"><h1>Mon album ${t.e}</h1><div class="compteur">⭐ ${acquis(t)} / ${t.mots.length}</div></div>
    <p class="doux">${t.cle ? "Une case se remplit quand tu trouves le nom de l'animal au niveau difficile." : t.trous ? "Une case se remplit quand tu réussis la leçon au niveau difficile sans faute." : `Les cases en pointillés se remplissent quand tu réponds juste ${seuil(t)} fois${t.gram?" à ce type d'exercice":" au mot"}.`}</p>
    <div class="album">${t.mots.map(w => { const n = niv(t,w), max = seuil(t); return n >= max
      ? `<div class="sticker oui">${t.cle ? `<span class="mini">${DESSINS[w.en]}</span>` : `<span class="e">${w.e||"⭐"}</span>`}<b>${esc(t.gram||t.trous||t.cle ? w.fr : w.en)}</b>${t.gram||t.trous||t.cle ? "" : `<span class="doux">${esc(w.fr)}</span>`}</div>`
      : `<div class="sticker non"><span class="e">?</span><span>${esc(w.fr)}</span><span aria-label="${n} sur ${max}">${"●".repeat(n)}${"○".repeat(max-n)}</span></div>`; }).join("")}
    </div></div>`;
  $("#ret").onclick = () => ecranTheme(t);
}

/* ---------- export / import ---------- */
function exporter(){
  const blob = new Blob([JSON.stringify(etat, null, 1)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "progression-luka-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(a); a.click(); a.remove(); toast("Progression sauvegardée ✔");
}
$("#fichier").onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (!d.m) throw 0; etat = d; sauver(); accueil(); toast("Progression restaurée ✔"); }
    catch(err){ toast("Ce fichier n'est pas une sauvegarde valide"); } };
  r.readAsText(f); e.target.value = "";
};

/* ---------- démarrage : appelé par chaque page de matière ---------- */
function demarrer(opts){
  PAGE = { ...PAGE, ...opts };
  THEMES.forEach(t => { if (t.trous && !t.mots) t.mots = t.textes.map(x => ({en:x.id, fr:x.titre, e:x.e})); });
  document.title = PAGE.titre + " · Luka's sticker book";
  route(true);
}

/* ---------- adresses : <matière>/#<thème> ou <matière>/#<chapitre> ----------
   Le lien est tiré du nom du thème (« Les espèces » → #les-especes).
   Pour le fixer (et pouvoir renommer le thème sans casser le lien) :
   ajouter lien:"mon-lien" dans le THEMES.push du thème. */
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const lien = t => t.lien || slug(t.nom);
let premier = false;
function aller(h){
  if (decodeURIComponent(location.hash.slice(1)) === h) return;
  const url = h ? "#" + h : location.pathname;
  premier ? history.replaceState(null, "", url) : history.pushState(null, "", url);
}
function route(init){
  premier = !!init;
  const h = decodeURIComponent(location.hash.slice(1));
  const t = THEMES.find(x => lien(x) === h);
  const ch = !t && h && THEMES.some(x => x.chapitre && slug(x.chapitre)===h) ? h : "";
  t ? ecranTheme(t) : accueil(ch);
  premier = false; if (!ch) window.scrollTo(0, 0);
}
addEventListener("popstate", () => route());
addEventListener("hashchange", () => route());
