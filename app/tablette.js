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
    var dernierTampon = j.filter(function (l) { return l.type === 'tampon' && !l.annule; })[0];
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
    PP.appel('fid_undo', { card_id: l.card_id }).then(function (r) {
      if (r.status === 'ok') {
        var j2 = PP.journal.lire();
        j2.forEach(function (x) { if (x.ts === ts) { x.annule = true; x.t = x.t + ' (annulé)'; x.ok = false; } });
        PP.stock.ecrire(PP.journal.cle(), j2);
        PP.toast('Tampon annulé.');
        T.majJournal();
        return;
      }
      el.disabled = false; el.innerHTML = ico('annuler') + 'Annuler le dernier tampon';
      PP.toast(r.reseau ? 'Pas de réseau : rien n’est annulé.' : 'Annulation refusée.', true);
    });
  };
})();
