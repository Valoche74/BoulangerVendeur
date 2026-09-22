/* LE CALCULATEUR DE MARGE — LE MOTEUR, sans page (23/09/2026).

   Répond à la seule question que se pose un commerçant : « est-ce que ça me rapporte ? »
   avec SES chiffres. Rien n'est inventé : ce qui manque est listé (`manque`), jamais deviné.

   Ce qu'il calcule :
     · ce qu'un tampon COÛTE : le prix de revient d'un cadeau divisé par ses tampons — jamais
       son prix de vente (un tacos à 20 tampons ne coûte pas 9 €, il coûte ses ingrédients) ;
       le coût MOYEN d'un tampon est pondéré par ce que les clients choisissent vraiment (le mix
       des échanges) quand on le sait, sinon par la moyenne simple des cadeaux renseignés ;
     · ce qu'un tampon RAPPORTE : un tampon = une visite = panier moyen × marge ;
     · le mois : tampons distribués (passages, actions, cadeaux de bienvenue), ce qu'ils
       coûteront en cadeaux, l'abonnement Perify, et en face la marge des visites que le
       programme fait revenir — selon une part que le commerçant CHOISIT (`incrementalitePct`) ;
     · le SEUIL : la part des visites qui doivent être dues au programme pour qu'il se paie.
       C'est la sortie la plus honnête : au lieu d'affirmer un gain, on dit à partir de quoi il y
       en a un ;
     · les LEVIERS : chaque cadeau à ±1 tampon, chaque action à supprimer — et ce que ça change
       par mois.

   Chargé par calculateur.html (window.CalculateurMoteur) et par l'essai
   _outils/tests/test-calculateur.mjs (globalThis). Aucune dépendance. */
