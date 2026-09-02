# Indexation : préproduction et production

## Le problème

Le dépôt sert deux adresses différentes :

| environnement | adresse | doit être indexé ? |
| --- | --- | --- |
| préproduction | `https://jonathan-lanationduweb.github.io/pose-parquet/` | **non** |
| production | `https://pose-parquet.com/` | oui |

Or `pose-parquet.com` héberge encore l'ancien site, chez Online.net. Les DNS ne
sont pas repointés et **il ne faut pas ajouter de fichier CNAME** tant qu'ils ne
le sont pas, sinon l'adresse `github.io` cesse de fonctionner.

Pendant ce temps, la préproduction est publique. Sans précaution, elle
s'indexe : Google se retrouve avec deux sites au contenu identique, dont l'un à
une adresse jetable, et des canoniques qui pointent vers un domaine servant
autre chose.

## Ce qu'on ne fait pas

**On n'écrit pas de `noindex` dans les sources.** C'est la solution évidente et
c'est un piège : le jour de la mise en ligne, personne ne se souvient de
l'enlever, et le site part en production avec l'indexation coupée. Ce genre
d'oubli se paie plusieurs mois.

## Ce qu'on fait

Les fichiers du dépôt décrivent **toujours la production** :

- `<link rel="canonical">` vers `pose-parquet.com` ;
- `<meta name="robots" content="index, follow">` sur chaque page éditoriale,
  toujours écrite explicitement — c'est ce qui rend la substitution possible ;
- `robots.txt` en `Allow: /` avec le sitemap de production ;
- `sitemap.xml` avec les URL définitives.

C'est le **déploiement** qui marque la préproduction, dans
`.github/workflows/deploy-pages.yml`. Le signal est la présence d'un fichier
`CNAME` à la racine :

| CNAME | interprétation | ce que fait le workflow |
| --- | --- | --- |
| absent | GitHub Pages sert sur `*.github.io` — ce n'est pas l'adresse finale | `robots.txt` en `Disallow: /`, suppression du `sitemap.xml`, remplacement de la balise robots par `noindex, nofollow` dans toutes les pages de l'artefact |
| présent | le domaine définitif est en place | rien ; une vérification échoue si l'accueil n'est pas indexable |

Le basculement est donc **automatique** : le jour où les DNS sont repointés et
le CNAME ajouté, l'indexation reprend sans qu'il faille se rappeler de quoi que
ce soit. Et à l'inverse, aucun `noindex` ne peut se retrouver en production,
puisqu'il n'existe dans aucun fichier versionné.

## L'application, elle, n'est jamais indexée

`outils/studio.html` porte `noindex, follow` **dans les sources**, et c'est
volontaire : c'est une application, sans contenu à indexer. La page à indexer,
c'est sa landing `outils/visualiseur.html`, qui porte le H1, les explications et
les données structurées. Le workflow durcit simplement ce `noindex, follow` en
`noindex, nofollow` en préproduction.

## Vérifier

Sur la préproduction :

```bash
curl -s https://jonathan-lanationduweb.github.io/pose-parquet/robots.txt
# → User-agent: *
#   Disallow: /

curl -s https://jonathan-lanationduweb.github.io/pose-parquet/ | grep 'name="robots"'
# → <meta name="robots" content="noindex, nofollow" />
```

En local, après `node _generator/build.js`, on doit voir l'inverse — c'est le
signe que les sources sont bien prêtes pour la production :

```bash
grep 'name="robots"' index.html
# → <meta name="robots" content="index, follow" />
```

## À faire le jour de la mise en ligne

1. Repointer les DNS de `pose-parquet.com` vers GitHub Pages (voir
   [hebergement.md](hebergement.md)).
2. Ajouter le fichier `CNAME` contenant `pose-parquet.com`.
3. Pousser. Le workflow détecte le CNAME, ne marque plus rien, et vérifie que
   l'accueil est indexable.
4. Vérifier `robots.txt` et le sitemap sur le domaine final.
5. Demander l'indexation dans la Search Console.

**Ne pas faire les étapes 1 et 2 dans l'ordre inverse** : un CNAME posé avant le
repointage des DNS casse l'adresse `github.io` sans que le domaine fonctionne.
