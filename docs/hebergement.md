# Où héberger pose-parquet.com

*Note préparatoire. Aucune migration n'a été effectuée : le choix de la
plateforme est une décision humaine.*

## Le problème posé par GitHub Pages

Le site est publié aujourd'hui sur GitHub Pages, ce qui convient très bien pour
la préproduction : déploiement automatique à chaque commit, HTTPS gratuit,
aucun serveur à administrer, coût nul.

Une limite devient bloquante au moment de reprendre le domaine :

- **GitHub Pages ne sait pas produire de redirection 301.** Il sert des
  fichiers statiques ; une redirection ne peut être simulée qu'avec une balise
  `<meta http-equiv="refresh">` ou un script, que les moteurs traitent moins
  bien qu'un vrai code 301 et qui n'existent pas pour un fichier absent.
- Les en-têtes HTTP ne sont pas configurables (cache, sécurité, `Content-Type`).
- La règle `www` → apex ne peut pas être écrite : elle dépend du DNS.

Or la migration a besoin de trois redirections réelles (voir
`docs/migration-url-map.md`).

## Options

| Option | Redirections 301 | En-têtes | HTTPS | Coût | Remarque |
| --- | --- | --- | --- | --- | --- |
| **Rester sur GitHub Pages** | non | non | oui | 0 € | Correct pour la préproduction, insuffisant pour reprendre le domaine proprement |
| **Cloudflare Pages** | oui (`_redirects`) | oui (`_headers`) | oui | 0 € sur l'offre gratuite | Même flux Git qu'aujourd'hui ; les trois règles tiennent en trois lignes |
| **Netlify** | oui (`_redirects`) | oui (`_headers`) | oui | 0 € sur l'offre gratuite | Équivalent fonctionnel |
| **L'hébergement nginx actuel** | oui | oui | à remettre en service | déjà payé | Le TLS n'y fonctionne plus aujourd'hui ; demande une administration manuelle |

## Recommandation

**Cloudflare Pages**, pour trois raisons :

1. il apporte exactement ce qui manque — de vraies redirections 301 et des
   en-têtes configurables — sans rien changer au site lui-même, qui reste un
   ensemble de fichiers statiques ;
2. le flux de travail ne bouge pas : le dépôt Git reste la source, le
   déploiement reste automatique ;
3. le domaine et le DNS peuvent être gérés au même endroit, ce qui simplifie
   la bascule et le certificat.

Netlify est un choix équivalent : si une préférence existe déjà pour l'un ou
l'autre, elle prime sur cet argumentaire.

Rester sur l'hébergement nginx actuel reste défendable si l'on souhaite garder
la main sur le serveur, mais cela suppose de remettre TLS en service et
d'assurer les mises à jour.

### Ce que donnerait la configuration sur Cloudflare Pages

```
# _redirects
https://www.pose-parquet.com/*  https://pose-parquet.com/:splat  301
/index.htm                      /                                301
```

Le passage de HTTP à HTTPS est assuré par la plateforme.

## Ce qui reste à décider par une personne

- la plateforme définitive ;
- le moment de la bascule DNS ;
- qui administre le domaine et le certificat ensuite.

Tant que ces points ne sont pas tranchés, le site reste publié sur GitHub Pages
à son adresse de préproduction, et les DNS de `pose-parquet.com` ne sont pas
touchés.
