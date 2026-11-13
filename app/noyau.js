/* Perify Pro — le noyau (13/11/2026) : la mémoire du téléphone, les pictogrammes, les dates, l'affichage d'un
   écran, les onglets, les gestes (un seul écouteur pour toute l'appli : la politique de sécurité de la page
   interdit les « onclick » écrits dans le HTML), le petit bandeau de confirmation et la feuille du bas. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};

  /* ── La mémoire du téléphone ──────────────────────────────────────────────
     Chaque lecture et chaque écriture dans un try/catch : en navigation privée, ou quand le téléphone refuse, la
     mémoire peut lever une erreur ou rester vide. L'appli marche alors le temps de la visite, et le dit. */
  var memoireVive = {};
  PP.stock = {
    ok: true,
    lire: function (cle) {
      try {
        var v = window.localStorage.getItem(cle);
        if (v === null) return Object.prototype.hasOwnProperty.call(memoireVive, cle) ? memoireVive[cle] : null;
        return JSON.parse(v);
      } catch (e) {
        PP.stock.ok = false;
        return Object.prototype.hasOwnProperty.call(memoireVive, cle) ? memoireVive[cle] : null;
      }
    },
    ecrire: function (cle, valeur) {
      memoireVive[cle] = valeur;
      try { window.localStorage.setItem(cle, JSON.stringify(valeur)); return true; }
      catch (e) { PP.stock.ok = false; return false; }
    },
    effacer: function (cle) {
      delete memoireVive[cle];
      try { window.localStorage.removeItem(cle); } catch (e) { PP.stock.ok = false; }
    },
    cles: function (debut) {
      var out = [];
      try { for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k && k.indexOf(debut) === 0) out.push(k); } }
      catch (e) { PP.stock.ok = false; }
      Object.keys(memoireVive).forEach(function (k) { if (k.indexOf(debut) === 0 && out.indexOf(k) < 0) out.push(k); });
      return out;
    },
    essayer: function () {
      try { window.localStorage.setItem('perify_pro.essai', '1'); window.localStorage.removeItem('perify_pro.essai'); PP.stock.ok = true; }
      catch (e) { PP.stock.ok = false; }
      return PP.stock.ok;
    }
  };

  /* ── Texte sûr : tout ce qui vient du serveur passe par ici avant d'entrer dans le HTML ── */
  PP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  PP.pluriel = function (n, un, plusieurs) { return n > 1 ? plusieurs : un; };
  PP.nombre = function (n) { return Number(n || 0).toLocaleString('fr-FR'); };
  PP.euros = function (n, decimales) {
    var d = decimales == null ? (Math.round(n) === n ? 0 : 2) : decimales;
    return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';
  };
  // Une espace insécable entre les deux groupes : « 123 456 » ne se coupe jamais en deux lignes (relecture du 13/11).
  PP.codeLisible = function (code) { var c = String(code || ''); return c.length === 6 ? c.slice(0, 3) + '\u00A0' + c.slice(3) : c; };

  /* ── Les pictogrammes (traits 24 × 24, couleur du texte) ── */
  var P = {
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13.5 13.5h2.5v2.5h-2.5z"/>',
    chiffres: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7"/>',
    annonces: '<path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
    plus: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    cadeau: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13M12 7C10.5 4 7 4 7.5 6.5S12 7 12 7zM12 7c1.5-3 5-3 4.5-.5S12 7 12 7z"/>',
    carte: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    calendrier: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    horsligne: '<path d="M3 3l18 18M9.5 5.3A15 15 0 0 1 22 8.6M2 8.6a15 15 0 0 1 4-2.6M5 12.1a10 10 0 0 1 4-2.2M15.6 10.3A10 10 0 0 1 19 12.1M8.6 15.5a5 5 0 0 1 6.3-.3M12 19.5h.01"/>',
    cadenas: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
    oeil: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    droite: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    gauche: '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
    effacer: '<path d="M21 5H9.5L3 12l6.5 7H21a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M12 9l6 6M18 9l-6 6"/>',
    lampe: '<path d="M7 3h10v3.5l-2.5 3.5V21h-5V10L7 6.5z"/><path d="M12 13v3"/>',
    clavier: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
    telecharger: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    actualiser: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
    calcul: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h3.5"/>',
    panier: '<path d="M3 9.5h18l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H6.3a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M8 9.5l4-6 4 6M9 13.5v3M15 13.5v3"/>',
    sanscontact: '<path d="M7.5 8.5a5 5 0 0 1 0 7M11 6a9 9 0 0 1 0 12M14.5 3.5a13 13 0 0 1 0 17"/>',
    sortir: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    courrier: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    boutique: '<path d="M4 10v10h16V10"/><path d="M3 4h18l-1.2 5.2a2.5 2.5 0 0 1-4.8 0 2.5 2.5 0 0 1-3 1.8 2.5 2.5 0 0 1-3-1.8 2.5 2.5 0 0 1-4.8 0z"/><path d="M10 20v-5h4v5"/>',
    ajouter: '<path d="M12 5v14M5 12h14"/>',
    retirer: '<path d="M5 12h14"/>',
    annuler: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    alerte: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.7v.3M12 17h.01"/>',
    pause: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
    haut: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    bas: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    envoyer: '<path d="M21 3L10.5 13.5"/><path d="M21 3l-6.5 18-4-7.5-7.5-4z"/>',
    apercu: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    personne: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    telephone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    lien: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    copier: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    partager: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/>',
    ajouterecran: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
    points: '<circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/>',
    camera: '<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>',
    reglages: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    qr: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19h1.5M19 14v1.5"/>',
    tampon: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.3 2.3 4.7-4.8"/>'
  };
  PP.ico = function (nom, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[nom] || '') + '</svg>';
  };

  /* ── Dates : toujours l'heure de Paris, en clair ── */
  function morceaux(date, options) {
    var o = { timeZone: 'Europe/Paris' };
    for (var k in options) o[k] = options[k];
    var out = {};
    try { new Intl.DateTimeFormat('fr-FR', o).formatToParts(date).forEach(function (p) { out[p.type] = p.value; }); }
    catch (e) { out = { day: String(date.getDate()).padStart(2, '0'), month: String(date.getMonth() + 1).padStart(2, '0'), hour: String(date.getHours()).padStart(2, '0'), minute: String(date.getMinutes()).padStart(2, '0'), weekday: '' }; }
    return out;
  }
  PP.date = {
    jjmm: function (d) { var m = morceaux(new Date(d), { day: '2-digit', month: '2-digit' }); return m.day + '/' + m.month; },
    heure: function (d) { var m = morceaux(new Date(d), { hour: '2-digit', minute: '2-digit', hour12: false }); return m.hour + ':' + m.minute; },
    jour: function (d) { var m = morceaux(new Date(d), { year: 'numeric', day: '2-digit', month: '2-digit' }); return m.year + '-' + m.month + '-' + m.day; },
    jourSemaine: function (d) { var m = morceaux(new Date(d), { weekday: 'long' }); return m.weekday || ''; },
    /** « aujourd'hui », « hier » ou « le 08/11 » */
    relatif: function (d) {
      var j = PP.date.jour(d), auj = PP.date.jour(Date.now()), hier = PP.date.jour(Date.now() - 86400000);
      return j === auj ? 'aujourd’hui' : j === hier ? 'hier' : 'le ' + PP.date.jjmm(d);
    },
    /** « AAAA-MM-JJ » → « 08/11 » */
    jjmmIso: function (iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : String(iso || ''); },
    duree: function (sec) {
      var s = Math.max(0, Math.round(Number(sec) || 0));
      if (s < 60) return s + ' seconde' + (s > 1 ? 's' : '');
      var m = Math.ceil(s / 60);
      if (m < 60) return m + ' minute' + (m > 1 ? 's' : '');
      var h = Math.round(m / 60);
      return h + ' heure' + (h > 1 ? 's' : '');
    },
    minSec: function (sec) { var s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; }
  };

  /* ── Les gestes : un seul écouteur ──────────────────────────────────────── */
  PP.actions = {};
  PP.saisies = {};
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    var f = PP.actions[el.getAttribute('data-act')];
    if (!f) return;
    ev.preventDefault();
    try { f(el, ev); } catch (e) { PP.souci(e); }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target;
    var nom = el && el.getAttribute && el.getAttribute('data-saisie');
    if (nom && PP.saisies[nom]) { try { PP.saisies[nom](el, ev); } catch (e) { PP.souci(e); } }
  });
  document.addEventListener('submit', function (ev) {
    var f = ev.target && ev.target.getAttribute && PP.actions[ev.target.getAttribute('data-envoi')];
    ev.preventDefault();
    if (f) { try { f(ev.target, ev); } catch (e) { PP.souci(e); } }
  });

  /* ── L'écran ────────────────────────────────────────────────────────────── */
  PP.etat = PP.etat || { reseauOk: true };
  var minuteurs = [];
  /** Un minuteur attaché à l'écran : il s'arrête tout seul quand l'écran change. */
  PP.minuteur = function (f, ms, repete) {
    var id = repete ? setInterval(f, ms) : setTimeout(f, ms);
    minuteurs.push({ id: id, repete: repete });
    return id;
  };
  PP.arreterMinuteurs = function () {
    minuteurs.forEach(function (m) { if (m.repete) clearInterval(m.id); else clearTimeout(m.id); });
    minuteurs = [];
  };
  PP.quitter = [];   // fonctions appelées quand l'écran change (caméra, lecture régulière…)

  PP.montrer = function (html, opt) {
    opt = opt || {};
    PP.arreterMinuteurs();
    var q = PP.quitter; PP.quitter = [];
    q.forEach(function (f) { try { f(); } catch (e) {} });
    var racine = document.getElementById('app');
    racine.innerHTML = html;
    PP.etat.ecran = opt.nom || '';
    document.documentElement.setAttribute('data-ecran', opt.nom || '');
    if (opt.titre) document.title = opt.titre + ' · Perify Pro';
    if (!opt.garderDefilement) window.scrollTo(0, 0);
    var h = racine.querySelector('[data-focus]') || racine.querySelector('h1');
    if (h && opt.focus !== false) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
    if (opt.apres) opt.apres(racine);
  };

  /* L'en-tête de la boutique : la tuile du logo (le logo clair sur la couleur profonde du commerce, ou son initiale),
     le nom court, la pastille d'état qui suit la vérité (dernier appel, réseau du téléphone, programme arrêté). */
  PP.tuileLogo = function (identite, taille) {
    var id = identite || {};
    var initiale = PP.esc(String(id.nom_court || id.nom || 'P').trim().charAt(0).toUpperCase());
    var logo = id.logo_blanc && /^(https:\/\/|data:image\/|\.\.?\/)/.test(String(id.logo_blanc)) ? String(id.logo_blanc) : '';
    return '<span class="tuile-logo' + (taille ? ' ' + taille : '') + '" aria-hidden="true">'
      + (logo ? '<img src="' + PP.esc(logo) + '" alt="" data-repli="' + initiale + '">' : initiale) + '</span>';
  };
  // Un logo qui ne charge pas laisse la place à l'initiale (jamais une image cassée).
  document.addEventListener('error', function (ev) {
    var img = ev.target;
    if (img && img.tagName === 'IMG' && img.hasAttribute('data-repli')) {
      var t = img.parentNode; if (t) t.textContent = img.getAttribute('data-repli');
    } else if (img && img.tagName === 'IMG' && img.hasAttribute('data-cacher-si-erreur')) {
      img.classList.add('cache');
    }
  }, true);

  PP.pastille = function () {
    var id = PP.etat.identite || {};
    if (id.etat === 'arrete') return '<span class="pastille neutre">Arrêté</span>';
    var enLigne = PP.etat.reseauOk && (typeof navigator.onLine !== 'boolean' || navigator.onLine);
    return enLigne ? '<span class="pastille ok">En ligne</span>' : '<span class="pastille ko">Hors ligne</span>';
  };
  PP.majPastille = function () {
    var p = document.querySelector('.entete .pastille');
    if (p) p.outerHTML = PP.pastille();
  };
  window.addEventListener('online', function () { PP.majPastille(); });
  window.addEventListener('offline', function () { PP.majPastille(); });

  PP.entete = function () {
    var id = PP.etat.identite || {};
    return '<header class="entete">' + PP.tuileLogo(id) + '<span class="nom">' + PP.esc(id.nom_court || id.nom || '') + '</span>' + PP.pastille() + '</header>';
  };
  PP.nav = function (retour, routeRetour, titre) {
    return '<nav class="nav" aria-label="Navigation"><button class="retour" data-act="aller" data-route="' + PP.esc(routeRetour) + '">' + PP.ico('gauche') + PP.esc(retour) + '</button>'
      + '<span class="titre-nav">' + PP.esc(titre || '') + '</span><span></span></nav>';
  };
  var ONGLETS = [['comptoir', 'Comptoir', 'scan'], ['chiffres', 'Chiffres', 'chiffres'], ['annonces', 'Annonces', 'annonces'], ['plus', 'Plus', 'plus']];
  PP.onglets = function (actif) {
    return '<nav class="onglets" aria-label="Onglets">' + ONGLETS.map(function (o) {
      return '<button class="onglet" data-act="aller" data-route="' + o[0] + '"' + (o[0] === actif ? ' aria-current="page"' : '') + '>' + PP.ico(o[2]) + '<span>' + o[1] + '</span></button>';
    }).join('') + '</nav>';
  };
  /** Un écran avec ses onglets : l'en-tête de la boutique (ou une barre de retour), le contenu, les onglets. */
  PP.cadre = function (onglet, corps, opt) {
    opt = opt || {};
    var haut = opt.nav || PP.entete();
    return '<div class="app' + (opt.classe ? ' ' + opt.classe : '') + '">' + haut + (onglet === 'comptoir' && !opt.nav ? '' : PP.bandeauArret())
      + (opt.brut ? corps : '<main class="contenu' + (opt.classeContenu ? ' ' + opt.classeContenu : '') + '">' + corps + '</main>')
      + PP.onglets(onglet) + '</div>';
  };
  /** Programme arrêté : le bandeau, sur tous les écrans de la boutique. Le fichier client reste téléchargeable. */
  PP.bandeauArret = function () {
    var id = PP.etat.identite || {};
    if (id.etat !== 'arrete') return '';
    var depuis = id.arrete_le ? ' depuis le ' + PP.date.jjmm(id.arrete_le) : '';
    return '<div class="contenu bandeau-arret"><div class="alerte" role="status">' + PP.ico('pause') + '<div><div class="t">Votre programme est arrêté' + PP.esc(depuis) + '</div>'
      + '<div class="s">Vos clients ne gagnent plus de tampons et ne peuvent plus utiliser leurs cadeaux. Votre fichier client reste téléchargeable dans « Plus ».</div></div></div></div>';
  };

  PP.allerRoute = function (route) {
    var h = '#/' + String(route || 'comptoir');
    if (location.hash === h) { if (PP.route) PP.route(); }
    else location.hash = h;
  };
  PP.actions.aller = function (el) { PP.allerRoute(el.getAttribute('data-route')); };

  /* ── Le petit bandeau de confirmation ── */
  PP.toast = function (texte, ko) {
    var vieux = document.querySelector('.toast'); if (vieux) vieux.remove();
    var d = document.createElement('div');
    d.className = 'toast' + (ko ? ' ko' : '');
    d.setAttribute('role', 'status');
    d.innerHTML = PP.ico(ko ? 'alerte' : 'check') + '<span></span>';
    d.querySelector('span').textContent = texte;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  };

  /* ── La feuille du bas ── */
  PP.feuille = function (html) {
    PP.fermerFeuille();
    var v = document.createElement('div'); v.className = 'voile'; v.setAttribute('data-act', 'fermer-feuille'); v.id = 'pp-voile';
    var f = document.createElement('div'); f.className = 'feuille'; f.id = 'pp-feuille'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true');
    f.innerHTML = '<div class="poignee"></div>' + html;
    document.body.appendChild(v); document.body.appendChild(f);
    var t = f.querySelector('.t'); if (t) { t.setAttribute('tabindex', '-1'); try { t.focus({ preventScroll: true }); } catch (e) {} }
    return f;
  };
  PP.fermerFeuille = function () {
    var a = document.getElementById('pp-voile'), b = document.getElementById('pp-feuille');
    if (a) a.remove(); if (b) b.remove();
  };
  PP.actions['fermer-feuille'] = function () { if (!PP.etat.feuilleBloquee) PP.fermerFeuille(); };

  /* ── Un souci inattendu : jamais un message technique ── */
  PP.souci = function (e) {
    try { if (window.console) console.error(e); } catch (x) {}
    PP.toast('Un souci est survenu. Réessayez.', true);
  };
  PP.ecranSouci = function () {
    PP.montrer('<div class="app"><main class="contenu entree"><div class="clef">' + PP.ico('alerte') + '</div>'
      + '<h1>Un souci est survenu</h1><p class="chapo">Réessayez. Si cela continue, écrivez à Perify.</p>'
      + '<button class="bouton geant perify" data-act="recharger">' + PP.ico('actualiser') + 'Réessayer</button>'
      + '<a class="bouton-texte discret mt-8" href="mailto:contact@perify.app">Écrire à Perify</a></main></div>', { nom: 'souci', titre: 'Un souci' });
  };
  PP.actions.recharger = function () { location.reload(); };

  /* ── Le journal de l'appareil (ce qui a été fait aujourd'hui, montré sur la tablette) ── */
  PP.journal = {
    cle: function () { return 'perify_pro.journal.' + (PP.etat.cle || '_') + '.' + PP.date.jour(Date.now()); },
    lire: function () { var j = PP.stock.lire(PP.journal.cle()); return Array.isArray(j) ? j : []; },
    ajouter: function (ligne) {
      var j = PP.journal.lire();
      ligne.h = PP.date.heure(Date.now());
      ligne.ts = Date.now();
      j.unshift(ligne);
      PP.stock.ecrire(PP.journal.cle(), j.slice(0, 60));
      if (PP.tablette && PP.tablette.majJournal) PP.tablette.majJournal();
    },
    /** Les jours passés sont effacés à l'ouverture : la tablette ne garde que la journée. */
    nettoyer: function () {
      var garder = PP.journal.cle();
      PP.stock.cles('perify_pro.journal.').forEach(function (k) { if (k !== garder && k.indexOf('perify_pro.journal.' + (PP.etat.cle || '_') + '.') === 0) PP.stock.effacer(k); });
    }
  };

  /* La typographie française à l'écran : une espace insécable avant « : ; ! ? » et à l'intérieur des guillemets, pour
     qu'un signe ne parte jamais seul à la ligne (« Perify / : vous… »). Appliquée au texte affiché, jamais aux champs. */
  var RE_AVANT = / ([:;!?»])/g, RE_APRES = /« /g;
  PP.typographie = function (racine) {
    if (!racine || !document.createTreeWalker) return;
    var w = document.createTreeWalker(racine, 4, null), n;
    while ((n = w.nextNode())) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'TEXTAREA' || p === 'SCRIPT' || p === 'STYLE') continue;
      var v = n.nodeValue;
      if (v.indexOf(' ') < 0) continue;
      var t = v.replace(RE_AVANT, ' $1').replace(RE_APRES, '« ');
      if (t !== v) n.nodeValue = t;
    }
  };
  try {
    new MutationObserver(function (liste) {
      liste.forEach(function (m) {
        if (m.type === 'characterData') { if (/ [:;!?»]|« /.test(m.target.nodeValue || '')) PP.typographie(m.target.parentNode); }
        else m.addedNodes.forEach(function (x) { if (x.nodeType === 1) PP.typographie(x); else if (x.nodeType === 3 && x.parentNode) PP.typographie(x.parentNode); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  } catch (e) {}

  /* La mise en page « caisse » de la tablette (relecture du 13/11) : assez large ET assez haute — un grand iPhone tourné à
     l'horizontale ou une tablette très basse gardent la mise en page du téléphone (le bouton du résultat restait caché) ;
     une tablette tenue debout (744 px et plus, 900 px de haut) a la sienne. La même requête que dans app.css. */
  PP.REQUETE_TABLETTE = '(min-width: 900px) and (min-height: 640px), (min-width: 744px) and (min-height: 900px)';
  PP.estTablette = function () { return !!(window.matchMedia && window.matchMedia(PP.REQUETE_TABLETTE).matches); };
})();
