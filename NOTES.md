# Notes techniques — Luka's sticker book

Site statique (GitHub Pages). À lire avant toute évolution, au lieu d'explorer le code.

## Arborescence
- `index.html` : accueil, 8 matières (Maths = lien externe ; « Bientôt » = `<div class="mat bientot">`, active = `<a class="mat" href="dossier/">`).
- `commun/moteur.js` (mécanique) et `commun/style.css` (style, couleurs `--francais --svt --physique --histoire --emc --musique --ferme`, mode sombre). Ne pas toucher sauf nouveau type d'exercice.
- Un dossier par matière : `anglais/ francais/ svt/ physique/ histoire-geo/ emc/` avec `index.html` = contenu seul.
- `histoire-geo/carte-monde.js` : fond de carte généré (Natural Earth), `MONDE = {W,H,d,P:{ville:[x,y]}}` pour 11 métropoles.
- `outils/test.py` : test automatique de tout le site.

## ⚠ Ne jamais changer
- `CLE = "lukaEnglish.v1"` (localStorage) et les `id` des thèmes existants (progression = `etat.m[idThème+":"+idPartie]`).
- Un `id` de thème doit être unique sur tout le site.

## Ids déjà pris
anglais : an, vb, tb, th (to have, gen propre), ss (school supplies) · francais : fm, fq · f5l, f5e, f5q (Langue n°5, présent) · svt : sv, cl · physique : pl, px
histoire-geo : hl, hq (ch1), h2l, h2q (ch2), h3l, h3q (ch3), g5l, g5q (ch5) · emc : e4l, e4q (ch4)
Convention : `<lettre matière><n° chapitre><l = leçon | q = quiz>`.

## Modèle d'une page matière
```html
<script src="../commun/moteur.js"></script>
<script>
THEMES.push({...}); ...
demarrer({ titre:"EMC", e:"🤝", chapitres:[CH4, ...] });   // ordre d'affichage
</script>
```
Chaque thème : `id, chapitre, nom, matiere, e (emoji), c:"var(--couleur)"`.
`nom` doit être unique dans la page et différent du chapitre (sert d'adresse : `#slug-du-nom`).
Libellé de chapitre : `"Chapitre N · Titre"` tel que dans le cahier.

## Types d'exercices
1. **Leçon à trous** : `trous:true, maitrise:2, unite:"leçons", textes:[{id, titre, e, texte}]`.
   Dans `texte` : `[réponse|variante acceptée]`, la 1re forme est affichée. Mots interchangeables : `[a|b|c], [b|a|c], [c|a|b]`.
   Niveau facile = glisser les mots (+2 intrus pris dans les autres parties), difficile = taper (casse et articles ignorés, accents tolérés avec avertissement).
   Éviter deux trous quasi identiques dans des parties différentes (ex. « pierre » / « pierres »).
2. **Quiz QCM** : `gram:true, muet:true, maitrise:5, unite:"thèmes", titre, gen:{partie:fonction}, mots:[{en:"partie", fr:"Titre", e}]`.
   Dans histoire-geo et emc, helper `quiz({partie:[[question, bonne | [bonnes…], [mauvaises…]], …]})`.
   Un `gen` peut aussi renvoyer un QCM avec du SVG dans `html` (ex. `CARTE.carte` en histoire-geo, courbes en physique).
3. Autres (ne pas modifier sans besoin) : vocabulaire anglais (cartes, dictée, phrases), grammaire « to be » (tb), clés de détermination SVT (cl).

## Adresses
`<matière>/#<slug chapitre>` ouvre la page sur le chapitre ; `<matière>/#<slug nom du thème>` ouvre l'activité.
slug = minuscules, sans accents, tout le reste remplacé par « - ».

## Avant livraison
`python3 outils/test.py` doit afficher « Tout est OK ✔ » et « Erreurs JS : aucune ».
