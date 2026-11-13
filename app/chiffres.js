/* Perify Pro — les chiffres (13/11/2026).
   Une phrase en tête (« Ces 7 jours, 30 clients sont venus 50 fois. »), puis les comparaisons en mots : « 10 de
   plus », « 5 de moins », « Comme avant » — jamais un pourcentage. Rien n'est inventé : sans période d'avant
   complète, aucune comparaison ne s'affiche ; un compteur absent vaut zéro. Les cartes d'essai ne comptent pas
   (c'est le serveur qui les écarte). Écrans H1 et H2. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var ico = PP.ico, esc = PP.esc;
  var H = PP.chiffres = { periode: 7, stats: null, coupons: null, erreur: false, majLe: 0, tous: false, enCours: false };

  function charger() {
    if (H.enCours) return;
    H.enCours = true; H.erreur = false;
    var reste = 2, statsOk = null;
    var fini = function () {
      if (--reste) return;
      H.enCours = false;
      H.stats = statsOk; H.erreur = !statsOk; H.majLe = Date.now();
      if (PP.etat.ecran === 'H1' || PP.etat.ecran === 'H2') H.ecran();
    };
    PP.appel('stats', { jours: H.periode }).then(function (r) { statsOk = r && r.status === 'ok' && r.actuel ? r : null; fini(); });
    PP.appel('dashboard', {}).then(function (r) { H.coupons = r && r.status === 'ok' && Array.isArray(r.coupons) ? r.coupons : (H.coupons || []); fini(); });
  }

  function phrase(s) {
    var a = s.actuel || {}, c = Number(a.clients_actifs) || 0, p = Number(a.passages) || 0;
    var debut = s.fenetre_jours ? 'Ces ' + s.fenetre_jours + ' jours, ' : 'Depuis le début, ';
    if (!p) return debut + 'aucun client n’est encore venu avec sa carte.';
    return debut + '<em>' + c + ' client' + (c > 1 ? 's' : '') + '</em> ' + (c > 1 ? 'sont venus' : 'est venu') + ' <em>' + p + ' fois</em>.';
  }
  function tendance(val, prec) {
    if (prec === null || prec === undefined) return '';
    var d = (Number(val) || 0) - (Number(prec) || 0);
    if (d > 0) return '<div class="tend hausse">' + ico('haut') + '<span>' + d + ' de plus</span></div>';
    if (d < 0) return '<div class="tend baisse">' + ico('bas') + '<span>' + (-d) + ' de moins</span></div>';
    return '<div class="tend"><span>Comme avant</span></div>';
  }
  function kpi(val, lib, prec) {
    return '<div class="kpi"><div class="n">' + PP.nombre(val) + '</div><div class="l">' + lib + '</div>' + tendance(val, prec) + '</div>';
  }
  function rangee(t, v, s) {
    return '<div class="rangee sans-icone"><div><div class="t">' + t + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div><span class="v chiffres">' + v + '</span></div>';
  }
  /** La courbe commence au réglage « depuis » quand il existe : les jours d'avant ne comptent pas (pas de faux zéros). */
  function serieDepuis(serie, r) {
    if (!Array.isArray(serie)) return [];
    return (r && r.depuis) ? serie.filter(function (p) { return String(p.jour) >= r.depuis; }) : serie;
  }
  function graphe(serie) {
    var n = serie.length;
    if (!n) return '';
    var W = 600, Ht = 150, max = Math.max(1, Math.max.apply(null, serie.map(function (p) { return Number(p.passages) || 0; })));
    var pas = W / n, lb = Math.max(2, pas * 0.62);
    var barres = serie.map(function (p, i) {
      var h = Math.round((Number(p.passages) || 0) / max * (Ht - 12));
      return '<rect class="barre" x="' + (i * pas + (pas - lb) / 2).toFixed(1) + '" y="' + (Ht - h) + '" width="' + lb.toFixed(1) + '" height="' + Math.max(h, 0) + '" rx="' + Math.min(6, lb / 3).toFixed(1) + '"/>';
    }).join('');
    var lignes = [0.5, 1].map(function (f) { var y = Math.round(Ht - f * (Ht - 12)) - 0.5; return '<line class="ligne-grille" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>'; }).join('');
    var milieu = serie[Math.floor(n / 2)].jour;
    return '<div class="graphe"><div class="max">Jusqu’à ' + max + ' passage' + (max > 1 ? 's' : '') + ' par jour</div><svg viewBox="0 0 ' + W + ' ' + Ht + '" preserveAspectRatio="none" role="img" aria-label="Passages par jour">' + lignes + barres + '</svg>'
      + '<div class="jours"><span>' + PP.date.jjmmIso(serie[0].jour) + '</span><span>' + PP.date.jjmmIso(milieu) + '</span><span>' + PP.date.jjmmIso(serie[n - 1].jour) + '</span></div></div>';
  }
  function trierCoupons(l) {
    var cle = function (c) { var m = String(c.date || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + m[2] + m[1] : ''; };
    return l.map(function (c, i) { return { c: c, i: i, k: cle(c) }; }).sort(function (a, b) { return a.k === b.k ? a.i - b.i : (a.k < b.k ? 1 : -1); }).map(function (x) { return x.c; });
  }
  function ligneCoupon(c) {
    var s = c.statut === 'Utilisé' ? ['Remis', 'ok'] : c.statut === 'Expiré' ? ['Expiré', 'gris'] : ['À récupérer', 'marque'];
    var photo = PP.photoCadeau(c.gain);
    var date = String(c.date || '').match(/(\d{2}\/\d{2})/);
    return '<div class="rangee"><div class="vignette">' + (photo ? '<img src="' + esc(photo) + '" alt="">' : ico('cadeau')) + '</div><div><div class="t">' + esc(c.gain || 'Cadeau') + (c.prenom ? ' · ' + esc(c.prenom) : '') + '</div>'
      + '<div class="s">' + (date ? 'Gagné le ' + date[1] : '') + '</div></div><span class="etiquette ' + s[1] + '">' + s[0] + '</span></div>';
  }

  H.ecran = function () {
    var segments = '<div class="segments" role="group" aria-label="Période">' + [[7, '7 jours'], [30, '30 jours'], [90, '90 jours'], [0, 'Tout']].map(function (x) {
      return '<button class="segment" data-act="h-periode" data-v="' + x[0] + '" aria-pressed="' + (H.periode === x[0]) + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    var tete = '<h1 class="grand-titre">Chiffres</h1>' + segments;
    if (!H.stats) {
      if (H.erreur) {
        PP.montrer(PP.cadre('chiffres', tete + '<div class="surface mt-16"><div class="message-erreur">' + ico('alerte') + '<div><b>Les chiffres n’ont pas pu être chargés.</b>' + (PP.etat.reseauOk ? 'Réessayez dans un instant.' : 'Le réseau n’a pas répondu.') + '</div></div>'
          + '<button class="bouton second mt-16" data-act="h-actualiser">' + ico('actualiser') + 'Réessayer</button></div>'), { nom: 'H2', titre: 'Chiffres' });
        return;
      }
      PP.montrer(PP.cadre('chiffres', tete + '<div class="chargement"><span class="tourne" aria-hidden="true"></span>Chargement des chiffres…</div>'), { nom: 'H2', titre: 'Chiffres' });
      charger();
      return;
    }
    var s = H.stats, a = s.actuel || {}, p = s.precedent || null, pr = function (k) { return p ? p[k] : null; };
    var vide = !(Number(a.passages) || 0) && !(Number(s.clients_inscrits) || 0);
    var note = [];
    if (s.fenetre_jours && p) note.push('Comparés aux ' + s.fenetre_jours + ' jours d’avant.');
    if (s.fenetre_jours && s.jours_observes && s.jours_observes < s.fenetre_jours) note.push('Le programme n’a que ' + s.jours_observes + ' jour' + (s.jours_observes > 1 ? 's' : '') + ' d’activité.');
    if (!s.fenetre_jours && s.clients_inscrits) note.push(s.clients_inscrits + ' client' + (s.clients_inscrits > 1 ? 's ont' : ' a') + ' une carte.');
    var cad = s.cadeaux || {}, top = (cad.top || [])[0];
    var coupons = trierCoupons(H.coupons || []);
    var montres = coupons.slice(0, H.tous ? 12 : 4);
    var corps = tete
      + (vide ? '<div class="surface mt-16"><div class="boutique"><div class="vignette">' + ico('chiffres') + '</div><div><div class="n">Pas encore de passage</div><div class="s">Les chiffres arrivent avec les premiers clients.</div></div></div></div>' : '')
      + (vide ? '' : '<p class="phrase">' + phrase(s) + '</p>') + (note.length ? '<p class="note">' + note.join(' ') + '</p>' : '')
      + '<div class="kpis">' + kpi(a.passages, 'Passages', pr('passages')) + kpi(a.clients_actifs, 'Clients venus', pr('clients_actifs')) + kpi(a.scans_qr, 'Scans du QR', pr('scans_qr')) + kpi(a.vues_carte, 'Cartes ouvertes', pr('vues_carte')) + '</div>'
      + '<div class="deux-colonnes"><div>'
      + '<h2 class="titre-section">Passages par jour</h2><div class="surface serree">' + (graphe(serieDepuis(s.serie, s.reglage)) || '<p class="note">Pas encore de passage sur la période.</p>') + '</div>'
      + '<h2 class="titre-section">Le programme</h2><div class="liste">' + rangee('Nouvelles cartes', PP.nombre(a.nouvelles_cartes)) + rangee('Ajoutées au Wallet', PP.nombre(a.cartes_wallet)) + rangee('Cadeaux récupérés', PP.nombre(a.cadeaux_reclames)) + rangee('Tampons donnés', PP.nombre(a.tampons)) + '</div>'
      + '<h2 class="titre-section">D’où viennent les tampons</h2><div class="liste">' + rangee('Passages au comptoir', PP.nombre(a.passages)) + rangee('Avis', PP.nombre(a.avis)) + rangee('Réseaux sociaux', PP.nombre(a.reseaux)) + rangee('Inscriptions e-mail', PP.nombre(a.emails)) + '</div>'
      + '</div><div>'
      + '<h2 class="titre-section">Les cadeaux</h2><div class="liste">' + rangee('À récupérer', PP.nombre(cad.en_attente), 'Gagnés, pas encore remis') + rangee('Expirés', PP.nombre(cad.expires), 'Plus valables')
      + (top ? rangee('Le plus gagné', esc(top.gain), top.n + ' fois sur la période') : '') + '</div>'
      + '<h2 class="titre-section">Derniers codes cadeaux</h2>' + (montres.length ? '<div class="liste">' + montres.map(ligneCoupon).join('') + '</div>'
        + (coupons.length > 4 && !H.tous ? '<button class="bouton-texte mt-8" data-act="h-tous">Voir les ' + Math.min(12, coupons.length) + ' derniers</button>' : '') : '<p class="note">Aucun code cadeau pour le moment.</p>')
      + '<h2 class="titre-section">Pour aller plus loin</h2><div class="liste">'
      + '<button class="rangee" data-act="exporter"><div class="vignette icone">' + ico('telecharger') + '</div><div><div class="t">Votre fichier client</div><div class="s" data-export-msg>Un tableau Excel de vos clients</div></div><span class="chevron">' + ico('droite') + '</span></button>'
      + '<button class="rangee" data-act="aller" data-route="plus/calculateur"><div class="vignette icone">' + ico('calcul') + '</div><div><div class="t">Est-ce que ça me rapporte ?</div><div class="s">Le calculateur, en touchant des choix</div></div><span class="chevron">' + ico('droite') + '</span></button></div>'
      + '</div></div>'
      + '<p class="note centre mt-20">Mis à jour à ' + PP.date.heure(H.majLe || Date.now()) + '.' + (s.reglage ? ' Les cartes d’essai ne sont pas comptées.' : '') + '</p>'
      + '<button class="bouton second mt-12" data-act="h-actualiser">' + ico('actualiser') + 'Actualiser</button>';
    PP.montrer(PP.cadre('chiffres', corps), { nom: 'H1', titre: 'Chiffres', garderDefilement: H.garder });
    H.garder = false;
  };
  PP.actions['h-periode'] = function (el) { H.periode = Number(el.getAttribute('data-v')) || 0; H.stats = null; H.tous = false; H.ecran(); };
  PP.actions['h-actualiser'] = function () { H.stats = null; H.erreur = false; H.ecran(); };
  PP.actions['h-tous'] = function () { H.tous = true; H.garder = true; H.ecran(); };

  /* Le fichier client (.xlsx) : article 14 du contrat, ouvert même si le programme est arrêté. */
  var exportEnCours = false;
  PP.actions.exporter = function (el) {
    if (exportEnCours) return;
    var msg = el.querySelector('[data-export-msg]');
    var dire = function (t) { if (msg) msg.textContent = t; };
    exportEnCours = true;
    dire('Préparation du fichier…');
    PP.appel('export_excel', {}, { fichier: true }).then(function (r) {
      exportEnCours = false;
      if (r.status === 'ok' && r.fichier) {
        try {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(r.fichier);
          a.download = r.nom || 'fichier-client.xlsx';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
        } catch (e) {}
        dire('Fichier prêt : ' + (r.nom || 'fichier-client.xlsx'));
        return;
      }
      dire(r.reseau ? 'Le réseau n’a pas répondu. Réessayez.' : 'Export impossible pour le moment. Réessayez.');
    });
  };
  H.oublier = function () { H.stats = null; H.coupons = null; H.erreur = false; };
})();
