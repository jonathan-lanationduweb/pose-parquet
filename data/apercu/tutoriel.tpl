<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>%%PP_TITRE%%</title>
    <meta name="description" content="%%PP_DESCRIPTION%%" />
    <!-- Balise robots toujours explicite. Sa valeur par défaut est « index,
         follow » : les fichiers du dépôt décrivent la production, et c'est le
         déploiement qui marque une préproduction — voir
         .github/workflows/deploy-pages.yml et docs/seo-environnements.md. Un
         noindex écrit ici par prudence finirait tôt ou tard copié en production.

         Une page peut cependant demander autre chose par « page.robots », et
         une seule le fait : la 404. Elle n'est pas une préproduction, elle n'a
         simplement rien à indexer — c'est un état d'erreur, pas un contenu. -->
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://pose-parquet.com/tutoriels/apercu.html" />
    <meta name="theme-color" content="#f2efe8" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Pose Parquet" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="%%PP_TITRE%%" />
    <meta property="og:description" content="%%PP_DESCRIPTION%%" />
    <meta property="og:url" content="https://pose-parquet.com/tutoriels/apercu.html" />
    <meta property="og:image" content="https://pose-parquet.com/assets/images/og-default.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="../assets/icons/favicon.svg?v=ed0c249f93" type="image/svg+xml" />
    <link rel="icon" href="../assets/icons/favicon-32.png?v=ed0c249f93" sizes="32x32" type="image/png" />
    <link rel="icon" href="../assets/icons/favicon-16.png?v=ed0c249f93" sizes="16x16" type="image/png" />
    <link rel="apple-touch-icon" href="../assets/icons/apple-touch-icon.png?v=ed0c249f93" />
    <link rel="manifest" href="../site.webmanifest?v=ed0c249f93" />
    <link rel="preload" as="font" type="font/woff2" href="../assets/fonts/instrument-serif-400-3.woff2" crossorigin />
    <link rel="preload" as="font" type="font/woff2" href="../assets/fonts/inter-var-1.woff2" crossorigin />
    <link rel="stylesheet" href="../assets/dist/site.070ddff7ad.css" />
    <script type="module" src="../assets/dist/ced9b1be6d/js/main.js"></script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Accueil","item":"https://pose-parquet.com/index.html"},{"@type":"ListItem","position":2,"name":"Tutoriels","item":"https://pose-parquet.com/tutoriels/"},{"@type":"ListItem","position":3,"name":"%%PP_H1%%","item":"https://pose-parquet.com/"}]}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"HowTo","headline":"%%PP_H1%%","description":"%%PP_DESCRIPTION%%","inLanguage":"fr-FR","datePublished":"2001-01-01","dateModified":"2001-01-01","author":{"@type":"Organization","name":"Pose Parquet","url":"https://pose-parquet.com/a-propos/"},"publisher":{"@type":"Organization","name":"Pose Parquet"},"mainEntityOfPage":"https://pose-parquet.com/tutoriels/apercu.html"}</script>
  </head>
  <body class="page">
    <a class="skip-link" href="#contenu">Aller au contenu</a>
    <header class="site-header" data-header data-over="false" data-scrolled="false">
      <div class="wrap-wide site-header__inner">
        <a class="brand" href="../index.html" aria-label="Pose Parquet, accueil">
          <svg class="brand__mark" viewBox="0 0 106 197" fill="currentColor" aria-hidden="true"><g transform="scale(106 197)"><path d="M0 0H0.3396V0.5584L0 0.6396ZM0 0.6599L0.3396 0.5787V1H0ZM0.4057 0H0.7453V0.2437L0.4057 0.3249ZM0.4057 0.3452L0.7453 0.264V1H0.4057ZM0.8208 0H1V0.5584L0.8208 0.6012ZM0.8208 0.6215L1 0.5787V1H0.8208Z"/></g></svg><strong>Pose</strong><span>Parquet</span>
        </a>
        <nav class="nav" aria-label="Navigation principale">
          <ul class="nav__list">
            <li><a class="nav__link" href="../guides/" data-nav-section="guides">Guides</a></li>
            <li><a class="nav__link" href="../motifs/" data-nav-section="motifs">Motifs</a></li>
            <li><a class="nav__link" href="../tutoriels/" data-nav-section="tutoriels">Tutoriels</a></li>
            <li><a class="nav__link" href="../inspiration/" data-nav-section="inspiration">Inspiration</a></li>
            <li><a class="nav__link" href="../outils/" data-nav-section="outils">Outils</a></li>
          </ul>
        </nav>
        <div class="header__actions">
          <a class="header__cta" href="../projet/"><span>Votre projet</span></a>
          <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false"
            aria-controls="menu-mobile" aria-label="Ouvrir le menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
    <div class="drawer" id="menu-mobile" data-drawer data-open="false">
      <nav class="drawer__list" aria-label="Navigation mobile">
        <a class="drawer__link" href="../guides/"><span>01</span>Guides</a>
          <a class="drawer__link" href="../motifs/"><span>02</span>Motifs</a>
          <a class="drawer__link" href="../tutoriels/"><span>03</span>Tutoriels</a>
          <a class="drawer__link" href="../inspiration/"><span>04</span>Inspiration</a>
          <a class="drawer__link" href="../outils/"><span>05</span>Outils</a>
          <a class="drawer__link" href="../a-propos/"><span>06</span>À propos</a>
          <a class="drawer__link" href="../contact/"><span>07</span>Contact</a>
      </nav>
      <div class="drawer__footer">
        <a class="btn btn--light btn--block" href="../projet/"><span>Décrire mon projet</span><svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg></a>
        <a class="btn btn--outline-light btn--block" href="../outils/studio.html"><span>Visualiser mon parquet</span></a>
        <!-- « Média indépendant · aucune vente en ligne » figurait aussi ici.
             L'information est utile, mais répétée en tête de menu sur chaque
             page elle prend un ton défensif. Elle reste dans le pied de page et
             développée sur la page À propos, c'est-à-dire là où on la cherche. -->
        <p class="drawer__meta">Guides, motifs et outils</p>
      </div>
    </div>
    <main id="contenu">
      <div class="reading-progress" data-reading-progress aria-hidden="true"><span></span></div>
      <nav class="breadcrumb wrap-wide" aria-label="Fil d'Ariane"><ol><li><a href="../index.html">Accueil</a></li><li><a href="../tutoriels/">Tutoriels</a></li><li><span aria-current="page">%%PP_H1%%</span></li></ol></nav>
      <header class="article-header">
        <div class="wrap-wide article-header__grid">
          <div>
            <p class="eyebrow">%%PP_CATEGORIE%%</p>
            <h1>%%PP_H1%%</h1>
          </div>
          <div>
            <p class="lead">%%PP_INTRO%%</p>
            <ul class="meta-list article-header__meta">
              <li>%%PP_LECTURE%% de lecture</li>
              <li>Publié le <time datetime="%%PP_DATE_ISO%%">%%PP_DATE%%</time></li>
              
              <li>Niveau %%PP_NIVEAU%%</li>
              <li>%%PP_DUREE%%</li>
            </ul>
            <p class="article-byline">Par <strong>la rédaction de Pose Parquet</strong> — <a href="../a-propos/methode-editoriale.html">notre méthode éditoriale</a></p>
          </div>
        </div>
      </header>

      <div class="wrap-wide">
        

        %%PP_COUVERTURE%%
        <div class="article-layout">
          <article class="prose" id="article-content">
