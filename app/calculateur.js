/* Perify Pro — « Est-ce que ça me rapporte ? », le calculateur pour débutant (13/11/2026).
   Demande du 12/11 : aucune valeur à taper. Quatre questions, chacune une rangée de choix ; le résultat
   apparaît dès la quatrième réponse et change à chaque toucher. Rien n'est présélectionné, sauf ce qui vient des
   vrais chiffres de la boutique (« D'après vos chiffres »). Prix de Perify affichés : 39 € par mois et 120 €
   d’installation (accord du 12/11). Le calcul est celui du moteur déjà testé (../calculateur-moteur.js) : aucun
   chiffre de résultat qui ne vienne des choix du commerçant. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var ico = PP.ico, esc = PP.esc;
  var K = PP.calculateur = {};

  K.PANIERS = [5, 8, 10, 12, 15, 20, 30];
  K.MARGES = [3, 4, 5, 6, 7];                 // € qui restent sur 10 € vendus
  K.COUTS = [0.5, 1, 1.5, 2, 3, 5];
  K.PASSAGES = [10, 25, 50, 100, 200];        // passages avec la carte, chaque semaine
  K.TAMPONS_REPLI = [6, 10, 15, 20];          // quand le catalogue ne répond pas
  K.PERIFY = { abonnement: 39, installation: 120, amortissementMois: 12 };

  /** Les choix → les entrées du moteur. Fonction pure (l'essai la vérifie). */
  K.choixVersEntrees = function (choix, catalogue) {
    var cadeau = null;
    if (choix.cadeau != null) {
      var c = (catalogue || []).filter(function (x) { return x.cle === choix.cadeau; })[0];
      cadeau = c ? { cle: c.cle, libelle: c.libelle, tampons: Number(c.tampons), coutRevient: choix.cout }
        : { cle: 'cadeau', libelle: 'Le cadeau', tampons: Number(String(choix.cadeau).replace('t', '')), coutRevient: choix.cout };
    }
    return {
      panierMoyen: choix.panier,
      margePct: choix.marge == null ? null : choix.marge * 10,
      cadeaux: cadeau ? [cadeau] : [],
      clientsActifs: choix.passages == null ? 0 : choix.passages * 52 / 12,
      visitesParClientParMois: 1,
      tauxEchangePct: 100,
      passageTampons: 1,
      actions: [],
      bienvenue: {},
      perify: { abonnement: K.PERIFY.abonnement, installation: choix.ensuite ? 0 : K.PERIFY.installation, amortissementMois: K.PERIFY.amortissementMois }
    };
  };
  K.complet = function (choix) { return choix.panier != null && choix.marge != null && choix.cadeau != null && choix.cout != null && choix.passages != null; };
  /** N visites de plus par mois pour que Perify se paie, et M par semaine. null tant qu'il manque une réponse. */
  K.resultat = function (choix, catalogue) {
    if (!K.complet(choix) || !window.CalculateurMoteur) return null;
    var r = window.CalculateurMoteur.calculer(K.choixVersEntrees(choix, catalogue));
    if (!r.complet || !(r.margeVisite > 0) || r.mois.coutTotal === null) return null;
    var n = Math.max(0, Math.ceil((r.mois.coutTotal - r.mois.valeurActions) / r.margeVisite - 1e-9));
    return { n: n, m: Math.ceil(n * 12 / 52 - 1e-9), margeVisite: r.margeVisite, coutTampon: r.tampon.cout, coutPerify: r.mois.coutPerify, moteur: r };
  };

  var choix = {}, catalogue = null, mesure = null, charge = false;
  function cle() { return 'perify_pro.calc.' + (PP.etat.cle || ''); }
  K.oublier = function () { choix = {}; catalogue = null; mesure = null; charge = false; };

  function puce(k, v, lib, extra) {
    var on = choix[k] === v;
    return '<button class="puce' + (extra || '') + '" data-act="k-choix" data-k="' + k + '" data-v="' + esc(String(v)) + '" aria-pressed="' + on + '">' + (on ? ico('check') : '') + esc(lib) + '</button>';
  }
  function eur(n) { return PP.euros(n, Math.round(n) === n ? 0 : 2); }

  K.ecran = function () {
    if (!charge) {
      charge = true;
      var sauve = PP.stock.lire(cle());
      if (sauve && typeof sauve === 'object') choix = sauve;
      var reste = 2;
      var fini = function () { if (--reste === 0 && PP.etat.ecran === 'P7') { K.garder = true; K.ecran(); } };
      var cat = PP.comptoir.chargerCatalogue ? PP.comptoir.chargerCatalogue() : Promise.resolve(null);
      cat.then(function (c) { catalogue = c && c.length ? c : []; fini(); });
      PP.appel('mesures', { jours: 30 }).then(function (r) {
        if (r && r.status === 'ok' && r.periode) {
          var j = Math.min(Number(r.fenetre_jours) || 30, Number(r.jours_observes) || 0);
          var p = Number(r.periode.passages) || 0;
          if (j > 0 && p > 0) {
            mesure = Math.max(1, Math.round(p * 7 / j));
            if (choix.passages == null) choix.passages = mesure;
          }
        }
        fini();
      });
    }
    var cat2 = catalogue || [];
    var n = 0; ['panier', 'marge', 'cadeau', 'cout', 'passages'].forEach(function (k) { if (choix[k] != null) n++; });
    var res = K.resultat(choix, cat2);
    var q = function (num, titre, corps) { return '<section class="question"><h2 class="q"><span class="num">' + num + '</span>' + titre + '</h2><div class="pastilles-choix">' + corps + '</div></section>'; };
    var cadeaux = catalogue === null ? '<p class="note">Chargement de vos cadeaux…</p>'
      : cat2.length ? cat2.map(function (c) { return puce('cadeau', c.cle, c.libelle + ' · ' + c.tampons + ' tampons'); }).join('')
      : K.TAMPONS_REPLI.map(function (t) { return puce('cadeau', 't' + t, t + ' tampons'); }).join('');
    var passages = K.PASSAGES.map(function (p) { return puce('passages', p, String(p)); }).join('')
      + (mesure && K.PASSAGES.indexOf(mesure) < 0 ? puce('passages', mesure, 'D’après vos chiffres : ' + mesure, ' mesure') : '');
    var verdict;
    if (res) {
      var etSi = [];
      var iP = K.PANIERS.indexOf(choix.panier), iM = K.MARGES.indexOf(choix.marge);
      if (iP >= 0 && iP < K.PANIERS.length - 1) { var c1 = Object.assign({}, choix, { panier: K.PANIERS[iP + 1] }); var r1 = K.resultat(c1, cat2); if (r1) etSi.push(['panier', K.PANIERS[iP + 1], 'Le panier passe à ' + eur(K.PANIERS[iP + 1]) + ' : ' + r1.n + ' visite' + (r1.n > 1 ? 's' : '')]); }
      if (iM > 0) { var c2 = Object.assign({}, choix, { marge: K.MARGES[iM - 1] }); var r2 = K.resultat(c2, cat2); if (r2) etSi.push(['marge', K.MARGES[iM - 1], 'La marge tombe à ' + eur(K.MARGES[iM - 1]) + ' sur 10 € : ' + r2.n + ' visite' + (r2.n > 1 ? 's' : '')]); }
      verdict = '<div class="surface verdict" id="k-verdict" aria-live="polite"><div class="lead">Il suffit de</div><div class="gros">' + res.n + ' visite' + (res.n > 1 ? 's' : '') + ' de plus par mois</div>'
        + '<div class="suite">(environ ' + res.m + ' par semaine) pour que Perify se paie.</div>'
        + '<div class="detail"><div><span>Une visite vous rapporte</span><b>' + PP.euros(res.margeVisite, 2) + '</b></div>'
        + '<div><span>Un tampon vous coûte</span><b>' + PP.euros(res.coutTampon, 2) + '</b></div>'
        + '<div><span>Perify vous coûte par mois</span><b>' + eur(Math.round(res.coutPerify * 100) / 100) + '</b></div></div></div>'
        + (etSi.length ? '<h2 class="titre-section">Et si…</h2><div class="pastilles-choix">' + etSi.map(function (e) { return '<button class="puce" data-act="k-choix" data-k="' + e[0] + '" data-v="' + e[1] + '">' + esc(e[2]) + '</button>'; }).join('') + '</div>' : '')
        + '<p class="note">Le calcul : ce que Perify coûte chaque mois, plus les cadeaux de tous les passages (chaque tampon finit en cadeau), divisé par ce que rapporte une visite.</p>';
    } else {
      var manque = 5 - n;
      verdict = '<div class="surface verdict attente" id="k-verdict" aria-live="polite">' + ico('calcul') + '<p>Touchez une réponse à chaque question : le résultat s’affiche tout de suite.</p><p class="note centre">' + (manque > 0 ? 'Encore ' + manque + ' choix.' : '') + '</p></div>';
    }
    PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Est-ce que ça me rapporte ?</h1><p class="chapo">Touchez une réponse à chaque question. Rien à taper.</p>'
      + '<div class="deux-colonnes"><div>'
      + q(1, 'Un client dépense en moyenne', K.PANIERS.map(function (v) { return puce('panier', v, eur(v)); }).join(''))
      + q(2, 'Sur 10 € vendus, il vous reste, une fois les produits payés', K.MARGES.map(function (v) { return puce('marge', v, eur(v)); }).join(''))
      + q(3, 'Le cadeau le plus pris', cadeaux)
      + '<section class="question"><h2 class="q">Il vous coûte à préparer</h2><div class="pastilles-choix">' + K.COUTS.map(function (v) { return puce('cout', v, eur(v)); }).join('') + '</div></section>'
      + q(4, 'Passages avec la carte, chaque semaine', passages)
      + (mesure ? '<p class="note">' + (K.PASSAGES.indexOf(mesure) >= 0 ? mesure + ' : d’après vos chiffres des 30 derniers jours.' : 'D’après vos chiffres des 30 derniers jours.') + '</p>' : '')
      + '</div><div>'
      + '<h2 class="titre-section">Perify</h2><div class="surface serree prix-perify"><div class="vignette icone">' + ico('calcul') + '</div><div><div class="t">39 € par mois et 120 € d’installation.</div>'
      + '<div class="s">La première année, 49 € par mois (l’installation étalée sur 12 mois). Ensuite, 39 € par mois.</div></div></div>'
      + '<div class="segments mt-12" role="group" aria-label="Période de calcul"><button class="segment" data-act="k-annee" data-v="0" aria-pressed="' + !choix.ensuite + '">La première année</button><button class="segment" data-act="k-annee" data-v="1" aria-pressed="' + !!choix.ensuite + '">Ensuite</button></div>'
      + '<h2 class="titre-section">Le résultat</h2>' + verdict
      + '</div></div>', { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P7', titre: 'Est-ce que ça me rapporte ?', garderDefilement: K.garder });
    K.garder = false;
  };
  PP.actions['k-choix'] = function (el) {
    var k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
    var avant = K.complet(choix);
    choix[k] = (k === 'cadeau') ? v : Number(v);
    PP.stock.ecrire(cle(), choix);
    K.garder = true; K.ecran();
    if (!avant && K.complet(choix)) { var d = document.getElementById('k-verdict'); if (d && d.scrollIntoView) d.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  };
  PP.actions['k-annee'] = function (el) { choix.ensuite = el.getAttribute('data-v') === '1'; PP.stock.ecrire(cle(), choix); K.garder = true; K.ecran(); };
})();
