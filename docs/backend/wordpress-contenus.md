# WordPress, source éditoriale du site

> 06/10/2026 — module « Pose Parquet » (plugin `pose-parquet-core`), sans
> autre extension : pas d'ACF, pas de page builder, pas de framework.

## Architecture retenue

```
WordPress (édition)                       dépôt (génération)                    hébergement
───────────────────                       ──────────────────                    ───────────
Pose Parquet → Guides, Tutoriels,   ──►   node _generator/wordpress.js pull     ──►  site statique
Inspirations, Pages, Images,              → data/wordpress/contenus.json             (GitHub Pages
Maintenance                               → assets/images/wp-<id>*.jpg                aujourd'hui)
                                          node _generator/build.js
GET /wp-json/pose-parquet/v1/contenus     → mêmes gabarits, même design
(publié seulement, lecture seule)
```

- **WordPress édite, le dépôt construit.** Le site public reste statique :
  aucune page n'appelle WordPress au chargement. On tire l'export quand on
  veut publier ce qui a été saisi, puis on construit et on déploie.
- **Un instantané versionné** (`data/wordpress/contenus.json`) plutôt qu'un
  appel à chaque build : le build reste reproductible et hors ligne, et un
  WordPress indisponible n'empêche ni de construire ni de publier.
- **Sans instantané** (ou `PP_SANS_WORDPRESS=1`), le build est exactement
  celui d'avant : `content-guides.js`, `content-tutos.js`, `photos.js`,
  `content-pages.js`. La bascule est donc progressive et réversible.

## Ce que WordPress peut modifier — et ce qu'il ne peut pas

| Modifiable | Non modifiable (reste dans le code) |
|---|---|
| Titres, résumés, chapôs, introductions | Mise en page, sections, grilles |
| Corps des guides et tutoriels (éditeur classique) | CSS, composants, gabarits |
| Images (médiathèque), texte alternatif, crédit | Visualiseur, Studio, rendu |
| SEO : meta title, meta description, slug | Structure des pages du site |
| Catégorie, temps estimé, niveau, outils | Création de nouvelles pages du site |
| Inspirations : texte court, pièce, motif, teinte, lien Studio | |
| Pages : titre affiché (H1), chapô, SEO ; texte d'« À propos » | |
| Maintenance : état, titre, message, image, liens | |

Le HTML d'un corps modifié dans WordPress passe par une **liste fermée**
(`Contenus\Html`) : balises de texte et composants du site (encadrés, étapes,
figures, tableaux, avant/après), classes du site seulement, aucun attribut
`style`, aucun script. Un corps importé et non retouché est rendu tel quel.

## Migration (rejouable, sans doublon)

```bash
node _generator/exporter-wordpress.js
php backend/pose-parquet-core/tools/importer-contenus.php C:/wamp64/www/pose-parquet-dev data/wordpress/import.json
node _generator/wordpress.js pull
node _generator/build.js
```

Importés le 06/10/2026 : 8 guides, 3 tutoriels, 8 inspirations, 8 pages,
17 images. Contrôle : le site construit depuis WordPress est **identique
octet pour octet** au site construit sans lui (toutes les pages HTML) ; seul
`sitemap.xml` change, les tutoriels y prenant leur vraie date (16/08/2026)
au lieu de la date du build.

URLs : le slug est repris tel quel. Un guide ou un tutoriel publié qui
disparaît de WordPress (brouillon, corbeille) est **conservé** depuis le dépôt
avec un avertissement au build : on ne casse pas une URL indexée par un clic.

## Images

- Médiathèque de WordPress : téléverser, choisir, remplacer, retirer, insérer
  dans le contenu (« Ajouter un média »).
- Une image importée du dépôt garde ses déclinaisons optimisées
  (WebP + JPEG 560/980/1400) : aucun octet ne change.
- Une image téléversée dans WordPress est rapatriée par `pull`
  (`assets/images/wp-<id>.jpg` et ses tailles WordPress) et servie en JPEG.
- Contrôles : colonne « Image » (vignette, « Image manquante » ou « Image
  introuvable »), filtre « Image manquante » dans chaque liste, avertissement
  sur l'écran d'édition, compte dans le tableau de bord. Jamais bloquant.

## Maintenance

**Sur WordPress** (`Maintenance\Page`) : visiteur → page de maintenance en
**HTTP 503** avec `Retry-After: 3600`. Jamais bloqués : `wp-admin`,
`wp-login.php`, l'API REST, `admin-ajax`, `wp-cron`. Un utilisateur qui gère
le site voit le vrai site et une mention « Maintenance activée » dans la barre
d'administration. Vérifié en local : `/` → 503, `/wp-login.php` → 200,
`/wp-admin/` → 302, `/wp-json/…/health` → 200, `/wp-cron.php` → 200.

