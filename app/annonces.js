/* Perify Pro — les annonces (13/11/2026).
   A1 deux choix · A2 le message sur la carte Wallet (on écrit d'abord, l'aperçu se met à jour juste dessous) ·
   A3 l'affiche par e-mail, CLAIRE (fond blanc, bandeau de couleur, photo du produit ; aucun doré, aucun crème) ·
   A4 confirmation · A5 envoi vérifié par mk_list · A6 aucun destinataire.
   Repris de l'ancien espace : les exemples par métier, la double vérification d'un envoi (une affiche = une
   campagne, identifiant choisi avant l'appel et réutilisé ; pas de réponse ≠ pas d'envoi ; même affiche jamais
   renvoyée dans les 12 h). Les visuels sont servis par ce même site : le dessin de l'affiche reste lisible. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var ico = PP.ico, esc = PP.esc;
  var A = PP.annonces = {};

  /* ── Les produits, par métier (photos servies par le site) ── */
  var PRODUITS = {
    baps: [
      { id: 'burger', nom: 'Burger', img: '../assets/promo/baps/burger.png', genre: 'm', mots: ['burger'] },
      { id: 'tacos', nom: 'Tacos', img: '../assets/promo/baps/tacos.png', genre: 'm', mots: ['tacos'] },
      { id: 'frites', nom: 'Frites', img: '../assets/promo/baps/frites.png', genre: 'f', pluriel: true, mots: ['frite'] },
      { id: 'mozza', nom: 'Mozzasticks', img: '../assets/promo/baps/mozzasticks.png', genre: 'm', pluriel: true, mots: ['mozza'] },
      { id: 'hotdog', nom: 'Hot-dog', img: '../assets/promo/baps/hotdog.png', genre: 'm', mots: ['hot-dog', 'hot dog', 'hotdog'] },
      { id: 'toast', nom: 'Toast', img: '../assets/promo/baps/toast.png', genre: 'm', mots: ['toast'] }
    ],
    boulangerie: [
      { id: 'croissant', nom: 'Croissant', img: '../assets/promo/products/croissant.png', genre: 'm', mots: ['croissant', 'viennoiserie'] },
      { id: 'pain', nom: 'Pain au chocolat', img: '../assets/promo/products/pain-au-chocolat.png', genre: 'm', mots: ['pain au chocolat', 'chocolatine'] },
      { id: 'baguette', nom: 'Baguette', img: '../assets/promo/products/baguette.png', genre: 'f', mots: ['baguette', 'pain'] },
      { id: 'eclair', nom: 'Éclair', img: '../assets/promo/products/eclair.png', genre: 'm', mots: ['eclair', 'patisserie'] },
      { id: 'cookie', nom: 'Cookie', img: '../assets/promo/products/cookie.png', genre: 'm', mots: ['cookie'] },
      { id: 'tartelette', nom: 'Tartelette', img: '../assets/promo/products/tartelette-fraise.png', genre: 'f', mots: ['tartelette'] }
    ]
  };
  /** Les produits d'un métier. strict : rien si le métier n'a pas de photos (jamais un croissant chez un vendeur de tacos). */
  PP.produitsDuMetier = function (metier, strict) {
    return PRODUITS[metier] || (strict ? [] : PRODUITS.boulangerie);
  };

  /* Les idées de message, par métier (reprises de l'ancien espace). Viser 40 caractères. */
  var EXEMPLES = {
    _defaut: ['Offre du jour : -20 % membres', 'Nouveauté en boutique cette semaine', 'Le 2e article à moitié prix', 'Ouvert exceptionnellement dimanche', 'Fermé exceptionnellement demain'],
    boulangerie: ['Fournée de 16h : -30 % membres', 'Pains au chocolat chauds à 16h', '-30 % sur les viennoiseries', 'Baguette offerte dès 2 achetées', 'Fermé exceptionnellement demain'],
    baps: ['Menu tacos + frites + boisson 9,90 €', '-20 % sur les burgers ce soir', 'Mozzasticks offerts dès 15 € d’achat', 'Frites offertes avec tout tacos', 'Fermé exceptionnellement demain'],
    fleuriste: ['Bouquet du jour à -20 %', 'Roses : la 2e offerte', 'Nouvelles pivoines arrivées', 'Plantes vertes -15 % ce week-end', 'Fermé exceptionnellement demain'],
    pizzeria: ['Pizza achetée = boisson offerte', '-25 % à emporter avant 19h', 'Calzone du jour à 9,90 €', 'Tiramisu maison offert dès 20 €', 'Fermé exceptionnellement demain'],
    restaurant: ['Formule midi à 14,90 € ce midi', 'Café gourmand offert aujourd’hui', 'Suggestion du jour : magret', '-20 % sur les desserts ce soir', 'Fermé exceptionnellement demain'],
    primeur: ['Fraises de Carpentras arrivées', 'Cagette de saison à 9,90 €', '-30 % sur les tomates ce soir', 'Légumes : 2 cagettes, 1 offerte', 'Fermé exceptionnellement demain'],
    vape: ['-20 % sur tous les e-liquides', 'Nouveaux arômes en boutique', 'Résistances : la 5e offerte', 'Pack découverte à 19,90 €', 'Fermé exceptionnellement demain']
  };
  var CONFORT = 40, MAX = 64;

  var etat = { offre: null, nb: null, campagnes: null };

  function charger(apres) {
    var reste = 3;
    var fini = function () { if (--reste === 0 && apres) apres(); };
    PP.appel('wallet_offre_etat', {}).then(function (r) { etat.offre = r && r.status === 'ok' ? r : { erreur: true, reseau: r.reseau }; fini(); });
    PP.appel('mk_count', {}).then(function (r) { etat.nb = r && r.status === 'ok' ? Number(r.nb) || 0 : null; fini(); });
    PP.appel('mk_list', {}).then(function (r) { etat.campagnes = r && r.status === 'ok' && Array.isArray(r.campagnes) ? r.campagnes : null; fini(); });
  }

  /* ═══ A1 — deux choix ══════════════════════════════════════════════════ */
  A.ecran = function () {
    var o = etat.offre, nb = etat.nb, camp = etat.campagnes;
    var cartes = o && !o.erreur ? Number(o.cartes) || 0 : null;
    var etatMessage = !o ? 'Chargement…' : o.erreur ? 'État du message indisponible pour le moment.' : o.texte ? 'Un message en cours : envoyé ' + esc(o.depuis || '') + '.' : 'Aucun message en ce moment.';
    var envoyees = (camp || []).filter(function (c) { return c.statut === 'envoye'; });
    var etatAffiche = camp === null ? (etat.nb === null && etat.offre ? 'Envois indisponibles pour le moment.' : 'Chargement…')
      : envoyees.length ? 'Dernier envoi ' + esc(dateEnvoi(envoyees[0])) + '.' : 'Aucun envoi pour le moment.';
    var id = PP.etat.identite || {};
    var miniPass = '<div class="mini-pass" aria-hidden="true">' + (id.logo_blanc ? '<img class="logo-mini" src="' + esc(id.logo_blanc) + '" alt="" data-cacher-si-erreur>' : '')
      + '<div class="bd">' + (PP.habillage.banniere(id.metier) ? '<img src="' + esc(PP.habillage.banniere(id.metier)) + '" alt="" data-cacher-si-erreur>' : '') + '</div><i></i><b></b><b></b></div>';
    var carte = function (route, vis, t, et, s, i, txt) {
      return '<button class="annonce" data-act="aller" data-route="' + route + '"><div class="vis">' + vis + '</div><div class="corps"><span class="t">' + t + '</span>'
        + (et ? '<span class="etiquette marque">' + et + '</span>' : '') + '<span class="s">' + s + '</span><span class="etat">' + ico(i) + '<span>' + txt + '</span></span></div></button>';
    };
    PP.montrer(PP.cadre('annonces', '<h1 class="grand-titre">Annonces</h1><div class="deux-colonnes"><div>'
      + carte('annonces/message', miniPass, 'Message sur la carte', cartes === null ? '' : cartes + ' carte' + (cartes > 1 ? 's' : ''), 'Un court message sur la carte Wallet de vos clients. Il disparaît au bout de 24 h.', 'horloge', etatMessage)
      + '</div><div>'
      + carte('annonces/affiche', '<img class="mini-affiche" id="a1-mini" alt="">', 'Affiche par e-mail', nb === null ? '' : nb + ' client' + (nb > 1 ? 's' : ''), 'Une affiche envoyée aux clients qui acceptent vos offres. Valable 3 à 30 jours.', 'courrier', etatAffiche)
      + '</div></div>'), { nom: 'A1', titre: 'Annonces' });
    var mini = document.getElementById('a1-mini');
    if (mini) dessinerApercu(mini, 270);
    if (!A.charge) { A.charge = true; charger(function () { if (PP.etat.ecran === 'A1') A.ecran(); }); }
  };
  function dateEnvoi(c) {
    var t = String(c.envoye_le || '');
    var m = t.match(/(\d{2})\/(\d{2})/);
    if (m) return 'le ' + m[1] + '/' + m[2];
    m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? 'le ' + m[3] + '/' + m[2] : '';
  }

  /* ═══ A2 — le message sur la carte ═════════════════════════════════════ */
  A.ecranMessage = function () {
    var id = PP.etat.identite || {};
    var o = etat.offre && !etat.offre.erreur ? etat.offre : null;
    var cartes = o ? Number(o.cartes) || 0 : null;
    var exemples = EXEMPLES[id.metier] || EXEMPLES._defaut;
    var ban = PP.habillage.banniere(id.metier);
    var logo = id.logo_blanc ? '<img src="' + esc(id.logo_blanc) + '" alt="" data-repli="' + esc(String(id.nom_court || id.nom || 'P').charAt(0)) + '">' : '<span class="mono">' + esc(String(id.nom_court || id.nom || 'P').charAt(0)) + '</span>';
    PP.montrer(PP.cadre('annonces', '<h1 class="titre-ecran">Message sur la carte</h1>'
      + '<p class="chapo">Il apparaît sur la carte Wallet de vos ' + (cartes === null ? '' : '<b>' + cartes + ' client' + (cartes > 1 ? 's' : '') + '</b>') + (cartes === null ? 'clients' : '') + ', puis disparaît au bout de 24 h.</p>'
      + '<label class="libelle-champ" for="a-message">Votre message</label>'
      + '<textarea class="zone-texte" id="a-message" maxlength="' + MAX + '" rows="2" data-saisie="a-message" placeholder="' + esc(exemples[0]) + '"></textarea>'
      + '<div class="compteur" id="a-compteur"><span>Au-delà de 40 caractères, le texte rétrécit sur l’iPhone.</span><b>0 / ' + MAX + '</b></div>'
      + '<div class="libelle-champ">Des idées</div><div class="pastilles-choix">' + exemples.map(function (e) { return '<button class="puce" data-act="a-idee">' + esc(e) + '</button>'; }).join('') + '</div>'
      + '<h2 class="titre-section">Ce que vos clients verront</h2>'
      + '<div class="surface serree"><div class="ecran-verrouille" aria-hidden="true"><div class="notif">' + PP.tuileLogo(id) + '<div><div class="l1"><span class="t">' + esc(id.nom_court || id.nom || '') + '</span><span class="h">maintenant</span></div><div class="m" id="a-notif">' + esc(exemples[0]) + '</div></div></div></div>'
      + '<div class="pass mt-12" aria-hidden="true"><div class="ligne1">' + logo + '<span class="n">' + esc(id.nom_court || id.nom || '') + '</span><span class="lib">5/10 tampons</span></div>'
      + '<div class="bandeau">' + (ban ? '<img src="' + esc(ban) + '" alt="" data-cacher-si-erreur>' : '') + '</div>'
      + '<div class="champs"><div><div class="lib">CADEAU À RÉCUPÉRER</div><div class="val vide">Aucun pour l’instant</div></div><div></div>'
      + '<div class="ligne-offre"><div class="lib">OFFRE DU MOMENT</div><div class="val" id="a-apercu">' + esc(exemples[0]) + '</div></div></div></div>'
      + '<p class="note">Exemple de carte : chaque client voit ses propres tampons et cadeaux.</p></div>'
      + '<div id="a-erreur" aria-live="polite"></div>'
      + '<button class="bouton geant mt-24" id="a-envoyer" data-act="a-envoyer"' + (cartes === 0 ? ' disabled' : '') + '>' + ico('envoyer') + (cartes === 0 ? 'Aucune carte enregistrée' : 'Envoyer aux ' + (cartes === null ? '' : cartes + ' ') + 'cartes') + '</button>'
      + (o && o.texte ? '<h2 class="titre-section">En ce moment sur les cartes</h2><div class="liste"><div class="rangee">' + '<div class="vignette icone">' + ico('horloge') + '</div><div><div class="t">« ' + esc(o.texte) + ' »</div><div class="s">Envoyé ' + esc(o.depuis || '') + ' · il disparaît au bout de 24 h</div></div><span></span></div></div>'
        + '<button class="bouton danger mt-12" data-act="a-retirer">Retirer le message des cartes</button>' : ''),
    { nav: PP.nav('Annonces', 'annonces', '') }), { nom: 'A2', titre: 'Message sur la carte' });
    if (!etat.offre) charger(function () { if (PP.etat.ecran === 'A2') { var v = (document.getElementById('a-message') || {}).value || ''; A.ecranMessage(); var t = document.getElementById('a-message'); if (t) { t.value = v; majMessage(t); } } });
  };
  function majMessage(t) {
    var v = t.value, n = v.length;
    var c = document.getElementById('a-compteur');
    if (c) { c.querySelector('b').textContent = n + ' / ' + MAX; c.classList.toggle('alerte-long', n > CONFORT); }
    var ap = document.getElementById('a-apercu'), no = document.getElementById('a-notif');
    var ex = t.getAttribute('placeholder') || '';
    if (ap) ap.textContent = v || ex;
    if (no) no.textContent = v || ex;
  }
  PP.saisies['a-message'] = majMessage;
  PP.actions['a-idee'] = function (el) { var t = document.getElementById('a-message'); if (!t) return; t.value = el.textContent.trim(); majMessage(t); };
  function erreurA(txt) { var e = document.getElementById('a-erreur'); if (e) e.innerHTML = txt ? '<div class="message-erreur" role="alert">' + ico('alerte') + '<div>' + txt + '</div></div>' : ''; }
  PP.actions['a-envoyer'] = function (el) {
    var t = document.getElementById('a-message');
    var v = t ? t.value.trim() : '';
    if (!v) { erreurA('<b>Écrivez d’abord votre message.</b>Ou touchez une idée.'); return; }
    erreurA('');
    var texte = el.innerHTML;
    el.disabled = true; el.classList.add('occupe'); el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Envoi en cours…';
    PP.appel('wallet_offre', { message: v }).then(function (r) {
      el.disabled = false; el.classList.remove('occupe'); el.innerHTML = texte;
      if (r.status === 'ok') {
        PP.toast('Envoyé à ' + r.cartes + ' carte' + (r.cartes > 1 ? 's' : '') + '.');
        etat.offre = null;
        return charger(function () { if (PP.etat.ecran === 'A2') A.ecranMessage(); });
      }
      if (r.status === 'aucune_carte') return erreurA('<b>Aucune carte enregistrée pour le moment.</b>Le message partira dès que des clients auront mis leur carte dans leur Wallet.');
      if (r.code === 'rejouer') return erreurA('<b>Pas envoyé.</b>Appuyez de nouveau sur « Envoyer ».');
      erreurA(r.reseau ? '<b>Pas envoyé.</b>Le réseau n’a pas répondu. Réessayez.' : '<b>L’envoi n’a pas abouti.</b>Réessayez dans un instant.');
    });
  };
  PP.actions['a-retirer'] = function (el) {
    el.disabled = true; el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Un instant…';
    PP.appel('wallet_offre', { clear: '1' }).then(function (r) {
      if (r.status === 'ok') { PP.toast('Message retiré des cartes.'); etat.offre = null; return charger(function () { if (PP.etat.ecran === 'A2') A.ecranMessage(); }); }
      el.disabled = false; el.textContent = 'Retirer le message des cartes';
      erreurA(r.reseau ? '<b>Pas retiré.</b>Le réseau n’a pas répondu. Réessayez.' : '<b>Pas retiré.</b>Réessayez dans un instant.');
    });
  };

  /* ═══ A3 — l'affiche par e-mail ════════════════════════════════════════ */
  var COULEURS = [['commerce', ''], ['vert', '#2F7D32', 'Vert'], ['chocolat', '#5D3A1A', 'Chocolat'], ['fraise', '#C2185B', 'Fraise'], ['bleu', '#1E5AA8', 'Bleu']];
  var VALIDITES = [3, 7, 14, 30];
  var mk = { pid: null, off: 'buyGet', buy: 1, free: 1, pct: 20, couleur: 'commerce', quand: 'now', validite: 7 };
  var images = {};

  function produits() { return PP.produitsDuMetier((PP.etat.identite || {}).metier, false); }
  function produit() { var l = produits(); return l.filter(function (p) { return p.id === mk.pid; })[0] || l[0]; }
  function couleurCommerce() {
    var h = PP.habillage.TABLE[(document.documentElement.getAttribute('data-habillage') || 'perify')] || PP.habillage.TABLE.perify;
    return PP.habillage.contraste(h.marque, '#FFFFFF') >= 4.5 ? h.marque : h.marqueProfond;
  }
  function couleur() { var c = COULEURS.filter(function (x) { return x[0] === mk.couleur; })[0]; return c && c[1] ? c[1] : couleurCommerce(); }
  /** Les textes de l'affiche : déduits des choix, jamais tapés. */
  function textes() {
    var p = produit(), f = p.genre === 'f';
    var art = p.pluriel ? 'les ' : f ? 'la ' : (/^[aeiouéè]/i.test(p.nom) ? 'l’' : 'le ');
    if (mk.off === 'percent') return { l1: '−' + mk.pct + ' %', l2: 'avec la carte', sur: 'Sur ' + art + p.nom.toLowerCase(), court: '−' + mk.pct + ' %', titre: p.nom + ' · −' + mk.pct + ' %' };
    var ach = 'acheté' + (f ? 'e' : '') + (mk.buy > 1 ? 's' : ''), off = 'offert' + (f ? 'e' : '') + (mk.free > 1 ? 's' : '');
    var court = mk.buy + ' ' + ach + ' = ' + mk.free + ' ' + off;
    return { l1: mk.buy + ' ' + ach, l2: '= ' + mk.free + ' ' + off, sur: 'Sur ' + art + p.nom.toLowerCase(), court: court, titre: p.nom + ' · ' + court };
  }
  function finOffre() {
    var d = new Date(Date.now() + 86400000 * ((mk.quand === 'demain' ? 1 : 0) + mk.validite));
    return { jjmm: PP.date.jjmm(d), jour: PP.date.jourSemaine(d) };
  }
  /* Le logo vient d'un autre site (carte.perify.app) : il est demandé en CORS. Sans l'en-tête qui le permet, il ne se
     charge pas et l'affiche prend l'initiale de la boutique — jamais un dessin « teinté » que le téléphone refuserait
     d'exporter (l'affiche ne partirait plus). */
  function chargerImage(src, cors) {
    var cle = (cors ? 'cors:' : '') + src;
    if (images[cle]) return images[cle];
    images[cle] = new Promise(function (ok) { var i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
    return images[cle];
  }
  function arrondi(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function ajuster(ctx, txt, poids, max, largeur, min) { var t = max; while (t > min) { ctx.font = poids + ' ' + t + 'px Inter, Arial, sans-serif'; if (ctx.measureText(txt).width <= largeur) break; t -= 4; } return t; }

  /** L'affiche CLAIRE, 1080 × 1920 : c'est elle qui part dans l'e-mail. Fond blanc, en-tête de la boutique, gros titre,
      photo du produit, bandeau de la couleur choisie avec la date de fin. */
  function dessiner(toile, sansLogo) {
    var id = PP.etat.identite || {}, p = produit(), t = textes(), coul = couleur(), fin = finOffre();
    var ctx = toile.getContext('2d'), W = 1080, H = 1920;
    toile.width = W; toile.height = H;
    return Promise.all([chargerImage(p.img), id.logo_blanc && !sansLogo ? chargerImage(id.logo_blanc, true) : Promise.resolve(null)]).then(function (im) {
      var photo = im[0], logo = im[1];
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      // L'en-tête : la tuile de la boutique et son nom.
      var h = PP.habillage.TABLE[(document.documentElement.getAttribute('data-habillage') || 'perify')] || PP.habillage.TABLE.perify;
      ctx.fillStyle = h.marqueProfond; arrondi(ctx, 80, 80, 112, 112, 30); ctx.fill();
      if (logo) { try { var r = Math.min(90 / logo.naturalWidth, 90 / logo.naturalHeight); ctx.drawImage(logo, 136 - logo.naturalWidth * r / 2, 136 - logo.naturalHeight * r / 2, logo.naturalWidth * r, logo.naturalHeight * r); } catch (e) { logo = null; } }
      if (!logo) { ctx.fillStyle = h.surProfond; ctx.font = '800 60px Inter, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(id.nom_court || id.nom || 'P').charAt(0).toUpperCase(), 136, 140); }
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#16171D';
      var tn = ajuster(ctx, String(id.nom_court || id.nom || ''), '700', 52, 780, 30);
      ctx.font = '700 ' + tn + 'px Inter, Arial, sans-serif'; ctx.fillText(String(id.nom_court || id.nom || ''), 220, 138);
      // Le titre.
      ctx.textBaseline = 'alphabetic';
      var t1 = ajuster(ctx, t.l1, '800', 170, 920, 90);
      ctx.font = '800 ' + t1 + 'px Inter, Arial, sans-serif'; ctx.fillStyle = mk.off === 'percent' ? coul : '#16171D'; ctx.fillText(t.l1, 80, 420);
      var t2 = ajuster(ctx, t.l2, '800', mk.off === 'percent' ? 96 : 170, 920, 60);
      ctx.font = '800 ' + t2 + 'px Inter, Arial, sans-serif'; ctx.fillStyle = mk.off === 'percent' ? '#16171D' : coul; ctx.fillText(t.l2, 80, 420 + Math.round(t2 * 1.08));
      ctx.font = '600 54px Inter, Arial, sans-serif'; ctx.fillStyle = '#5C5F6A'; ctx.fillText(t.sur, 84, 720);
      // La photo.
      if (photo) {
        var zoneH = 760, zoneW = 900, rr = Math.min(zoneW / photo.naturalWidth, zoneH / photo.naturalHeight);
        var w = photo.naturalWidth * rr, hh = photo.naturalHeight * rr;
        ctx.save(); ctx.shadowColor = 'rgba(22,23,29,0.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
        ctx.drawImage(photo, (W - w) / 2, 780 + (zoneH - hh) / 2, w, hh); ctx.restore();
      }
      // Le bandeau du bas.
      ctx.fillStyle = coul; ctx.fillRect(0, 1580, W, H - 1580);
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
      ctx.font = '800 68px Inter, Arial, sans-serif'; ctx.fillText('Valable jusqu’au ' + fin.jjmm, 80, 1700);
      ctx.font = '500 40px Inter, Arial, sans-serif'; ctx.fillText('Montrez cet e-mail au comptoir. Selon disponibilité.', 80, 1780);
      ctx.font = '500 34px Inter, Arial, sans-serif'; ctx.globalAlpha = 0.9; ctx.fillText('Offre réservée aux clients de la carte de fidélité.', 80, 1840); ctx.globalAlpha = 1;
      return toile;
    });
  }
  /** L'image de l'affiche (data:), refaite sans le logo si le téléphone refuse de l'exporter. */
  function exporter(type, qualite, largeur) {
    var essai = function (sansLogo) {
      var toile = document.createElement('canvas');
      return dessiner(toile, sansLogo).then(function () {
        var out = toile;
        if (largeur) { out = document.createElement('canvas'); var k = largeur / 1080; out.width = Math.round(1080 * k); out.height = Math.round(1920 * k); out.getContext('2d').drawImage(toile, 0, 0, out.width, out.height); }
        return out.toDataURL(type, qualite);
      });
    };
    return essai(false).catch(function () { return essai(true); });
  }
  function dessinerApercu(img, largeur) {
    return exporter('image/png', undefined, largeur).then(function (url) { if (img) img.src = url; }).catch(function () {});
  }
  function affichePourEnvoi() { return exporter('image/jpeg', 0.86); }

  A.ecranAffiche = function () {
    var l = produits();
    if (!mk.pid || !l.some(function (p) { return p.id === mk.pid; })) { mk.pid = l[0].id; }
    var nb = etat.nb;
    var fin = finOffre(), t = textes();
    var camp = (etat.campagnes || []).slice(0, 5);
    var statut = function (c) {
      var s = c.statut || 'brouillon';
      if (s === 'envoye') return ['Envoyé', 'ok', (dateEnvoi(c) ? PP.majuscule(dateEnvoi(c)) : 'Envoyé') + ' · ' + (Number(c.nb) || 0) + ' e-mail' + ((Number(c.nb) || 0) > 1 ? 's' : '')];
      if (s === 'prevu') return ['Prévu', 'marque', 'Prévu le ' + PP.date.jjmmIso(c.date_envoi) + ' au matin'];
      return ['Brouillon', 'gris', 'Préparé, jamais envoyé'];
    };
    var aucun = nb === 0;
    PP.montrer(PP.cadre('annonces', '<h1 class="titre-ecran">Affiche par e-mail</h1>'
      + '<p class="chapo">Choisissez en quelques touches. Le texte de l’affiche s’écrit tout seul.</p>'
      + '<div class="deux-colonnes"><div>'
      + '<img class="affiche-apercu mt-20" id="a-affiche" alt="Aperçu de l’affiche : ' + esc(t.titre) + ', valable jusqu’au ' + esc(fin.jjmm) + '">'
      + '<p class="note centre">C’est l’image que recevront vos clients.</p></div><div>'
      + '<h2 class="titre-section">Le produit</h2><div class="produits">' + l.map(function (p) {
        var on = p.id === mk.pid;
        return '<button class="produit" data-act="a-produit" data-id="' + p.id + '" aria-pressed="' + on + '">' + (on ? '<span class="coche">' + ico('check') + '</span>' : '') + '<img src="' + esc(p.img) + '" alt="">' + esc(p.nom) + '</button>';
      }).join('') + '</div>'
      + '<h2 class="titre-section">L’offre</h2><div class="segments" role="group" aria-label="Type d’offre">'
      + '<button class="segment" data-act="a-offre" data-v="buyGet" aria-pressed="' + (mk.off === 'buyGet') + '">Acheté = offert</button><button class="segment" data-act="a-offre" data-v="percent" aria-pressed="' + (mk.off === 'percent') + '">Réduction en %</button></div>'
      + '<div class="liste mt-12">' + (mk.off === 'percent'
        ? pas('Réduction', mk.pct + ' %', 'pct')
        : pas('Achetés', mk.buy, 'buy') + pas('Offerts', mk.free, 'free')) + '</div>'
      + '<h2 class="titre-section">La couleur</h2><div class="couleurs">' + COULEURS.map(function (c) {
        var on = c[0] === mk.couleur;
        return '<button class="couleur" data-act="a-couleur" data-v="' + c[0] + '" aria-pressed="' + on + '"><i class="c-' + c[0] + '">' + (on ? ico('check') : '') + '</i>' + esc(c[0] === 'commerce' ? ((PP.etat.identite || {}).nom_court || 'Boutique') : c[2]) + '</button>';
      }).join('') + '</div>'
      + '<h2 class="titre-section">Quand l’envoyer</h2><div class="segments" role="group" aria-label="Quand"><button class="segment" data-act="a-quand" data-v="now" aria-pressed="' + (mk.quand === 'now') + '">Maintenant</button><button class="segment" data-act="a-quand" data-v="demain" aria-pressed="' + (mk.quand === 'demain') + '">Demain matin</button></div>'
      + '<h2 class="titre-section">Valable</h2><div class="segments" role="group" aria-label="Durée">' + VALIDITES.map(function (v) { return '<button class="segment" data-act="a-validite" data-v="' + v + '" aria-pressed="' + (mk.validite === v) + '">' + v + ' jours</button>'; }).join('') + '</div>'
      + '<p class="note">Jusqu’au ' + esc(fin.jour) + ' ' + esc(fin.jjmm) + ' inclus.</p>'
      + '<div class="surface serree mt-24"><div class="boutique"><div class="vignette icone">' + ico('personne') + '</div><div><div class="n" id="a-nb">' + (nb === null ? 'Destinataires…' : aucun ? 'Aucun client ne reçoit encore vos offres' : nb + ' client' + (nb > 1 ? 's' : '') + ' la recevr' + (nb > 1 ? 'ont' : 'a')) + '</div>'
      + '<div class="s">' + (aucun ? 'Les clients s’inscrivent depuis leur carte, en acceptant de recevoir vos offres.' : 'Ceux qui acceptent de recevoir vos offres.') + '</div></div></div>'
      + '<div id="a-info" aria-live="polite"></div>'
      + '<div class="pile mt-16"><button class="bouton geant" data-act="a-envoyer-affiche"' + (aucun ? ' disabled' : '') + '>' + ico('envoyer') + (mk.quand === 'demain' ? 'Programmer pour demain matin' : aucun ? 'Aucun destinataire' : 'Envoyer à ' + (nb === null ? 'vos clients' : nb + ' client' + (nb > 1 ? 's' : ''))) + '</button>'
      + '<button class="bouton second" data-act="a-test">' + ico('apercu') + 'M’envoyer l’aperçu d’abord</button></div></div>'
      + '<h2 class="titre-section">Derniers envois</h2>' + (etat.campagnes === null ? '<p class="note">Chargement…</p>' : camp.length ? '<div class="liste">' + camp.map(function (c) {
        var s = statut(c);
        return '<div class="rangee sans-icone"><div><div class="t">' + esc(c.titre || 'Affiche') + '</div><div class="s">' + esc(s[2]) + '</div></div><span class="etiquette ' + s[1] + '">' + s[0] + '</span></div>';
      }).join('') + '</div>' : '<p class="note">Aucune affiche envoyée pour le moment.</p>')
      + '</div></div>',
    { nav: PP.nav('Annonces', 'annonces', '') }), { nom: 'A3', titre: 'Affiche par e-mail', garderDefilement: A.garder });
    A.garder = false;
    var sw = document.querySelector('.c-commerce'); if (sw) sw.style.background = couleurCommerce();
    dessinerApercu(document.getElementById('a-affiche'), 480);
    if (etat.nb === null || etat.campagnes === null) charger(function () { if (PP.etat.ecran === 'A3' && (etat.nb !== null || etat.campagnes !== null)) { A.garder = true; A.ecranAffiche(); } });
  };
  function pas(lib, val, k) {
    return '<div class="rangee sans-icone"><span class="t">' + lib + '</span><div class="pas"><button data-act="a-pas" data-k="' + k + '" data-d="-1" aria-label="Moins">' + ico('retirer') + '</button><b>' + val + '</b><button data-act="a-pas" data-k="' + k + '" data-d="1" aria-label="Plus">' + ico('ajouter') + '</button></div></div>';
  }
  function refaire() { A.garder = true; A.ecranAffiche(); }
  PP.actions['a-produit'] = function (el) { mk.pid = el.getAttribute('data-id'); refaire(); };
  PP.actions['a-offre'] = function (el) { mk.off = el.getAttribute('data-v') === 'percent' ? 'percent' : 'buyGet'; refaire(); };
  PP.actions['a-couleur'] = function (el) { mk.couleur = el.getAttribute('data-v'); refaire(); };
  PP.actions['a-quand'] = function (el) { mk.quand = el.getAttribute('data-v') === 'demain' ? 'demain' : 'now'; refaire(); };
  PP.actions['a-validite'] = function (el) { var v = Number(el.getAttribute('data-v')); mk.validite = VALIDITES.indexOf(v) >= 0 ? v : 7; refaire(); };
  PP.actions['a-pas'] = function (el) {
    var k = el.getAttribute('data-k'), d = Number(el.getAttribute('data-d'));
    if (k === 'buy') mk.buy = Math.min(9, Math.max(1, mk.buy + d));
    if (k === 'free') mk.free = Math.min(9, Math.max(1, mk.free + d));
    if (k === 'pct') mk.pct = Math.min(90, Math.max(5, mk.pct + d * 5));
    refaire();
  };

  /* ── L'envoi : une affiche = une campagne, jamais envoyée deux fois ── */
  var VERIF_MS = 90000, DEJA_MS = 12 * 3600000;
  function cleEnvois() { return 'perify_pro.envois.' + (PP.etat.cle || ''); }
  function empreinte() { var t = textes(); return JSON.stringify([PP.etat.cle || '', (PP.etat.identite || {}).metier || '', mk.pid, mk.off, mk.buy, mk.free, mk.pct, mk.couleur, t.titre, t.court, mk.validite]); }
  function envois() { var o = PP.stock.lire(cleEnvois()); return (o && typeof o === 'object') ? o : {}; }
  function memoriser(emp, patch) {
    var tous = envois(), vieux = Date.now() - 7 * 86400000;
    for (var k in tous) if (!tous[k] || !(tous[k].t > vieux)) delete tous[k];
    var r = tous[emp] || {};
    for (var p in patch) r[p] = patch[p];
    r.t = Date.now(); tous[emp] = r;
    PP.stock.ecrire(cleEnvois(), tous);
    return r;
  }
  function nouvelId() {
    var A2 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    try { var t = new Uint8Array(8); crypto.getRandomValues(t); t.forEach(function (x) { s += A2[x % A2.length]; }); }
    catch (e) { for (var i = 0; i < 8; i++) s += A2[Math.floor(Math.random() * A2.length)]; }
    return 'CAMP-' + s;
  }
  function demain() { return PP.date.jour(Date.now() + 86400000); }
  function charge(statut, date) {
    var t = textes();
    return affichePourEnvoi().then(function (poster) {
      return { titre: t.titre, offre: t.court, accroche: '', type: 'promo', cta_txt: 'J’en profite', statut: statut, date_envoi: date || '2026-01-01', poster: poster, validite_jours: mk.validite };
    });
  }
  function obtenirCampagne(emp) {
    var rec = envois()[emp];
    if (rec && rec.id && ['envoye', 'creation', 'creation-prevu', 'perdu'].indexOf(rec.statut) < 0) return Promise.resolve(rec.id);
    var id = (rec && rec.statut === 'creation' && rec.id) || nouvelId();
    memoriser(emp, { id: id, statut: 'creation' });
    return charge('brouillon').then(function (c) {
      c.id = id;
      return PP.appel('mk_create', c);
    }).then(function (d) {
      if (d.status !== 'ok') { var e = new Error(d.reseau ? 'reseau' : 'refus'); throw e; }
      memoriser(emp, { id: d.id || id, statut: 'cree' });
      return d.id || id;
    });
  }
  function info(html) { var e = document.getElementById('a-info'); if (e) e.innerHTML = html || ''; }

  PP.actions['a-envoyer-affiche'] = function () {
    var emp = empreinte(), rec = envois()[emp], nb = etat.nb || 0;
    if (mk.quand === 'now' && rec && rec.statut === 'envoye' && rec.nb > 0 && Date.now() - (rec.envoyee || 0) < DEJA_MS) {
      info('<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Cette affiche est déjà partie.</b>À ' + rec.nb + ' client' + (rec.nb > 1 ? 's' : '') + ', à ' + PP.date.heure(rec.envoyee) + '. Modifiez-la pour envoyer une nouvelle affiche.</div></div>');
      return;
    }
    if (mk.quand === 'demain' && rec && rec.statut === 'prevu' && rec.date === demain()) {
      info('<div class="message-ok" role="status">' + ico('check') + '<span>Cette affiche est déjà programmée pour demain matin.</span></div>');
      return;
    }
    var t = textes(), fin = finOffre();
    var src = (document.getElementById('a-affiche') || {}).src || '';
    var prevu = mk.quand === 'demain';
    PP.feuille('<div class="t">' + (prevu ? 'Programmer pour demain matin ?' : 'Envoyer à ' + nb + ' client' + (nb > 1 ? 's' : '') + ' ?') + '</div>'
      + '<p class="s">' + (prevu ? 'L’affiche partira demain matin par e-mail. Un envoi programmé ne s’annule pas.' : 'L’affiche part par e-mail tout de suite. Un envoi ne s’annule pas.') + '</p>'
      + '<div class="recap">' + (src ? '<img src="' + esc(src) + '" alt="">' : '<span></span>') + '<div><div class="t2">' + esc(t.titre) + '</div><div class="s2">Valable jusqu’au ' + esc(fin.jour) + ' ' + esc(fin.jjmm) + '</div></div></div>'
      + '<div class="pile"><button class="bouton geant" data-act="a-confirmer">' + ico('envoyer') + (prevu ? 'Oui, programmer' : 'Oui, envoyer à ' + nb + ' client' + (nb > 1 ? 's' : '')) + '</button>'
      + '<button class="bouton-texte discret" data-act="fermer-feuille">Pas maintenant</button></div>');
  };

  function feuilleEnvoi(nb) {
    PP.etat.feuilleBloquee = true;
    PP.feuille('<div class="attente"><span class="tourne" aria-hidden="true"></span><span class="t">Envoi en cours…</span></div><div class="progres"><i></i></div>'
      + '<p class="s">Cela prend jusqu’à une minute. Restez sur cet écran : nous vérifions ensuite que les ' + nb + ' e-mails sont bien partis.</p>'
      + '<p class="s">La même affiche ne pourra pas repartir avant 12 heures.</p>');
  }
  function feuilleFin(titre, texte, ok) {
    PP.etat.feuilleBloquee = false;
    PP.feuille('<div class="t">' + titre + '</div><p class="s">' + texte + '</p><div class="pile"><button class="bouton geant' + (ok ? '' : ' second') + '" data-act="a-fin">Fermer</button></div>');
  }
  PP.actions['a-fin'] = function () { PP.fermerFeuille(); A.charge = false; etat.nb = null; etat.campagnes = null; refaire(); };

  PP.actions['a-confirmer'] = function () {
    var emp = empreinte(), nb = etat.nb || 0;
    if (mk.quand === 'demain') {
      PP.etat.feuilleBloquee = true;
      PP.feuille('<div class="attente"><span class="tourne" aria-hidden="true"></span><span class="t">Programmation…</span></div><div class="progres"><i></i></div>');
      var rec = envois()[emp];
      var idP = (rec && rec.statut === 'creation-prevu' && rec.id) || nouvelId();
      memoriser(emp, { id: idP, statut: 'creation-prevu' });
      return charge('prevu', demain()).then(function (c) { c.id = idP; return PP.appel('mk_create', c); }).then(function (d) {
        if (d.status === 'ok') { memoriser(emp, { id: d.id || idP, statut: 'prevu', date: demain() }); return feuilleFin('C’est programmé', 'L’affiche partira demain matin.', true); }
        feuilleFin('Programmation non confirmée', d.reseau ? 'Le réseau n’a pas répondu. Réessayez : cette affiche ne sera programmée qu’une fois.' : 'Réessayez dans un instant : cette affiche ne sera programmée qu’une fois.');
      });
    }
    feuilleEnvoi(nb);
    obtenirCampagne(emp).then(function (id) { lancer(id, emp); }).catch(function (e) {
      feuilleFin('Pas envoyée', e && e.message === 'reseau' ? 'Le serveur tarde à répondre. Réessayez : cette affiche ne sera créée qu’une fois.' : 'L’affiche n’a pas pu être préparée. Réessayez dans un instant.');
    });
  };
  function confirme(emp, id, nb, deja) {
    nb = Number(nb) || 0;
    memoriser(emp, { id: id, statut: 'envoye', nb: nb, envoyee: Date.now() });
    feuilleFin(deja ? 'Déjà envoyée' : 'C’est parti', (deja ? 'Cette affiche était déjà partie à ' : 'Envoyée à ') + nb + ' client' + (nb > 1 ? 's' : '') + '.', true);
  }
  function lancer(id, emp) {
    PP.appel('mk_send', { id: id }).then(function (r) {
      if (r.status === 'ok' || r.status === 'already') return confirme(emp, id, r.status === 'ok' ? r.nb_envoyes : r.nb, r.status === 'already');
      if (r.status === 'quota') return feuilleFin('Pas envoyée aujourd’hui', 'Trop d’e-mails sont déjà partis aujourd’hui. Réessayez demain.');
      if (r.status === 'unknown') { memoriser(emp, { id: null, statut: 'perdu' }); return feuilleFin('Pas envoyée', 'L’affiche n’a pas été retrouvée. Réessayez.'); }
      if (r.reseau) return verifier(id, emp, Date.now() + VERIF_MS);   // pas de réponse ≠ pas d'envoi
      feuilleFin('Pas envoyée', r.code === 'rejouer' ? 'Appuyez de nouveau sur « Envoyer » : elle ne partira qu’une fois.' : 'Réessayez dans un instant : elle ne partira qu’une fois.');
    });
  }
  function verifier(id, emp, limite) {
    PP.appel('mk_list', {}).then(function (d) {
      var c = ((d && d.campagnes) || []).filter(function (x) { return x.id === id; })[0];
      if (c && c.statut === 'envoye') return confirme(emp, id, c.nb, false);
      if (Date.now() < limite) return setTimeout(function () { verifier(id, emp, limite); }, 5000);
      feuilleFin('Envoi non confirmé', 'Regardez « Derniers envois » dans une minute : si l’affiche n’y est pas marquée « Envoyé », réessayez. Elle ne partira qu’une fois.');
    });
  }
  PP.actions['a-test'] = function (el) {
    var emp = empreinte();
    el.disabled = true; var html = el.innerHTML; el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Envoi de l’aperçu…';
    obtenirCampagne(emp).then(function (id) { return PP.appel('mk_test', { id: id }); }).then(function (d) {
      el.disabled = false; el.innerHTML = html;
      if (d.status === 'ok') return info('<div class="message-ok" role="status">' + ico('check') + '<span>Aperçu envoyé à votre adresse e-mail.</span></div>');
      if (d.status === 'unknown') memoriser(emp, { id: null, statut: 'perdu' });
      info('<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Aperçu pas envoyé.</b>' + (d.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Réessayez dans un instant.') + '</div></div>');
    }).catch(function () {
      el.disabled = false; el.innerHTML = html;
      info('<div class="message-erreur" role="alert">' + ico('alerte') + '<div><b>Aperçu pas envoyé.</b>Le serveur tarde à répondre. Réessayez : cette affiche ne sera créée qu’une fois.</div></div>');
    });
  };
  A.oublier = function () { etat = { offre: null, nb: null, campagnes: null }; A.charge = false; };
})();
