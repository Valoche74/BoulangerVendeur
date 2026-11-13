/* Perify Pro — le réseau (13/11/2026).
   Un seul point de passage pour parler au serveur : POST, corps JSON envoyé en text/plain (pas de pré-vol CORS),
   jamais rien de secret dans l'adresse (le jeton de session voyage dans le corps). Les réponses du serveur sont
   toujours du JSON en HTTP 200 ; une coupure, un délai dépassé ou une réponse illisible deviennent une réponse
   « réseau » : l'écran dit « Pas de réseau », jamais un faux succès. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  PP.API = 'https://api.perify.app';

  var DELAIS = { mk_send: 60000, mk_create: 40000, export_excel: 40000 };
  /* Ce qui peut être relancé sans risque après « session expirée » (lectures). Jamais ce qui consomme ou envoie :
     use, remis, fid_addpoints, fid_undo, mk_send, wallet_offre… — on demande alors d'appuyer de nouveau. */
  var REJOUABLES = ['check', 'stats', 'dashboard', 'a_remettre', 'fid_identify', 'fid_client', 'mesures', 'catalogue',
    'mk_list', 'mk_count', 'wallet_offre_etat', 'acces_appareils', 'ag_list'];
  var SANS_COMMERCE = ['acces_relier', 'acces_ouvrir'];

  /** L'adresse du serveur de la boutique : celle que le serveur a donnée au moment du lien, si elle est bien chez
      Perify ; sinon l'adresse construite à partir de la clé de la boutique. */
  function adresse(action) {
    if (SANS_COMMERCE.indexOf(action) >= 0) return PP.API + '/exec';
    var id = PP.etat.identite || {};
    var s = String(id.serveur || '');
    if (/^https:\/\/api\.perify\.app\/[a-z0-9-]+\/exec$/.test(s)) return s;
    return PP.API + '/' + encodeURIComponent(PP.etat.cle || '') + '/exec';
  }

  function brut(action, donnees, opt) {
    return new Promise(function (resoudre) {
      var corps = { action: action };
      for (var k in donnees) if (Object.prototype.hasOwnProperty.call(donnees, k) && donnees[k] !== undefined) corps[k] = donnees[k];
      if (SANS_COMMERCE.indexOf(action) < 0 && !opt.sansSession) {
        var s = PP.acces && PP.acces.session ? PP.acces.session() : null;
        if (s && s.jeton) corps.session = s.jeton;
      }
      var x;
      try { x = new XMLHttpRequest(); } catch (e) { resoudre({ status: 'error', code: 'reseau', reseau: true }); return; }
      x.open('POST', adresse(action), true);
      x.timeout = opt.delai || DELAIS[action] || 15000;
      if (opt.fichier) x.responseType = 'blob';
      try { x.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8'); } catch (e) {}
      x.onload = function () {
        if (opt.fichier) {
          var type = x.getResponseHeader('Content-Type') || '';
          if (type.indexOf('spreadsheetml') >= 0 && x.response) {
            var cd = x.getResponseHeader('Content-Disposition') || '';
            resoudre({ status: 'ok', fichier: x.response, nom: (cd.match(/filename="([^"]+)"/) || [])[1] || 'fichier-client.xlsx' });
            return;
          }
          var lecteur = new FileReader();
          lecteur.onload = function () { try { resoudre(JSON.parse(String(lecteur.result))); } catch (e) { resoudre({ status: 'error', code: 'illisible', reseau: true }); } };
          lecteur.onerror = function () { resoudre({ status: 'error', code: 'illisible', reseau: true }); };
          try { lecteur.readAsText(x.response); } catch (e) { resoudre({ status: 'error', code: 'illisible', reseau: true }); }
          return;
        }
        var r;
        try { r = JSON.parse(x.responseText); } catch (e) { r = null; }
        if (!r || typeof r !== 'object') { resoudre({ status: 'error', code: 'illisible', reseau: true }); return; }
        if (r.code === 'acces_indisponible') r.reseau = true;
        resoudre(r);
      };
      x.onerror = function () { resoudre({ status: 'error', code: 'reseau', reseau: true }); };
      x.ontimeout = function () { resoudre({ status: 'error', code: 'delai', reseau: true }); };
      try { x.send(JSON.stringify(corps)); } catch (e) { resoudre({ status: 'error', code: 'reseau', reseau: true }); }
    });
  }

  /** appel(action, données, { delai, fichier }) → Promise d'une réponse (jamais rejetée). */
  PP.appel = function (action, donnees, opt) {
    opt = opt || {};
    donnees = donnees || {};
    return brut(action, donnees, opt).then(function (r) {
      PP.etat.reseauOk = !r.reseau;
      if (PP.majPastille) PP.majPastille();
      if (r.code === 'commerce_arrete' && PP.acces && PP.acces.marquerArrete) PP.acces.marquerArrete(r);
      if (r.code === 'session_expiree' && SANS_COMMERCE.indexOf(action) < 0 && !opt.dejaRejoue && PP.acces && PP.acces.redemander) {
        return PP.acces.redemander().then(function (ok) {
          if (!ok) return { status: 'error', code: 'session_expiree' };
          if (REJOUABLES.indexOf(action) >= 0) return PP.appel(action, donnees, { delai: opt.delai, fichier: opt.fichier, dejaRejoue: true });
          return { status: 'error', code: 'rejouer' };   // l'écran demande d'appuyer de nouveau
        });
      }
      return r;
    });
  };

  /* Succès = réponse explicite du serveur (correction du 12/11, gardée) : un cadeau n'est « remis » que si le serveur
     répond « marked ». Une coupure, un refus, un délai : ce n'est PAS un succès. */
  PP.reseau = {
    REJOUABLES: REJOUABLES,
    adresse: adresse,
    marque: function (r) { return !!r && r.status === 'marked'; },
    ok: function (r) { return !!r && r.status === 'ok'; }
  };
})();
