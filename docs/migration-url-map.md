# Migration de l'ancien pose-parquet.com

*Relevé effectué le 1er septembre 2026, depuis le site en ligne.*
**Aucune redirection n'a été déployée et aucun enregistrement DNS n'a été
modifié.** Ce document prépare la bascule ; il ne la déclenche pas.

## Ce qui est en ligne aujourd'hui

| Constat | Détail |
| --- | --- |
| Hébergement | nginx, IP `62.210.16.62` (`pf20-web.online.net`, Online / Scaleway), IPv6 `2001:bc8:4::3` |
| Dernière modification du fichier | `Fri, 26 Aug 2011 14:28:32 GMT` |
| HTTPS | **non fonctionnel** : la connexion TLS échoue sur `https://pose-parquet.com/` comme sur `www.` |
| `www` | résout vers la même machine et répond en HTTP 200 |
| Contenu | **une seule page**, environ 5 000 signes, sur la pose collée du parquet massif, le stockage des colis et les conditions de chantier |
| Liens | environ 180 liens, **tous sortants** vers `premibel-parquet.com` ; aucun lien interne |
| Auteur déclaré | balises `Author` et `copyright` : Premibel Parquet, 2002-2009 |

## Inventaire des URL

Le crawl (départ `/`, suivi des liens internes) n'a trouvé **aucune page
interne** : le site tient en un fichier. Les URL héritées plausibles ont donc
été testées une par une.

| Ancienne URL | Réponse actuelle | Décision |
| --- | --- | --- |
| `http://pose-parquet.com/` | 200 | → `https://pose-parquet.com/` (nouvelle page d'accueil) |
| `http://www.pose-parquet.com/` | 200 | → `https://pose-parquet.com/` (301, sans `www`) |
| `http://pose-parquet.com/index.htm` | 200, **même fichier que `/`** | → `https://pose-parquet.com/` (301) |
| `http://pose-parquet.com/index.html` | 404 | rien à faire |
| `http://pose-parquet.com/style.css` | 200 | laisser expirer (404) |
| `http://pose-parquet.com/favicon.ico` | 200 | remplacé par le nouveau jeu d'icônes |
| `/contact.htm`, `/pose-parquet.htm`, `/parquet-flottant.htm` | 404 | aucune URL héritée à conserver |
| `/sitemap.xml`, `/robots.txt` | 404 | créés par le nouveau site |

`/` et `/index.htm` servent aujourd'hui le même contenu sans canonique : c'est
un doublon d'indexation qui disparaît avec la redirection.

## Correspondance de contenu

L'ancienne page traitait trois sujets. Ils existent tous dans le nouveau site,
en plus développé — il n'y a donc rien à récupérer tel quel, d'autant que ce
texte appartient à Premibel Parquet.

| Sujet de l'ancienne page | Page correspondante |
| --- | --- |
| Conditions de chantier, planéité, humidité du support | `/guides/preparer-son-sol-avant-la-pose.html` |
| Stockage et acclimatation des colis | `/guides/erreurs-a-eviter-avant-de-poser.html` |
| Pose collée, compatibilité sol chauffant, épaisseurs | `/guides/parquet-massif-ou-contrecolle.html` |

## Stratégie de redirection

Trois règles suffisent, dans cet ordre :

1. `http://` → `https://` (301), une fois le certificat en place ;
2. `www.pose-parquet.com` → `pose-parquet.com` (301) ;
3. `/index.htm` → `/` (301).

Toute autre URL renvoie le 404 du nouveau site, qui propose les guides et les
outils. C'est le comportement correct : inventer des redirections vers des
pages sans rapport dégraderait la qualité perçue du domaine.

### Exemple pour nginx (hébergement actuel)

```nginx
server {
  listen 80;
  server_name pose-parquet.com www.pose-parquet.com;
  return 301 https://pose-parquet.com$request_uri;
}

server {
  listen 443 ssl;
  server_name www.pose-parquet.com;
  return 301 https://pose-parquet.com$request_uri;
}

server {
  listen 443 ssl;
  server_name pose-parquet.com;
  root /var/www/pose-parquet;
  location = /index.htm { return 301 /; }
}
```

## Conditions avant de basculer

À vérifier **dans cet ordre**, sans anticiper :

1. l'hébergement définitif est choisi et sait produire de vraies redirections
   301 (voir `docs/hebergement.md`) ;
2. un certificat TLS valide répond sur le domaine et sur `www` ;
3. le nouveau site répond correctement sur cet hébergement, en préproduction ;
4. les trois règles ci-dessus sont en place et testées ;
5. **alors seulement**, les DNS sont basculés — décision humaine, hors de ce
   document.

Après bascule : vérifier les codes retour un par un, soumettre le nouveau
`sitemap.xml` dans la Search Console, et surveiller les erreurs d'exploration
pendant quelques semaines.