%%PP_CORPS%%
            
            
            <aside class="tool-bridge" aria-label="Passer à l’outil">
              <p class="tool-bridge__eyebrow">Passer à la pratique</p>
              <p class="tool-bridge__text">Essayez ce que vous venez de lire sur une photo de votre pièce : teinte, motif et sens de pose se changent en direct, sans rien envoyer sur un serveur.</p>
              <div class="cluster">
                <a class="btn btn--sm" href="../outils/visualiseur.html">Visualiser mon parquet</a>
                <a class="link-arrow" href="../outils/simulateur-pose.html">Ou passer en mode plan</a>
              </div>
            </aside>
            <nav class="article-nav" aria-label="Poursuivre la lecture">
              <a class="link-arrow" href="../tutoriels/">Tous les tutoriels<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg></a>
              <a class="link-arrow" href="../inspiration/">Voir des ambiances<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg></a>
            </nav>
          </article>

          <aside class="article-aside">
            <nav class="toc" data-toc data-toc-for="article-content" aria-labelledby="toc-title">
              <p class="toc__title" id="toc-title">Sommaire</p>
              <ol></ol>
            </nav>
            <div class="aside-box">
              <h3>Outillage</h3>
              <ul class="meta-list meta-list--stack">
                <li>%%PP_OUTILS%%</li>
              </ul>
            </div>
            <div class="aside-box">
              <h3>Avant de commencer</h3>
              <p>Vérifiez la planéité et l'humidité du support : c'est la cause de la majorité des désordres.</p>
              <a class="btn btn--ghost btn--sm" href="../guides/preparer-son-sol-avant-la-pose.html">Préparer le support</a>
            </div>
            <!--
              La sortie chantier, sur les tutoriels et nulle part ailleurs.

              Un tutoriel de pose est le seul endroit du site où quelqu'un
              peut légitimement changer d'avis en lisant : découvrir le nombre
              d'étapes, l'outillage, les points de contrôle, et décider que ce
              n'est pas pour lui. Lui proposer là de confier le chantier
              répond à une question qu'il vient de se poser.

              Dans un guide de décision — « quel sens de pose ? » — la même
              proposition serait hors sujet : on y cherche à comprendre, pas à
              déléguer.

              Le lien mène au formulaire, pas chez le poseur : c'est ce qui
              permet de qualifier le besoin et la zone avant d'orienter. Voir
              js/commerce/allure.js.
            -->
            <div class="aside-box">
              <h3>Vous préférez confier la pose ?</h3>
              <p>Décrivez votre projet : nous orientons vers un poseur selon votre région. En Île-de-France, la pose et la rénovation sont assurées par Allure Design.</p>
              <a class="btn btn--ghost btn--sm" href="../projet/?besoin=pose">Faire poser mon parquet</a>
            </div>
          </aside>
        </div>

        
      </div>
      <section class="section">
      <div class="wrap">
        <div class="cta-band" data-reveal>
          <div>
            <h2>Un projet de pose à préparer ?</h2>
            <p>Décrivez votre pièce, votre support et le rendu recherché en quatre étapes, sans laisser vos coordonnées : vous voyez aussitôt vers qui vous tourner.</p>
          </div>
          <div class="cta-band__actions">
            <a class="btn btn--light" href="../projet/">Décrire mon projet</a>
            <a class="btn btn--outline-light" href="../outils/studio.html">Visualiser mon parquet</a>
          </div>
        </div>
      </div>
    </section>
    </main>
    <footer class="site-footer">
      <div class="wrap-wide footer__inner">
        <div class="footer__top">
          <div class="footer__brand">
            <svg class="footer__mark" viewBox="0 0 106 197" fill="currentColor" aria-hidden="true"><g transform="scale(106 197)"><path d="M0 0H0.3396V0.5584L0 0.6396ZM0 0.6599L0.3396 0.5787V1H0ZM0.4057 0H0.7453V0.2437L0.4057 0.3249ZM0.4057 0.3452L0.7453 0.264V1H0.4057ZM0.8208 0H1V0.5584L0.8208 0.6012ZM0.8208 0.6215L1 0.5787V1H0.8208Z"/></g></svg>
            <p class="footer__wordmark">Pose <span>Parquet</span></p>
            <p class="footer__baseline">Guides et outils pour réussir la pose de son parquet.</p>
          </div>
          <nav class="footer__nav" aria-label="Pied de page">
            <div class="footer__col">
              <h2>Comprendre</h2>
              <ul>
                <li><a href="../guides/">Guides</a></li><li><a href="../motifs/">Motifs</a></li><li><a href="../tutoriels/">Tutoriels</a></li>
              </ul>
            </div><div class="footer__col">
              <h2>Outils</h2>
              <ul>
                <li><a href="../outils/studio.html">Visualiser ma pièce</a></li><li><a href="../outils/simulateur-pose.html">Mode Plan</a></li><li><a href="../inspiration/">Inspiration</a></li>
              </ul>
            </div><div class="footer__col">
              <h2>À propos</h2>
              <ul>
                <li><a href="../a-propos/methode-editoriale.html">Notre méthode</a></li><li><a href="../contact/">Contact</a></li><li><a href="../projet/">Votre projet</a></li>
              </ul>
            </div>
          </nav>
        </div>
        <div class="footer__bottom">
          <!--
            « Média indépendant, aucune vente en ligne » figurait ici.

            La première moitié n'est plus exacte : le site oriente vers les
            références de Premibel quand elles existent, et un lecteur qui
            découvrirait ce lien après coup aurait raison de se sentir trompé.
            La seconde reste vraie — rien ne se vend ni ne se paie ici — mais
            énoncée seule elle laissait entendre la première.

            Le pied de page ne développe pas : il renvoie à la page qui le
            fait, une fois, sobrement.
          -->
          <p>&copy; 2026 Pose Parquet — guides et outils pour préparer son projet.</p>
          <!--
            Deux destinations nommées, une ligne, pas de logo.

            Le pied de page dit vers QUI l'on oriente et pour QUOI ; le détail
            — la zone, ce que la relation ne change pas — est à la page qui
            l'explique. Écrire trois phrases ici en ferait une réclame en bas
            de 32 pages.
          -->
          <p class="footer__orientation"><strong>Premibel</strong> pour les références de parquet, <strong>Allure&nbsp;Design</strong> pour la pose et la rénovation en Île-de-France : Pose Parquet oriente selon le besoin. <a href="../a-propos/#liens-commerciaux">Nos liens commerciaux</a></p>
          <p>Photographies sous licence Pexels</p>
        </div>
      </div>
    </footer>
  </body>
</html>
