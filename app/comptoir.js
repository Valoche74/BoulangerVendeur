/* Perify Pro — le comptoir (13/11/2026).
   L'écran d'accueil : « N cadeaux à remettre » (les cadeaux que les clients ont validés sur leur carte), le gros
   bouton « Scanner », et le pavé du code cadeau, vérifié tout seul au 6e chiffre. Le résultat s'affiche sur un
   écran entier d'une couleur : vert = donnez, rouge = ne donnez rien, couleur du commerce = déjà validé par le
   client. « C'est enregistré » ne s'affiche QUE si le serveur répond « marked » (correction du 12/11, gardée).
   Écrans : C1 à C5, S1 à S3, R1 à R9, K1 à K3, I1. Aucun encart d'aide ici : jamais pendant une validation. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var C = PP.comptoir = { DUREE_RETOUR: 3000, RELECTURE_MS: 30000, aRemettre: null, carte: null, catalogue: null, panneau: null, horsLigne: false, enAttente: '' };
  var ico = PP.ico, esc = PP.esc;

  /* ── La photo d'un cadeau, quand le métier en a une (sinon le pictogramme du cadeau) ── */
  function sansAccent(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  PP.photoCadeau = function (libelle) {
    var l = sansAccent(libelle);
    var liste = (PP.produitsDuMetier ? PP.produitsDuMetier((PP.etat.identite || {}).metier, true) : []);
    for (var i = 0; i < liste.length; i++) {
      var mots = [sansAccent(liste[i].nom)].concat(liste[i].mots || []);
      for (var j = 0; j < mots.length; j++) if (mots[j] && l.indexOf(mots[j]) >= 0) return liste[i].img;
    }
    return '';
  };
  function vignetteCadeau(libelle, cls) {
    var p = PP.photoCadeau(libelle);
    return '<div class="' + (cls || 'vignette') + '">' + (p ? '<img src="' + esc(p) + '" alt="">' : ico('cadeau')) + '</div>';
  }

  /* ═══ C1 — le comptoir ═════════════════════════════════════════════════ */
  C.ecran = function (opt) {
    opt = opt || {};
    var id = PP.etat.identite || {};
    var arrete = id.etat === 'arrete';
    var hors = C.horsLigne || (typeof navigator.onLine === 'boolean' && !navigator.onLine);
    var inactif = arrete || hors;
    C.pave = new PP.Pave({ longueur: 6, libelle: 'Code cadeau', quandComplet: verifier, inactif: inactif, code: opt.code || '' });
    var alerte = '';
    if (hors) alerte = '<div class="alerte" role="alert">' + ico('horsligne') + '<div><div class="t">Pas de réseau</div><div class="s">Impossible de vérifier un code cadeau. Ne remettez aucun cadeau sans vérification.</div>'
      + '<button class="bouton petit" data-act="c-reessayer">' + ico('actualiser') + 'Réessayer</button></div></div>';
    else if (arrete) alerte = '<div class="alerte" role="status">' + ico('pause') + '<div><div class="t">Votre programme est arrêté</div><div class="s">Vos clients ne gagnent plus de tampons et ne peuvent plus utiliser leurs cadeaux. Votre fichier client reste téléchargeable dans « Plus ».</div>'
      + '<a class="bouton petit" href="mailto:contact@perify.app">' + ico('courrier') + 'Écrire à Perify</a></div></div>';
    var listeAR = (!inactif && C.aRemettre && C.aRemettre.length) ? C.aRemettre : [];
    var nfc = PP.lecteur && PP.lecteur.allume() ? '<span class="nfc">' + ico('sanscontact') + 'Sans contact : prêt</span>' : '';
    var tuile = inactif ? '' : '<button class="tuile-scan' + (listeAR.length && !PP.estTablette() ? ' compacte' : '') + '" id="c-tuile" data-act="scanner">' + ico('scan') + '<span class="grand">Scanner</span><span class="petit">La carte du client ou son code cadeau</span>' + nfc + '</button>';
    // Le réseau est revenu avec un code déjà tapé : un bouton le vérifie (jamais tout seul, relecture du 13/11).
    var verif = (!inactif && !C.enAttente && opt.verifier && C.pave.code.length === 6) ? '<button class="bouton geant verifier" data-act="c-reessayer">' + ico('check') + 'Vérifier ce code cadeau</button>' : '';
    var bas = '<div id="c-bas">' + (C.enAttente ? '<div class="etat-verif">' + '<span class="tourne" aria-hidden="true"></span>' + esc(C.enAttente) + '</div>' : verif + C.pave.htmlTouches()) + '</div>';
    // Un client sans carte : l'inscrire, depuis le comptoir (relecture du 13/11 ; avant, seulement après une carte inconnue).
    var inscrire = inactif ? '' : '<button class="bouton-texte lien-inscrire" data-act="aller" data-route="inscrire">' + ico('ajouter') + 'Carte neuve ? Inscrire le client</button>';

    if (PP.estTablette()) {
      var droite = C.panneau ? panneauResultat(C.panneau) : (PP.tablette ? PP.tablette.journalHtml() : '');
      PP.montrer('<div class="app tablette-comptoir">' + PP.entete() + '<main class="caisse">'
        + '<div class="colonne-scan">' + alerte + tuile + '<div id="c-ar">' + blocARemettre(listeAR) + '</div>' + inscrire + '</div>'
        + '<div class="bloc-code"><h1 class="t">' + (inactif ? 'Code cadeau' : 'Ou tapez le code cadeau') + '</h1>' + C.pave.htmlCasesBloc() + bas + '</div>'
        + '<div class="colonne-droite" id="c-droite">' + droite + '</div>'
        + '</main>' + PP.onglets('comptoir') + '</div>', { nom: 'comptoir', titre: 'Comptoir', focus: false });
      if (C.panneau && C.panneau.apres) C.panneau.apres();
    } else {
      PP.montrer(PP.cadre('comptoir', alerte + '<div id="c-ar">' + blocARemettre(listeAR) + '</div>' + tuile
        + '<h1 class="ou' + (listeAR.length ? ' serre' : '') + '">' + (inactif ? 'Code cadeau' : 'ou tapez le code cadeau') + '</h1>'
        + C.pave.htmlCasesBloc() + bas + inscrire, { classeContenu: 'comptoir' }), { nom: 'comptoir', titre: 'Comptoir', focus: false, garderDefilement: !!opt.garderDefilement });
    }
    if (!inactif) relireARemettre();
  };

  function blocARemettre(liste) {
    if (!liste.length) return '';
    var n = liste.length;
    var lignes = liste.slice(0, 2).map(function (c, i) { return ligneARemettre(c, i); }).join('');
    // « Voir tout » : toujours quand il y en a plus de 2 ; sur un écran court (les lignes s'y cachent), toujours aussi.
    return '<section class="a-remettre" aria-label="Cadeaux à remettre"><div class="tete">' + ico('cadeau') + '<span class="t">' + n + ' cadeau' + (n > 1 ? 'x' : '') + ' à remettre</span>'
      + '<button class="bouton-texte' + (n > 2 ? '' : ' voir-court') + '" data-act="aller" data-route="a-remettre">Voir tout</button></div>' + lignes + '</section>';
  }
  function ligneARemettre(c, i) {
    var min = Math.max(1, Math.round((Number(c.reste_sec) || 0) / 60));
    return '<button class="rangee" data-act="ouvrir-a-remettre" data-i="' + i + '">' + vignetteCadeau(c.gain, 'vignette icone')
      + '<div><div class="t">' + esc(c.gain || 'Cadeau') + (c.prenom ? ' · ' + esc(c.prenom) : '') + '</div><div class="s">encore ' + min + ' min</div></div>'
      + '<span class="chevron">' + ico('droite') + '</span></button>';
  }

  /** « À remettre » est relu toutes les 30 s quand le comptoir est à l'écran et l'appli au premier plan. */
  var relectureEnCours = false;
  function relireARemettre() {
    var lire = function () {
      if (document.visibilityState === 'hidden' || PP.etat.ecran !== 'comptoir' || relectureEnCours || !PP.acces.session()) return;
      relectureEnCours = true;
      PP.appel('a_remettre', {}).then(function (r) {
        relectureEnCours = false;
        var avant = JSON.stringify(C.aRemettre || []);
        C.aRemettre = (r && r.status === 'ok' && Array.isArray(r.cadeaux)) ? r.cadeaux.filter(function (c) { return c && c.code; }) : (r.reseau ? C.aRemettre : null);
        if (PP.etat.ecran === 'comptoir' && JSON.stringify(C.aRemettre || []) !== avant && C.pave && !C.pave.code && !C.enAttente) majARemettre();
      });
    };
    C.relire = lire;   // pour les essais : relire tout de suite
    if (C.aRemettre === null || C.aRemettre === undefined) lire();
    PP.minuteur(lire, C.RELECTURE_MS, true);
  }
  /* Relecture du 13/11 : quand la liste change, seul le bloc « À remettre » est redessiné — le pavé ne bouge pas sous le
     doigt et le défilement reste où il est (avant, tout le comptoir était redessiné et la page remontait). */
  function majARemettre() {
    var bloc = document.getElementById('c-ar');
    if (!bloc || C.horsLigne || (PP.etat.identite || {}).etat === 'arrete') return;
    var liste = (C.aRemettre && C.aRemettre.length) ? C.aRemettre : [];
    bloc.innerHTML = blocARemettre(liste);
    var t = document.getElementById('c-tuile');
    if (t && !PP.estTablette()) t.classList.toggle('compacte', liste.length > 0);
    var ou = document.querySelector('.comptoir .ou');
    if (ou) ou.classList.toggle('serre', liste.length > 0);
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && PP.etat.ecran === 'comptoir' && PP.acces.session()) { C.aRemettre = null; C.ecran({ code: C.pave ? C.pave.code : '' }); } });
  /* Le réseau revient pendant que le comptoir dit « Pas de réseau » : l'alerte disparaît, le code déjà tapé reste, et un
     bouton le vérifie (rien ne part tout seul). Avant, la pastille disait « En ligne » sous une alerte « Pas de réseau ». */
  window.addEventListener('online', function () {
    if (!C.horsLigne || PP.etat.ecran !== 'comptoir') return;
    C.horsLigne = false;
    C.ecran({ code: C.dernierCode || '', verifier: true });
  });

  PP.actions['ouvrir-a-remettre'] = function (el) {
    var c = (C.aRemettre || [])[Number(el.getAttribute('data-i'))];
    if (c) dejaValide(c.code, { gain: c.gain, prenom: c.prenom, reste_sec: c.reste_sec, en_fenetre: true });
  };
  PP.actions['c-reessayer'] = function () {
    C.horsLigne = false;
    if (C.dernierCode) { var code = C.dernierCode; C.ecran({ code: code }); verifier(code); }
    else { C.aRemettre = null; C.ecran(); }
  };

  /* C1b — À remettre maintenant (la liste complète) */
  C.ecranARemettre = function () {
    var l = C.aRemettre || [];
    PP.montrer(PP.cadre('comptoir', '<h1 class="titre-ecran">À remettre maintenant</h1>'
      + '<p class="chapo">Ces clients ont validé leur cadeau sur leur téléphone. Touchez une ligne quand vous le donnez.</p>'
      + (l.length ? '<div class="liste mt-16">' + l.map(ligneARemettre).join('') + '</div>' : '<div class="surface mt-16 centre">Aucun cadeau en attente.</div>'),
    { nav: PP.nav('Comptoir', 'comptoir', 'À remettre') }), { nom: 'C1b', titre: 'À remettre' });
  };

  /* ═══ La vérification d'un code cadeau ═════════════════════════════════ */
  function verifier(code) {
    C.dernierCode = code;
    C.enAttente = 'Vérification du code cadeau…';
    if (C.pave) { C.pave.occupe = true; C.pave.majCases(); }
    var bas = document.getElementById('c-bas');
    if (bas) bas.innerHTML = '<div class="etat-verif"><span class="tourne" aria-hidden="true"></span>Vérification du code cadeau…</div>';
    PP.appel('check', { code: code }).then(function (r) {
      C.enAttente = '';
      if (r.reseau) { C.horsLigne = true; return C.ecran({ code: code }); }
      C.horsLigne = false; C.dernierCode = '';
      if (r.code === 'commerce_arrete') return C.ecran();
      if (r.status === 'valid') return valide(code, r);
      if (r.status === 'used' && r.en_fenetre) return dejaValide(code, r);
      if (r.status === 'used') return dejaUtilise(code, r);
      if (r.status === 'expired') return offreTerminee(code, r);
      if (r.status === 'invalid') return inconnu(code);
      PP.toast('Un souci est survenu. Réessayez.', true);
      C.ecran();
    });
  }
  C.verifier = verifier;

  /* ═══ Les résultats : un écran entier, une couleur, une consigne ════════ */
  function blocCadeau(gain, qui, code) {
    return '<div class="cadeau">' + vignetteCadeau(gain, 'photo') + '<div><div class="nom-cadeau">' + esc(gain || 'Cadeau') + '</div>'
      + (qui ? '<div class="qui">' + esc(qui) + '</div>' : '') + '</div></div>'
      + (code ? '<div class="code-rappel"><span>Code cadeau</span><b>' + esc(PP.codeLisible(code)) + '</b></div>' : '');
  }
  function qui(r, verbe) {
    var p = r.prenom ? String(r.prenom) : '';
    var le = r.gagne_le ? ', le ' + r.gagne_le : '';
    return p ? verbe + ' par ' + p + le : (r.gagne_le ? verbe + ' le ' + r.gagne_le : '');
  }
  /** « Fermer » : jamais pendant un enregistrement (relecture du 13/11 — le vendeur passait au client suivant pendant
      que la réponse du premier arrivait, et elle remplaçait son écran). */
  function boutonFermer(o) { return o.envoi ? '<span></span>' : '<button class="fermer" data-act="c-fermer">' + ico('x') + 'Fermer</button>'; }
  function panneauResultat(o) {
    if (o.brut) return o.brut;
    return '<section class="panneau-res r-' + o.ton + '" aria-live="polite"><div class="res-haut"><div class="fermer-l">' + boutonFermer(o) + '</div>'
      + '<div class="res-icone">' + ico(o.icone) + '</div><h2 class="res-titre" data-focus>' + esc(o.titre) + '</h2><p class="res-consigne">' + o.consigne + '</p></div>'
      + (o.corps ? '<div class="corps">' + o.corps + '</div>' : '') + '<div class="bas">' + o.boutons + '</div></section>';
  }
  var ecranOp = 0;   // change à chaque résultat affiché ou fermé : une réponse tardive sait si son écran est encore là
  function afficher(o) {
    ecranOp++;
    if (PP.estTablette()) {
      C.panneau = o;
      if (PP.etat.ecran === 'comptoir' && document.getElementById('c-droite') && C.pave) {
        C.pave.vider(); C.pave.occupe = false;
        var bas = document.getElementById('c-bas'); if (bas) bas.innerHTML = C.pave.htmlTouches();
        document.getElementById('c-droite').innerHTML = panneauResultat(o);
        PP.arreterMinuteurs();
        if (o.apres) o.apres();
        var h = document.querySelector('#c-droite [data-focus]'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
      } else C.ecran();
      return;
    }
    PP.montrer('<div class="resultat r-' + o.ton + '"><div class="res-haut"><div class="fermer-l">' + boutonFermer(o) + '</div>'
      + '<div class="res-icone">' + ico(o.icone) + '</div><h1 class="res-titre">' + esc(o.titre) + '</h1><p class="res-consigne">' + o.consigne + '</p></div>'
      + (o.corps ? '<div class="res-corps"><div class="surface">' + o.corps + '</div></div>' : '')
      + '<div class="res-bas">' + o.boutons + '</div></div>', { nom: o.nom, titre: o.titre });
    if (o.apres) o.apres();
  }
  C.retour = function () { ecranOp++; C.panneau = null; C.enAttente = ''; PP.allerRoute('comptoir'); if (PP.etat.ecran !== 'comptoir') C.ecran(); };
  /** La réponse de « Remis au client » / « C'est donné » arrive : son écran d'envoi est-il toujours là ? */
  function toujoursLa(op) {
    return op === ecranOp && (PP.etat.ecran === 'R2' || PP.etat.ecran === 'R5-envoi' || (PP.estTablette() && PP.etat.ecran === 'comptoir'));
  }
  PP.actions['c-fermer'] = function () { C.retour(); };
  PP.actions['client-suivant'] = function () { C.retour(); };
  PP.actions['retaper'] = function () { C.retour(); };

  var courant = null;   // { code, r } du résultat à l'écran

  /* R1 — code cadeau valide (vert) */
  function valide(code, r, etat) {
    courant = { code: code, r: r };
    var boutons = etat === 'envoi'
      ? '<button class="bouton geant occupe" disabled aria-busy="true"><span class="tourne" aria-hidden="true"></span>Enregistrement…</button><p class="note centre">Un instant : nous enregistrons le code cadeau.</p>'
      : '<button class="bouton geant" data-act="remis-client">' + ico('check') + 'Remis au client</button><button class="bouton-texte discret" data-act="client-suivant">Pas maintenant</button>';
    afficher({ nom: etat === 'envoi' ? 'R2' : 'R1', envoi: etat === 'envoi', ton: 'valide', icone: 'check', titre: 'Code cadeau valide', consigne: 'Donnez le cadeau, puis appuyez sur « Remis au client ».',
      corps: blocCadeau(r.gain, qui(r, PP.accord(r.gain, 'Gagné')), code), boutons: boutons });
  }
  /** L'accord du participe avec le cadeau : « Frites remises », « Tacos remis », « Boisson gagnée ». */
  PP.accord = function (gain, participe) {
    var mot = String(gain || '').trim().split(/\s+/)[0] || '';
    // « Tacos » est un singulier qui finit par s.
    var f = PP.genre(gain) === 'f', pl = /[sx]$/i.test(mot) && !/^tacos$/i.test(mot);
    var base = participe.replace(/s$/, '');
    if (participe === 'remis') return f ? (pl ? 'remises' : 'remise') : 'remis';
    return base + (f ? 'e' : '') + (pl ? 's' : '');
  };
  PP.majuscule = function (t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };
  PP.genre = function (gain) { return /^(frites|boisson|tartelette|baguette|pizza|part|formule|viennoiserie|boule|crêpe|gaufre)/i.test(String(gain || '').trim()) ? 'f' : 'm'; };

  /* Chaque envoi garde SON code : si l'écran a changé quand la réponse arrive (tablette : un autre code tapé, un autre
     onglet), le résultat est dit par un petit bandeau, sans toucher à l'écran du client suivant (relecture du 13/11). */
  PP.actions['remis-client'] = function () {
    if (!courant || courant.envoi) return;
    var code = courant.code, r = courant.r;
    valide(code, r, 'envoi');
    courant.envoi = true;
    var op = ecranOp;
    PP.appel('use', { code: code }).then(function (u) {
      var la = toujoursLa(op);
      if (PP.reseau.marque(u)) {
        PP.journal.ajouter({ t: (r.gain || 'Cadeau') + ' ' + PP.accord(r.gain || 'Cadeau', 'remis'), s: 'Code cadeau ' + PP.codeLisible(code), ok: true, type: 'remis' });
        if (!la) return PP.toast('Code cadeau ' + PP.codeLisible(code) + ' : enregistré.');
        return enregistre(PP.codeLisible(code), (r.gain || 'Cadeau'), r.prenom, 'use');
      }
      if (!la) return PP.toast('Code cadeau ' + PP.codeLisible(code) + ' : pas enregistré. Retapez-le.', true);
      nonEnregistre(u, 'use', code, r);
    });
  };

  /* R3 — c'est enregistré (seulement sur « marked ») ; retour seul au comptoir après 3 s */
  function enregistre(codeLisible, gain, prenom, par, deja) {
    var consigne = par === 'use' ? 'Le code cadeau ' + esc(codeLisible) + ' est utilisé. Il ne pourra plus servir.'
      : deja ? 'C’était déjà noté sur un autre téléphone.' : 'Le cadeau est noté comme donné.';
    afficher({ nom: 'R3', ton: 'valide', icone: 'check', titre: 'C’est enregistré', consigne: consigne,
      corps: blocCadeau(gain, PP.majuscule(PP.accord(gain, 'remis')) + (prenom ? ' à ' + prenom : '') + ', aujourd’hui à ' + PP.date.heure(Date.now()), ''),
      boutons: '<div class="barre-temps" aria-hidden="true"><i id="barre-retour"></i></div><p class="note centre">Retour au comptoir dans 3 secondes.</p><button class="bouton geant" data-act="client-suivant">Client suivant</button>',
      apres: function () {
        var b = document.getElementById('barre-retour');
        if (b) b.style.setProperty('--duree', (C.DUREE_RETOUR / 1000) + 's');
        PP.minuteur(function () { C.retour(); }, C.DUREE_RETOUR);
      } });
  }

  /* R4 — pas enregistré : le code cadeau peut encore servir. Le code et le cadeau sont ceux de L'ENVOI, jamais ceux du
     résultat affiché à ce moment-là (relecture du 13/11). */
  function nonEnregistre(u, par, code, r) {
    r = r || {};
    code = code || '';
    courant = { code: code, r: r };
    var consigne = par === 'remis'
      ? (u && u.reseau ? 'Le réseau n’a pas répondu. Le cadeau reste dans « À remettre » : réessayez.' : 'Le serveur n’a pas confirmé. Le cadeau reste dans « À remettre » : réessayez.')
      : u && u.code === 'rejouer' ? 'Le code à 4 chiffres a été redemandé. Le code cadeau peut encore servir : appuyez sur « Réessayer ».'
      : u && u.reseau ? 'Le réseau n’a pas répondu. Le code cadeau peut encore servir : réessayez avant que le client parte.'
      : 'Le serveur n’a pas confirmé. Le code cadeau peut encore servir : réessayez avant que le client parte.';
    afficher({ nom: 'R4', ton: 'alerte', icone: u && u.reseau ? 'horsligne' : 'alerte', titre: 'Pas enregistré', consigne: consigne,
      corps: blocCadeau(r.gain, qui(r, PP.accord(r.gain, 'Gagné')), par === 'remis' ? '' : code),
      boutons: '<button class="bouton geant" data-act="' + (par === 'remis' ? 'c-est-donne' : 'remis-client') + '">' + ico('actualiser') + 'Réessayer</button><button class="bouton-texte discret" data-act="client-suivant">Fermer sans enregistrer</button>' });
  }

  /* R5 — déjà validé par le client (couleur du commerce) */
  function dejaValide(code, r, etat) {
    courant = { code: code, r: r };
    var reste = Math.max(0, Number(r.reste_sec) || 0), fen = Number(r.window_sec) || 3600;
    var min = Math.max(1, Math.ceil(reste / 60));
    var circ = 169.65, dash = (circ * (1 - Math.min(1, reste / fen))).toFixed(1);
    afficher({ nom: etat === 'envoi' ? 'R5-envoi' : 'R5', envoi: etat === 'envoi', ton: 'deja', icone: 'cadeau', titre: 'Déjà validé par le client', consigne: 'Le client l’a validé sur son téléphone. Donnez-lui le cadeau.',
      corps: blocCadeau(r.gain, qui(r, PP.accord(r.gain, 'Gagné')), '')
        + '<div class="minuteur"><svg class="rond" viewBox="0 0 64 64" aria-hidden="true"><circle class="fond-rond" cx="32" cy="32" r="27" fill="none" stroke-width="7"/><circle class="arc" cx="32" cy="32" r="27" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="169.65" stroke-dashoffset="' + dash + '" transform="rotate(-90 32 32)"/></svg>'
        + '<div><div class="t">Encore ' + min + ' minute' + (min > 1 ? 's' : '') + '</div><div class="s">Après, le cadeau n’est plus valable.</div></div></div>',
      boutons: etat === 'envoi'
        ? '<button class="bouton geant occupe" disabled aria-busy="true"><span class="tourne" aria-hidden="true"></span>Enregistrement…</button>'
        : '<button class="bouton geant" data-act="c-est-donne">' + ico('check') + 'C’est donné</button>' });
  }
  PP.actions['c-est-donne'] = function () {
    if (!courant || courant.envoi) return;
    var code = courant.code, r = courant.r;
    dejaValide(code, r, 'envoi');
    courant.envoi = true;
    var op = ecranOp;
    PP.appel('remis', { code: code }).then(function (u) {
      var la = toujoursLa(op);
      if (PP.reseau.marque(u)) {
        PP.journal.ajouter({ t: (r.gain || 'Cadeau') + ' ' + PP.accord(r.gain || 'Cadeau', 'remis'), s: 'Validé par le client', ok: true, type: 'remis' });
        C.aRemettre = (C.aRemettre || []).filter(function (c) { return c.code !== code; });
        if (!la) return PP.toast(PP.majuscule(PP.accord(r.gain || 'Cadeau', 'remis')) + ' : c’est noté.');
        return enregistre('', r.gain || 'Cadeau', r.prenom, 'remis', !!u.deja);
      }
      if (!la) return PP.toast((r.gain || 'Cadeau') + ' : pas noté. Il reste dans « À remettre ».', true);
      nonEnregistre(u, 'remis', code, r);
    });
  };

  /* R6 — déjà utilisé (rouge) */
  function dejaUtilise(code, r) {
    PP.journal.ajouter({ t: 'Déjà utilisé', s: PP.codeLisible(code) + ' · rien remis', ok: false });
    afficher({ nom: 'R6', ton: 'refus', icone: 'x', titre: 'Déjà utilisé', consigne: 'Ne remettez pas le cadeau.',
      corps: blocCadeau(r.gain, r.utilise_le_texte ? 'Remis le ' + r.utilise_le_texte : '', code),
      boutons: '<button class="bouton geant" data-act="client-suivant">Client suivant</button>' });
  }
  /* R7 — code inconnu (rouge) */
  function inconnu(code) {
    PP.journal.ajouter({ t: 'Code inconnu', s: PP.codeLisible(code) + ' · rien remis', ok: false });
    afficher({ nom: 'R7', ton: 'refus', icone: 'question', titre: 'Code inconnu', consigne: 'Aucun cadeau ne porte ce code. Ne remettez rien.',
      corps: '<div class="code-rappel seul"><span>Code tapé</span><b>' + esc(PP.codeLisible(code)) + '</b></div><p class="note">Relisez les 6 chiffres avec le client. Une faute de frappe arrive vite.</p>',
      boutons: '<button class="bouton geant" data-act="retaper">Retaper le code</button><button class="bouton-texte discret" data-act="client-suivant">Client suivant</button>' });
  }
  /* R8 — offre terminée (rouge) */
  function offreTerminee(code, r) {
    PP.journal.ajouter({ t: 'Offre terminée', s: PP.codeLisible(code) + ' · rien remis', ok: false });
    afficher({ nom: 'R8', ton: 'refus', icone: 'calendrier', titre: 'Offre terminée',
      consigne: (r.fin_le ? 'Ce code cadeau n’est plus valable depuis le ' + esc(r.fin_le) + '.' : 'Ce code cadeau n’est plus valable.') + ' Ne remettez pas le cadeau.',
      corps: blocCadeau(r.gain, qui(r, PP.accord(r.gain, 'Gagné')), code),
      boutons: '<button class="bouton geant" data-act="client-suivant">Client suivant</button>' });
  }
  /* R9 — carte inconnue (rouge) */
  function carteInconnue(cardId) {
    var id = PP.etat.identite || {};
    var pref = String(cardId || '').split('-')[0].toUpperCase();
    var autre = pref && id.prefixe && /^[A-Z]{2,6}$/.test(pref) && pref !== String(id.prefixe).toUpperCase();
    afficher({ nom: 'R9', ton: 'refus', icone: 'carte', titre: 'Carte inconnue',
      consigne: autre ? 'Ce n’est pas une carte ' + esc(nomAvecDe(id)) + '. Elle vient peut-être d’un autre commerce.' : 'Cette carte n’est pas enregistrée chez vous.',
      corps: '<p class="note">Si le QR code est abîmé ou mal éclairé, scannez de nouveau avec la lampe, ou tapez le code cadeau.</p>',
      boutons: '<button class="bouton geant" data-act="scanner">' + ico('scan') + 'Scanner à nouveau</button>'
        + '<button class="bouton-texte" data-act="retaper">Taper le code cadeau</button>'
        + '<button class="bouton-texte" data-act="aller" data-route="inscrire">' + ico('ajouter') + 'Carte neuve ? Inscrire le client</button>' });
  }
  C.carteInconnue = carteInconnue;
  /** « du Bap's », « de Falman », « de la Boulangerie… » */
  function nomAvecDe(id) {
    var n = String(id.nom_court || id.nom || '').trim();
    if (/^le\s/i.test(n)) return 'du ' + n.replace(/^le\s+/i, '');
    if (/^les\s/i.test(n)) return 'des ' + n.replace(/^les\s+/i, '');
    if (/^la\s/i.test(n)) return 'de ' + n;
    if (/^[aeiouyhéè]/i.test(n)) return 'd’' + n;
    return 'de ' + n;
  }

  /* ═══ S1 à S3 — le scanner ═════════════════════════════════════════════ */
  var flux = null, boucle = null, detecteur = null, actif = false, lampe = false;
  var toile = null, ctx = null;
  function arreterCamera() {
    actif = false;
    if (boucle) { cancelAnimationFrame(boucle); clearTimeout(boucle); }
    boucle = null;
    if (flux) { try { flux.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} }
    flux = null; lampe = false;
  }
  function chargerJsQR() {
    if (window.jsQR) return Promise.resolve();
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = 'vendor/jsqr-1.4.0.js';
      s.onload = ok; s.onerror = function () { ko(new Error('jsqr')); };
      document.head.appendChild(s);
    });
  }
  /* Deux usages du scanner : au comptoir (carte ou code cadeau), et avant toute boutique ouverte, pour relier ce
     téléphone avec le code de liaison qu'un autre téléphone de la boutique affiche (« Plus › Relier un autre
     téléphone »). Sur iPhone, c'est le seul moyen de relier l'appli posée sur l'écran d'accueil sans taper le code
     d'accès : un lien ouvert depuis un message ou l'appareil photo s'ouvre dans Safari, qui ne partage rien avec elle. */
  C.modeScan = 'comptoir';
  PP.actions['scanner-liaison'] = function () { C.modeScan = 'liaison'; ouvrirScanner(); };
  PP.actions.scanner = function () { C.modeScan = 'comptoir'; C.panneau = null; ouvrirScanner(); };
  PP.actions['liaison-fermer'] = function () { arreterCamera(); C.modeScan = 'comptoir'; PP.acces.ecranCodeAcces(); };
  function ouvrirScanner() {
    var liaison = C.modeScan === 'liaison';
    var fermer = liaison ? 'liaison-fermer' : 'c-fermer';
    PP.montrer('<div class="scanner"><video id="s-video" playsinline muted autoplay></video><div class="voile-scan"></div>'
      + '<div class="haut"><h1 class="t">' + (liaison ? 'Code de liaison' : 'Scanner') + '</h1><button class="fermer" data-act="' + fermer + '">' + ico('x') + 'Fermer</button></div>'
      + '<div class="viseur" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'
      + '<p class="consigne" id="s-consigne">' + (liaison ? 'Visez le code affiché par l’autre téléphone de la boutique' : 'Visez le QR code de la carte ou du code cadeau') + '</p>'
      + '<p class="sous" id="s-sous">' + (liaison ? 'Sur ce téléphone-là : « Plus », puis « Relier un autre téléphone ».' : 'La lecture se fait toute seule, sans appuyer.') + '</p>'
      + '<div class="actions" id="s-actions"><button class="bouton-verre cache" data-act="lampe" id="s-lampe" aria-pressed="false">' + ico('lampe') + 'Lampe</button>'
      + '<button class="bouton-verre" data-act="' + fermer + '">' + (liaison ? ico('gauche') + 'Retour' : ico('clavier') + 'Taper le code') + '</button></div></div>', { nom: liaison ? 'S1-liaison' : 'S1', titre: liaison ? 'Code de liaison' : 'Scanner' });
    PP.quitter.push(arreterCamera);
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return liaison ? liaisonSansCamera('absente') : cameraIndisponible();
    md.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }).then(function (s) {
      if (PP.etat.ecran !== 'S1' && PP.etat.ecran !== 'S1-liaison') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      flux = s;
      var v = document.getElementById('s-video');
      v.srcObject = s;
      try { var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      try {
        var piste = s.getVideoTracks()[0];
        var cap = piste && piste.getCapabilities ? piste.getCapabilities() : {};
        if (cap && cap.torch) document.getElementById('s-lampe').classList.remove('cache');
        else document.getElementById('s-actions').classList.add('une');
      } catch (e) { document.getElementById('s-actions').classList.add('une'); }
      var pret = ('BarcodeDetector' in window)
        ? window.BarcodeDetector.getSupportedFormats().then(function (f) { if (f.indexOf('qr_code') >= 0) detecteur = new window.BarcodeDetector({ formats: ['qr_code'] }); else return chargerJsQR(); }).catch(function () { return chargerJsQR(); })
        : chargerJsQR();
      return pret.then(function () { actif = true; lire(); }).catch(function () {
        var c = document.getElementById('s-consigne'); if (c) c.textContent = 'Le lecteur de QR code n’a pas pu démarrer. Tapez le code cadeau.';
      });
    }).catch(function (e) {
      var n = e && e.name;
      var bloquee = n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError';
      if (C.modeScan === 'liaison') return liaisonSansCamera(bloquee ? 'bloquee' : 'absente');
      if (bloquee) cameraBloquee();
      else cameraIndisponible();
    });
  }
  function liaisonSansCamera(pourquoi) {
    arreterCamera();
    C.modeScan = 'comptoir';
    PP.acces.ecranCodeAcces({ camera: pourquoi });
  }
  function lire() {
    if (!actif) return;
    var v = document.getElementById('s-video');
    if (!v) return arreterCamera();
    var suite = function (texte) {
      if (texte) { trouve(String(texte).trim()); return; }
      boucle = requestAnimationFrame(lire);
    };
    if (v.readyState >= 2 && v.videoWidth) {
      try {
        if (detecteur) {
          detecteur.detect(v).then(function (codes) { suite(codes && codes.length ? codes[0].rawValue : null); }).catch(function () { suite(null); });
          return;
        }
        if (!toile) { toile = document.createElement('canvas'); ctx = toile.getContext('2d', { willReadFrequently: true }); }
        // jsQR est en JavaScript pur : on échantillonne à 480 px de large, sinon la cadence tombe.
        var ech = 480 / v.videoWidth;
        toile.width = Math.round(v.videoWidth * ech); toile.height = Math.round(v.videoHeight * ech);
        ctx.drawImage(v, 0, 0, toile.width, toile.height);
        var img = ctx.getImageData(0, 0, toile.width, toile.height);
        var q = window.jsQR ? window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' }) : null;
        return suite(q && q.data ? q.data : null);
      } catch (e) { return suite(null); }
    }
    suite(null);
  }
  function trouve(texte) {
    if (C.modeScan === 'liaison') return trouveLiaison(texte);
    if (navigator.vibrate) { try { navigator.vibrate(35); } catch (e) {} }
    arreterCamera();
    var val = texte;
    var m = texte.match(/[?&#]id=([^&\s#]+)/i);
    if (m) { try { val = decodeURIComponent(m[1]); } catch (e) { val = m[1]; } }
    if (/^[0-9]{6}$/.test(val)) { C.ecran({ code: val }); verifier(val); }
    else C.identifier({ card_id: val.slice(0, 24) });
  }
  C.trouve = trouve;
  /** Le code de liaison : le lien d'installation de Perify Pro (…/app/#i=…). Tout autre QR est refusé, sans rien envoyer. */
  function trouveLiaison(texte) {
    var m = /^https:\/\/pro\.perify\.app\/app\/#i=([A-Za-z0-9_-]{20,200})$/.exec(String(texte || '').trim());
    if (!m) {
      var c = document.getElementById('s-consigne');
      if (c) c.textContent = 'Ce n’est pas un code de liaison. Visez celui de l’autre téléphone de la boutique.';
      boucle = setTimeout(function () { boucle = null; if (actif) lire(); }, 1200);
      return;
    }
    if (navigator.vibrate) { try { navigator.vibrate(35); } catch (e) {} }
    arreterCamera();
    C.modeScan = 'comptoir';
    PP.acces.relierParLien(m[1]);
  }
  PP.actions.lampe = function (el) {
    if (!flux) return;
    var piste = flux.getVideoTracks()[0];
    lampe = !lampe;
    try { piste.applyConstraints({ advanced: [{ torch: lampe }] }).catch(function () {}); } catch (e) {}
    el.setAttribute('aria-pressed', lampe ? 'true' : 'false');
  };

  /* S2 — caméra bloquée : le chemin dans les Réglages */
  function cameraBloquee() {
    arreterCamera();
    PP.montrer(PP.cadre('comptoir', '<div class="clef">' + ico('camera') + '</div><h1 class="titre-ecran centre">La caméra est bloquée</h1>'
      + '<p class="chapo centre">Perify Pro a besoin de la caméra pour lire les cartes. Vous pouvez l’autoriser dans les réglages.</p>'
      + '<h2 class="titre-section serre">Sur iPhone ou iPad</h2><ol class="etapes">'
      + '<li><span>Dans Safari, touchez <b>aA</b> ou <b>•••</b> près de l’adresse, puis <b>« Réglages du site web »</b>.</span></li>'
      + '<li><span>Touchez <b>Caméra</b>, puis choisissez <b>« Autoriser »</b>.</span></li>'
      + '<li><span>Revenez ici et touchez « Réessayer ».</span></li></ol>'
      + '<p class="note">Toujours bloquée, ou l’appli est sur l’écran d’accueil ? Ouvrez <b>Réglages</b>, puis <b>Apps</b>, puis <b>Safari</b>, puis <b>Caméra</b>, et choisissez « Autoriser ».</p>'
      + '<h2 class="titre-section serre">Sur Android</h2><ol class="etapes">'
      + '<li><span>Touchez l’icône à gauche de l’adresse (cadenas ou réglages).</span></li>'
      + '<li><span>Touchez <b>Autorisations</b>, puis <b>Caméra</b>, et choisissez <b>« Autoriser »</b>.</span></li>'
      + '<li><span>Revenez ici et touchez « Réessayer ».</span></li></ol>'
      + '<p class="note">L’appli est sur l’écran d’accueil ? Appuyez longuement sur son icône, touchez <b>« Infos sur l’appli »</b>, puis Autorisations, puis Caméra.</p>'
      + '<div class="encart">' + ico('clavier') + '<span>En attendant, le code cadeau à 6 chiffres se tape au clavier : rien n’est bloqué.</span></div>'
      + '<div class="pile mt-24"><button class="bouton geant" data-act="scanner">' + ico('camera') + 'Réessayer</button>'
      + '<button class="bouton second" data-act="c-fermer">' + ico('clavier') + 'Taper le code à la place</button></div>',
    { nav: PP.nav('Comptoir', 'comptoir', 'Caméra'), classeContenu: 'entree-s' }), { nom: 'S2', titre: 'Caméra bloquée' });
  }
  /* S3 — pas de caméra (appareil sans caméra, ou caméra occupée) */
  function cameraIndisponible() {
    arreterCamera();
    PP.montrer(PP.cadre('comptoir', '<div class="clef">' + ico('camera') + '</div><h1 class="titre-ecran centre">Pas de caméra disponible</h1>'
      + '<p class="chapo centre">Cet appareil n’a pas de caméra, ou elle est occupée par une autre appli. Tapez le code cadeau à 6 chiffres.</p>'
      + '<div class="pile mt-24"><button class="bouton geant" data-act="c-fermer">' + ico('clavier') + 'Taper le code cadeau</button>'
      + '<button class="bouton-texte" data-act="scanner">Réessayer la caméra</button></div>',
    { nav: PP.nav('Comptoir', 'comptoir', 'Caméra') }), { nom: 'S3', titre: 'Pas de caméra' });
  }

  /* ═══ K1 à K3 — la carte du client ═════════════════════════════════════ */
  C.identifier = function (q, opt) {
    opt = opt || {};
    if (!opt.silencieux) {
      C.ecran();
      C.enAttente = '';
      var bas = document.getElementById('c-bas');
      if (bas) bas.innerHTML = '<div class="etat-verif"><span class="tourne" aria-hidden="true"></span>Lecture de la carte…</div>';
    }
    return PP.appel('fid_identify', q).then(function (r) {
      if (r.reseau) { C.horsLigne = true; if (!opt.silencieux) C.ecran(); else PP.toast('Pas de réseau. Réessayez.', true); return r; }
      C.horsLigne = false;
      if (r.status === 'active' && r.client) { C.carte = r; C.carteId = r.client.card_id || q.card_id; C.bulle = opt.bulle || null; PP.allerRoute('carte'); return r; }
      if (r.status === 'new') { C.carte = { status: 'new', card_id: r.card_id || q.card_id }; C.carteId = C.carte.card_id; C.bulle = null; PP.allerRoute('carte'); return r; }
      if (r.status === 'unknown' || r.status === 'error') { carteInconnue(q.card_id || ''); return r; }
      PP.toast('Un souci est survenu. Réessayez.', true);
      if (!opt.silencieux) C.ecran();
      return r;
    });
  };
  function chargerCatalogue() {
    if (C.catalogue) return Promise.resolve(C.catalogue);
    return PP.appel('catalogue', {}).then(function (r) {
      if (r && r.status === 'ok' && Array.isArray(r.cadeaux)) C.catalogue = r.cadeaux.filter(function (c) { return Number(c.tampons) > 0; });
      return C.catalogue;
    });
  }
  C.chargerCatalogue = chargerCatalogue;

  C.ecranCarte = function () {
    if (!C.carte) return PP.allerRoute('comptoir');
    if (C.carte.status === 'new') return carteAActiver();
    var tablette = PP.estTablette();
    var d = C.carte, cl = d.client || {};
    var solde = Number(cl.points_solde) || 0;
    var cat = C.catalogue || [];
    var tries = cat.slice().sort(function (a, b) { return a.tampons - b.tampons; });
    var prochain = tries.filter(function (c) { return c.tampons > solde; })[0] || null;
    var dernier = tries[tries.length - 1] || null;
    var vise = prochain || dernier;
    var nouveau = C.bulle ? solde - 1 : -1;
    var grille = '';
    if (vise && vise.tampons <= 20) {
      grille = '<div class="tampons" aria-hidden="true">';
      for (var i = 0; i < vise.tampons; i++) grille += '<span class="tampon' + (i < solde ? ' plein' : '') + (i === nouveau ? ' nouveau' : '') + '">' + (i < solde ? ico('check') : '') + '</span>';
      grille += '</div>';
    }
    var phrase = prochain
      ? 'Plus que ' + (prochain.tampons - solde) + ' tampon' + (prochain.tampons - solde > 1 ? 's' : '') + ' pour ' + PP.article(prochain.libelle)
      : dernier ? 'Assez de tampons pour ' + PP.article(dernier.libelle) + ' : le client l’échange depuis sa carte.' : '';
    var pendants = (d.rewards_pending || []).filter(function (r) { return r && r.code; });
    var valides = d.rewards_active || [];
    var lignes = pendants.map(function (r) {
      return '<div class="rangee">' + vignetteCadeau(r.libelle) + '<div><div class="t">' + esc(r.libelle) + '</div><div class="s">Code cadeau ' + esc(PP.codeLisible(r.code)) + '</div><div class="ligne-erreur cache" data-erreur="' + esc(r.code) + '">Pas enregistré. Réessayez.</div></div>'
        + '<button class="bouton petit" data-act="k-remettre" data-code="' + esc(r.code) + '" data-gain="' + esc(r.libelle) + '">Remis</button></div>';
    }).concat(valides.map(function (r) {
      var min = Math.max(1, Math.round((Number(r.expire_dans) || 0) / 60));
      return '<div class="rangee">' + vignetteCadeau(r.libelle) + '<div><div class="t">' + esc(r.libelle) + '</div><div class="s">Validé par le client · encore ' + min + ' min</div><div class="ligne-erreur cache" data-erreur="' + esc(r.code || '') + '">Pas enregistré. Réessayez.</div></div>'
        + (r.code ? '<button class="bouton petit" data-act="k-donne" data-code="' + esc(r.code) + '" data-gain="' + esc(r.libelle) + '">C’est donné</button>' : '<span class="etiquette marque">À donner</span>') + '</div>';
    }));
    var bulle = C.bulle ? '<div class="bulle" role="status">' + ico('check') + '<div><div class="t">' + C.bulle.n + ' tampon' + (C.bulle.n > 1 ? 's' : '') + ' ajouté' + (C.bulle.n > 1 ? 's' : '') + '</div><div class="s">'
      + solde + ' tampon' + (solde > 1 ? 's' : '') + (vise ? ' sur ' + vise.tampons : '') + '</div></div><button class="bouton" data-act="k-annuler">Annuler</button></div>' : '';
    var corps = '<div class="surface"><div class="client-tete"><h1 class="prenom">' + esc((cl.prenom || '').trim() || 'Client fidèle') + '</h1><div class="numero">Carte ' + esc(C.carteId) + '</div></div>'
      + '<div class="solde"><b class="chiffres">' + solde + '</b><span>tampon' + (solde > 1 ? 's' : '') + (vise ? ' sur ' + vise.tampons : '') + '</span></div>'
      + grille + (phrase ? '<div class="prochain">' + vignetteCadeau(vise.libelle) + '<span>' + esc(phrase) + '</span></div>' : '') + '</div>'
      + (lignes.length ? '<h2 class="titre-section">À remettre maintenant</h2><div class="liste">' + lignes.join('') + '</div>' : '')
      + '<h2 class="titre-section">Ajouter des tampons à la main</h2><p class="note">Pour un client sans téléphone, ou un geste commercial.</p>'
      + '<div class="plus-tampons"><button class="bouton second-marque" data-act="k-tampon" data-n="1">+1</button><button class="bouton second-marque" data-act="k-tampon" data-n="2">+2</button><button class="bouton second-marque" data-act="k-tampon" data-n="3">+3</button></div>'
      + '<div id="k-erreur" aria-live="polite"></div>'
      + '<button class="bouton second mt-24" data-act="client-suivant">Client suivant</button>' + bulle;
    if (tablette) {
      /* Sur la tablette, la carte du client s'ouvre dans la colonne de droite : le pavé reste là (relecture du 13/11). */
      var html = '<section class="panneau-res panneau-carte" aria-label="Carte du client"><div class="carte-fermer"><button class="fermer" data-act="c-fermer">' + ico('x') + 'Fermer</button></div><div class="corps">' + corps + '</div></section>';
      C.panneau = { brut: html, carte: true };
      var droite = PP.etat.ecran === 'comptoir' ? document.getElementById('c-droite') : null;
      if (droite) {
        var garde = droite.querySelector('.corps') ? droite.querySelector('.corps').scrollTop : 0;
        droite.innerHTML = html;
        // « Lecture de la carte… » laisse la place au pavé : il reste prêt pour le client suivant.
        var basT = document.getElementById('c-bas');
        if (basT && !basT.querySelector('[data-pave]') && C.pave) { C.enAttente = ''; C.pave.vider(); basT.innerHTML = C.pave.htmlTouches(); }
        if (C.bulle) { var cc = droite.querySelector('.corps'); if (cc) cc.scrollTop = garde; }
      } else C.ecran();
    } else {
      PP.montrer(PP.cadre('comptoir', corps, { nav: PP.nav('Comptoir', 'comptoir', 'Carte du client') }), { nom: C.bulle ? 'K2' : 'K1', titre: 'Carte du client', garderDefilement: !!C.bulle });
    }
    if (!C.catalogue) chargerCatalogue().then(function (c) { if (c && (PP.etat.ecran === 'K1' || (C.panneau && C.panneau.carte))) C.ecranCarte(); });
  };
  /** « des Frites », « un Tacos », « une Boisson » : le libellé du catalogue, avec son article. */
  PP.article = function (lib) {
    var l = String(lib || '').trim();
    if (/s$/i.test(l.split(' ')[0])) return 'des ' + l;
    return (PP.genre(l) === 'f' ? 'une ' : 'un ') + l;
  };

  var tamponEnCours = false;
  PP.actions['k-tampon'] = function (el) {
    if (tamponEnCours || !C.carteId) return;
    var n = Math.max(1, Math.min(3, parseInt(el.getAttribute('data-n'), 10) || 1));
    tamponEnCours = true;
    document.querySelectorAll('[data-act="k-tampon"]').forEach(function (b) { b.disabled = true; });
    el.innerHTML = '<span class="tourne" aria-hidden="true"></span>';
    PP.appel('fid_addpoints', { card_id: C.carteId, points: n, source: 'manuel', note: 'Ajouté à la main (espace commerçant)' }).then(function (r) {
      tamponEnCours = false;
      if (r.status === 'ok') {
        if (r.client && C.carte) C.carte.client = r.client;
        C.bulle = { n: n };
        PP.journal.ajouter({ t: '+' + n + ' tampon' + (n > 1 ? 's' : ''), s: 'Carte ' + C.carteId, ok: true, type: 'tampon', card_id: C.carteId, n: n });
        return C.ecranCarte();
      }
      C.ecranCarte();
      var e = document.getElementById('k-erreur');
      if (e) e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Tampon pas ajouté.</b>' + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : r.code === 'rejouer' ? 'Appuyez de nouveau.' : 'Réessayez.') + '</div></div>';
    });
  };
  PP.actions['k-annuler'] = function (el) {
    if (!C.carteId) return;
    el.disabled = true;
    PP.appel('fid_undo', { card_id: C.carteId }).then(function (r) {
      if (r.status === 'ok') {
        PP.journal.ajouter({ t: 'Tampon annulé', s: 'Carte ' + C.carteId, ok: true, type: 'annule', card_id: C.carteId });
        C.bulle = null;
        PP.toast('Annulé : le solde est relu.');
        // Le solde revient du serveur, jamais d'un calcul sur le téléphone.
        return C.identifier({ card_id: C.carteId }, { silencieux: true });
      }
      el.disabled = false;
      PP.toast(r.reseau ? 'Pas de réseau : rien n’est annulé.' : 'Annulation refusée.', true);
    });
  };
  function remettreLigne(el, action) {
    var code = el.getAttribute('data-code'), gain = el.getAttribute('data-gain');
    var err = document.querySelector('[data-erreur="' + code + '"]');
    if (err) err.classList.add('cache');
    el.disabled = true;
    el.innerHTML = '<span class="tourne" aria-hidden="true"></span>';
    PP.appel(action, { code: code }).then(function (r) {
      if (PP.reseau.marque(r)) {
        PP.journal.ajouter({ t: gain + ' ' + PP.accord(gain, 'remis'), s: action === 'use' ? 'Code cadeau ' + PP.codeLisible(code) : 'Validé par le client', ok: true, type: 'remis' });
        el.outerHTML = '<span class="etiquette ok">' + ico('check') + 'Remis</span>';
        return;
      }
      el.disabled = false;
      el.innerHTML = action === 'use' ? 'Remis' : 'C’est donné';
      if (err) { err.textContent = r.reseau ? 'Pas enregistré : le réseau n’a pas répondu. Réessayez.' : 'Pas enregistré. Réessayez.'; err.classList.remove('cache'); }
    });
  }
  PP.actions['k-remettre'] = function (el) { remettreLigne(el, 'use'); };
  PP.actions['k-donne'] = function (el) { remettreLigne(el, 'remis'); };

  /* K3 — carte pas encore activée */
  function carteAActiver() {
    PP.montrer(PP.cadre('comptoir', '<div class="surface boutique"><div class="vignette">' + ico('carte') + '</div><div><h1 class="n">Carte pas encore activée</h1><div class="s">Carte ' + esc(C.carteId) + ' · 0 tampon</div></div></div>'
      + '<p class="chapo mt-20">Demandez son prénom au client. Ensuite, chaque passage lui rapporte des tampons.</p>'
      + '<form data-envoi="k-activer" novalidate><label class="libelle-champ" for="k-prenom">Prénom</label><div class="champ texte"><input id="k-prenom" type="text" autocomplete="off" autocapitalize="words" maxlength="60" required></div>'
      + '<label class="libelle-champ" for="k-email">E-mail <span class="doux">(facultatif)</span></label><div class="champ texte"><input id="k-email" type="email" inputmode="email" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="120" placeholder="nom@exemple.fr" data-saisie="k-email"></div>'
      + '<label class="case-a-cocher cache" id="k-optin-l"><input type="checkbox" id="k-optin"><span>Le client accepte de recevoir vos offres par e-mail</span></label>'
      + '<p class="note">Le client peut refuser. La carte marche sans e-mail.</p><div id="k-erreur"></div>'
      + '<button class="bouton geant mt-24" type="submit" id="k-activer">Activer la carte</button></form>'
      + '<button class="bouton-texte discret mt-8" data-act="client-suivant">Annuler</button>',
    { nav: PP.nav('Comptoir', 'comptoir', 'Nouvelle carte') }), { nom: 'K3', titre: 'Nouvelle carte' });
  }
  PP.saisies['k-email'] = function (el) { var l = document.getElementById('k-optin-l'); if (l) l.classList.toggle('cache', !el.value.trim()); };
  PP.actions['k-activer'] = function () {
    var p = document.getElementById('k-prenom'), m = document.getElementById('k-email'), o = document.getElementById('k-optin');
    var prenom = String(p.value || '').trim(), email = String(m.value || '').trim();
    var e = document.getElementById('k-erreur');
    if (!prenom) { e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Il manque le prénom.</b>Demandez-le au client.</div></div>'; p.focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>L’e-mail semble incomplet.</b>Vérifiez-le, ou laissez le champ vide.</div></div>'; m.focus(); return; }
    var b = document.getElementById('k-activer');
    b.disabled = true; b.classList.add('occupe'); b.innerHTML = '<span class="tourne" aria-hidden="true"></span>Activation…';
    PP.appel('fid_activate', { card_id: C.carteId, prenom: prenom, email: email, email_opt_in: (email && o && o.checked) ? 'on' : '' }).then(function (r) {
      if (r.status === 'ok' || r.status === 'active') {
        PP.journal.ajouter({ t: 'Carte activée', s: 'Carte ' + C.carteId, ok: true });
        return C.identifier({ card_id: C.carteId }, { silencieux: true });
      }
      b.disabled = false; b.classList.remove('occupe'); b.textContent = 'Activer la carte';
      e.innerHTML = '<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Carte pas activée.</b>' + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez.') + '</div></div>';
    });
  };

  /* I1 — inscrire un nouveau client (carte neuve) */
  C.ecranInscrire = function () {
    PP.montrer(PP.cadre('comptoir', '<h1 class="titre-ecran">Inscrire un client</h1><div class="chargement"><span class="tourne" aria-hidden="true"></span>Création de la carte…</div>',
      { nav: PP.nav('Comptoir', 'comptoir', 'Carte neuve') }), { nom: 'I1-attente', titre: 'Inscrire un client' });
    PP.appel('fid_enroll', {}).then(function (r) {
      if (PP.etat.ecran !== 'I1-attente') return;
      var url = String((r && r.url) || '');
      if ((r.status === 'ok' || r.status === 'exists') && /^https:\/\//.test(url)) {
        PP.journal.ajouter({ t: 'Carte créée', s: 'Carte ' + (r.card_id || ''), ok: true });
        PP.montrer(PP.cadre('comptoir', '<h1 class="titre-ecran">Inscrire un client</h1>'
          + '<p class="chapo">Le client scanne ce code avec l’appareil photo : sa carte s’ouvre, il l’ajoute à son Wallet.</p>'
          + '<div class="qr mt-24" id="i-qr" role="img" aria-label="QR code de la carte du client"></div>'
          + '<p class="note centre mt-12">Carte ' + esc(r.card_id || '') + '</p>'
          + '<button class="bouton geant mt-24" data-act="client-suivant">Terminé</button>',
        { nav: PP.nav('Comptoir', 'comptoir', 'Carte neuve') }), { nom: 'I1', titre: 'Inscrire un client' });
        PP.qr(document.getElementById('i-qr'), url);
        return;
      }
      PP.montrer(PP.cadre('comptoir', '<h1 class="titre-ecran">Inscrire un client</h1><div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>La carte n’a pas été créée.</b>'
        + (r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez dans un instant.') + '</div></div>'
        + '<div class="pile mt-24"><button class="bouton geant" data-act="aller" data-route="inscrire">' + ico('actualiser') + 'Réessayer</button><button class="bouton-texte discret" data-act="client-suivant">Retour au comptoir</button></div>',
      { nav: PP.nav('Comptoir', 'comptoir', 'Carte neuve') }), { nom: 'I1-erreur', titre: 'Inscrire un client' });
    });
  };

  /** Le QR code, fabriqué sur le téléphone (rien ne part ailleurs). */
  PP.qr = function (boite, texte) {
    if (!boite) return;
    try {
      if (typeof window.PerifyQR === 'function') { boite.innerHTML = window.PerifyQR(texte); return; }
    } catch (e) {}
    boite.innerHTML = '<p class="note centre">Le QR code n’a pas pu être dessiné. Utilisez « Copier le lien ».</p>';
  };

  window.addEventListener('resize', function () {
    var t = PP.estTablette();
    if (t !== C.etaitTablette) { C.etaitTablette = t; if (PP.etat.ecran === 'comptoir') C.ecran(); }
  });
  C.etaitTablette = PP.estTablette();
})();
