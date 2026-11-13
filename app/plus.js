/* Perify Pro — l'onglet « Plus » (13/11/2026).
   P1 la page · P2 téléphones reliés · P3 relier un autre téléphone (QR valable 15 minutes) · P4 changer le code à
   4 chiffres · P5 changer de boutique · P6 mettre sur l'écran d'accueil · P8 paniers anti-gaspi · P9 lecteur de
   cartes sans contact · P10 retirer ce téléphone. Le calculateur (P7) est dans calculateur.js. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var ico = PP.ico, esc = PP.esc;
  var P = PP.plus = {};

  function ligne(route, icone, t, s, v, act) {
    return '<button class="rangee" data-act="' + (act || 'aller') + '"' + (route ? ' data-route="' + route + '"' : '') + '><div class="vignette icone">' + ico(icone) + '</div><div><div class="t">' + t + '</div>' + (s ? '<div class="s"' + (act === 'exporter' ? ' data-export-msg' : '') + '>' + s + '</div>' : '') + '</div>' + (v || '<span class="chevron">' + ico('droite') + '</span>') + '</button>';
  }

  /* ═══ P1 ═══════════════════════════════════════════════════════════════ */
  P.ecran = function () {
    var id = PP.etat.identite || {};
    var b = (PP.acces.memoire().boutiques[PP.etat.cle] || {});
    var depuis = b.relie_le ? 'Relié à ce téléphone depuis le ' + PP.date.jjmm(b.relie_le) : 'Relié à ce téléphone';
    var lecteur = PP.lecteur.allume();
    var plusieurs = PP.acces.boutiques().length > 1;
    PP.montrer(PP.cadre('plus', '<h1 class="grand-titre">Plus</h1>'
      + '<div class="surface"><div class="boutique">' + PP.tuileLogo(id, 'moyen') + '<div><div class="n">' + esc(id.nom || id.nom_court || '') + '</div><div class="s">' + esc(depuis) + '</div></div></div></div>'
      + (PP.stock.ok ? '' : '<div class="alerte neutre mt-16">' + ico('alerte') + '<div><div class="t">Ce téléphone ne garde rien</div><div class="s">Il faudra retaper le code d’accès à chaque visite. Vérifiez que la navigation privée est désactivée.</div></div></div>')
      + '<div class="deux-colonnes"><div>'
      + '<h2 class="titre-section">Outils</h2><div class="liste">'
      + ligne('plus/calculateur', 'calcul', 'Est-ce que ça me rapporte ?', 'Le calculateur, en touchant des choix')
      + ligne('', 'telecharger', 'Votre fichier client', 'Un tableau Excel de vos clients', '', 'exporter')
      + ligne('inscrire', 'ajouter', 'Inscrire un nouveau client', 'Une carte neuve, que le client scanne')
      + (id.antigaspi ? ligne('plus/anti-gaspi', 'panier', 'Paniers anti-gaspi', 'Vos invendus du jour, à petit prix') : '')
      + ligne('plus/lecteur', 'sanscontact', 'Lecteur de cartes sans contact', 'Pour une tablette de caisse', '<span class="v doux">' + (lecteur ? 'Allumé' : 'Éteint') + '</span>')
      + '</div>'
      + '</div><div>'
      + '<h2 class="titre-section">Ce téléphone</h2><div class="liste">'
      + (PP.acces.estInstallee() ? '' : ligne('plus/installer', 'ajouterecran', 'Mettre sur l’écran d’accueil', 'Pour l’ouvrir comme une appli'))
      + ligne('plus/telephones', 'telephone', 'Téléphones reliés', 'Voir et retirer les téléphones de la boutique')
      + ligne('plus/relier', 'qr', 'Relier un autre téléphone', 'Un code à scanner, valable 15 minutes')
      + ligne('plus/code', 'cadenas', 'Changer le code à 4 chiffres', 'Pour tous les téléphones de la boutique')
      + ligne('plus/boutiques', 'boutique', 'Changer de boutique', plusieurs ? PP.acces.boutiques().length + ' boutiques reliées' : 'Si vous gérez plusieurs commerces')
      + ligne('', 'cadenas', 'Verrouiller', 'Le code à 4 chiffres sera demandé', '<span></span>', 'p-verrouiller')
      + '<button class="rangee rouge" data-act="p-retirer-moi"><div class="vignette icone rouge">' + ico('sortir') + '</div><div><div class="t">Retirer ce téléphone</div><div class="s">Il faudra le code d’accès pour le relier de nouveau</div></div><span></span></button>'
      + '</div>'
      + '<h2 class="titre-section">Aide</h2><div class="liste"><a class="rangee" href="mailto:contact@perify.app"><div class="vignette icone">' + ico('courrier') + '</div><div><div class="t">Écrire à Perify</div><div class="s">Une question, un souci au comptoir</div></div><span class="chevron">' + ico('droite') + '</span></a></div>'
      + '<p class="note">Votre code d’accès a circulé ? Écrivez à Perify : vous en recevez un nouveau, l’ancien ne marche plus, et les téléphones reliés devront l’être de nouveau.</p>'
      + '</div></div>'), { nom: 'P1', titre: 'Plus' });
  };
  PP.actions['p-verrouiller'] = function () { PP.acces.fermerSession(); };

  /* ═══ P10 — retirer ce téléphone ═══════════════════════════════════════ */
  PP.actions['p-retirer-moi'] = function () {
    PP.feuille('<div class="t">Retirer ce téléphone ?</div><p class="s">Il faudra le code d’accès pour le relier de nouveau.</p>'
      + '<div id="p-retirer-erreur"></div><div class="pile"><button class="bouton geant" data-act="p-retirer-moi-oui">Oui, retirer ce téléphone</button><button class="bouton-texte discret" data-act="fermer-feuille">Annuler</button></div>');
  };
  PP.actions['p-retirer-moi-oui'] = function (el) {
    var app = PP.etat.appareil || {};
    el.disabled = true; el.classList.add('occupe'); el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Un instant…';
    PP.appel('acces_retirer', { id: app.id || '' }).then(function (r) {
      if (r.status === 'ok' || r.code === 'session_expiree') {
        PP.fermerFeuille();
        var cle = PP.etat.cle;
        PP.acces.oublierBoutique(cle);
        PP.etat.cle = null; PP.etat.identite = null;
        var autres = PP.acces.boutiques();
        if (autres.length) { PP.acces.choisir(autres[0].cle); return PP.acces.session() ? PP.allerRoute('comptoir') : PP.acces.verrouiller(); }
        return PP.acces.ecranCodeAcces();
      }
      el.disabled = false; el.classList.remove('occupe'); el.textContent = 'Oui, retirer ce téléphone';
      var e = document.getElementById('p-retirer-erreur');
      if (e) e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Pas retiré.</b>' + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez dans un instant.') + '</div></div>';
    });
  };

  /* ═══ P2 — téléphones reliés ═══════════════════════════════════════════ */
  P.ecranTelephones = function () {
    PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Téléphones reliés</h1><div class="chargement"><span class="tourne" aria-hidden="true"></span>Chargement…</div>', { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P2', titre: 'Téléphones reliés' });
    PP.appel('acces_appareils', {}).then(function (r) {
      if (PP.etat.ecran !== 'P2') return;
      if (r.status !== 'ok' || !Array.isArray(r.appareils)) {
        PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Téléphones reliés</h1><div class="message-erreur">' + ico('alerte') + '<div><b>La liste n’a pas pu être chargée.</b>' + (r.reseau ? 'Le réseau n’a pas répondu.' : 'Réessayez dans un instant.') + '</div></div>'
          + '<button class="bouton second mt-16" data-act="aller" data-route="plus/telephones">' + ico('actualiser') + 'Réessayer</button>', { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P2', titre: 'Téléphones reliés' });
        return;
      }
      var moi = (PP.etat.appareil || {}).id;
      var l = r.appareils.slice().sort(function (a, b) { return (b.ce_telephone || b.id === moi) - (a.ce_telephone || a.id === moi); });
      PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Téléphones reliés</h1><p class="chapo">Les téléphones qui ouvrent la boutique avec le code à 4 chiffres.</p>'
        + '<div class="liste mt-16">' + l.map(function (a) {
          var c = a.ce_telephone || a.id === moi;
          var vu = a.vu_le ? ' · vu ' + PP.date.relatif(a.vu_le) : '';
          // Les codes faux des 30 derniers jours se voient (quelqu'un essaie-t-il des codes ?).
          var nf = Math.max(0, Number(a.codes_faux_30j) || 0);
          var faux = nf ? '<div class="ligne-erreur">' + nf + ' code' + (nf > 1 ? 's' : '') + ' faux ces 30 jours</div>' : '';
          return '<div class="rangee"><div class="vignette icone">' + ico('telephone') + '</div><div><div class="t">' + esc(a.nom || 'Téléphone') + '</div><div class="s">Relié le ' + PP.date.jjmm(a.relie_le) + esc(vu) + (a.par === 'installation' ? ' · par un lien' : '') + '</div>' + faux + '</div>'
            + (c ? '<span class="etiquette marque">Ce téléphone</span>' : '<button class="bouton petit danger" data-act="p-retirer" data-id="' + esc(a.id) + '" data-nom="' + esc(a.nom || 'Téléphone') + '">Retirer</button>') + '</div>';
        }).join('') + '</div>'
        + '<p class="note">Un téléphone que vous ne connaissez pas, ou beaucoup de codes faux ? Retirez-le, puis changez le code à 4 chiffres.</p>'
        + '<button class="bouton second mt-24" data-act="aller" data-route="plus/relier">' + ico('qr') + 'Relier un autre téléphone</button>', { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P2', titre: 'Téléphones reliés' });
    });
  };
  PP.actions['p-retirer'] = function (el) {
    var id = el.getAttribute('data-id'), nom = el.getAttribute('data-nom');
    PP.feuille('<div class="t">Retirer « ' + esc(nom) + ' » ?</div><p class="s">Ce téléphone n’ouvrira plus la boutique. Il faudra le code d’accès pour le relier de nouveau.</p>'
      + '<div id="p-retirer-erreur"></div><div class="pile"><button class="bouton geant" data-act="p-retirer-oui" data-id="' + esc(id) + '">Oui, le retirer</button><button class="bouton-texte discret" data-act="fermer-feuille">Annuler</button></div>');
  };
  PP.actions['p-retirer-oui'] = function (el) {
    el.disabled = true; el.classList.add('occupe'); el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Un instant…';
    PP.appel('acces_retirer', { id: el.getAttribute('data-id') }).then(function (r) {
      if (r.status === 'ok') { PP.fermerFeuille(); PP.toast('Téléphone retiré.'); return P.ecranTelephones(); }
      el.disabled = false; el.classList.remove('occupe'); el.textContent = 'Oui, le retirer';
      var e = document.getElementById('p-retirer-erreur');
      if (e) e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Pas retiré.</b>' + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez dans un instant.') + '</div></div>';
    });
  };

  /* ═══ P3 — relier un autre téléphone ══════════════════════════════════ */
  P.ecranRelier = function () {
    var nav = PP.nav('Plus', 'plus', '');
    PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Relier un autre téléphone</h1><div class="chargement"><span class="tourne" aria-hidden="true"></span>Préparation du lien…</div>', { nav: nav }), { nom: 'P3', titre: 'Relier un téléphone' });
    PP.appel('acces_installation', {}).then(function (r) {
      if (PP.etat.ecran !== 'P3') return;
      var lien = String((r && r.lien) || '');
      if (r.status !== 'ok' || !/^https:\/\/pro\.perify\.app\/app\/#i=[A-Za-z0-9_-]+$/.test(lien)) {
        var txt = r.code === 'trop_de_liens' && r.codes_faux ? '<b>Trop de codes faux tapés avec des liens aujourd’hui.</b>Réessayez demain, ou reliez l’autre téléphone avec le code d’accès.'
          : r.code === 'trop_de_liens' ? '<b>Trop de liens en attente.</b>Attendez qu’ils expirent (15 minutes), ou utilisez-en un.'
          : r.reseau ? '<b>Le lien n’a pas pu être préparé.</b>Le réseau n’a pas répondu. Réessayez.' : '<b>Le lien n’a pas pu être préparé.</b>Réessayez dans un instant.';
        PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Relier un autre téléphone</h1><div class="message-erreur" role="alert">' + ico('alerte') + '<div>' + txt + '</div></div>'
          + '<button class="bouton second mt-16" data-act="aller" data-route="plus/relier">' + ico('actualiser') + 'Réessayer</button>', { nav: nav }), { nom: 'P3', titre: 'Relier un téléphone' });
        return;
      }
      var fin = Date.parse(r.expire_le) || (Date.now() + 15 * 60000);
      P.lien = lien;
      PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Relier un autre téléphone</h1>'
        + '<div class="encart">' + ico('telephone') + '<span>Sur l’autre téléphone, ouvrez Perify Pro, touchez « Scanner un code de liaison » et visez ce code. Puis tapez le code à 4 chiffres de la boutique. Sans l’appli, l’appareil photo l’ouvre aussi.</span></div>'
        + '<div class="qr mt-24" id="p-qr" role="img" aria-label="QR code du lien d’installation"></div>'
        + '<p class="compte-rebours" id="p-rebours" aria-live="off"></p>'
        + '<div class="pile mt-16"><button class="bouton second" data-act="p-copier">' + ico('copier') + 'Copier le lien</button></div>'
        + '<p class="note centre">Le lien ne sert qu’une fois. Ne l’envoyez qu’à une personne de la boutique.</p>', { nav: nav }), { nom: 'P3', titre: 'Relier un téléphone' });
      PP.qr(document.getElementById('p-qr'), lien);
      var tic = function () {
        var s = Math.round((fin - Date.now()) / 1000), e = document.getElementById('p-rebours');
        if (!e) return;
        if (s <= 0) {
          var q = document.getElementById('p-qr'); if (q) q.innerHTML = '<p class="note centre">Ce lien n’est plus valable.</p>';
          e.innerHTML = '<button class="bouton" data-act="aller" data-route="plus/relier">' + ico('actualiser') + 'Nouveau lien</button>';
          return true;
        }
        e.textContent = 'Valable encore ' + PP.date.minSec(s);
      };
      if (!tic()) { var t = PP.minuteur(function () { if (tic()) clearInterval(t); }, 1000, true); }
    });
  };
  PP.actions['p-copier'] = function () {
    if (!P.lien) return;
    var ok = function () { PP.toast('Lien copié.'); };
    try { navigator.clipboard.writeText(P.lien).then(ok).catch(function () { PP.toast('Copie impossible : faites scanner le code.', true); }); }
    catch (e) { PP.toast('Copie impossible : faites scanner le code.', true); }
  };

  /* ═══ P4 — changer le code à 4 chiffres ═══════════════════════════════ */
  P.ecranCode = function (etape, actuel, premier, msg) {
    etape = etape || 1;
    var titres = { 1: 'Tapez le code actuel', 2: 'Choisissez le nouveau code', 3: 'Tapez-le une seconde fois' };
    var consignes = { 1: 'Celui que vous tapez chaque jour.', 2: 'Les autres téléphones le demanderont la prochaine fois.', 3: 'Pour être sûr qu’il n’y a pas de faute de frappe.' };
    var pave = new PP.Pave({ longueur: 4, masque: true, serre: true, libelle: titres[etape], quandComplet: function (code, p) {
      if (etape === 1) return P.ecranCode(2, code);
      if (etape === 2) {
        if (PP.acces.codeTropFacile(code)) { p.erreur(); return dire('Ce code est trop facile à deviner. Choisissez-en un autre.'); }
        if (code === actuel) { p.erreur(); return dire('C’est le code actuel. Choisissez-en un autre.'); }
        return P.ecranCode(3, actuel, code);
      }
      if (code !== premier) return P.ecranCode(2, actuel, null, 'Les deux codes ne sont pas pareils. Recommencez.');
      p.occupe = true; p.majCases(); dire('<span class="tourne" aria-hidden="true"></span>&nbsp;Un instant…', true);
      PP.appel('acces_code_changer', { code_actuel: actuel, code_nouveau: code }).then(function (r) {
        if (r.status === 'ok') { PP.toast('Nouveau code enregistré.'); return PP.allerRoute('plus'); }
        /* Le code actuel compte sur le compteur de CE téléphone : au dernier essai (14 codes faux sur 30 jours, ou le 9e
           d'affilée), le prochain code faux le retire. On le dit, comme sur l'écran du code de chaque jour. */
        var dernier = r.dernier_essai ? ' Au prochain code faux, ce téléphone devra être relié de nouveau.' : '';
        if (r.code === 'code_faux') { var n = Number(r.essais_restants); return P.ecranCode(1, null, null, 'Le code actuel n’est pas le bon.' + (dernier || (n >= 1 ? ' Encore ' + n + ' essai' + (n > 1 ? 's' : '') + ', puis une pause.' : ''))); }
        if (r.code === 'pause') return P.ecranCode(1, null, null, 'Trop d’essais. Réessayez dans ' + PP.date.duree(r.reste_sec) + '.' + dernier);
        if (r.code === 'code_trop_facile') return P.ecranCode(2, actuel, null, 'Ce code est trop facile à deviner. Choisissez-en un autre.');
        if (r.code === 'appareil_retire') return PP.acces.ecranPlusRelie(r.pourquoi || '');
        p.occupe = false; p.vider();
        dire(r.reseau ? 'Pas de réseau. Réessayez.' : 'Un souci est survenu. Réessayez.');
      });
    } });
    function dire(t, info) { var m = document.getElementById('v-message'); if (m) { m.className = 'message' + (info ? ' info' : ''); m.innerHTML = t; } }
    PP.montrer(PP.cadre('plus', '<div class="verrou">' + PP.tuileLogo(PP.etat.identite, 'moyen') + '<h1>' + titres[etape] + '</h1><p class="consigne">' + consignes[etape] + '</p>'
      + pave.htmlCasesBloc() + '<div class="message" id="v-message" aria-live="assertive"></div>' + pave.htmlTouches() + '</div>',
    { nav: PP.nav('Plus', 'plus', 'Changer le code') }), { nom: 'P4-' + etape, titre: 'Changer le code' });
    if (msg) dire(msg);
  };

  /* ═══ P5 — changer de boutique ═════════════════════════════════════════ */
  P.ecranBoutiques = function () {
    var l = PP.acces.boutiques();
    var session = !!PP.acces.session();
    var corps = '<h1 class="titre-ecran">Changer de boutique</h1><p class="chapo">Chaque boutique a son lien avec ce téléphone, et son code à 4 chiffres.</p>'
      + '<div class="liste mt-16">' + l.map(function (x) {
        var id = x.b.identite || {}, active = x.cle === PP.etat.cle;
        return '<button class="rangee" data-act="p-boutique" data-cle="' + esc(x.cle) + '">' + PP.tuileLogo(id) + '<div><div class="t">' + esc(id.nom || id.nom_court || x.cle) + '</div><div class="s">' + (active ? 'Ouverte en ce moment' : 'Reliée à ce téléphone') + '</div></div>'
          + (active ? '<span class="etiquette marque">Active</span>' : '<span class="chevron">' + ico('droite') + '</span>') + '</button>';
      }).join('') + '</div>'
      + '<button class="bouton second mt-24" data-act="vers-code-acces">' + ico('ajouter') + 'Relier une autre boutique</button>';
    if (session) PP.montrer(PP.cadre('plus', corps, { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P5', titre: 'Changer de boutique' });
    else PP.montrer('<div class="app"><nav class="nav" aria-label="Navigation"><button class="retour" data-act="retour-verrou">' + ico('gauche') + 'Retour</button><span></span><span></span></nav><main class="contenu">' + corps + '</main></div>', { nom: 'P5', titre: 'Changer de boutique' });
  };
  PP.actions['p-boutique'] = function (el) {
    var cle = el.getAttribute('data-cle');
    if (!PP.acces.choisir(cle)) return;
    PP.comptoir.aRemettre = null; PP.comptoir.carte = null; PP.comptoir.catalogue = null; PP.comptoir.panneau = null;
    PP.chiffres.oublier(); PP.annonces.oublier();
    if (PP.calculateur) PP.calculateur.oublier();
    // Ouvrir une boutique mène toujours au comptoir, même après ses 4 chiffres.
    if (PP.acces.session()) { location.hash = '#/comptoir'; PP.route(); }
    else { try { history.replaceState(null, '', '#/comptoir'); } catch (e) {} PP.acces.verrouiller(); }
  };

  /* ═══ P6 — mettre sur l'écran d'accueil ═══════════════════════════════ */
  P.ecranInstaller = function () {
    PP.montrer(PP.cadre('plus', PP.acces.htmlInstaller(true), { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P6', titre: 'Écran d’accueil' });
  };

  /* ═══ P8 — paniers anti-gaspi ══════════════════════════════════════════ */
  var ag = { pid: null, qty: 1, prix: 4, valeur: 10, liste: null };
  var AG_PRODUITS = {
    boulangerie: [['croissant', 'Viennoiseries'], ['baguette', 'Pains'], ['eclair', 'Pâtisseries'], ['cookie', 'Biscuits']],
    baps: [['burger', 'Burgers'], ['tacos', 'Tacos'], ['frites', 'Frites'], ['mozza', 'Mozzasticks']]
  };
  function agProduits() {
    var m = (PP.etat.identite || {}).metier;
    var l = AG_PRODUITS[m] || AG_PRODUITS.boulangerie, photos = PP.produitsDuMetier(m, false);
    return l.map(function (x) { var p = photos.filter(function (y) { return y.id === x[0]; })[0] || {}; return { id: x[0], nom: x[1], img: p.img || '' }; });
  }
  P.ecranAntiGaspi = function () {
    var l = agProduits();
    if (!ag.pid) ag.pid = l[0].id;
    var en = ag.liste;
    PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Paniers anti-gaspi</h1><p class="chapo">Vos invendus du jour, à petit prix. Vos clients les voient sur leur carte de fidélité.</p>'
      + '<h2 class="titre-section serre">En vente maintenant</h2>' + (en === null ? '<p class="note">Chargement…</p>' : en.length ? '<div class="liste">' + en.map(function (p) {
        return '<div class="rangee"><div class="vignette">' + ico('panier') + '</div><div><div class="t">' + esc(p.libelle) + '</div><div class="s">' + (Number(p.qty) || 0) + ' panier' + ((Number(p.qty) || 0) > 1 ? 's' : '') + ' · ' + PP.euros(Number(p.prix_reduit) || 0, 2) + (p.prix_origine ? ' au lieu de ' + PP.euros(Number(p.prix_origine), 2) : '') + '</div></div>'
          + '<button class="bouton petit danger" data-act="ag-retirer" data-id="' + esc(p.id) + '">Retirer</button></div>';
      }).join('') + '</div>' : '<p class="note">Aucun panier en vente aujourd’hui.</p>')
      + '<h2 class="titre-section">Mettre un panier en vente</h2><div class="produits deux">' + l.map(function (p) {
        var on = p.id === ag.pid;
        return '<button class="produit" data-act="ag-produit" data-id="' + p.id + '" aria-pressed="' + on + '">' + (on ? '<span class="coche">' + ico('check') + '</span>' : '') + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : ico('panier')) + esc(p.nom) + '</button>';
      }).join('') + '</div>'
      + '<div class="liste mt-12">'
      + '<div class="rangee sans-icone"><span class="t">Nombre de paniers</span><div class="pas"><button data-act="ag-pas" data-k="qty" data-d="-1" aria-label="Moins">' + ico('retirer') + '</button><b>' + ag.qty + '</b><button data-act="ag-pas" data-k="qty" data-d="1" aria-label="Plus">' + ico('ajouter') + '</button></div></div>'
      + '<div class="rangee sans-icone"><div><div class="t">Prix du panier</div></div><div class="pas"><button data-act="ag-pas" data-k="prix" data-d="-1" aria-label="Moins">' + ico('retirer') + '</button><b>' + PP.euros(ag.prix, 2) + '</b><button data-act="ag-pas" data-k="prix" data-d="1" aria-label="Plus">' + ico('ajouter') + '</button></div></div>'
      + '<div class="rangee sans-icone"><div><div class="t">Valeur en boutique</div><div class="s">Ce que le panier vaudrait au prix normal</div></div><div class="pas"><button data-act="ag-pas" data-k="valeur" data-d="-1" aria-label="Moins">' + ico('retirer') + '</button><b>' + PP.euros(ag.valeur, 2) + '</b><button data-act="ag-pas" data-k="valeur" data-d="1" aria-label="Plus">' + ico('ajouter') + '</button></div></div>'
      + '</div><div id="ag-erreur"></div>'
      + '<button class="bouton geant mt-24" data-act="ag-vendre">' + ico('panier') + 'Mettre en vente</button>'
      + '<p class="note centre">Le panier disparaît des cartes à la fermeture.</p>', { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P8', titre: 'Anti-gaspi', garderDefilement: P.garder });
    P.garder = false;
    if (ag.liste === null) agCharger();
  };
  function agCharger() {
    PP.appel('ag_list', { all: '0' }).then(function (r) { ag.liste = r && r.status === 'ok' && Array.isArray(r.paniers) ? r.paniers : []; if (PP.etat.ecran === 'P8') { P.garder = true; P.ecranAntiGaspi(); } });
  }
  PP.actions['ag-produit'] = function (el) { ag.pid = el.getAttribute('data-id'); P.garder = true; P.ecranAntiGaspi(); };
  PP.actions['ag-pas'] = function (el) {
    var k = el.getAttribute('data-k'), d = Number(el.getAttribute('data-d'));
    if (k === 'qty') ag.qty = Math.min(20, Math.max(1, ag.qty + d));
    if (k === 'prix') ag.prix = Math.min(50, Math.max(0.5, Math.round((ag.prix + d * 0.5) * 2) / 2));
    if (k === 'valeur') ag.valeur = Math.min(100, Math.max(1, ag.valeur + d));
    P.garder = true; P.ecranAntiGaspi();
  };
  PP.actions['ag-vendre'] = function (el) {
    var p = agProduits().filter(function (x) { return x.id === ag.pid; })[0];
    if (ag.prix >= ag.valeur) { document.getElementById('ag-erreur').innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Le prix doit être plus bas que la valeur en boutique.</b>Baissez le prix ou montez la valeur.</div></div>'; return; }
    el.disabled = true; el.classList.add('occupe'); el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Mise en vente…';
    PP.appel('ag_create', { libelle: 'Panier ' + p.nom.toLowerCase(), qty: ag.qty, prix_reduit: ag.prix, prix_origine: ag.valeur }).then(function (r) {
      el.disabled = false; el.classList.remove('occupe'); el.innerHTML = ico('panier') + 'Mettre en vente';
      if (r.status === 'ok') { PP.toast('Panier en vente.' + (r.notified ? ' ' + r.notified + ' client' + (r.notified > 1 ? 's' : '') + ' prévenu' + (r.notified > 1 ? 's' : '') + '.' : '')); ag.liste = null; return agCharger(); }
      document.getElementById('ag-erreur').innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Pas mis en vente.</b>' + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez dans un instant.') + '</div></div>';
    });
  };
  PP.actions['ag-retirer'] = function (el) {
    el.disabled = true; el.innerHTML = '<span class="tourne" aria-hidden="true"></span>';
    PP.appel('ag_delete', { id: el.getAttribute('data-id') }).then(function (r) {
      if (r.status === 'ok') { PP.toast('Panier retiré.'); ag.liste = null; return agCharger(); }
      el.disabled = false; el.textContent = 'Retirer';
      PP.toast(r.reseau ? 'Pas de réseau : rien n’est retiré.' : 'Pas retiré. Réessayez.', true);
    });
  };

  /* ═══ P9 — le lecteur de cartes sans contact (tablette de caisse) ═════ */
  PP.lecteur = {
    allume: function () { return PP.stock.lire('perify_pro.lecteur') === true; },
    /** Une carte posée sur le lecteur : il « tape » son numéro ou l'identifiant de sa puce, puis Entrée. */
    carteLue: function (v) {
      var s = String(v || '').trim().toUpperCase();
      if (!s || !PP.acces.session()) return;
      PP.lecteur.derniere = Date.now();
      var carte = /^[A-Z]{2,6}-/.test(s);
      PP.comptoir.identifier(carte ? { card_id: s.slice(0, 24) } : { uid: s.slice(0, 40) });
    }
  };
  P.ecranLecteur = function () {
    var on = PP.lecteur.allume();
    PP.montrer(PP.cadre('plus', '<h1 class="titre-ecran">Lecteur sans contact</h1><p class="chapo">Pour une tablette de caisse avec un lecteur de cartes branché.</p>'
      + '<button class="interrupteur mt-16" data-act="p-lecteur" aria-pressed="' + on + '"><div><div class="t">Lecteur de cartes</div><div class="s">' + (on ? 'Prêt : posez une carte sur le lecteur' : 'Éteint') + '</div></div><span class="glisse" aria-hidden="true"></span></button>'
      + '<p class="note mt-16">Branchez le lecteur sur la tablette. Quand un client pose sa carte, sa fiche s’ouvre toute seule, comme après un scan.</p>'
      + (PP.lecteur.derniere ? '<p class="note">Dernière carte lue à ' + PP.date.heure(PP.lecteur.derniere) + '.</p>' : ''),
    { nav: PP.nav('Plus', 'plus', '') }), { nom: 'P9', titre: 'Lecteur sans contact' });
  };
  PP.actions['p-lecteur'] = function () { PP.stock.ecrire('perify_pro.lecteur', !PP.lecteur.allume()); P.ecranLecteur(); };
})();
