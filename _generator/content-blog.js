/**
 * Articles du blog.
 *
 * Le dépôt n'en contient aucun : ils s'écrivent dans WordPress
 * (Pose Parquet → Articles) et arrivent ici par l'instantané
 * data/wordpress/contenus.json (_generator/wordpress.js remplit ce tableau
 * sans changer sa référence). Tant qu'il est vide, la rubrique /blog/ existe
 * mais n'est ni indexée ni proposée dans les liens du site.
 */
const ARTICLES = [];

module.exports = { ARTICLES };