**Sur le site statique** : la page `maintenance.html` est générée avec le même
gabarit et la même feuille (`backend/pose-parquet-core/assets/maintenance.css`).
Quand la maintenance est active dans l'instantané :

- **GitHub Pages ne sait pas répondre 503.** Chaque page reçoit en tête un
  court script qui renvoie vers `maintenance.html`, sauf en aperçu
  (`?apercu=1`, mémorisé par le cookie `pp_apercu`). C'est un repli en 200 :
  à utiliser pour une mise à jour courte, pas pour une fermeture.
- **En local**, `serve.js` applique la vraie règle : pages HTML → 503 +
  `Retry-After`, fichiers (CSS, JS, images) servis, aperçu par `?apercu=1`.
- **Sur l'hébergement définitif**, appliquer la même règle côté serveur.
  nginx, par exemple :

```nginx
# Maintenance : activée quand assets/maintenance.json contient "actif":true
# (le build l'écrit) — ici, un fichier-témoin posé par le déploiement.
if (-f $document_root/.maintenance-active) { set $pp_maint 1; }
if ($cookie_pp_apercu = "1") { set $pp_maint 0; }
if ($request_uri ~* "\.(css|js|jpg|webp|png|svg|woff2|json)$") { set $pp_maint 0; }
if ($pp_maint = 1) { return 503; }
error_page 503 /maintenance.html;
location = /maintenance.html { add_header Retry-After 3600 always; internal; }
```

Sur Cloudflare Pages (piste déjà notée dans `docs/hebergement.md`), une
fonction (`functions/_middleware.js`) peut faire la même chose.

## Droits

`capability_type` `pp_contenu` / `pp_contenus` avec `map_meta_cap` : dix
droits primitifs, accordés à l'administrateur **seulement** (version de droits
2). Ni les éditeurs, ni les auteurs, ni le gestionnaire des projets ne les
reçoivent. Maintenance et réglages : `pp_manage_settings`. Projets : inchangé.

## Sécurité

Chaque formulaire : droit vérifié (`current_user_can`), jeton (`nonce`),
liste fermée de champs (`Contenus\Champs`), nettoyage par type, échappement à
l'affichage. Images : médiathèque de WordPress uniquement (aucun
téléversement maison). Export : contenus publiés seulement, aucune donnée
personnelle, aucun identifiant d'auteur.

## Tests

- `php tests/run-contenus.php <racine WordPress>` : types, droits, menu,
  nettoyage, HTML filtré, cycle brouillon → publication → export, images
  manquantes, maintenance.
- `node _generator/check-*.js` : le site (inchangé).

## Socle d'administration commun (référence : Expert Parquet)

Le back-office reprend le cadre et les composants d'Expert Parquet : menu sombre
à rubriques (Contenu, Activité, Produits, Site) avec icônes et logotype,
chiffres, cartes, panneaux, interrupteur, badges, bloc image, boîte
« Référencement ». Code : `src/Admin/Socle.php`, feuilles
`assets/socle/admin-shell.css` (partout dans wp-admin) et
`assets/socle/admin-composants.css` (écrans du module), préfixe neutre `adm-`.
Seuls changent d'un site à l'autre : le nom, le logotype et l'accent
(`Socle::marque()` — ici la sauge `#46594A` de la DA).

## Images dans le corps des articles

- **Illustrations importées** (`../assets/images/…`) : le HTML enregistré n'est
  pas modifié et aucun fichier n'est copié dans la médiathèque. L'éditeur
  reçoit la base du site public pour le type de contenu (`document_base_url`
  = adresse du site public + `guides/`, `tutoriels/`…) et affiche donc les
  vraies images. `convert_urls` est désactivé : l'enregistrement ne réécrit
  aucune adresse. Adresse du site public : Réglages → Site public (par
  défaut `http://localhost:5180/` en local, `https://pose-parquet.com/` sinon).
- **Images ajoutées depuis la médiathèque** : l'export remplace leur adresse
  WordPress par `../assets/images/wp-<id>.jpg` et les liste dans `medias` ;
  `node _generator/wordpress.js pull` les télécharge.

## Catalogue Premibel (consultation)

Le build publie `data/catalogue-etat.json` (`_generator/etat-catalogue.js`) ;
l'écran « Catalogue Premibel » le lit sur le site public. Rien ne s'y édite, et
WordPress ne lance pas la synchronisation :
`node _generator/sync-premibel.js` puis `node _generator/build.js`.

## Maintenance

Interrupteur du panneau (formulaire séparé, confirmé) ; le formulaire de
l'écran n'enregistre que le contenu de la page. WordPress répond 503 +
`Retry-After: 3600` aux visiteurs, les administrateurs voient le vrai site. Le
site statique (GitHub Pages) ne peut pas répondre 503 : il affiche la page
après la prochaine publication (pull puis build).

