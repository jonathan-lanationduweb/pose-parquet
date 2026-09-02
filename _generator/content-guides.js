const { tip, warn, key, figure, table, steps, beforeAfter, linkArrow } = require('./ui');

const img = (name) => `../assets/images/${name}`;

const GUIDES = [
  {
    slug: 'quel-sens-de-pose-choisir',
    title: 'Quel sens de pose choisir pour son parquet ? | Pose Parquet',
    h1: 'Quel sens de pose choisir pour son parquet ?',
    description:
      "Lumière, proportions, circulation, support : la méthode pour choisir le sens de pose de votre parquet, avec un simulateur pour visualiser le résultat.",
    category: 'Sens de pose',
    tags: ['sens-de-pose', 'comprendre'],
    date: '2026-08-24',
    reading: '9 min',
    excerpt:
      "Cinq critères suffisent à trancher, et ils ne se valent pas. Voici l'ordre dans lequel les regarder.",
    cover: { seed: 11, variant: 0 },
    lead:
      "Le sens de pose se décide avant la première lame et ne se rattrape pas. Cinq critères permettent de trancher dans presque toutes les situations : la lumière, les proportions de la pièce, la circulation, le support et le motif retenu.",
    faq: [
      {
        q: 'Faut-il toujours poser dans le sens de la lumière ?',
        a: "Non, mais c'est le point de départ le plus fiable. Poser dans le sens des rayons limite les ombres portées sur les joints. Si la pièce est très étroite ou si le support impose une direction, un autre critère peut primer.",
      },
      {
        q: 'Peut-on changer de sens entre deux pièces ?',
        a: "Oui, à condition d'assumer une transition nette : barre de seuil, coupe droite au droit de la porte ou frise de raccord. Un changement de sens sans transition dessinée se remarque immédiatement.",
      },
      {
        q: 'Le sens de pose change-t-il la quantité de parquet à acheter ?',
        a: "Oui. Une pose droite est la plus économe en matière ; une pose diagonale ou un Point de Hongrie multiplient les coupes de rive et consomment sensiblement plus. Les ordres de grandeur souvent cités vont de 7 à 8 % pour une pose droite à 12 à 15 % pour un motif orienté, mais ils dépendent de la pièce, du calepinage et des longueurs livrées : à confirmer par un calepinage avant de commander. Dans tous les cas, le surplus se commande dès le départ, dans le même lot.",
      },
    ],
    related: ['poser-parquet-sens-de-la-lumiere', 'sens-de-pose-piece-etroite', 'sens-de-pose-couloir'],
    body: `
      <p>Le sens de pose est la première décision visible d'un chantier de parquet. Elle influence la perception des volumes, la façon dont la lumière accroche les joints, la quantité de coupes et parfois la tenue même du revêtement. Une fois les lames collées ou clouées, revenir en arrière signifie déposer l'ensemble.</p>
      <p>Bonne nouvelle : dans la majorité des pièces, le choix se joue sur cinq critères, dans un ordre de priorité assez stable.</p>

      <h2 id="lumiere">1. La lumière : le critère qui prime presque toujours</h2>
      <p>Un parquet n'est jamais parfaitement plan. Chaque joint crée un micro-relief qui, éclairé de côté, dessine une ligne d'ombre. Poser les lames <strong>dans le sens des rayons</strong> — c'est-à-dire perpendiculairement au mur qui porte la fenêtre — limite ces ombres et donne un sol visuellement plus continu.</p>
      <p>Ce réflexe vient de la pose clouée traditionnelle, mais il reste valable avec les parquets contrecollés actuels, notamment avec des finitions brossées ou huilées qui accrochent davantage la lumière rasante.</p>
      ${tip('<p>Testez avant de décider : posez trois ou quatre lames à blanc sur le sol, en fin de journée, quand la lumière est la plus rasante. La différence entre les deux orientations est souvent flagrante.</p>')}

      <h2 id="proportions">2. Les proportions de la pièce</h2>
      <p>Les lames guident le regard. Elles étirent l'espace dans leur direction :</p>
      <ul>
        <li><strong>Pose dans la longueur</strong> : allonge encore la pièce. Idéale dans un séjour large, discutable dans un couloir déjà étroit.</li>
        <li><strong>Pose dans la largeur</strong> : élargit visuellement un espace tout en longueur, au prix de coupes plus nombreuses.</li>
        <li><strong>Pose en diagonale</strong> : casse les lignes, agrandit la perception d'un petit volume et rattrape des murs non parallèles.</li>
      </ul>
      <p>Dans une pièce carrée, ce critère devient neutre : la lumière et le motif reprennent la main.</p>
      ${figure(img('guide-sens-proportions.svg'), "Trois orientations de lames comparées dans une même pièce", 'Une même pièce, trois lectures : la direction des lames modifie la perception des proportions avant tout autre paramètre.', 1100, 290)}

      <h2 id="circulation">3. La circulation et les seuils</h2>
      <p>Le regard entre dans une pièce par la porte. Une pose parallèle à l'axe d'entrée accompagne ce mouvement ; une pose perpendiculaire crée une sensation de barrière, surtout avec des lames larges et contrastées.</p>
      <p>Dans un logement traversant, on gagne à traiter les circulations comme un ensemble : couloir, entrée et pièces de vie posés dans la même direction donnent une continuité que les changements de sens cassent.</p>

      <h2 id="support">4. Le support impose parfois la direction</h2>
      <p>Certaines configurations ne laissent pas le choix :</p>
      <ul>
        <li><strong>Pose clouée sur lambourdes ou solives</strong> : les lames doivent être perpendiculaires aux supports.</li>
        <li><strong>Ancien plancher conservé</strong> : les nouvelles lames se posent perpendiculairement aux anciennes, pour ne pas superposer les joints.</li>
        <li><strong>Chauffage au sol</strong> : la direction est libre, mais la pose collée et l'inertie du support imposent d'autres précautions.</li>
      </ul>
      ${warn("<p>Poser un parquet flottant dans le sens de la longueur d'une grande pièce sans respecter les joints de fractionnement, c'est prendre le risque de blocages et de tuilage. Au-delà de 8 mètres dans une direction, un joint de dilatation intermédiaire s'impose.</p>")}

      <h2 id="motif">5. Le motif choisi</h2>
      <p>Un Point de Hongrie ou un bâton rompu ne se raisonnent pas comme une pose droite : ce sont des motifs orientés, dont l'axe principal doit être décidé en premier. Cet axe suit généralement la longueur de la pièce ou l'axe d'entrée, plus rarement la fenêtre.</p>
      <p>${linkArrow('../motifs/', 'Comparer les motifs de pose')}</p>

      <h2 id="methode">La méthode en cinq minutes</h2>
      ${steps([
        {
          title: 'Repérez la source de lumière principale',
          text: "Une seule fenêtre ? Elle décide. Plusieurs ouvertures ? Retenez celle qui éclaire le plus longtemps dans la journée.",
        },
        {
          title: 'Mesurez et notez le rapport longueur / largeur',
          text: "Au-delà d'un rapport de 1,6, la pièce est perçue comme étroite : la pose dans la largeur ou en diagonale devient pertinente.",
        },
        {
          title: "Tracez l'axe d'entrée",
          text: 'Depuis la porte principale, en direction du fond de la pièce. Cet axe départage souvent deux options équivalentes.',
        },
        {
          title: 'Vérifiez les contraintes du support',
          text: 'Solives, ancien plancher, chape, chauffage au sol : ces éléments peuvent annuler les trois premiers critères.',
        },
        {
          title: 'Visualisez avant de commander',
          text: "Le simulateur de pose permet de comparer les orientations sur vos dimensions réelles, avec la fenêtre au bon endroit.",
        },
      ])}
      ${key('<ul><li>La lumière tranche le plus souvent.</li><li>Les proportions tranchent lorsque la lumière est neutre.</li><li>Le support peut imposer un sens, quel que soit le rendu souhaité.</li><li>Le motif se décide avant le sens, jamais après.</li></ul>')}

      <h2 id="visualiser">Visualiser plutôt qu'imaginer</h2>
      <p>Les descriptions ont leurs limites : deux orientations décrites de la même façon peuvent donner deux ambiances très différentes une fois posées. Le simulateur reproduit votre pièce, place la fenêtre et l'entrée, puis applique le motif choisi.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
  },

  {
    slug: 'poser-parquet-sens-de-la-lumiere',
    title: 'Poser un parquet dans le sens de la lumière | Pose Parquet',
    h1: 'Poser un parquet dans le sens de la lumière',
    description:
      "Pourquoi la règle du sens de la lumière fonctionne, dans quels cas elle ne s'applique pas, et comment repérer la bonne direction dans une pièce à plusieurs ouvertures.",
    category: 'Sens de pose',
    tags: ['sens-de-pose', 'comprendre'],
    date: '2026-08-20',
    reading: '6 min',
    excerpt:
      "La règle la plus citée du parquet. Encore faut-il savoir ce qu'elle recouvre et quand elle cesse d'être vraie.",
    cover: { seed: 21, variant: 1 },
    lead:
      "« Poser dans le sens de la lumière » est la règle la plus répétée du parquet. Elle repose sur un phénomène optique très concret, mais elle connaît des exceptions qu'il vaut mieux identifier avant de commander les lames.",
    faq: [
      {
        q: 'Que signifie exactement « dans le sens de la lumière » ?',
        a: "Les lames sont posées perpendiculairement au mur qui porte la fenêtre, donc parallèlement à la direction des rayons qui entrent dans la pièce.",
      },
      {
        q: 'Et si la pièce a des fenêtres sur deux murs ?',
        a: "Retenez l'ouverture qui apporte la lumière la plus rasante et la plus durable dans la journée, souvent la plus grande ou celle exposée au sud. Les autres critères, proportions et axe d'entrée, départagent ensuite.",
      },
      {
        q: 'La règle vaut-elle pour un parquet mat ?',
        a: "Elle compte moins. Une finition très mate et peu texturée renvoie peu de lumière rasante : les joints se voient nettement moins, et les autres critères prennent le dessus.",
      },
    ],
    related: ['quel-sens-de-pose-choisir', 'sens-de-pose-piece-etroite', 'erreurs-a-eviter-avant-de-poser'],
    body: `
      <p>La lumière rasante révèle les reliefs. Sur un parquet, chaque joint entre deux lames forme une arête minuscule qui projette une ombre dès que la lumière arrive de côté. Multipliée par des dizaines de joints, cette ombre dessine des lignes bien visibles.</p>

      <h2 id="phenomene">Le phénomène en une image</h2>
      <p>Placez les lames <strong>perpendiculairement à la fenêtre</strong> et les rayons filent le long des joints : l'ombre reste dans l'axe et se remarque peu. Placez-les <strong>parallèlement à la fenêtre</strong> et chaque joint se retrouve éclairé de côté : les lignes ressortent, surtout en fin de journée.</p>
      ${beforeAfter(
        img('lumiere-avant.svg'),
        img('lumiere-apres.svg'),
        'Lames parallèles à la fenêtre',
        'Lames dans le sens des rayons'
      )}
      <p class="text-muted">Déplacez le curseur pour comparer les deux orientations sous la même lumière.</p>

      <h2 id="quand">Quand la règle s'applique vraiment</h2>
      <ul>
        <li>Pièce éclairée par une seule ouverture principale.</li>
        <li>Finition brossée, huilée ou vieillie, qui accroche la lumière.</li>
        <li>Lames étroites et nombreuses, donc joints nombreux.</li>
        <li>Sol très éclairé en lumière naturelle rasante, typiquement une exposition ouest.</li>
      </ul>

      <h2 id="exceptions">Les quatre exceptions</h2>
      ${table(
        ['Situation', 'Ce qui prime', 'Direction retenue'],
        [
          ['Couloir étroit', 'Continuité de la circulation', "Dans l'axe du couloir"],
          ['Pièce très allongée', 'Correction des proportions', 'Dans la largeur ou en diagonale'],
          ['Pose clouée sur solives', 'Contrainte structurelle', 'Perpendiculaire aux solives'],
          ['Motif orienté (Point de Hongrie)', 'Axe du motif', "Axe principal de la pièce"],
        ]
      )}
      ${warn("<p>Ne cherchez pas à appliquer la règle pièce par pièce dans un logement ouvert. Un séjour, une cuisine et un couloir posés chacun dans « leur » sens de lumière produisent un patchwork. Sur un plateau ouvert, une seule direction pour tout l'espace.</p>")}

      <h2 id="reperer">Repérer la bonne direction en pratique</h2>
      ${steps([
        {
          title: 'Observez la pièce en fin de journée',
          text: "C'est le moment où la lumière est la plus rasante, donc le plus révélateur.",
        },
        {
          title: 'Posez quelques lames à blanc',
          text: 'Trois ou quatre lames suffisent, dans une orientation puis dans l’autre, au même endroit.',
        },
        {
          title: 'Photographiez les deux essais',
          text: "La photo aplatit la perspective et montre les lignes de joints plus objectivement que l'œil.",
        },
      ])}
      ${tip("<p>Si vous hésitez encore, gardez à l'esprit que le rendu le plus discret est presque toujours le plus durable : un sol qui se fait oublier vieillit mieux qu'un effet graphique dont on se lasse.</p>")}

      <h2 id="simuler">Simuler la lumière dans votre pièce</h2>
      <p>Le simulateur place la fenêtre sur le mur de votre choix et applique une nappe de lumière cohérente avec le motif retenu. Utile pour comparer sans poser une seule lame.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
  },

  {
    slug: 'preparer-son-sol-avant-la-pose',
    title: 'Comment préparer un sol avant la pose d’un parquet ? | Pose Parquet',
    h1: 'Comment préparer un sol avant la pose ?',
    description:
      "Planéité, humidité, propreté, ragréage, sous-couche : les contrôles et les travaux à mener sur le support avant de poser un parquet, avec les seuils à respecter.",
    category: 'Préparation',
    tags: ['preparation', 'poser'],
    date: '2026-08-18',
    reading: '10 min',
    excerpt:
      "La plupart des désordres viennent du support, pas du parquet. Voici les contrôles à mener avant la première lame.",
    cover: { seed: 31, variant: 3 },
    lead:
      "Un parquet ne corrige jamais les défauts du sol sur lequel il est posé : il les révèle. La préparation du support représente l'essentiel du travail invisible d'un chantier réussi.",
    faq: [
      {
        q: 'Quelle planéité faut-il atteindre ?',
        a: "La règle courante est de 5 mm sous une règle de 2 mètres pour une pose collée, et 3 mm sous la même règle pour une pose flottante avec des lames rigides. Au-delà, un ragréage s'impose.",
      },
      {
        q: 'Comment vérifier l’humidité d’une chape ?',
        a: "La mesure fiable se fait à la bombe à carbure. Un contrôle indicatif consiste à scotcher hermétiquement un film plastique d'un mètre carré pendant 24 à 48 heures : la moindre condensation signale un support encore humide.",
      },
      {
        q: 'Peut-on poser un parquet sur un carrelage existant ?',
        a: "Oui, si le carrelage est adhérent, propre, plan et sec. Les carreaux sonnant creux doivent être déposés et rebouchés, et un primaire adapté est nécessaire avant une pose collée.",
      },
    ],
    related: ['erreurs-a-eviter-avant-de-poser', 'parquet-massif-ou-contrecolle', 'quel-sens-de-pose-choisir'],
    body: `
      <p>Tuilage, lames qui claquent, joints qui s'ouvrent, points durs sous le pied : la plupart des désordres constatés après une pose viennent du support, rarement du parquet lui-même. La préparation demande du temps, mais elle est mesurable, donc vérifiable.</p>

      <h2 id="diagnostic">Le diagnostic en quatre mesures</h2>
      ${table(
        ['Contrôle', 'Méthode', 'Seuil courant'],
        [
          ['Planéité', 'Règle de 2 m et cales', '≤ 5 mm (collée) / ≤ 3 mm (flottante)'],
          ['Humidité', 'Bombe à carbure', '≤ 3 % pour une chape ciment'],
          ['Cohésion', 'Rayure et test d’adhérence', 'Surface non farinante, non friable'],
          ['Propreté', 'Aspiration et inspection', 'Sans laitance, colle, plâtre ni graisse'],
        ]
      )}
      ${warn("<p>Une chape neuve n'est pas sèche parce qu'elle est dure. Comptez en moyenne une semaine de séchage par centimètre d'épaisseur pour une chape ciment traditionnelle, davantage en hiver ou dans une pièce peu ventilée.</p>")}

      <h2 id="planeite">Corriger la planéité</h2>
      <p>Trois cas de figure, trois réponses :</p>
      <ul>
        <li><strong>Défauts localisés</strong> : rebouchage à l'enduit de rebouchage fibré, ponçage des points hauts.</li>
        <li><strong>Défauts diffus sur toute la surface</strong> : ragréage autolissant, en respectant l'épaisseur minimale du produit.</li>
        <li><strong>Sol très irrégulier ou plancher bois ancien</strong> : panneautage en contreplaqué ou en OSB vissé, qui redonne un plan de pose homogène.</li>
      </ul>
      ${figure(img('preparation-ragreage.jpg'), 'Ragréage frais en cours de mise en œuvre sur un sol intérieur', "Le ragréage rattrape les défauts du support : c'est lui qui donne au parquet un plan de pose homogène.")}

      <h2 id="humidite">Gérer l'humidité</h2>
      <p>L'humidité est la cause la plus fréquente des sinistres. Deux sources à distinguer : l'humidité résiduelle du support et les remontées capillaires, notamment sur dalle en rez-de-chaussée sans coupure de capillarité.</p>
      <p>Dans le premier cas, il faut attendre ou assécher. Dans le second, une barrière étanche — film polyéthylène pour une pose flottante, primaire époxy bicomposant pour une pose collée — est indispensable.</p>
      ${tip("<p>Le parquet lui-même doit être acclimaté : laissez les paquets fermés à plat dans la pièce, entre 48 et 72 heures, à une température de 18 à 22 °C et une hygrométrie de 45 à 60 %.</p>")}

      <h2 id="souscouche">Choisir la sous-couche</h2>
      <p>La sous-couche ne concerne que la pose flottante. Elle joue sur trois plans : correction des micro-défauts, confort acoustique et pare-vapeur.</p>
      <ul>
        <li><strong>En appartement</strong>, l'affaiblissement des bruits d'impact est souvent imposé par le règlement de copropriété : visez au minimum 18 dB.</li>
        <li><strong>Sur dalle béton</strong>, un pare-vapeur est nécessaire, intégré ou posé en complément.</li>
        <li><strong>Sur chauffage au sol</strong>, privilégiez une résistance thermique faible, idéalement inférieure à 0,15 m².K/W.</li>
      </ul>

      <h2 id="checklist">La checklist avant la première lame</h2>
      ${steps([
        { title: 'Support sec, mesuré et documenté', text: "Notez la valeur, la date et la méthode : c'est ce qui compte en cas de litige." },
        { title: 'Planéité contrôlée à la règle de 2 m', text: 'Dans les deux directions, y compris le long des murs et devant les seuils.' },
        { title: 'Sol aspiré, dépoussiéré, primaire appliqué si nécessaire', text: "Un support propre conditionne l'adhérence de la colle." },
        { title: 'Parquet acclimaté dans la pièce', text: '48 à 72 heures, paquets fermés, posés à plat.' },
        { title: 'Calepinage tracé au sol', text: 'Axe de départ, joints périphériques de 8 à 10 mm, position des coupes de rive.' },
      ])}
      ${key("<ul><li>Mesurez plutôt que d'estimer : planéité et humidité se chiffrent.</li><li>Le ragréage est un investissement, pas une option de confort.</li><li>L'acclimatation évite la majorité des jeux de joints ultérieurs.</li></ul>")}
    `,
  },

  {
    slug: 'point-de-hongrie-ou-baton-rompu',
    title: 'Point de Hongrie ou bâton rompu : quelles différences ? | Pose Parquet',
    h1: 'Point de Hongrie ou bâton rompu ?',
    description:
      "Deux motifs souvent confondus. Coupe, rendu, contraintes de pose, coût et pièces adaptées : le comparatif complet, illustré par un simulateur.",
    category: 'Motifs',
    tags: ['motifs', 'choisir'],
    date: '2026-08-14',
    reading: '7 min',
    excerpt:
      "Une coupe d'onglet sépare ces deux motifs. Elle change le rendu, le prix et la pose.",
    cover: { seed: 41, variant: 2 },
    lead:
      "On les confond souvent, alors qu'un seul détail les sépare : la coupe des extrémités. Ce détail change le dessin au sol, la mise en œuvre et le budget.",
    faq: [
      {
        q: 'Lequel est le plus cher ?',
        a: "Le Point de Hongrie. Les lames sont coupées à l'onglet en usine, avec des versions gauche et droite à commander en quantités égales, et les chutes sont plus importantes.",
      },
      {
        q: 'Peut-on poser ces motifs dans une petite pièce ?',
        a: "Oui, en adaptant le format des lames. Dans une pièce de moins de 12 m², des lames courtes et étroites évitent un motif écrasant et limitent les coupes de rive.",
      },
      {
        q: 'Ces motifs conviennent-ils à un chauffage au sol ?',
        a: "Oui, en pose collée avec un contrecollé stable. La colle assure le contact thermique et limite les mouvements du bois.",
      },
    ],
    related: ['quel-sens-de-pose-choisir', 'parquet-massif-ou-contrecolle', 'preparer-son-sol-avant-la-pose'],
    body: `
      <p>Les deux motifs assemblent des lames en biais et produisent un sol très graphique. La différence tient à la coupe : le bâton rompu utilise des lames droites, le Point de Hongrie des lames coupées à l'onglet. L'angle du Point de Hongrie n'est pas figé — 45° est le plus répandu, mais on rencontre aussi 30° et 60°, qui allongent la pointe et changent nettement le rendu.</p>

      <h2 id="difference">La différence en une phrase</h2>
      <p>Dans le <strong>bâton rompu</strong>, le bout d'une lame vient buter contre le chant de la suivante : le dessin forme des marches d'escalier. Dans le <strong>Point de Hongrie</strong>, les extrémités coupées en biais se rejoignent : le dessin forme des pointes continues, alignées en colonnes.</p>
      <div class="grid grid--2">
        <div class="pattern-card"><div class="pattern-card__viz" data-pattern-thumb="point-de-hongrie"></div><h3>Point de Hongrie</h3><p>Pointe continue, joints alignés, coupe d'onglet.</p></div>
        <div class="pattern-card"><div class="pattern-card__viz" data-pattern-thumb="baton-rompu"></div><h3>Bâton rompu</h3><p>Lames droites, décrochés en escalier, aucune coupe spéciale.</p></div>
      </div>

      <h2 id="comparatif">Comparatif détaillé</h2>
      ${table(
        ['Critère', 'Point de Hongrie', 'Bâton rompu'],
        [
          ['Coupe des lames', "Onglet, le plus souvent à 45° ; lames gauches et droites", 'Lames droites standard'],
          ['Rendu au sol', 'Pointes continues, effet flèche', 'Décrochés en escalier, effet tressé'],
          ['Chutes estimées', '12 à 15 %', '10 à 12 %'],
          ['Approvisionnement', 'Lots dédiés, délais plus longs', 'Lames courantes'],
          ['Difficulté de pose', 'Élevée : traçage et axe très précis', 'Élevée, mais coupes plus tolérantes'],
          ['Effet visuel dominant', 'Allonge et guide le regard', 'Anime la surface, plus statique'],
        ]
      )}

      <h2 id="choisir">Comment choisir</h2>
      <ul>
        <li><strong>Pièce longue à valoriser</strong> : le Point de Hongrie, dont la pointe file vers le fond.</li>
        <li><strong>Grande surface ouverte</strong> : le bâton rompu, qui anime sans imposer de direction.</li>
        <li><strong>Budget contraint</strong> : le bâton rompu, en lames courantes.</li>
        <li><strong>Rénovation d'un appartement ancien</strong> : les deux se justifient, mais le Point de Hongrie s'accorde mieux aux moulures et aux parquets d'origine.</li>
      </ul>
      ${tip("<p>Quel que soit le motif, tracez l'axe principal au cordeau et vérifiez-le à l'équerre avant de coller la première lame. Un axe légèrement faux ne se corrige pas en cours de pose : l'écart se cumule rangée après rangée.</p>")}
      ${warn("<p>N'improvisez pas la rive. Une frise périphérique, même simple, rattrape les murs non parallèles et évite des coupes en pointe très fines, fragiles et disgracieuses.</p>")}

      <h2 id="simulateur">Voir les deux motifs dans votre pièce</h2>
      <p>Changez de motif d'un clic et comparez sur vos dimensions réelles.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
  },

  {
    slug: 'erreurs-a-eviter-avant-de-poser',
    title: 'Les erreurs à éviter avant de poser un parquet | Pose Parquet',
    h1: 'Les erreurs à éviter avant de poser un parquet',
    description:
      "Acclimatation oubliée, joints périphériques trop justes, support mal mesuré, commande sans marge : les huit erreurs les plus fréquentes et comment les éviter.",
    category: 'Préparation',
    tags: ['preparation', 'comprendre'],
    date: '2026-08-10',
    reading: '8 min',
    excerpt:
      "Huit erreurs reviennent en boucle sur les chantiers. Toutes se corrigent avant la pose, aucune après.",
    cover: { seed: 51, variant: 1 },
    lead:
      "Les erreurs coûteuses ne se produisent pas pendant la pose, mais dans les jours qui la précèdent. Voici les huit plus fréquentes, dans l'ordre où elles surviennent.",
    faq: [
      {
        q: 'Combien de temps faut-il acclimater un parquet ?',
        a: "48 heures minimum pour un contrecollé, 72 heures pour un massif, paquets fermés, à plat, dans la pièce de destination chauffée à température d'usage.",
      },
      {
        q: 'Quel jeu périphérique faut-il laisser ?',
        a: "8 à 10 mm sur toute la périphérie pour une pose flottante, et davantage sur les grandes longueurs : comptez environ 1,5 mm par mètre de largeur de pièce.",
      },
      {
        q: 'Combien de parquet commander en plus ?',
        a: "Prévoyez 7 à 10 % de plus pour une pose droite, 12 à 15 % pour une diagonale ou un motif, et gardez une réserve d'un demi-paquet pour les réparations futures.",
      },
    ],
    related: ['preparer-son-sol-avant-la-pose', 'quel-sens-de-pose-choisir', 'parquet-massif-ou-contrecolle'],
    body: `
      <h2 id="acclimatation">1. Poser un parquet non acclimaté</h2>
      <p>Le bois échange en permanence de l'humidité avec l'air. Posé trop sec, il gonflera ; posé trop humide, il se rétractera et ouvrira des joints. L'acclimatation en paquets fermés, dans la pièce, est non négociable.</p>

      <h2 id="joints">2. Négliger les joints périphériques</h2>
      <p>Un parquet flottant est un plateau qui doit pouvoir bouger. Sans jeu suffisant contre les murs, les huisseries et les tuyaux, il se bloque et tuile. Les plinthes masquent ce jeu : il n'y a aucune raison de l'économiser.</p>
      ${warn("<p>Attention aux points singuliers : seuils de porte, poteaux, angles rentrants et passages de tuyaux de chauffage. Ce sont eux qui bloquent, pas les longs murs droits.</p>")}

      <h2 id="support">3. Estimer le support au lieu de le mesurer</h2>
      <p>« Il a l'air plan » et « il doit être sec » ne sont pas des mesures. Une règle de 2 mètres et un test d'humidité coûtent bien moins cher qu'une dépose.</p>

      <h2 id="melange">4. Ne pas mélanger les paquets</h2>
      <p>Le bois varie d'un paquet à l'autre. Piocher dans trois ou quatre paquets simultanément répartit les nuances et évite les zones plus claires ou plus foncées.</p>

      <h2 id="commande">5. Commander au plus juste</h2>
      <p>Les coupes de rive, les erreurs et les lames écartées pour défaut consomment plus que prévu. Une commande complémentaire arrive dans un autre lot, avec une teinte légèrement différente.</p>

      <h2 id="calepinage">6. Poser sans calepinage</h2>
      <p>Commencer contre un mur sans avoir calculé la dernière rangée est le meilleur moyen de finir avec une bande de 2 cm. Le calepinage se trace avant, au cordeau, en répartissant les coupes entre la première et la dernière rangée.</p>
      ${tip("<p>Si la dernière rangée fait moins d'un tiers de la largeur d'une lame, retirez cette largeur de la première rangée et répartissez la différence des deux côtés.</p>")}

      <h2 id="sens">7. Décider le sens de pose au dernier moment</h2>
      <p>Le sens conditionne la quantité de matière, la position des coupes et parfois le type de pose. C'est une décision de conception, pas d'exécution.</p>
      <p>${linkArrow('quel-sens-de-pose-choisir.html', 'Lire le guide du sens de pose')}</p>

      <h2 id="chantier">8. Poser avant les autres corps d'état</h2>
      <p>Peinture, plomberie, cuisine : tout ce qui produit de la poussière, de l'eau ou des chocs doit être terminé. Un parquet posé trop tôt devient un plan de travail.</p>
      ${key("<ul><li>Mesurer plutôt qu'estimer, systématiquement.</li><li>Acclimater le parquet et respecter les jeux périphériques.</li><li>Calepiner avant de poser la première lame.</li><li>Commander avec marge, dans un seul lot.</li></ul>")}
    `,
  },

  {
    slug: 'parquet-massif-ou-contrecolle',
    title: 'Parquet massif ou contrecollé : ce qui change à la pose | Pose Parquet',
    h1: 'Parquet massif ou contrecollé : quelles différences pour la pose ?',
    description:
      "Structure, stabilité, types de pose compatibles, rénovation, chauffage au sol : ce qui distingue vraiment un parquet massif d'un contrecollé au moment de la pose.",
    category: 'Comprendre',
    tags: ['comprendre', 'choisir'],
    date: '2026-08-06',
    reading: '8 min',
    excerpt:
      "Le débat porte rarement sur le bon terrain : ce qui change vraiment, c'est la stabilité dimensionnelle.",
    cover: { seed: 61, variant: 0 },
    lead:
      "Massif et contrecollé sont deux parquets à part entière : dans les deux cas, la couche visible est en bois noble. Ce qui les sépare tient à leur structure, et donc à leur comportement une fois posés.",
    faq: [
      {
        q: 'Le contrecollé est-il un « faux parquet » ?',
        a: "Non. Un parquet contrecollé possède une couche d'usure en bois noble d'au moins 2,5 mm. En dessous, on parle de sol stratifié, qui n'est pas un parquet.",
      },
      {
        q: 'Combien de fois peut-on poncer un parquet ?',
        a: "Un massif de 20 mm accepte cinq à sept ponçages. Un contrecollé avec 3 mm de couche d'usure en accepte deux à trois, ce qui couvre déjà plusieurs décennies d'usage domestique.",
      },
      {
        q: 'Lequel choisir avec un chauffage au sol ?',
        a: "Un contrecollé collé en plein, avec une épaisseur maîtrisée et une essence stable. Le massif est déconseillé, sauf produits spécifiquement certifiés compatibles.",
      },
    ],
    related: ['preparer-son-sol-avant-la-pose', 'quel-sens-de-pose-choisir', 'point-de-hongrie-ou-baton-rompu'],
    body: `
      <h2 id="structure">Deux structures, deux comportements</h2>
      <p>Le <strong>massif</strong> est une pièce de bois pleine, de 14 à 23 mm d'épaisseur. Il travaille dans toute sa masse au gré de l'hygrométrie.</p>
      <p>Le <strong>contrecollé</strong> superpose une couche d'usure en bois noble, une âme en bois résineux ou en contreplaqué à fils croisés, et un contre-parement. Ce croisement des fibres limite fortement les variations dimensionnelles.</p>
      ${figure(img('massif-contrecolle.jpg'), 'Échantillons de lames de bois de différentes essences et épaisseurs', 'Massif ou contrecollé : la structure de la lame, et non son aspect de surface, détermine les poses possibles.')}

      <h2 id="comparatif">Comparatif orienté pose</h2>
      ${table(
        ['Critère', 'Massif', 'Contrecollé'],
        [
          ['Poses possibles', 'Clouée, collée', 'Collée, flottante'],
          ['Stabilité dimensionnelle', 'Sensible à l’hygrométrie', 'Très stable'],
          ['Chauffage au sol', 'Déconseillé sauf produit certifié', 'Adapté en pose collée'],
          ['Épaisseur courante', '14 à 23 mm', '10 à 15 mm'],
          ['Ponçages', '5 à 7', '2 à 3'],
          ['Grands formats et motifs', 'Limité par les mouvements', 'Bien adapté'],
        ]
      )}

      <h2 id="pose">Ce que cela change concrètement sur le chantier</h2>
      <ul>
        <li><strong>Tolérance sur le support</strong> : le contrecollé flottant demande une planéité plus stricte que le massif cloué sur lambourdes.</li>
        <li><strong>Hauteur disponible</strong> : sous une porte ou face à un carrelage existant, les quelques millimètres d'écart peuvent décider seuls.</li>
        <li><strong>Motifs</strong> : Point de Hongrie et bâton rompu se posent plus sereinement en contrecollé collé, plus stable.</li>
        <li><strong>Acoustique</strong> : en appartement, la pose collée en plein réduit nettement les bruits d'impact par rapport à une pose flottante.</li>
      </ul>
      ${tip("<p>Regardez l'épaisseur de la couche d'usure plutôt que le prix au mètre carré : c'est elle qui détermine la durée de vie réelle d'un contrecollé.</p>")}

      <h2 id="rénovation">Et en rénovation ?</h2>
      <p>Sur un ancien plancher bois sain, le massif cloué reste cohérent. Sur une dalle béton en rénovation d'appartement, le contrecollé collé est le choix le plus sûr, particulièrement avec un chauffage au sol.</p>
      <p>Pour comparer des gammes existantes et leurs épaisseurs de couche d'usure, un distributeur spécialisé comme <a href="https://premibel.fr" rel="noopener">Premibel</a> publie les caractéristiques techniques détaillées de ses parquets contrecollés, utiles pour vérifier ces points avant de commander.</p>
      ${key("<ul><li>La vraie différence est la stabilité, pas la « noblesse » du produit.</li><li>Le contrecollé ouvre la pose flottante et le chauffage au sol.</li><li>Le massif reste imbattable en durée de vie ponçable.</li></ul>")}
    `,
  },

  {
    slug: 'sens-de-pose-couloir',
    title: 'Quel sens de pose dans un couloir ? | Pose Parquet',
    h1: 'Sens de pose dans un couloir',
    description:
      "Dans un couloir, la continuité prime sur la lumière. Comment orienter les lames, gérer les seuils et raccorder les pièces adjacentes.",
    category: 'Sens de pose',
    tags: ['sens-de-pose', 'poser'],
    date: '2026-08-02',
    reading: '5 min',
    excerpt: "Le couloir est le seul espace où la règle de la lumière passe au second plan.",
    cover: { seed: 71, variant: 3 },
    lead:
      "Un couloir est un espace de passage, étroit et souvent peu éclairé. La question du sens de pose s'y résout autrement que dans une pièce de vie.",
    faq: [
      {
        q: 'Faut-il poser dans le sens de la marche ?',
        a: "Oui, dans la très grande majorité des cas. Les lames dans l'axe du couloir accompagnent le déplacement et limitent le nombre de coupes.",
      },
      {
        q: 'Comment raccorder le couloir aux pièces adjacentes ?',
        a: "Soit en conservant la même direction partout, soit en marquant une coupe droite au droit de chaque porte, avec ou sans barre de seuil selon le type de pose.",
      },
    ],
    related: ['quel-sens-de-pose-choisir', 'sens-de-pose-piece-etroite', 'poser-parquet-sens-de-la-lumiere'],
    body: `
      <h2 id="axe">Poser dans l'axe : la règle par défaut</h2>
      <p>Dans un couloir, la lumière arrive rarement de côté : elle vient d'une extrémité, ou d'un éclairage artificiel. Le critère lumineux perd donc son poids habituel, au profit de deux autres.</p>
      <ul>
        <li><strong>La continuité visuelle</strong> : des lames dans l'axe prolongent le couloir et l'apaisent.</li>
        <li><strong>Le nombre de coupes</strong> : une pose transversale multiplie les coupes de rive et les chutes dans un espace où chaque lame est courte.</li>
      </ul>
      ${warn("<p>La pose en travers d'un couloir étroit produit un effet d'échelle, très marqué avec des lames contrastées. À réserver aux couloirs larges, traités comme de vraies pièces.</p>")}

      <h2 id="seuils">Gérer les seuils</h2>
      <p>Deux stratégies, à choisir dès le calepinage :</p>
      ${steps([
        { title: 'Continuité totale', text: "Même direction dans le couloir et les pièces, sans seuil. Le rendu est le plus fluide, mais impose une pose cohérente sur l'ensemble du niveau." },
        { title: 'Coupe franche au droit des portes', text: 'Le changement de direction est assumé, marqué par une coupe nette ou une barre de seuil discrète, alignée sur le nu de la porte fermée.' },
      ])}
      ${tip("<p>Dans un couloir en L, traitez la partie la plus longue comme direction principale et raccordez la seconde par une coupe droite dans l'angle.</p>")}

      <h2 id="simuler">Simuler un couloir</h2>
      <p>Entrez par exemple 8 m sur 1,2 m dans le simulateur : l'effet des différentes orientations est immédiat.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
  },

  {
    slug: 'sens-de-pose-piece-etroite',
    title: 'Sens de pose dans une pièce étroite | Pose Parquet',
    h1: 'Sens de pose dans une pièce étroite',
    description:
      "Élargir visuellement une pièce tout en longueur : quand poser dans la largeur, quand préférer la diagonale, et ce que cela change en coupes.",
    category: 'Sens de pose',
    tags: ['sens-de-pose', 'choisir'],
    date: '2026-07-29',
    reading: '5 min',
    excerpt: "Poser dans la largeur élargit vraiment — à condition d'en accepter les coupes.",
    cover: { seed: 81, variant: 2 },
    lead:
      "Dans une pièce dont la longueur dépasse 1,6 fois la largeur, le sens de pose devient un outil de correction visuelle. Encore faut-il mesurer ce que l'on gagne et ce que l'on paie.",
    faq: [
      {
        q: 'La pose dans la largeur élargit-elle vraiment ?',
        a: "Oui, l'effet est réel : les lignes transversales interrompent la fuite du regard et raccourcissent visuellement la pièce. L'effet est d'autant plus fort que les lames sont larges et contrastées.",
      },
      {
        q: 'Combien de chutes en plus ?',
        a: "Comptez environ un point de plus qu'une pose dans la longueur, et 6 à 7 points de plus si vous optez pour la diagonale.",
      },
    ],
    related: ['quel-sens-de-pose-choisir', 'sens-de-pose-couloir', 'poser-parquet-sens-de-la-lumiere'],
    body: `
      <h2 id="mesurer">Mesurer avant de décider</h2>
      <p>Calculez le rapport longueur / largeur de la pièce :</p>
      <ul>
        <li><strong>Inférieur à 1,4</strong> : la pièce est équilibrée, la lumière décide.</li>
        <li><strong>Entre 1,4 et 1,8</strong> : la pose dans la largeur devient intéressante si la lumière ne l'interdit pas.</li>
        <li><strong>Supérieur à 1,8</strong> : la correction visuelle s'impose, en largeur ou en diagonale.</li>
      </ul>

      <h2 id="options">Trois options, trois effets</h2>
      ${table(
        ['Option', 'Effet visuel', 'Chutes'],
        [
          ['Dans la longueur', 'Accentue la profondeur', '≈ 7 %'],
          ['Dans la largeur', 'Élargit, rythme la pièce', '≈ 8 %'],
          ['Diagonale', 'Casse les lignes, agrandit', '≈ 14 %'],
        ]
      )}
      ${tip("<p>Avec des lames très larges, la pose dans la largeur peut créer un effet de barreaudage. Des lames plus étroites, ou une teinte peu contrastée, adoucissent nettement le résultat.</p>")}
      ${warn("<p>Dans une pièce étroite éclairée par une fenêtre en pignon, poser dans la largeur revient à placer tous les joints perpendiculairement aux rayons : les lignes ressortiront fortement en fin de journée.</p>")}

      <h2 id="simuler">Comparer sur vos dimensions</h2>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
  },
];

module.exports = { GUIDES };