(function (racine) {
  'use strict';

  function nombre(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  function arrondi(n, d) { if (!Number.isFinite(n)) return null; const k = Math.pow(10, d == null ? 2 : d); return Math.round(n * k) / k; }

  /** Le coût d'UN tampon pour un cadeau donné : prix de revient / tampons demandés. */
  function coutParTampon(cadeau) {
    const t = nombre(cadeau && cadeau.tampons), c = nombre(cadeau && cadeau.coutRevient);
    if (t === null || t <= 0 || c === null || c < 0) return null;
    return c / t;
  }

  /** Le coût moyen d'un tampon sur tout le catalogue — pondéré par le mix des échanges si on l'a. */
  function coutMoyenTampon(cadeaux, mix) {
    const utiles = (cadeaux || []).map(function (c) { return { cle: c.cle, cpt: coutParTampon(c) }; }).filter(function (c) { return c.cpt !== null; });
    const total = (cadeaux || []).length;
    if (!utiles.length) return { cout: null, min: null, max: null, base: 'incomplet', renseignes: 0, total: total };
    const couts = utiles.map(function (c) { return c.cpt; });
    const min = Math.min.apply(null, couts), max = Math.max.apply(null, couts);
    const poids = utiles.map(function (c) { return (mix && Number(mix[c.cle]) > 0) ? Number(mix[c.cle]) : 0; });
    const totalPoids = poids.reduce(function (s, p) { return s + p; }, 0);
    let cout, base;
    if (mix && totalPoids > 0) {
      base = 'mix';
      cout = utiles.reduce(function (s, c, i) { return s + c.cpt * poids[i]; }, 0) / totalPoids;
    } else {
      base = 'moyenne';
      cout = couts.reduce(function (s, v) { return s + v; }, 0) / couts.length;
    }
    return { cout: cout, min: min, max: max, base: base, renseignes: utiles.length, total: total };
  }

  /**
   * Tout le calcul, à partir d'un objet d'entrées (toutes facultatives ; ce qui manque est listé).
   *   panierMoyen (€), margePct (%), clientsActifs (n), visitesParClientParMois (n),
   *   tauxEchangePct (% des tampons qui finissent en cadeau, 100 par défaut),
   *   passageTampons (1 par défaut),
   *   cadeaux: [{ cle, libelle, tampons, coutRevient }], mix: { cle: n } | null,
   *   actions: [{ cle, libelle, tampons, parMois, valeur (€ ou null) }],
   *   bienvenue: { coutRevient (€), parMois (n) },
   *   perify: { abonnement, installation, amortissementMois },
   *   incrementalitePct (% des visites dues au programme — SON hypothèse) | null
   */
  function calculer(e) {
    e = e || {};
    const manque = [];
    const panier = nombre(e.panierMoyen), marge = nombre(e.margePct);
    const clients = nombre(e.clientsActifs) || 0, visites = nombre(e.visitesParClientParMois) || 0;
    const tauxEchange = e.tauxEchangePct == null || e.tauxEchangePct === '' ? 100 : (nombre(e.tauxEchangePct) == null ? 100 : nombre(e.tauxEchangePct));
    const passageTampons = e.passageTampons == null ? 1 : (nombre(e.passageTampons) || 1);
    const cadeaux = (e.cadeaux || []).map(function (c) {
      return { cle: c.cle, libelle: c.libelle, tampons: nombre(c.tampons), coutRevient: nombre(c.coutRevient) };
    });

    if (panier === null) manque.push('panier_moyen');
    if (marge === null) manque.push('marge');
    if (!clients) manque.push('clients');
    if (!visites) manque.push('visites');

    const tampon = coutMoyenTampon(cadeaux, e.mix || null);
    if (tampon.cout === null) manque.push('cout_cadeaux');
    const margeVisite = (panier !== null && marge !== null) ? panier * marge / 100 : null;

    const parCadeau = cadeaux.map(function (c) {
      const cpt = coutParTampon(c);
      return {
        cle: c.cle, libelle: c.libelle, tampons: c.tampons, coutRevient: c.coutRevient,
        coutParTampon: cpt,
        margeAvantCadeau: (margeVisite !== null && c.tampons) ? margeVisite * c.tampons : null,   // ce que le client a rapporté avant de l'obtenir
        rapport: (cpt !== null && cpt > 0 && margeVisite !== null) ? margeVisite / cpt : null       // € de marge par € offert
      };
    });

    // ── le mois ──
    const visitesTotales = clients * visites;
    const tamponsPassages = visitesTotales * passageTampons;
    const actions = (e.actions || []).map(function (a) {
      return { cle: a.cle, libelle: a.libelle, tampons: nombre(a.tampons) || 0, parMois: nombre(a.parMois) || 0, valeur: nombre(a.valeur) };
    });
    const tamponsActions = actions.reduce(function (s, a) { return s + a.tampons * a.parMois; }, 0);
    const cpt = tampon.cout;
    const coutCadeauxPassages = cpt !== null ? tamponsPassages * cpt * tauxEchange / 100 : null;
    const coutActions = cpt !== null ? tamponsActions * cpt * tauxEchange / 100 : null;
    const bienvenue = e.bienvenue || {};
    const bCout = nombre(bienvenue.coutRevient), bParMois = nombre(bienvenue.parMois) || 0;
    let coutBienvenue = 0;
    if (bParMois > 0) { if (bCout === null) { coutBienvenue = null; manque.push('cout_bienvenue'); } else coutBienvenue = bCout * bParMois; }
    const perify = e.perify || {};
    const abo = nombre(perify.abonnement) || 0, inst = nombre(perify.installation) || 0, amort = nombre(perify.amortissementMois) || 12;
    const coutPerify = abo + (amort > 0 ? inst / amort : 0);
    const coutTotal = (coutCadeauxPassages !== null && coutActions !== null && coutBienvenue !== null)
      ? coutCadeauxPassages + coutActions + coutBienvenue + coutPerify : null;

    const valeurActions = actions.reduce(function (s, a) { return s + (a.valeur !== null ? a.valeur * a.parMois : 0); }, 0);
    const actionsSansValeur = actions.filter(function (a) { return a.parMois > 0 && a.valeur === null; }).map(function (a) { return a.cle; });

    const inc = nombre(e.incrementalitePct);
    const visitesGagnees = inc !== null ? visitesTotales * inc / 100 : null;
    const margeGagnee = (visitesGagnees !== null && margeVisite !== null) ? visitesGagnees * margeVisite : null;
    const net = (margeGagnee !== null && coutTotal !== null) ? margeGagnee + valeurActions - coutTotal : null;

    // ── le seuil : la part des visites qui doivent venir du programme pour qu'il se paie ──
    let seuil = null;
    if (coutTotal !== null && margeVisite !== null && margeVisite > 0 && visitesTotales > 0) {
      seuil = Math.max(0, (coutTotal - valeurActions) / (visitesTotales * margeVisite) * 100);
    }
    const sensibilite = [5, 10, 15, 20, 30, 50].map(function (p) {
      return { pct: p, net: (coutTotal !== null && margeVisite !== null) ? visitesTotales * p / 100 * margeVisite + valeurActions - coutTotal : null };
    });

    // ── les leviers ──
    const leviers = [];
    if (coutTotal !== null) {
      cadeaux.forEach(function (c) {
        if (coutParTampon(c) === null) return;
        [1, -1].forEach(function (delta) {
          const t2 = c.tampons + delta;
          if (t2 < 1) return;
          const cad2 = cadeaux.map(function (x) { return x.cle === c.cle ? { cle: x.cle, libelle: x.libelle, tampons: t2, coutRevient: x.coutRevient } : x; });
          const t = coutMoyenTampon(cad2, e.mix || null);
          const total2 = (tamponsPassages + tamponsActions) * t.cout * tauxEchange / 100 + coutBienvenue + coutPerify;
          leviers.push({ type: 'cadeau', cle: c.cle, libelle: c.libelle, avant: c.tampons, apres: t2,
                         coutParTampon: coutParTampon({ tampons: t2, coutRevient: c.coutRevient }),
                         economieMois: coutTotal - total2 });                   // > 0 = le mois coûte moins
        });
      });
      actions.forEach(function (a) {
        if (a.tampons > 0 && a.parMois > 0) {
          leviers.push({ type: 'action', cle: a.cle, libelle: a.libelle, tampons: a.tampons, parMois: a.parMois,
                         coutMois: a.tampons * a.parMois * cpt * tauxEchange / 100, valeurMois: a.valeur !== null ? a.valeur * a.parMois : null });
        }
      });
    }

    return {
      manque: manque, complet: manque.length === 0,
      tampon: tampon, margeVisite: margeVisite, parCadeau: parCadeau,
      mois: {
        visites: visitesTotales, tamponsPassages: tamponsPassages, tamponsActions: tamponsActions,
        coutCadeauxPassages: coutCadeauxPassages, coutActions: coutActions, coutBienvenue: coutBienvenue,
        coutPerify: coutPerify, coutTotal: coutTotal,
        incrementalitePct: inc, visitesGagnees: visitesGagnees, margeGagnee: margeGagnee,
        valeurActions: valeurActions, net: net
      },
      seuil: seuil, sensibilite: sensibilite, leviers: leviers, actionsSansValeur: actionsSansValeur
    };
  }

  /** Ramène une fenêtre incomplète à un mois : 37 passages en 12 jours observés → ~92 par mois. */
  function parMois(n, joursObserves) {
    const j = nombre(joursObserves);
    if (!j || j <= 0) return null;
    return (nombre(n) || 0) * 30 / j;
  }

  racine.CalculateurMoteur = { calculer: calculer, coutParTampon: coutParTampon, coutMoyenTampon: coutMoyenTampon, parMois: parMois, nombre: nombre, arrondi: arrondi };
})(typeof window !== 'undefined' ? window : globalThis);