## Mises à jour de WordPress

Recommandé, non appliqué (touche `wp-config.php`) :
`define( 'WP_AUTO_UPDATE_CORE', 'minor' );`. Actuellement les versions majeures
sont aussi automatiques (`auto_update_core_major = enabled`).

## Pilotage sans code (lot « finaliser le pilotage »)

### Publier : une commande

    node _generator/contenus.js

1. récupère l'export WordPress (contenus, pages, Mon site, maintenance) et
   les images nouvelles ;
2. le **valide** (`_generator/valider-wordpress.js`) : une erreur
   structurante (titre vide, slug invalide, URL non http(s), email invalide,
   HTML dans un champ structuré, texte trop long, SEO au-delà des bornes)
   arrête tout — l'instantané et le site restent ceux d'avant. Une image
   manquante, un SEO plus long que conseillé ou un champ vidé ne sont que des
   avertissements ;
3. construit le site.

Les commandes unitaires restent : `node _generator/wordpress.js pull`, puis
`node _generator/build.js`. (Pas de `package.json` : sa seule présence fait
re-analyser par Node les modules ES de `js/`, avec un avertissement.)

### Champs structurés : WordPress dit QUOI, le front dit COMMENT

Le schéma de chaque champ (groupe, type, longueur, valeur par défaut) est
déclaré dans le dépôt, avec la page qu'il alimente :

- `_generator/content-pages.js` : Accueil (hero, passerelle, projet),
  À propos (présentation, rôles, liens commerciaux), Notre méthode (qui écrit,
  corrections, étapes, principes, refus, liens), Contact (adresse publique,
  trois contacts, bouton projet) ;
- `_generator/content-site.js` : « Mon site » — identité (nom, baseline,
  logo, favicon), en-tête (bouton projet, menu mobile, navigation : libellé et
  affichage), pied de page (présentation, mentions, colonnes de liens),
  liens commerciaux (Premibel, Allure Design : nom, adresse générale,
  affichage).

Les types (`_generator/textes.js`) : `texte`, `long`, `riche` (`**gras**`,
`*italique*`, `` `code` ``), `lien` (`[libellé]`, adresse fixée par le
gabarit), `lignes`, `url`, `email`, `oui-non`, `image`. Aucun HTML, aucune
classe : la structure des sections, leur ordre et leur mise en page restent
dans `build.js`, `home.js` et `layout.js`. Avec les valeurs par défaut, le
site construit est identique octet pour octet (seule exception : l'adresse
Premibel d'À propos et de la méthode suit désormais l'adresse générale,
`https://www.premibel.fr/`).

Le schéma arrive dans WordPress par :

    node _generator/exporter-wordpress.js
    php backend/pose-parquet-core/tools/importer-champs.php <racine WordPress> data/wordpress/import.json

Rejouable : les schémas sont remplacés (c'est du code), **aucune saisie n'est
écrasée**, seules les clés nouvelles reçoivent la valeur par défaut. Les
contenus (guides, corps, images) ne sont pas touchés.

Où : Pose Parquet → **Mon site** ; Pose Parquet → **Pages** → Accueil,
À propos, Notre méthode, Contact (bloc « Contenu de la page », avec la liste
des sections de la page).

### Éditeur et aperçu sans serve.js

Réglages → Site public → **Dossier du site sur cette machine**. Réglé, WordPress
sert lui-même les fichiers publics du site (`assets/` seulement, extensions en
liste fermée, remontée de dossier refusée, SVG sous CSP) par
`/wp-json/pose-parquet/v1/site/assets/…`. L'éditeur résout
`../assets/images/…` sur cette route, l'aperçu y prend ses feuilles et ses
polices, l'écran Catalogue y lit `data/catalogue-etat.json`. Vide : le site
public (production). Aucun fichier copié, aucune adresse enregistrée réécrite.

### Aperçu public, duplication

Guides et tutoriels : bouton **Aperçu public** (boîte Publier) et actions de
ligne **Aperçu** / **Dupliquer**. L'aperçu remplit le gabarit d'article publié
par le build (`data/apercu/guide.tpl`, `tutoriel.tpl`) avec la version
enregistrée (brouillon compris), échappée, corps filtré ; noindex, réservé à
qui peut modifier le contenu. Dupliquer crée un brouillon (textes, champs,
image, catégorie).

### Mises à jour de WordPress (local)

`wp-config.php` local : `define( 'WP_AUTO_UPDATE_CORE', 'minor' );` (ajouté le
06/10/2026, sauvegarde préalable). Mineures automatiques, majeures manuelles ;
la constante prime sur l'option `auto_update_core_major`. La politique de
production n'est pas fixée par ce lot.
