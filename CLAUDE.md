# boulanger site — l'espace commerçant de Perify (consignes pour toute session Claude)

Ce que **le gérant** utilise derrière son comptoir, sur son téléphone, d'une main :
- `index.html` — l'espace commerçant : Validation (code ou scan de carte), Dashboard (statistiques
  servies par l'action `stats`, derniers coupons par `dashboard`), Offre (l'offre affichée sur la carte
  des clients, avec un aperçu fidèle de la carte Wallet), Promo (le fabricant d'affiche + e-mail).
- `calculateur.html` + `calculateur-moteur.js` — « est-ce que ça me rapporte ? », avec les chiffres du
  commerce (action `mesures`), jamais un chiffre inventé.
- `kiosque.html` — la borne de caisse (annexe) ; `configurateur.html`, `boulanger.html` : anciens.

HTML / CSS / JS simple, sans framework ni build. Hébergé sur Vercel (déploiement à chaque push sur
`main`). Un seul commerce en production : Le Bap's. Le propriétaire, Valentin CARRILLO, n'est pas
développeur : écris-lui en français simple.

## Ce qui ne se discute pas
- **Le secret vendeur** est tapé une fois et gardé en `localStorage` (`boostavis_kiosk_secret`) ; il
  part avec chaque appel via `xhrGet`. **Jamais écrit dans le code**, jamais affiché.
- **Le commerce vient du registre** (`commerces.json` du site client, lu par `BA.pret()`) ; l'adresse
  du serveur est `AS_URL`. Aucune valeur en dur par commerce.
- **Sombre, lisible en plein jour, d'une main** : direction visuelle du 23/09 — nuit `#1B1F3B`, orange
  `#FF6B2C` / `#FF8A4C`, jaune `#FFC53D` pour les codes et chiffres, Plus Jakarta Sans pour titres et
  chiffres, Inter pour le texte ; boutons ≥ 44 px ; icônes en SVG dans des pastilles (plus d'emoji
  pour les nouveaux éléments).
- **Aucun chiffre inventé** : un compteur absent s'affiche à zéro, une tendance sans point de
  comparaison ne s'affiche pas (voir `renderDash`).
- **L'aperçu de carte Wallet** de l'onglet Offre reprend les vraies couleurs du pass (`PASS_THEMES`) et
  le vrai bandeau (`/api/bandeau` du service Wallet) : il ne doit jamais promettre ce que le pass ne
  fait pas.
- Commentaires en **français**, datés quand on explique un choix ou un piège.

## Vérifier
- Pas d'essai automatique dans ce dépôt (la suite et les captures téléphone sont sur la machine de
  Valentin, `_outils/tests`). Une PR doit rester petite et **décrire comment vérifier** (onglet, geste,
  données attendues). La page doit rester valide sans réseau (doublure de serveur pour les captures).

## Ce qu'une session cloud ne peut pas faire (le dire, ne pas contourner)
- Pousser sur `main` : **tout passe par une PR**. Voir un rendu, un téléphone, la base, le serveur ou
  les autres dépôts. Un changement qui impose une nouvelle action serveur se décrit dans la PR, il ne
  s'invente pas côté page.
