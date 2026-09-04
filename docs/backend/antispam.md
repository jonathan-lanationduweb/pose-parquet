# Backend — anti-spam

Trois freins devant `POST /projects`, dans cet ordre : limite de débit, pot de
miel, jeton temporel signé. Aucun ne touche la base : ce qui est refusé n'a
jamais existé — ni demande, ni historique, ni email.

Pas de Turnstile dans ce lot. La place est prête (un contrôle de plus dans
`Antispam\Guard`), la décision viendra du bruit réellement constaté.

## Où c'est écrit

```
src/Antispam/Guard.php           l'ordre des contrôles et les codes de refus
src/Antispam/FormToken.php       émission et vérification du jeton, durées
src/Antispam/Honeypot.php        le champ website
src/Antispam/RateLimiter.php     compteurs, limites, transients
src/Antispam/ClientIdentity.php  identité réseau, condensée
src/Projects/SubmissionService.php  le pipeline complet
```

## Pot de miel

Champ `website`, accepté par l'API et **jamais stocké**. Un humain ne le voit
pas (le front du lot 5 le placera hors écran, sans autocomplétion,
`tabindex="-1"`) ; un robot qui remplit tout le remplit.

Vide, absent, `null`, `false` ou seulement des espaces : la soumission
continue. Rempli : `422` avec le code générique `submission_rejected` et le
message « La soumission n'a pas pu être acceptée. » Le mot « honeypot »
n'apparaît nulle part dans la réponse, et le nom du champ non plus. Pas de
fausse référence, pas de faux succès : un refus franc, plus simple à traiter
côté front.

`website` et `formToken` sont des **champs techniques** : ils ne comptent pas
comme champs inconnus, et `SubmissionService` les retire avant d'appeler le
validateur métier. Ils ne peuvent donc pas atteindre `pp_projects`.

## Jeton temporel

`GET /pose-parquet/v1/form-token` rend :

```json
{ "token": "v1.1757068800.3f2a…", "minAge": 2, "expiresIn": 7200 }
```

Forme : `v1.<issued_at>.<nonce>.<signature>`, la signature étant un
HMAC-SHA256 du préfixe avec un secret dérivé de `wp_salt('nonce')`. Le jeton
ne contient aucun secret et se vérifie **sans stockage** : ni table, ni
transient, ni session. Le navigateur le demande au chargement du formulaire et
le renvoie dans `formToken`.

| Règle | Valeur | Où |
|---|---|---|
| Âge minimum | 2 s | `FormToken::MIN_AGE` |
| Durée de validité | 7 200 s (2 h) | `FormToken::MAX_AGE` |

Les deux valeurs vivent là et nulle part ailleurs ; la route et la page
« État » les lisent.

Refus, tous en `422` avec le code `form_token_invalid` et un `fields.formToken`
qui dit lequel : absent, invalide (signature fausse, tronqué, date modifiée
sans re-signature, version inconnue), expiré, trop récent. La réponse ne
contient ni le jeton, ni son contenu signé, ni le secret. `formToken`
n'apparaît jamais dans le journal.

**Ce n'est pas un CAPTCHA.** Un robot patient demande un jeton, attend deux
secondes, soumet — et passe. Il élimine les scripts naïfs qui postent
directement. La protection réelle reste la limite de débit, la validation
serveur, les bornes de charge, et Turnstile si un jour il le faut.

## Identité réseau

Seul `REMOTE_ADDR` est retenu. `X-Forwarded-For`, `X-Real-IP` et
`CF-Connecting-IP` sont des en-têtes qu'un client direct écrit lui-même : s'y
fier sans reverse proxy de confiance laisse le robot choisir son identité et
contourner la limite. Ils sont donc **ignorés**.

Derrière un proxy connu, le filtre `pose_parquet_client_ip` permet de lire
l'en-tête adéquat — à un seul endroit, `Antispam\ClientIdentity` :

```php
add_filter( 'pose_parquet_client_ip', function () {
    // Uniquement si le proxy est de confiance et réécrit cet en-tête lui-même.
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
} );
```

L'adresse n'est jamais conservée : elle passe dans un HMAC avec
`wp_salt('auth')` et seul un condensat de 32 hexadécimaux circule. **Pas
d'IP** dans `pp_projects`, ni dans le journal, ni dans un nom de clé.

## Limite de débit

Deux compteurs par identité et par fenêtre glissante d'une heure :

| Compteur | Défaut | Compte |
|---|---|---|
| `attempts` | 30 / h | toute requête arrivée jusqu'à l'anti-spam, valide ou non |
| `successes` | 5 / h | les demandes réellement créées |

Le compteur de tentatives est incrémenté **avant** la validation : une rafale
de charges invalides n'est pas gratuite et n'offre pas un banc d'essai libre
au validateur. Le compteur de créations est vérifié juste avant l'écriture,
puisqu'il ne compte que ce qui existe.

Valeurs modifiables sans interface, par filtre :

```php
add_filter( 'pose_parquet_rate_limits', fn() => [ 'window' => 3600, 'attempts' => 60, 'successes' => 10 ] );
```

Stockage : un transient par compteur, nommé d'après le condensat du client,
qui expire avec la fenêtre. Pas de table dédiée : pour cinq demandes par heure,
ce serait de la machinerie. **Limite connue** : un transient n'est pas
atomique — deux requêtes strictement simultanées peuvent lire *n* et écrire
*n+1* toutes les deux. Une limite de 30 peut donc laisser passer 31 ou 32.
Acceptable pour un frein, insuffisant pour une comptabilité ; c'est assumé. Un
cache objet partagé (Redis, Memcached) réduit la fenêtre de course sans la
fermer.

## Dépassement

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 2843
Cache-Control: no-store

{ "code": "rate_limited",
  "message": "Trop de demandes ont été envoyées. Veuillez réessayer plus tard.",
  "fields": {} }
```

`Retry-After` est le temps restant de la fenêtre, en secondes. Aucun
identifiant technique n'est renvoyé : ni condensat, ni nom de compteur, ni
adresse.

## CORS n'est pas un anti-spam

La liste fermée d'origines protège le navigateur d'un visiteur contre un site
tiers qui voudrait poster à sa place. **Un bot serveur n'est pas soumis à
CORS** : `curl` ignore ces en-têtes, et un POST depuis une origine inconnue
est traité normalement (sans en-tête CORS en retour) — un test HTTP le montre.
Voir `security.md`.

## Double soumission

Deux POST valides quasi simultanés depuis le même formulaire créent
aujourd'hui deux demandes, si tous deux passent la limite de débit. C'est
assumé pour ce lot : les deux demandes sont légitimes du point de vue du
serveur. Une clé d'idempotence (en-tête ou champ, dédupliquée sur une courte
fenêtre) pourra s'ajouter au lot 5, quand le vrai formulaire sera branché et
que le comportement du bouton sera connu.

## Ce que le front devra faire (lot 5)

1. `GET /form-token` au chargement du formulaire, garder `token` ;
2. rendre le champ `website` invisible et le laisser vide ;
3. envoyer `formToken` et `website` avec la charge métier ;
4. traiter `429` (message d'attente) et `422` `form_token_invalid`
   (redemander un jeton, réessayer).

Rien de tout cela n'est écrit dans le front à ce stade.
