/**
 * Pose Parquet — le seul script de l'administration.
 *
 * 1. Choisir une image dans la médiathèque de WordPress (couverture d'un
 *    contenu, fond de la page de maintenance). Téléverser, choisir, remplacer,
 *    retirer : tout se fait dans la fenêtre de la médiathèque elle-même.
 * 2. Les comportements du socle commun (comme Expert Parquet) : compteur de
 *    caractères du référencement (data-adm-compteur) et confirmation des
 *    interrupteurs (data-adm-confirmer).
 * 3. L'invite du champ de recherche des listes (« Rechercher un guide… »).
 */
(function () {
  'use strict';
  var t = window.ppAdmin || {};

  document.querySelectorAll('[data-pp-couverture]').forEach(function (bloc) {
    var champ = bloc.querySelector('[data-pp-couverture-id]');
    var apercu = bloc.querySelector('[data-pp-couverture-apercu]');
    var choisir = bloc.querySelector('[data-pp-choisir]');
    var retirer = bloc.querySelector('[data-pp-retirer]');
    var cadre = null;

    function montrer(url) {
      apercu.textContent = '';
      if (url) {
        var img = document.createElement('img');
        img.src = url;
        img.alt = '';
        apercu.appendChild(img);
      } else {
        var vide = document.createElement('span');
        vide.className = 'adm-image__vide' + (bloc.classList.contains('adm-image--ligne') ? '' : ' adm-image__vide--alerte');
        vide.textContent = t.manquante || 'Image manquante';
        apercu.appendChild(vide);
      }
      if (retirer) retirer.hidden = !url;
      var libelle = choisir && choisir.querySelector('[data-pp-choisir-texte]');
      if (libelle) libelle.textContent = url ? t.remplacer : t.choisir;
    }

    if (choisir && window.wp && wp.media) {
      choisir.addEventListener('click', function () {
        if (!cadre) {
          cadre = wp.media({
            title: t.choisir || 'Choisir une image',
            button: { text: t.utiliser || 'Utiliser cette image' },
            library: { type: 'image' },
            multiple: false,
          });
          cadre.on('open', function () {
            var id = parseInt(champ.value, 10);
            if (id) {
              var piece = wp.media.attachment(id);
              piece.fetch();
              cadre.state().get('selection').reset([piece]);
            }
          });
          cadre.on('select', function () {
            var piece = cadre.state().get('selection').first().toJSON();
            champ.value = String(piece.id);
            var taille = (piece.sizes && (piece.sizes.large || piece.sizes.medium_large || piece.sizes.full)) || piece;
            montrer(taille.url);
          });
        }
        cadre.open();
      });
    }
    if (retirer) {
      retirer.addEventListener('click', function () {
        champ.value = '0';
        montrer('');
      });
    }
  });

  document.querySelectorAll('[data-adm-compteur]').forEach(function (champ) {
    var max = parseInt(champ.getAttribute('data-adm-compteur'), 10) || 60;
    var badge = document.createElement('span');
    badge.className = 'adm-compteur';
    var libelle = champ.id && document.querySelector('label[for="' + champ.id + '"]');
    (libelle || champ).insertAdjacentElement(libelle ? 'beforeend' : 'afterend', badge);
    var maj = function () {
      var n = champ.value.length;
      badge.textContent = n + ' / ' + max;
      badge.classList.toggle('adm-compteur--trop', n > max);
    };
    champ.addEventListener('input', maj);
    maj();
  });

  document.querySelectorAll('[data-adm-confirmer]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-adm-confirmer'))) e.preventDefault();
    });
  });

  /*
   * Publier le site : le clic désactive le bouton (pas de double envoi).
   * Pendant une publication, la page se recharge toutes les trois secondes —
   * c'est le serveur qui relit l'état. Aucun appel réseau dans ce script.
   */
  document.querySelectorAll('[data-pp-publier]').forEach(function (form) {
    form.addEventListener('submit', function () {
      var b = form.querySelector('button');
      if (b) { b.disabled = true; b.lastChild.textContent = 'Publication en cours…'; }
    });
  });
  if (document.querySelector('[data-pp-publication="en_cours"]')) {
    setTimeout(function () { window.location.reload(); }, 3000);
  }

  /*
   * Corps non modifié → le serveur garde l'original (Edition::corps_inchange).
   * L'éditeur visuel réécrit le HTML qu'il charge : sans ce signal, changer un
   * résumé transformait aussi le corps. Onglet Visuel : TinyMCE sait s'il a
   * été modifié ; onglet Code : on compare au texte chargé.
   */
  var formulaireArticle = document.getElementById('post');
  var corps = document.getElementById('content');
  if (formulaireArticle && corps && document.querySelector('input[name="pp_contenu_nonce"]')) {
    var corpsInitial = corps.value;
    formulaireArticle.addEventListener('submit', function () {
      var ed = window.tinymce && window.tinymce.get('content');
      var visuel = ed && !ed.isHidden();
      var modifie = visuel ? ed.isDirty() : corps.value !== corpsInitial;
      var champ = formulaireArticle.querySelector('input[name="pp_corps_inchange"]');
      if (!champ) {
        champ = document.createElement('input');
        champ.type = 'hidden';
        champ.name = 'pp_corps_inchange';
        formulaireArticle.appendChild(champ);
      }
      champ.value = modifie ? '' : '1';
    });
  }

  var recherche = document.querySelector('#post-search-input');
  if (recherche && t.recherche && t.recherche !== '…') recherche.placeholder = t.recherche;
})();
