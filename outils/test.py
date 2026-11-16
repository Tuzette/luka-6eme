"""Test automatique du site. Usage : python3 outils/test.py  (depuis la racine du dépôt)
Vérifie : chaque page se charge sans erreur JS, chaque lien de chapitre/thème,
chaque leçon à trous (facile + difficile) faite sans faute, chaque quiz « gen »
(chaque partie + défi) fait sans faute, cohérence des banques de questions.
Prérequis : pip install playwright && playwright install chromium"""
import re, os, sys, threading, functools, http.server
from playwright.sync_api import sync_playwright

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class Muet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("localhost", 0), functools.partial(Muet, directory=RACINE))
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f"http://localhost:{srv.server_port}/"
PAGES = sorted(d + "/" for d in os.listdir(RACINE) if os.path.isfile(os.path.join(RACINE, d, "index.html")))
# enregistre la bonne réponse de chaque question générée
ESPION = """()=>{window.__a={};THEMES.filter(t=>t.gen).forEach(t=>{for(const k in t.gen){const f=t.gen[k];t.gen[k]=(...a)=>{const q=f(...a);
  (__a[(q.consigne||'')+'|'+q.html]=__a[(q.consigne||'')+'|'+q.html]||[]).push(q.bonne);return q}}})}"""
REPONSE = """()=>{const c=document.querySelector('.consigne').textContent, ph=document.querySelector('.phr'), s=ph.querySelector(':scope > svg');
  const vals=[...document.querySelectorAll('.choix button')].map(b=>b.dataset.v);
  if (s && typeof MONDE!=='undefined'){ const pos=v=>MONDE.P[v].join(',');
    if (c.startsWith('Où se trouve')){ const v=c.slice(13,-2); return 'ABCD'[[...s.querySelectorAll(':scope > circle[r="8"]')].map(e=>e.getAttribute('cx')+','+e.getAttribute('cy')).indexOf(pos(v))]; }
    const r=s.querySelector(':scope > circle[r="7"]'); return Object.keys(MONDE.P).find(v=>pos(v)===r.getAttribute('cx')+','+r.getAttribute('cy')); }
  const k=c+'|'+ph.innerHTML; return (__a[k]||[]).find(v=>vals.includes(v)); }"""

ko, errs, main = [], [], set()
with sync_playwright() as p:
    pg = p.chromium.launch().new_page()
    pg.on("pageerror", lambda e: errs.append(f"{pg.url} : {e}"))
    pg.goto(B); pg.wait_for_timeout(200)
    for m in PAGES:
        pg.goto(B + m); pg.wait_for_timeout(250)
        th = pg.evaluate("THEMES.map(t=>({id:t.id,lien:lien(t),ch:t.chapitre?slug(t.chapitre):'',trous:!!t.trous,gen:!!t.gen,modes:(t.mots||[]).map(w=>w.en),textes:t.trous?t.textes.map(x=>x.id):[]}))")
        ids = [t["id"] for t in th]
        if len(set(ids)) != len(ids): ko.append(f"{m} : id en double")
        if len({t["lien"] for t in th}) != len(th): ko.append(f"{m} : deux thèmes ont le même lien")
        print(f"{m} : {len(th)} thèmes")
        for t in th:
            if t["ch"]:
                pg.goto(B + m + "#" + t["ch"]); pg.wait_for_timeout(100)
                if pg.locator("section.cible").count() != 1: ko.append(f"{m}#{t['ch']} : lien de chapitre cassé")
            pg.goto(B + m + "#" + t["lien"]); pg.wait_for_timeout(100)
            if t["trous"]:
                for x in t["textes"]:
                    oks = pg.evaluate(f"decoupe(THEMES.find(t=>t.id==='{t['id']}').textes.find(x=>x.id==='{x}').texte).filter(p=>p.ok).map(p=>p.ok[0])")
                    for niv in ["facile", "dur"]:
                        pg.goto(B + m + "#" + t["lien"]); pg.wait_for_timeout(100)
                        pg.click(f'[data-t="{x}"][data-n="{niv}"]')
                        for i, o in enumerate(oks):
                            if niv == "dur": pg.fill(f'input[data-i="{i}"]', o)
                            else:
                                pg.locator(".puce:not([disabled])").filter(has_text=re.compile("^" + re.escape(o) + "$")).first.click()
                                pg.click(f'.trou[data-i="{i}"]')
                        pg.click("#ok"); r = pg.locator(".retourq").inner_text().split(" ")
                        if r[0] != r[2]: ko.append(f"{m}{t['id']}/{x} {niv} : {r[0]}/{r[2]}")
            elif t["gen"]:
                pb = pg.evaluate(f"""()=>{{const t=THEMES.find(t=>t.id==='{t['id']}'),pb=[];for(const k in t.gen)for(let i=0;i<300;i++){{const q=t.gen[k]();
                  if(q.kind==='qcm'&&(!q.choix.includes(q.bonne)||new Set(q.choix).size!==q.choix.length))pb.push(k)}};return [...new Set(pb)]}}""")
                if pb: ko.append(f"{m}{t['id']} : bonne réponse absente ou choix en double dans {pb}")
                for mode in t["modes"] + ["defi"]:
                    pg.goto(B + m + "#" + t["lien"]); pg.wait_for_timeout(100); pg.evaluate(ESPION)
                    pg.click(f'[data-mode="{mode}"]')
                    try:
                        for _ in range(10):
                            v = pg.evaluate(REPONSE) if pg.locator(".choix button").count() else None
                            if v is None: main.add(f"{m}{t['id']}/{mode}"); break
                            pg.click(f'.choix button[data-v="{v}"]', timeout=2000); pg.click("#next", timeout=2000)
                        else:
                          if "Parfait" not in pg.locator("#app").inner_text(): ko.append(f"{m}{t['id']}/{mode} : série pas parfaite")
                    except Exception as e: ko.append(f"{m}{t['id']}/{mode} : {str(e).splitlines()[0]}")
    srv.shutdown()
print("\n".join(["", "PROBLÈMES :"] + ko) if ko else "\nTout est OK ✔")
print("Erreurs JS :", errs or "aucune")
if main: print("Non vérifiable automatiquement (saisie ou dessin), à tester à la main :", ", ".join(sorted(main)))
sys.exit(1 if ko or errs else 0)
