/* Perify Pro — le pavé maison (13/11/2026).
   4 cases masquées pour le code à 4 chiffres (comme le code d'un téléphone), 6 cases visibles en deux groupes pour
   le code cadeau du client. La vérification part toute seule au dernier chiffre : rien à valider.
   Le clavier d'un ordinateur ou d'une tablette marche aussi (chiffres, retour arrière, Échap). */
(function () {
  'use strict';
  var PP = window.PP = window.PP || {};
  var paves = {};
  var compteur = 0;

  /** new PP.Pave({ longueur: 4|6, masque, libelle, quandComplet(code, pave), serre }) */
  function Pave(opt) {
    this.id = 'pave' + (++compteur);
    this.longueur = opt.longueur || 6;
    this.masque = !!opt.masque;
    this.libelle = opt.libelle || (this.longueur === 4 ? 'Code à 4 chiffres' : 'Code cadeau');
    this.quandComplet = opt.quandComplet || function () {};
    this.code = opt.code || '';
    this.inactif = !!opt.inactif;
    this.occupe = false;
    this.serre = !!opt.serre;
    paves[this.id] = this;
    PP.paveActif = this;
  }
  Pave.prototype.htmlCases = function () {
    var n = this.longueur, k = this.code.length, self = this, out = '';
    for (var i = 0; i < n; i++) {
      if (n === 6 && i === 3) out += '<span class="espace" aria-hidden="true"></span>';
      var ch = self.code.charAt(i);
      var cls = 'case' + (!self.inactif && !self.occupe && i === k ? ' active' : '') + (self.masque && ch ? ' point' : '');
      out += '<span class="' + cls + '">' + (self.masque ? '' : PP.esc(ch)) + '</span>';
    }
    var dit = this.masque ? (k + ' chiffre' + (k > 1 ? 's' : '') + ' sur ' + n) : (this.code ? this.code.split('').join(' ') : 'vide');
    return out + '<span class="lecteur-seul">' + PP.esc(this.libelle + ' : ' + dit) + '</span>';
  };
  Pave.prototype.htmlCasesBloc = function () {
    return '<div class="cases' + (this.longueur === 4 ? ' quatre' : '') + '" data-cases="' + this.id + '" role="group" aria-label="' + PP.esc(this.libelle) + '" aria-live="polite">' + this.htmlCases() + '</div>';
  };
  Pave.prototype.htmlTouches = function () {
    var t = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (c) { t += '<button class="touche" data-act="pave" data-touche="' + c + '">' + c + '</button>'; });
    t += '<button class="touche mot" data-act="pave" data-touche="tout">Tout effacer</button>';
    t += '<button class="touche" data-act="pave" data-touche="0">0</button>';
    t += '<button class="touche" data-act="pave" data-touche="effacer" aria-label="Effacer un chiffre">' + PP.ico('effacer') + '</button>';
    var dis = this.inactif ? ' aria-disabled="true"' : '';
    return '<div class="pave' + (this.inactif ? ' inactif' : '') + (this.serre ? ' serre' : '') + '" data-pave="' + this.id + '"' + dis + '>' + t.replace(/<button /g, '<button' + (this.inactif ? ' disabled' : '') + ' ') + '</div>';
  };
  Pave.prototype.majCases = function () {
    var c = document.querySelector('[data-cases="' + this.id + '"]');
    if (c) c.innerHTML = this.htmlCases();
  };
  Pave.prototype.toucher = function (t) {
    if (this.inactif || this.occupe) return;
    var c = document.querySelector('[data-cases="' + this.id + '"]');
    if (c) c.classList.remove('erreur');
    if (t === 'tout') this.code = '';
    else if (t === 'effacer') this.code = this.code.slice(0, -1);
    else if (/^[0-9]$/.test(t) && this.code.length < this.longueur) this.code += t;
    this.majCases();
    if (this.code.length === this.longueur) {
      var code = this.code, self = this;
      // Le dernier chiffre se voit un instant avant la vérification.
      setTimeout(function () { if (self.code === code) self.quandComplet(code, self); }, 120);
    }
  };
  Pave.prototype.vider = function () { this.code = ''; this.occupe = false; this.majCases(); };
  Pave.prototype.erreur = function () {
    this.code = ''; this.occupe = false; this.majCases();
    var c = document.querySelector('[data-cases="' + this.id + '"]');
    if (c) { c.classList.remove('erreur'); void c.offsetWidth; c.classList.add('erreur'); }
    if (navigator.vibrate) { try { navigator.vibrate([40, 60, 40]); } catch (e) {} }
  };
  Pave.prototype.activer = function (oui) {
    this.inactif = !oui;
    var p = document.querySelector('[data-pave="' + this.id + '"]');
    if (p) p.outerHTML = this.htmlTouches();
    this.majCases();
  };
  PP.Pave = Pave;

  PP.actions.pave = function (el) {
    var bloc = el.closest('[data-pave]');
    var p = bloc && paves[bloc.getAttribute('data-pave')];
    if (p) p.toucher(el.getAttribute('data-touche'));
  };

  /* Le clavier physique. Quand le lecteur sans contact est allumé, une rafale de touches très rapides terminée par
     Entrée est une carte posée sur le lecteur (tablette.js s'en occupe) : on retient donc les chiffres un instant. */
  var tampon = '', derniere = 0, minuteur = null;
  function versPave(ch) {
    var p = PP.paveActif;
    if (!p || !document.querySelector('[data-pave="' + p.id + '"]')) return;
    p.toucher(ch);
  }
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var lecteur = PP.lecteur && PP.lecteur.allume && PP.lecteur.allume();
    var maintenant = Date.now();
    if (lecteur) {
      if (maintenant - derniere > 80) tampon = '';
      derniere = maintenant;
      if (ev.key === 'Enter') {
        var v = tampon; tampon = ''; clearTimeout(minuteur);
        if (v.length >= 4 && PP.lecteur.carteLue) { ev.preventDefault(); PP.lecteur.carteLue(v); }
        return;
      }
      if (ev.key && ev.key.length === 1 && /[0-9A-Za-z-]/.test(ev.key)) {
        tampon += ev.key;
        clearTimeout(minuteur);
        var lu = tampon;
        minuteur = setTimeout(function () {
          // Pas d'Entrée : c'était une personne. Les chiffres vont au pavé.
          if (tampon === lu) { tampon = ''; lu.split('').forEach(function (c) { if (/[0-9]/.test(c)) versPave(c); }); }
        }, 140);
        return;
      }
    }
    if (/^[0-9]$/.test(ev.key)) { versPave(ev.key); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { versPave('effacer'); ev.preventDefault(); }
    else if (ev.key === 'Escape') { versPave('tout'); }
  });
})();
