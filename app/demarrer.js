/* Perify Pro — le démarrage et les adresses des écrans (13/11/2026).
   #/comptoir, #/chiffres, #/annonces, #/plus et leurs sous-écrans. Rien de secret dans une adresse : la carte d'un
   client reste en mémoire, jamais dans l'adresse. Sans session : seuls le choix de la boutique et le déverrouillage. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};

  var ROUTES = {
    'comptoir': function () { PP.comptoir.ecran(); },
    'a-remettre': function () { PP.comptoir.ecranARemettre(); },
    'carte': function () { PP.comptoir.ecranCarte(); },
    'inscrire': function () { PP.comptoir.ecranInscrire(); },
    'chiffres': function () { PP.chiffres.ecran(); },
    'annonces': function () { PP.annonces.ecran(); },
    'annonces/message': function () { PP.annonces.ecranMessage(); },
    'annonces/affiche': function () { PP.annonces.ecranAffiche(); },
    'plus': function () { PP.plus.ecran(); },
    'plus/telephones': function () { PP.plus.ecranTelephones(); },
    'plus/relier': function () { PP.plus.ecranRelier(); },
    'plus/code': function () { PP.plus.ecranCode(1); },
    'plus/boutiques': function () { PP.plus.ecranBoutiques(); },
    'plus/installer': function () { PP.plus.ecranInstaller(); },
    'plus/calculateur': function () { PP.calculateur.ecran(); },
    'plus/anti-gaspi': function () { PP.plus.ecranAntiGaspi(); },
    'plus/lecteur': function () { PP.plus.ecranLecteur(); }
  };
  var SANS_SESSION = ['plus/boutiques'];

  PP.route = function () {
    PP.fermerFeuille();
    var r = String(location.hash || '').replace(/^#\/?/, '');
    if (!ROUTES[r]) r = 'comptoir';
    if (!PP.etat.cle) {
      var l = PP.acces.boutiques();
      if (!l.length || !PP.acces.choisir(l[0].cle)) return PP.acces.ecranCodeAcces();
    }
    if (!PP.acces.session() && SANS_SESSION.indexOf(r) < 0) return PP.acces.verrouiller();
    try { ROUTES[r](); } catch (e) { if (window.console) console.error(e); PP.ecranSouci(); }
  };
  window.addEventListener('hashchange', function () {
    // Pendant la liaison ou le déverrouillage, l'adresse ne fait rien changer.
    var cible = String(location.hash || '').replace(/^#\/?/, '');
    if (/^(E|V)/.test(PP.etat.ecran || '') && PP.etat.ecran !== 'V1' && SANS_SESSION.indexOf(cible) < 0) return;
    PP.route();
  });

  function demarrer() {
    try { PP.acces.demarrer(); }
    catch (e) { if (window.console) console.error(e); PP.ecranSouci(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
