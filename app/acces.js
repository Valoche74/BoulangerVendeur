/* Perify Pro — l'accès à la boutique (13/11/2026).
   Décision du 13/11 : au quotidien, un code à 4 chiffres, comme le code d'un téléphone. Il n'ouvre la
   boutique que sur un téléphone DÉJÀ RELIÉ à cette boutique. Le lien se fait une seule fois par téléphone, avec le
   code d'accès long remis par Perify, ou avec un lien d'installation (#i=… dans l'adresse, jamais envoyé à un
   serveur, effacé dès la lecture). Le téléphone ne garde jamais ni le code d'accès ni les 4 chiffres : seulement le
   jeton du téléphone, donné par le serveur, et la session du jour.

   Écrans : E0 mettre sur l'écran d'accueil · E1 code d'accès · E2 vérification · E3 code faux · E3b trop d'essais ·
   E4 pas de connexion · E5 « C'est bien votre boutique ? » · E6 choisir le code · E6b code de la boutique ·
   E7 ouverture · E8 lien plus valable · E9 ancien espace · V1 à V7 le déverrouillage de chaque jour. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var CLE = 'perify_pro.v1';
  var CODES_FACILES = ['0123', '1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321', '3210', '2580', '0852', '1212', '6969'];

  /* ── La mémoire des boutiques reliées ── */
  function memoire() {
    var m = PP.stock.lire(CLE);
    if (!m || typeof m !== 'object' || !m.boutiques || typeof m.boutiques !== 'object') m = { boutiques: {}, active: null };
    return m;
  }
  function sauver(m) { PP.stock.ecrire(CLE, m); }
  function sessionLire(cle) {
    var s = PP.stock.lire('perify_pro.session.' + cle);
    if (!s || !s.jeton || !s.expire_le) return null;
    var fin = Date.parse(s.expire_le);
    return (fin && fin > Date.now()) ? s : null;
  }
  function sessionEcrire(cle, s) { PP.stock.ecrire('perify_pro.session.' + cle, { jeton: s.jeton, expire_le: s.expire_le }); }
  function sessionEffacer(cle) { PP.stock.effacer('perify_pro.session.' + cle); }

  function identiteSure(c) {
    c = c || {};
    var champ = function (v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; };
    return {
      cle: champ(c.cle, 40), nom: champ(c.nom, 120), nom_court: champ(c.nom_court, 60), metier: champ(c.metier, 40),
      prefixe: champ(c.prefixe, 8), logo_blanc: champ(c.logo_blanc, 400), antigaspi: c.antigaspi === true,
      etat: c.etat === 'arrete' ? 'arrete' : 'actif', arrete_le: champ(c.arrete_le, 40), message_arret: champ(c.message_arret, 120),
      serveur: champ(c.serveur, 200)
    };
  }
  function nomAppareil() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Téléphone Android' : 'Tablette Android';
    return 'Ordinateur';
  }
  function estIphoneSafari() {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPod/.test(ua);
    return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
  }
  function estInstallee() {
    try { if (window.navigator.standalone === true) return true; } catch (e) {}
    try { return window.matchMedia('(display-mode: standalone)').matches; } catch (e) { return false; }
  }

  /** Ouvre la boutique « cle » de la mémoire : identité, couleur, journal du jour. */
  function choisir(cle) {
    var m = memoire(), b = m.boutiques[cle];
    if (!b) return false;
    PP.etat.cle = cle;
    PP.etat.identite = b.identite || {};
    PP.etat.appareil = b.appareil || {};
    PP.habillage.appliquer(PP.etat.identite.metier);
    if (m.active !== cle) { m.active = cle; sauver(m); }
    PP.journal.nettoyer();
    return true;
  }

  var A = PP.acces = {
    memoire: memoire,
    choisir: choisir,
    session: function () { return PP.etat.cle ? sessionLire(PP.etat.cle) : null; },
    boutiques: function () { var m = memoire(); return Object.keys(m.boutiques).map(function (k) { return { cle: k, b: m.boutiques[k] }; }); },
    estInstallee: estInstallee,
    estIphoneSafari: estIphoneSafari,
    codeTropFacile: function (c) { return /^(\d)\1{3}$/.test(c) || CODES_FACILES.indexOf(c) >= 0; },
    marquerArrete: function (r) {
      if (!PP.etat.cle) return;
      PP.etat.identite = PP.etat.identite || {};
      PP.etat.identite.etat = 'arrete';
      if (r && r.arrete_le) PP.etat.identite.arrete_le = String(r.arrete_le).slice(0, 40);
      var m = memoire();
      if (m.boutiques[PP.etat.cle]) { m.boutiques[PP.etat.cle].identite = PP.etat.identite; sauver(m); }
    },
    /** Rafraîchit l'identité gardée (nom, logo, état…) avec celle que le serveur vient de donner. */
    majIdentite: function (c) {
      if (!c || !PP.etat.cle) return;
      var id = identiteSure(c);
      if (id.cle && id.cle !== PP.etat.cle) return;
      id.cle = PP.etat.cle;
      if (!id.serveur) id.serveur = (PP.etat.identite || {}).serveur || '';
      PP.etat.identite = id;
      var m = memoire();
      if (m.boutiques[PP.etat.cle]) { m.boutiques[PP.etat.cle].identite = id; sauver(m); }
      PP.habillage.appliquer(id.metier);
    },
    oublierBoutique: function (cle) {
      var m = memoire();
      delete m.boutiques[cle];
      if (m.active === cle) m.active = Object.keys(m.boutiques)[0] || null;
      sauver(m);
      sessionEffacer(cle);
    },
    sessionEffacer: sessionEffacer
  };

  /* ═══ E0 / P6 — Mettre sur l'écran d'accueil ═══════════════════════════ */
  var invite = null;   // l'invite d'installation d'Android, si Chrome la propose
  window.addEventListener('beforeinstallprompt', function (ev) { ev.preventDefault(); invite = ev; var b = document.querySelector('[data-act="installer"]'); if (b) b.classList.remove('cache'); });
  A.htmlInstaller = function (depuisPlus) {
    var ua = navigator.userAgent || '';
    var iphone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua);
    var blocIphone = '<h2 class="titre-section serre">Sur iPhone</h2><ol class="etapes">'
      + '<li><span>Dans Safari, touchez <span class="etiquette-ios">' + PP.ico('partager') + 'Partager</span> en bas de l’écran.</span></li>'
      + '<li><span>Choisissez <b>« Sur l’écran d’accueil »</b>.</span></li>'
      + '<li><span>Touchez <b>« Ajouter »</b>, puis ouvrez Perify Pro depuis l’écran d’accueil.</span></li></ol>';
    var blocAndroid = '<h2 class="titre-section serre">Sur Android</h2>'
      + '<button class="bouton' + (invite ? '' : ' cache') + ' mt-8" data-act="installer">' + PP.ico('ajouterecran') + 'Installer Perify Pro</button>'
      + '<ol class="etapes"><li><span>Dans Chrome, touchez <span class="etiquette-ios">' + PP.ico('points') + 'Menu</span> en haut à droite.</span></li>'
      + '<li><span>Choisissez <b>« Ajouter à l’écran d’accueil »</b> ou <b>« Installer l’application »</b>.</span></li>'
      + '<li><span>Confirmez, puis ouvrez Perify Pro depuis l’écran d’accueil.</span></li></ol>';
    // Le téléphone dit ce qu'il est : on ne montre que son chemin (les deux sur un ordinateur ou une tablette inconnue).
    var blocs = android ? blocAndroid : iphone ? blocIphone : blocIphone + blocAndroid;
    return '<div class="installer-ecran">'
      + (depuisPlus ? '<h1 class="titre-ecran">Mettre sur l’écran d’accueil</h1>' : '<div class="marque-perify"><img src="icones/perify-logo-nuit.png" alt="Perify"></div><h1 class="mt-24">Mettez Perify Pro sur l’écran d’accueil</h1>')
      + '<p class="chapo' + (depuisPlus ? '' : ' centre') + '">Elle s’ouvrira comme une appli, en plein écran, d’un seul geste.</p>'
      + '<div class="surface serree apercu-ecran mt-16"><img src="icones/icone-192.png" alt=""><div><div class="t">Perify Pro</div><div class="s">Espace commerçant</div></div></div>'
      + blocs
      + '<div class="encart">' + PP.ico('telephone') + '<span>' + (depuisPlus
        ? 'Sur iPhone, l’appli posée sur l’écran d’accueil ne voit pas ce que Safari garde : il faudra la relier une fois avec votre code d’accès.'
        : 'Faites-le <b>avant</b> de taper votre code : sur iPhone, l’appli posée sur l’écran d’accueil ne voit pas ce que Safari garde.') + '</span></div>'
      + '</div>';
  };
  function ecranInstaller() {
    PP.montrer('<div class="app"><main class="contenu entree">' + A.htmlInstaller(false)
      + '<button class="bouton second mt-24" data-act="continuer-sans-installer">Continuer sans installer</button></main></div>', { nom: 'E0', titre: 'Installer' });
  }
  PP.actions.installer = function () {
    if (!invite) return;
    invite.prompt();
    invite.userChoice.then(function () { invite = null; }).catch(function () {});
  };
  PP.actions['continuer-sans-installer'] = function () {
    try { sessionStorage.setItem('perify_pro.e0_vu', '1'); } catch (e) {}
    ecranCodeAcces();
  };

  /* ═══ E1 à E4 — le code d'accès (une fois par téléphone) ════════════════ */
  var relier = null;     // { par: 'code' | 'installation', code_acces | installation, commerce, code_existe } — en mémoire seulement
  var pauseE1 = null;    // fin de la pause (ms)

  function ecranCodeAcces(etat) {
    etat = etat || {};
    relier = null;
    PP.habillage.appliquer('perify');
    var plusieurs = A.boutiques().length > 0;
    var alerteStock = PP.stock.ok ? '' : '<div class="alerte neutre">' + PP.ico('alerte') + '<div><div class="t">Ce téléphone ne garde rien</div><div class="s">Il faudra retaper le code d’accès à chaque visite. Vérifiez que la navigation privée est désactivée.</div></div></div>';
    PP.montrer('<div class="app"><main class="contenu entree">'
      + (plusieurs ? PP.nav('Retour', 'plus/boutiques', '') : '')
      + '<div class="marque-perify"><img src="icones/perify-logo-nuit.png" alt="Perify"></div>'
      + '<div class="clef">' + PP.ico('boutique') + '</div>'
      + '<h1>Votre espace commerçant</h1>'
      + '<p class="chapo">Tapez le code d’accès que Perify vous a remis. Vous ne le taperez qu’une fois sur ce téléphone.</p>'
      + alerteStock
      + '<div id="e1-alerte"></div>'
      + '<form data-envoi="code-acces" novalidate>'
      + '<label class="libelle-champ" for="code-acces">Code d’accès</label>'
      + '<div class="champ" id="e1-champ"><input id="code-acces" name="code-acces" type="password" inputmode="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="128" placeholder="XXXX XXXX XXXX">'
      + '<button type="button" class="oeil" data-act="afficher-code" aria-pressed="false">' + PP.ico('oeil') + '<span>Afficher</span></button></div>'
      + '<p class="note">12 lettres et chiffres, sans 0, 1, O ni I.</p>'
      + '<div id="e1-erreur" aria-live="polite"></div>'
      + '<button class="bouton geant perify mt-24" type="submit" id="e1-bouton">Ouvrir ma boutique</button>'
      + '</form>'
      + '<a class="bouton-texte discret mt-8" href="mailto:contact@perify.app?subject=Code%20d%E2%80%99acc%C3%A8s%20perdu">Code perdu ? Écrivez à Perify</a>'
      + '<div class="encart">' + PP.ico('lien') + '<span>Vous avez reçu un lien de Perify ? Ouvrez-le sur ce téléphone.</span></div>'
      + '<div class="rassure">' + PP.ico('cadenas') + '<span>Le code d’accès ne reste pas sur ce téléphone. Ensuite, chaque jour, vous taperez seulement 4 chiffres.</span></div>'
      + '</main></div>', { nom: 'E1', titre: 'Code d’accès', focus: false });
    var champ = document.getElementById('code-acces');
    if (etat.valeur) champ.value = etat.valeur;
    majE1(etat);
  }
  A.ecranCodeAcces = ecranCodeAcces;

  function majE1(etat) {
    var err = document.getElementById('e1-erreur'), al = document.getElementById('e1-alerte');
    var champ = document.getElementById('e1-champ'), bouton = document.getElementById('e1-bouton');
    if (!err || !bouton) return;
    err.innerHTML = ''; al.innerHTML = '';
    champ.classList.toggle('erreur', !!etat.faux);
    bouton.disabled = false; bouton.classList.remove('occupe');
    bouton.innerHTML = 'Ouvrir ma boutique';
    if (etat.occupe) {
      bouton.disabled = true; bouton.classList.add('occupe');
      bouton.innerHTML = '<span class="tourne" aria-hidden="true"></span>Vérification du code…';
    } else if (etat.horsligne) {
      al.innerHTML = '<div class="alerte" role="alert">' + PP.ico('horsligne') + '<div><div class="t">Pas de connexion internet</div><div class="s">Votre code n’a pas pu être vérifié. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.</div></div></div>';
      bouton.innerHTML = PP.ico('actualiser') + 'Réessayer';
    } else if (etat.faux) {
      var n = Number(etat.essais_restants);
      var reste = n >= 1 ? 'Encore ' + n + ' essai' + (n > 1 ? 's' : '') + ', puis une pause de 15 minutes.' : 'Au prochain code faux, une pause de 15 minutes.';
      err.innerHTML = '<div class="message-erreur" role="alert">' + PP.ico('alerte') + '<div><b>Ce code n’ouvre aucune boutique.</b>Vérifiez chaque caractère. ' + reste + '</div></div>';
    } else if (etat.souci) {
      err.innerHTML = '<div class="message-erreur" role="alert">' + PP.ico('alerte') + '<div><b>Un souci est survenu.</b>Réessayez. Si cela continue, écrivez à Perify.</div></div>';
    }
    if (pauseE1 && pauseE1 > Date.now()) {
      bouton.disabled = true;
      var tic = function () {
        var s = Math.ceil((pauseE1 - Date.now()) / 1000);
        var e = document.getElementById('e1-erreur');
        if (!e) return;
        if (s <= 0) { pauseE1 = null; majE1({}); return; }
        e.innerHTML = '<div class="message-erreur" role="alert">' + PP.ico('pause') + '<div><b>Trop d’essais.</b>Réessayez dans ' + PP.date.duree(s) + '.</div></div>';
      };
      tic();
      PP.minuteur(tic, 1000, true);
    }
  }

  PP.actions['afficher-code'] = function (el) {
    var c = document.getElementById('code-acces');
    if (!c) return;
    var montre = c.type === 'password';
    c.type = montre ? 'text' : 'password';
    el.setAttribute('aria-pressed', montre ? 'true' : 'false');
    el.querySelector('span').textContent = montre ? 'Masquer' : 'Afficher';
  };

  PP.actions['code-acces'] = function () {
    var c = document.getElementById('code-acces');
    var v = c ? String(c.value || '').trim() : '';
    if (v.length < 6) { majE1({ faux: true, essais_restants: null }); var e = document.getElementById('e1-erreur'); if (e) e.innerHTML = '<div class="message-erreur" role="alert">' + PP.ico('alerte') + '<div><b>Le code est trop court.</b>Il compte 12 lettres et chiffres.</div></div>'; return; }
    if (pauseE1 && pauseE1 > Date.now()) return;
    majE1({ occupe: true });
    PP.appel('acces_relier', { code_acces: v }).then(function (r) { reponseRelier(r, { par: 'code', code_acces: v }); });
  };

  /** La réponse de l'étape 1 (code d'accès ou lien d'installation). */
  function reponseRelier(r, base) {
    if (r.status === 'ok' && r.etape === 'confirmer' && r.commerce) {
      relier = { par: base.par, code_acces: base.code_acces, installation: base.installation, commerce: identiteSure(r.commerce), code_existe: !!r.code_existe };
      ecranConfirmer();
      return;
    }
    if (base.par === 'installation') {
      if (r.code === 'installation_invalide') return ecranLienInvalide();
      if (r.code === 'trop_d_essais') { pauseE1 = Date.now() + 1000 * (Number(r.reste_sec) || 900); return ecranCodeAcces(); }
      if (r.reseau) return ecranLienReseau(base.installation);
      return ecranLienInvalide();
    }
    if (r.code === 'code_faux') return majE1({ faux: true, essais_restants: r.essais_restants });
    if (r.code === 'trop_d_essais') { pauseE1 = Date.now() + 1000 * (Number(r.reste_sec) || 900); return majE1({}); }
    if (r.code === 'ancien_espace') return ecranAncienEspace(r);
    if (r.reseau) return majE1({ horsligne: true });
    majE1({ souci: true });
  }

  /* ═══ E5 — « C'est bien votre boutique ? » ══════════════════════════════ */
  function ecranConfirmer() {
    var c = relier.commerce;
    PP.habillage.appliquer(c.metier);
    PP.montrer('<div class="app"><main class="contenu entree">'
      + '<div class="surface confirmer-boutique">' + PP.tuileLogo(c, 'grand') + '<div class="n">' + PP.esc(c.nom || c.nom_court) + '</div>'
      + '<div class="s">Votre espace commerçant</div></div>'
      + '<h1 class="mt-32">C’est bien votre boutique ?</h1>'
      + '<p class="chapo">Ce ' + PP.esc(nomAppareil() === 'Ordinateur' ? 'poste' : 'téléphone') + ' sera relié à cette boutique.</p>'
      + '<div class="pile"><button class="bouton geant" data-act="confirmer-oui">Oui, c’est ma boutique</button>'
      + '<button class="bouton-texte discret" data-act="confirmer-non">Non, ce n’est pas la mienne</button></div>'
      + '</main></div>', { nom: 'E5', titre: 'Votre boutique ?' });
  }
  PP.actions['confirmer-oui'] = function () {
    if (!relier) return ecranCodeAcces();
    if (relier.code_existe) ecranCodeBoutique(); else ecranChoisirCode();
  };
  PP.actions['confirmer-non'] = function () {
    relier = null;
    ecranCodeAcces();
    var e = document.getElementById('e1-erreur');
    if (e) e.innerHTML = '<div class="message-erreur">' + PP.ico('question') + '<div><b>Ce n’est pas votre boutique ?</b>Vérifiez le code que Perify vous a remis. En cas de doute, écrivez à Perify.</div></div>';
  };

  /* ═══ E6 — choisir le code à 4 chiffres ═════════════════════════════════ */
  function ecranQuatre(o) {
    var c = (relier && relier.commerce) || PP.etat.identite || {};
    var pave = new PP.Pave({ longueur: 4, masque: true, libelle: 'Code à 4 chiffres', quandComplet: o.quandComplet, serre: true });
    PP.montrer('<div class="app">' + (o.nav || '') + '<main class="contenu verrou">'
      + PP.tuileLogo(c, 'moyen')
      + '<h1>' + PP.esc(o.titre) + '</h1>'
      + '<p class="consigne">' + o.consigne + '</p>'
      + pave.htmlCasesBloc()
      + '<div class="message" id="v-message" aria-live="assertive"></div>'
      + pave.htmlTouches()
      + (o.bas || '')
      + '</main></div>', { nom: o.nom, titre: o.titre });
    if (o.message) message(o.message, o.info);
    return pave;
  }
  function message(texte, info) {
    var m = document.getElementById('v-message');
    if (!m) return;
    m.className = 'message' + (info ? ' info' : '');
    m.innerHTML = texte || '';
  }

  function ecranChoisirCode(mode, erreur) {
    // mode : 'nouveau' (la boutique n'a pas de code) ou 'remplacer' (« Je ne le connais pas »)
    var premier = null;
    var aide = '<div class="encart">' + PP.ico('cadenas') + '<span>Le même code pour tous les téléphones de la boutique. Donnez-le seulement aux personnes qui tiennent le comptoir.</span></div>';
    var etape1 = function (msg) {
      ecranQuatre({
        nom: 'E6', titre: 'Choisissez votre code à 4 chiffres',
        consigne: 'Vous le taperez chaque jour pour ouvrir la boutique.',
        message: msg, bas: aide,
        quandComplet: function (code, p) {
          if (A.codeTropFacile(code)) { p.erreur(); message('Ce code est trop facile à deviner. Choisissez-en un autre.'); return; }
          premier = code;
          etape2();
        }
      });
    };
    var etape2 = function () {
      ecranQuatre({
        nom: 'E6-2', titre: 'Tapez-le une seconde fois',
        consigne: 'Pour être sûr qu’il n’y a pas de faute de frappe.',
        bas: aide,
        quandComplet: function (code, p) {
          if (code !== premier) { etape1('Les deux codes ne sont pas pareils. Recommencez.'); return; }
          p.occupe = true; p.majCases();
          message('<span class="tourne" aria-hidden="true"></span>&nbsp;Un instant…', true);
          etape2Envoyer(mode === 'remplacer' ? { code_nouveau: code } : { code: code }, p);
        }
      });
    };
    etape1(erreur);
  }

  /* ═══ E6b — la boutique a déjà un code ═════════════════════════════════ */
  function ecranCodeBoutique(msg) {
    var parCode = relier && relier.par === 'code';
    ecranQuatre({
      nom: 'E6b', titre: 'Tapez le code à 4 chiffres de la boutique',
      consigne: 'Celui que l’on tape chaque jour sur les autres téléphones de la boutique.',
      message: msg,
      bas: parCode
        ? '<button class="bouton-texte mt-8" data-act="code-nouveau">Je ne le connais pas : en choisir un nouveau</button>'
        : '<p class="note centre mt-16">Vous ne le connaissez pas ? Demandez-le à la personne qui gère la boutique.</p>',
      quandComplet: function (code, p) {
        p.occupe = true; p.majCases();
        message('<span class="tourne" aria-hidden="true"></span>&nbsp;Vérification…', true);
        etape2Envoyer({ code: code }, p);
      }
    });
  }
  PP.actions['code-nouveau'] = function () {
    PP.feuille('<div class="t">Choisir un nouveau code ?</div>'
      + '<p class="s">Les autres téléphones de la boutique demanderont ce nouveau code la prochaine fois.</p>'
      + '<div class="pile"><button class="bouton geant" data-act="code-nouveau-oui">Oui, en choisir un nouveau</button>'
      + '<button class="bouton-texte discret" data-act="fermer-feuille">Annuler</button></div>');
  };
  PP.actions['code-nouveau-oui'] = function () { PP.fermerFeuille(); ecranChoisirCode('remplacer'); };

  /** Étape 2 : le serveur relie le téléphone et ouvre la session. */
  function etape2Envoyer(codes, pave) {
    if (!relier) return ecranCodeAcces();
    var d = { confirmer: 'oui', appareil_nom: nomAppareil() };
    if (relier.par === 'code') d.code_acces = relier.code_acces; else d.installation = relier.installation;
    for (var k in codes) d[k] = codes[k];
    PP.appel('acces_relier', d).then(function (r) {
      if (r.status === 'ok' && r.etape === 'relie' && r.appareil && r.session && r.commerce) {
        var c = identiteSure(r.commerce);
        var cle = c.cle || relier.commerce.cle;
        c.cle = cle;
        var m = memoire();
        m.boutiques[cle] = { appareil: { id: String(r.appareil.id || ''), jeton: String(r.appareil.jeton || ''), nom: String(r.appareil.nom || nomAppareil()) }, identite: c, relie_le: new Date().toISOString() };
        m.active = cle;
        sauver(m);
        sessionEcrire(cle, r.session);
        relier = null;
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
        choisir(cle);
        return ouverture();
      }
      pave.occupe = false;
      if (r.code === 'code_trop_facile') { pave.erreur(); return ecranChoisirCode(codes.code_nouveau ? 'remplacer' : 'nouveau', 'Ce code est trop facile à deviner. Choisissez-en un autre.'); }
      if (r.code === 'code_different') { pave.erreur(); return message('Ce n’est pas le code de la boutique. Réessayez.'); }
      if (r.code === 'code_nouveau_refuse') { pave.erreur(); return message('Avec un lien de Perify, seul le code de la boutique est accepté.'); }
      if (r.code === 'installation_invalide') return ecranLienInvalide();
      if (r.code === 'trop_d_essais') { pauseE1 = Date.now() + 1000 * (Number(r.reste_sec) || 900); return ecranCodeAcces(); }
      if (r.code === 'code_faux') return ecranCodeAcces({ faux: true, essais_restants: r.essais_restants });
      if (r.reseau) { pave.vider(); return message('Pas de réseau. Vérifiez le Wi-Fi ou les données mobiles, puis retapez le code.'); }
      pave.vider();
      message('Un souci est survenu. Réessayez.');
    });
  }

  /* ═══ E7 — ouverture de la boutique ════════════════════════════════════ */
  function ouverture(suite) {
    var id = PP.etat.identite || {};
    PP.montrer('<div class="ouverture"><div class="milieu">' + PP.tuileLogo(id, 'grand')
      + '<div class="n">' + PP.esc(id.nom_court || id.nom || '') + '</div>'
      + '<div class="s"><span class="tourne" aria-hidden="true"></span>Ouverture de votre boutique…</div></div>'
      + '<div class="pied">Espace commerçant <img src="icones/perify-logo-nuit.png" alt="Perify"></div></div>', { nom: 'E7', titre: 'Ouverture' });
    PP.minuteur(function () { if (suite) suite(); else PP.route(); }, A.DUREE_OUVERTURE);
  }
  A.DUREE_OUVERTURE = 700;
  A.ouverture = ouverture;

  /* ═══ E8 — lien d'installation plus valable ════════════════════════════ */
  function ecranLienInvalide() {
    relier = null;
    PP.habillage.appliquer('perify');
    PP.montrer('<div class="app"><main class="contenu entree"><div class="marque-perify"><img src="icones/perify-logo-nuit.png" alt="Perify"></div>'
      + '<div class="clef">' + PP.ico('lien') + '</div><h1>Ce lien n’est plus valable</h1>'
      + '<p class="chapo">Un lien d’installation ne sert qu’une fois, et seulement pendant un temps limité. Demandez-en un nouveau, ou tapez votre code d’accès.</p>'
      + '<button class="bouton geant perify" data-act="vers-code-acces">Taper le code d’accès</button>'
      + '<a class="bouton-texte discret mt-8" href="mailto:contact@perify.app">Écrire à Perify</a></main></div>', { nom: 'E8', titre: 'Lien plus valable' });
  }
  function ecranLienReseau(jeton) {
    PP.montrer('<div class="app"><main class="contenu entree"><div class="marque-perify"><img src="icones/perify-logo-nuit.png" alt="Perify"></div>'
      + '<div class="clef">' + PP.ico('horsligne') + '</div><h1>Pas de connexion internet</h1>'
      + '<p class="chapo">Le lien n’a pas pu être vérifié. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.</p>'
      + '<button class="bouton geant perify" data-act="lien-reessayer">' + PP.ico('actualiser') + 'Réessayer</button></main></div>', { nom: 'E4-lien', titre: 'Pas de connexion' });
    jetonInstallation = jeton;
  }
  var jetonInstallation = null;
  PP.actions['lien-reessayer'] = function () { if (jetonInstallation) relierParLien(jetonInstallation); };
  PP.actions['vers-code-acces'] = function () { ecranCodeAcces(); };

  function relierParLien(jeton) {
    jetonInstallation = jeton;
    PP.habillage.appliquer('perify');
    PP.montrer('<div class="ouverture"><div class="milieu"><img src="icones/perify-logo-nuit.png" alt="Perify" class="logo-lien">'
      + '<div class="s"><span class="tourne" aria-hidden="true"></span>Vérification du lien…</div></div></div>', { nom: 'E2-lien', titre: 'Vérification' });
    PP.appel('acces_relier', { installation: jeton }).then(function (r) { reponseRelier(r, { par: 'installation', installation: jeton }); });
  }

  /* ═══ E9 — la boutique est encore sur l'ancien espace (Falman) ═════════ */
  function ecranAncienEspace(r) {
    var adr = String(r.adresse || '');
    var sure = /^https:\/\/[a-z0-9.-]+(\/[^\s"'<>]*)?$/i.test(adr) ? adr : '';
    PP.montrer('<div class="app"><main class="contenu entree"><div class="marque-perify"><img src="icones/perify-logo-nuit.png" alt="Perify"></div>'
      + '<div class="clef">' + PP.ico('boutique') + '</div><h1>Votre boutique utilise encore l’ancien espace</h1>'
      + '<p class="chapo">' + (r.nom ? PP.esc(r.nom) + ' passera bientôt sur cette nouvelle appli.' : 'Votre boutique passera bientôt sur cette nouvelle appli.') + ' En attendant, ouvrez votre espace habituel.</p>'
      + (sure ? '<a class="bouton geant perify" href="' + PP.esc(sure) + '" rel="noreferrer">Ouvrir mon espace habituel</a>' : '')
      + '<p class="note centre mt-16">Votre code d’accès y marche toujours.</p>'
      + '<button class="bouton-texte discret mt-8" data-act="vers-code-acces">Retour</button></main></div>', { nom: 'E9', titre: 'Ancien espace' });
  }

  /* ═══ V1 à V7 — le déverrouillage de chaque jour ═══════════════════════ */
  var attenteDeverrou = null;   // { resoudre } quand une action attend la réouverture (session expirée)
  var dernierCode = '';

  function ecranVerrou(opt) {
    opt = opt || {};
    var id = PP.etat.identite || {};
    var plusieurs = A.boutiques().length > 1;
    var pave = new PP.Pave({ longueur: 4, masque: true, libelle: 'Code à 4 chiffres', quandComplet: ouvrir, serre: true });
    PP.montrer('<div class="app"><main class="contenu verrou">'
      + PP.tuileLogo(id, 'grand')
      + '<h1 class="nom-boutique">' + PP.esc(id.nom_court || id.nom || '') + '</h1>'
      + '<p class="consigne">Tapez votre code à 4 chiffres</p>'
      + pave.htmlCasesBloc()
      + '<div class="message" id="v-message" aria-live="assertive"></div>'
      + pave.htmlTouches()
      + '<div id="v-aide"></div>'
      + '<div class="liens' + (plusieurs ? '' : ' un') + '">'
      + (plusieurs ? '<button class="bouton-texte" data-act="aller" data-route="plus/boutiques">Changer de boutique</button>' : '')
      + '<button class="bouton-texte" data-act="code-oublie">Code oublié ?</button></div>'
      + '</main></div>', { nom: 'V1', titre: 'Code à 4 chiffres', focus: false });
    if (opt.message) message(opt.message, opt.info);
    if (opt.pause) pauser(opt.pause, opt.dernier, pave);
    if (opt.reseau) {
      message('Pas de réseau. Vérifiez le Wi-Fi ou les données mobiles, puis réessayez.');
      document.getElementById('v-aide').innerHTML = '<button class="bouton second mt-12" data-act="verrou-reessayer">' + PP.ico('actualiser') + 'Réessayer</button>';
    }
    return pave;
  }
  function pauser(sec, dernier, pave) {
    var fin = Date.now() + 1000 * (Number(sec) || 60);
    pave.activer(false);
    var aide = document.getElementById('v-aide');
    if (aide) aide.innerHTML = (dernier ? '<div class="alerte mt-12" role="alert">' + PP.ico('alerte') + '<div><div class="t">Dernier essai</div><div class="s">Au prochain code faux, ce téléphone devra être relié de nouveau.</div></div></div>' : '')
      + '<div class="encart">' + PP.ico('question') + '<span>Code oublié ? Reliez ce téléphone de nouveau avec votre code d’accès : vous pourrez choisir un nouveau code.</span></div>';
    var tic = function () {
      var s = Math.ceil((fin - Date.now()) / 1000);
      if (s <= 0) { message(dernier ? 'Vous pouvez réessayer. Attention : c’est le dernier essai.' : 'Vous pouvez réessayer.', true); pave.activer(true); return true; }
      message('Trop d’essais. Réessayez dans ' + PP.date.duree(s) + '.');
      return false;
    };
    if (!tic()) { var id = PP.minuteur(function () { if (tic()) clearInterval(id); }, 1000, true); }
  }

  function ouvrir(code, pave) {
    dernierCode = code;
    pave.occupe = true; pave.majCases();
    message('<span class="tourne" aria-hidden="true"></span>&nbsp;Vérification…', true);
    var app = PP.etat.appareil || {};
    PP.appel('acces_ouvrir', { appareil: app.jeton || '', code: code }).then(function (r) {
      if (r.status === 'ok' && r.session) {
        sessionEcrire(PP.etat.cle, r.session);
        if (r.commerce) A.majIdentite(r.commerce);
        dernierCode = '';
        var att = attenteDeverrou; attenteDeverrou = null;
        return ouverture(function () { PP.route(); if (att) att(true); });
      }
      pave.occupe = false;
      if (r.code === 'code_faux') {
        pave.erreur();
        var n = Number(r.essais_restants);
        return message(n >= 1 ? 'Code faux. Encore ' + n + ' essai' + (n > 1 ? 's' : '') + ', puis une pause.' : 'Code faux.');
      }
      if (r.code === 'pause') { pave.vider(); return pauser(r.reste_sec, !!r.dernier_essai, pave); }
      if (r.code === 'appareil_retire' || r.code === 'appareil_inconnu' || r.code === 'code_absent') return ecranPlusRelie(r.code === 'code_absent' ? 'code_absent' : (r.pourquoi || ''));
      if (r.reseau) { pave.vider(); return ecranVerrou({ reseau: true }); }
      pave.vider();
      message('Un souci est survenu. Réessayez.');
    });
  }
  PP.actions['verrou-reessayer'] = function () {
    if (!dernierCode) return ecranVerrou();
    var p = ecranVerrou();
    p.code = dernierCode; p.majCases();
    ouvrir(dernierCode, p);
  };

  /* V5 — le téléphone n'est plus relié (trop d'essais, retiré, code d'accès changé) */
  function ecranPlusRelie(pourquoi) {
    var cle = PP.etat.cle;
    var id = PP.etat.identite || {};
    var raisons = {
      trop_d_essais: 'Trop de codes faux ont été tapés. Reliez-le de nouveau avec votre code d’accès.',
      commercant: 'Il a été retiré depuis un autre téléphone de la boutique. Reliez-le de nouveau avec votre code d’accès.',
      code_acces_change: 'Le code d’accès de la boutique a changé. Reliez-le de nouveau avec le nouveau code d’accès.',
      perify: 'Perify l’a retiré. Reliez-le de nouveau avec votre code d’accès.',
      code_absent: 'Le code à 4 chiffres doit être choisi de nouveau. Reliez ce téléphone avec votre code d’accès.'
    };
    if (cle) A.oublierBoutique(cle);
    var att = attenteDeverrou; attenteDeverrou = null;
    if (att) att(false);
    PP.montrer('<div class="app"><main class="contenu entree">' + PP.tuileLogo(id, 'grand')
      + '<h1>Ce téléphone n’est plus relié à la boutique</h1>'
      + '<p class="chapo">' + (raisons[pourquoi] || 'Reliez-le de nouveau avec votre code d’accès.') + '</p>'
      + '<button class="bouton geant perify" data-act="vers-code-acces">Relier avec le code d’accès</button>'
      + '<a class="bouton-texte discret mt-8" href="mailto:contact@perify.app">Code d’accès perdu ? Écrivez à Perify</a></main></div>', { nom: 'V5', titre: 'Plus relié' });
    PP.etat.cle = null; PP.etat.identite = null; PP.etat.appareil = null;
  }
  A.ecranPlusRelie = ecranPlusRelie;

  /* V7 — code oublié */
  PP.actions['code-oublie'] = function () {
    PP.montrer('<div class="app">' + '<nav class="nav" aria-label="Navigation"><button class="retour" data-act="retour-verrou">' + PP.ico('gauche') + 'Retour</button><span></span><span></span></nav>'
      + '<main class="contenu entree"><div class="clef">' + PP.ico('question') + '</div><h1>Code oublié ?</h1>'
      + '<p class="chapo">Reliez ce téléphone de nouveau avec votre code d’accès : vous pourrez choisir un nouveau code.</p>'
      + '<div class="encart">' + PP.ico('telephone') + '<span>Les autres téléphones de la boutique demanderont alors ce nouveau code.</span></div>'
      + '<button class="bouton geant perify mt-24" data-act="vers-code-acces">Relier avec le code d’accès</button>'
      + '<a class="bouton-texte discret mt-8" href="mailto:contact@perify.app?subject=Code%20d%E2%80%99acc%C3%A8s%20perdu">Code d’accès perdu ? Écrivez à Perify</a></main></div>', { nom: 'V7', titre: 'Code oublié' });
  };
  PP.actions['retour-verrou'] = function () { ecranVerrou(); };

  /** G1 : la session a expiré pendant un geste. On redemande les 4 chiffres, puis l'action reprend. */
  A.redemander = function () {
    if (!PP.etat.cle) return Promise.resolve(false);
    A.sessionEffacer(PP.etat.cle);
    if (attenteDeverrou) {
      var precedent = attenteDeverrou;
      return new Promise(function (ok) { attenteDeverrou = function (v) { precedent(v); ok(v); }; });
    }
    return new Promise(function (ok) {
      attenteDeverrou = ok;
      ecranVerrou({ message: 'Pour continuer, tapez votre code à 4 chiffres.', info: true });
    });
  };
  A.verrouiller = function (opt) { return ecranVerrou(opt); };

  /** Verrouiller (Plus) : la session se ferme, les 4 chiffres seront demandés. */
  A.fermerSession = function () {
    var cle = PP.etat.cle;
    var fini = function () { if (cle) sessionEffacer(cle); ecranVerrou(); };
    if (!A.session()) return fini();
    PP.appel('acces_fermer', {}).then(fini);
  };

  /* ═══ Le démarrage ═════════════════════════════════════════════════════ */
  A.demarrer = function () {
    PP.stock.essayer();
    // Un lien d'installation : le jeton est dans le fragment (#i=…). On le lit, puis on l'efface de l'adresse.
    var m = /(?:^#|[#&])i=([A-Za-z0-9_-]{20,200})/.exec(location.hash || '');
    if (m) {
      var jeton = m[1];
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
      return relierParLien(jeton);
    }
    var mem = memoire();
    var cle = mem.active && mem.boutiques[mem.active] ? mem.active : Object.keys(mem.boutiques)[0];
    if (!cle) {
      var vu = false;
      try { vu = sessionStorage.getItem('perify_pro.e0_vu') === '1'; } catch (e) {}
      if (estIphoneSafari() && !estInstallee() && !vu) return ecranInstaller();
      return ecranCodeAcces();
    }
    choisir(cle);
    if (!A.session()) return ecranVerrou();
    PP.route();
  };

  /* Revenir sur l'appli après la nuit : la session a pu expirer (4 h du matin). */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !PP.etat.cle) return;
    var e = PP.etat.ecran || '';
    if (/^(E|V)/.test(e)) return;
    if (!A.session()) ecranVerrou();
  });

  /* Changer de boutique sans être déverrouillé (depuis V1) : géré par plus.js (route plus/boutiques). */
  A.ecranVerrou = ecranVerrou;
  A.nomAppareil = nomAppareil;
})();
