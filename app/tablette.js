/* Perify Pro — la tablette de comptoir (13/11/2026).
   La même appli, en grand (900 px de large et plus) : trois colonnes au comptoir — Scanner (et « Sans contact :
   prêt » si le lecteur est allumé), le pavé toujours ouvert, et « Sur cette tablette, aujourd'hui » (ce qui a été
   fait sur cet appareil, gardé seulement pour la journée). Le résultat d'un code s'affiche dans la colonne de
   droite : le pavé reste visible. Tampons seulement : ni points en euros, ni niveaux. */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var ico = PP.ico, esc = PP.esc;
  var T = PP.tablette = {};

  T.journalHtml = function () {
    var j = PP.journal.lire();
    /* « Annuler le dernier tampon » : seulement quand la DERNIÈRE ligne du journal est ce tampon. Avant, le bouton passait,
       après une annulation, au tampon d'avant (souvent la carte d'un autre client). Le serveur, lui, ne l'annule que si
       c'est encore la dernière opération de la carte (PP.annulerTampon). */
    var dernierTampon = (j[0] && j[0].type === 'tampon' && !j[0].annule && j[0].annulable !== false && j[0].card_id) ? j[0] : null;
    var lignes = j.slice(0, 8).map(function (l) {
      return '<div class="rangee"><span class="heure">' + esc(l.h || (l.ts ? PP.date.heure(l.ts) : '')) + '</span><div><div class="t">' + esc(l.t) + '</div><div class="s">' + esc(l.s || '') + '</div></div>'
        + '<span class="etiquette ' + (l.ok ? 'ok' : 'ko') + '" aria-label="' + (l.ok ? 'Fait' : 'Refusé') + '">' + ico(l.ok ? 'check' : 'x') + '</span></div>';
    }).join('');
    return '<section class="journal" id="t-journal" aria-label="Sur cette tablette, aujourd’hui"><h2 class="jt">Sur cette tablette, aujourd’hui</h2><div class="jst">Ce que vous venez de faire</div>'
      + '<div class="lignes">' + (lignes || '<div class="vide">Rien pour l’instant. Les cadeaux remis et les tampons ajoutés s’affichent ici.</div>') + '</div>'
      + (dernierTampon ? '<div class="bas"><button class="bouton second" data-act="t-annuler" data-ts="' + dernierTampon.ts + '">' + ico('annuler') + 'Annuler le dernier tampon</button></div>' : '')
      + '</section>';
  };
  T.majJournal = function () {
    var j = document.getElementById('t-journal');
    if (j) j.outerHTML = T.journalHtml();
  };
  PP.actions['t-annuler'] = function (el) {
    var ts = Number(el.getAttribute('data-ts'));
    var j = PP.journal.lire();
    var l = j.filter(function (x) { return x.ts === ts; })[0];
    if (!l || !l.card_id) return;
    el.disabled = true; el.innerHTML = '<span class="tourne" aria-hidden="true"></span>Annulation…';
    PP.annulerTampon(l.card_id, Number(l.n) || 1).then(function (a) {
      if (a.fait || a.autre || a.bouge) {
        var j2 = PP.journal.lire();
        j2.forEach(function (x) {
          if (x.ts !== ts) return;
          if (a.fait) { x.annule = true; x.t = x.t + ' (annulé)'; x.ok = false; }
          else x.annulable = false;   // la carte a bougé depuis : ce tampon ne s'annule plus d'ici
        });
        PP.stock.ecrire(PP.journal.cle(), j2);
        PP.toast(a.fait ? 'Tampon annulé.' : a.autre ? 'Une autre opération a été annulée : vérifiez la carte.' : 'Rien n’est annulé : la carte a changé depuis. Ouvrez-la pour corriger.', !a.fait);
        T.majJournal();
        return;
      }
      el.disabled = false; el.innerHTML = ico('annuler') + 'Annuler le dernier tampon';
      PP.toast(a.r.reseau ? 'Pas de réseau : rien n’est annulé.' : 'Annulation refusée.', true);
    });
  };
})();
