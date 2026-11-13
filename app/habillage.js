/* Perify Pro — la couleur de la boutique (13/11/2026).
   Les sept jetons par métier sont une COPIE EXACTE du tableau HABILLAGES du bloc PERIFY_HABILLAGE du site client
   (card.html) : la boutique a dans son espace la couleur que ses clients voient sur leur carte. Un essai vérifie que
   les deux tableaux restent identiques au caractère près. Seule l'apparence en dépend : un métier inconnu prend
   l'orange Perify, jamais la couleur d'un autre commerce. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};

  /* HABILLAGES:debut */
  var HABILLAGES = { perify:{marque:'#FF6B2C',surMarque:'#1B1F3B',marqueClair:'#FFEDE4',marqueEncre:'#C2410C',marqueProfond:'#1B1F3B',surProfond:'#FFFFFF',profondLibelle:'#FF6B2C',bandeau:''}, boulangerie:{marque:'#3A7A1E',surMarque:'#FFFFFF',marqueClair:'#EBF2E9',marqueEncre:'#3A7A1E',marqueProfond:'#3E7A1A',surProfond:'#FFFFFF',profondLibelle:'#FBEECF',bandeau:'assets/boulangerie/bandeau.webp'}, baps:{marque:'#A04E27',surMarque:'#FFFFFF',marqueClair:'#F6EAE3',marqueEncre:'#A04E27',marqueProfond:'#581816',surProfond:'#FFFFFF',profondLibelle:'#F3B068',bandeau:'assets/baps/bandeau.webp'}, fleuriste:{marque:'#BC5185',surMarque:'#FFFFFF',marqueClair:'#F8EEF3',marqueEncre:'#AD4B7A',marqueProfond:'#6E1A44',surProfond:'#FFFFFF',profondLibelle:'#F4B6D2',bandeau:''}, pizzeria:{marque:'#C8442E',surMarque:'#FFFFFF',marqueClair:'#FAECEA',marqueEncre:'#C0412C',marqueProfond:'#702014',surProfond:'#FFFFFF',profondLibelle:'#F2A07E',bandeau:''}, vape:{marque:'#6D5AE0',surMarque:'#FFFFFF',marqueClair:'#F0EFFC',marqueEncre:'#6B58DC',marqueProfond:'#2C2366',surProfond:'#FFFFFF',profondLibelle:'#B6ABFF',bandeau:''}, restaurant:{marque:'#9A3F4C',surMarque:'#FFFFFF',marqueClair:'#F5ECED',marqueEncre:'#9A3F4C',marqueProfond:'#4E1C23',surProfond:'#FFFFFF',profondLibelle:'#D78F99',bandeau:''}, primeur:{marque:'#E0892E',surMarque:'#1B1F3B',marqueClair:'#FCF3EA',marqueEncre:'#9D6020',marqueProfond:'#703E0C',surProfond:'#FFFFFF',profondLibelle:'#F8C87C',bandeau:''} };
  /* HABILLAGES:fin */
  var JETONS = { marque: '--marque', surMarque: '--sur-marque', marqueClair: '--marque-clair', marqueEncre: '--marque-encre', marqueProfond: '--marque-profond', surProfond: '--sur-profond', profondLibelle: '--profond-libelle' };

  /* Les couleurs du pass Wallet (fond, libellés), recopiées de wallet-service/lib/theme.js comme dans l'ancien espace
     (PASS_THEMES) : l'aperçu du message ne montre que ce que la vraie carte affiche. */
  var PASS = {
    boulangerie: { bg: [62, 122, 26], label: 'rgb(245,208,122)' },
    fleuriste: { bg: [110, 26, 68], label: 'rgb(244,182,210)' },
    pizzeria: { bg: [112, 32, 20], label: 'rgb(242,160,126)' },
    vape: { bg: [44, 35, 102], label: 'rgb(182,171,255)' },
    restaurant: { bg: [78, 28, 35], label: 'rgb(215,143,153)' },
    primeur: { bg: [112, 62, 12], label: 'rgb(248,200,124)' },
    baps: { bg: [88, 24, 22], label: 'rgb(243,176,104)' }
  };
  /* Les métiers dont la carte porte une bannière, servie par le service Wallet (jamais copiée ici). */
  var BANNIERE = { boulangerie: true, baps: true };

  function lum(hex) {
    var h = String(hex).replace('#', '');
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  var SUCCES = '#1A7F37', REFUS = '#B42318';
  /* « Pas enregistré » (R4) a son fond à lui : la nuit Perify (son rose pâle d'avant se confondait
     avec la teinte claire de « Déjà validé », à 1,03:1). Gardé ici pour que la garde le compare aussi. */
  var PAS_ENREGISTRE = '#1B1F3B';

  /** La couleur de « Déjà validé par le client » : la teinte claire du commerce, sauf si elle se confondait avec le
      vert, le rouge ou la nuit de « Pas enregistré » (moins de 3:1 entre les deux fonds) ; alors une surface blanche. */
  function fondDejaValide(h) {
    return (contraste(h.marqueClair, SUCCES) >= 3 && contraste(h.marqueClair, REFUS) >= 3 && contraste(h.marqueClair, PAS_ENREGISTRE) >= 3) ? h.marqueClair : '#FFFFFF';
  }

  PP.habillage = {
    TABLE: HABILLAGES,
    connu: function (m) { return Object.prototype.hasOwnProperty.call(HABILLAGES, m); },
    appliquer: function (metier) {
      var cle = PP.habillage.connu(metier) ? metier : 'perify';
      var h = HABILLAGES[cle], r = document.documentElement;
      for (var k in JETONS) r.style.setProperty(JETONS[k], h[k]);
      r.style.setProperty('--deja-fond', fondDejaValide(h));
      var p = PASS[cle];
      if (p) { r.style.setProperty('--pass-fond', 'rgb(' + p.bg.join(',') + ')'); r.style.setProperty('--pass-libelle', p.label); }
      else { r.style.removeProperty('--pass-fond'); r.style.removeProperty('--pass-libelle'); }
      r.setAttribute('data-habillage', cle);
      return cle;
    },
    banniere: function (metier) { return BANNIERE[metier] ? 'https://wallet-service-chi.vercel.app/api/bandeau?type=' + encodeURIComponent(metier) : ''; },
    contraste: contraste,
    fondDejaValide: fondDejaValide,
    FOND_PAS_ENREGISTRE: PAS_ENREGISTRE
  };
})();
