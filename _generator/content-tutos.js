const { tip, warn, key, steps, table } = require('./ui');

const TUTOS = [
  {
    slug: 'poser-un-parquet-flottant',
    title: 'Poser un parquet flottant : tutoriel pas à pas | Pose Parquet',
    h1: 'Poser un parquet flottant, étape par étape',
    description:
      "Sous-couche, calepinage, première rangée, coupes de rive, plinthes : le déroulé complet d'une pose flottante réussie, avec les points de contrôle.",
    level: 'Accessible',
    duration: '1 journée pour 20 m²',
    reading: '9 min',
    excerpt: "Le tutoriel de référence : de la sous-couche aux plinthes, avec les points de contrôle.",
    lead:
      "La pose flottante est la plus accessible : les lames s'emboîtent sans être fixées au support. Sa réussite tient entièrement à la préparation et au calepinage.",
    tools: ['Scie sauteuse ou scie à onglet', 'Cordeau et mètre', 'Cales de dilatation', 'Tire-lame et cale à frapper', 'Équerre'],
    body: `
      <h2 id="avant">Avant de commencer</h2>
      <p>Trois conditions doivent être réunies : support plan à 3 mm sous la règle de 2 mètres, support sec et propre, parquet acclimaté depuis 48 heures dans la pièce.</p>
      ${warn("<p>Si l'une des trois conditions n'est pas remplie, la pose peut attendre. Aucune technique de pose ne compense un support humide ou irrégulier.</p>")}

      <h2 id="etapes">Le déroulé</h2>
      ${steps([
        { title: 'Dérouler la sous-couche', text: "Lés jointifs, remontée de 3 à 4 cm le long des murs, adhésif d'étanchéité entre les lés si le produit le prévoit." },
        { title: 'Calculer le calepinage', text: "Divisez la largeur de la pièce par la largeur d'une lame. Si la dernière rangée fait moins d'un tiers de lame, retirez cette largeur à la première rangée." },
        { title: 'Poser la première rangée', text: 'Languette contre le mur, cales de 8 à 10 mm sur tout le pourtour. C’est la rangée la plus importante : elle conditionne tout le reste.' },
        { title: 'Progresser par rangées', text: "Décalage des joints d'au moins un tiers de lame, en alternant les décalages et en piochant dans plusieurs paquets." },
        { title: 'Traiter les obstacles', text: "Tuyaux, huisseries, seuils : percez au diamètre du tuyau plus 16 mm, recoupez la chute et recollez-la derrière." },
        { title: 'Poser la dernière rangée', text: 'Coupe à la largeur relevée en trois points, mise en place au tire-lame.' },
        { title: 'Retirer les cales et poser les plinthes', text: 'Les plinthes se fixent au mur, jamais au parquet : le plancher doit rester libre de bouger.' },
      ])}

      <h2 id="controles">Les points de contrôle</h2>
      ${table(
        ['Moment', 'Contrôle', 'Attendu'],
        [
          ['Avant la pose', 'Planéité et humidité', '≤ 3 mm / 2 m, support sec'],
          ['Rangée 1', 'Alignement au cordeau', 'Écart nul sur toute la longueur'],
          ['Toutes les 3 rangées', 'Équerrage et jeux', 'Cales en place, joints serrés'],
          ['Fin de chantier', 'Jeu périphérique', '8 à 10 mm sur tout le pourtour'],
        ]
      )}
      ${tip("<p>Posez toujours dans le sens de la lumière quand c'est possible, et travaillez en éclairage rasant : les défauts d'emboîtement se voient immédiatement.</p>")}
      ${key("<ul><li>La première rangée conditionne toute la pose.</li><li>Les cales restent en place jusqu'aux plinthes.</li><li>Les plinthes se fixent au mur, jamais au sol.</li></ul>")}
    `,
    faq: [
      { q: 'Faut-il coller les joints ?', a: "Non avec un système à clic. La colle ne concerne que les anciens systèmes à languette, ou certaines pièces humides selon les préconisations du fabricant." },
      { q: 'Peut-on poser un flottant dans une cuisine ?', a: "Oui avec un produit adapté et un traitement soigné des rives, mais la pose collée reste préférable dans les pièces exposées à l'eau." },
    ],
  },

  {
    slug: 'coller-un-parquet-contrecolle',
    title: 'Coller un parquet contrecollé : méthode pas à pas | Pose Parquet',
    h1: 'Coller un parquet contrecollé',
    description:
      "Primaire, choix de la colle, encollage à la spatule crantée, temps ouvert, marouflage : la méthode de pose collée en plein, étape par étape.",
    level: 'Confirmé',
    duration: '1 à 2 jours pour 20 m²',
    reading: '8 min',
    excerpt: "La pose la plus stable et la plus silencieuse — et la moins tolérante à l'improvisation.",
    lead:
      "La pose collée en plein offre la meilleure stabilité, le meilleur confort acoustique et la compatibilité avec le chauffage au sol. En contrepartie, elle ne pardonne aucune approximation.",
    tools: ['Spatule crantée adaptée à la colle', 'Primaire et rouleau', 'Cordeau', 'Sangles ou poids', 'Scie à onglet'],
    body: `
      <h2 id="support">Préparer le support</h2>
      <p>Le support doit être plan à 5 mm sous la règle de 2 mètres, sec, cohésif et dépoussiéré. Un primaire adapté est appliqué dans la quasi-totalité des cas : il bloque la poussière résiduelle et régule l'absorption.</p>
      ${warn("<p>Sur dalle en rez-de-chaussée sans coupure de capillarité, un primaire époxy bicomposant faisant barrière à l'humidité est indispensable. Une colle seule ne suffit pas.</p>")}

      <h2 id="colle">Choisir la colle</h2>
      ${table(
        ['Type', 'Usage', 'Remarque'],
        [
          ['MS polymère', 'Usage courant, chauffage au sol', 'Élastique, sans solvant'],
          ['Polyuréthane bicomposant', 'Grands formats, massif', 'Très rigide, mise en œuvre exigeante'],
          ['Dispersion acrylique', 'Contrecollé fin sur support absorbant', 'À proscrire sur chauffage au sol'],
        ]
      )}

      <h2 id="etapes">La méthode</h2>
      ${steps([
        { title: 'Tracer et poser à blanc', text: "Alignez la première rangée au cordeau et validez le calepinage avant tout encollage." },
        { title: 'Encoller par zones', text: "Ne jamais encoller plus que la surface posable dans le temps ouvert de la colle, généralement 20 à 40 minutes." },
        { title: 'Poser et maroufler', text: 'Chaque lame est posée puis pressée pour assurer un transfert de colle complet au dos.' },
        { title: 'Contrôler le transfert', text: "Soulevez une lame témoin toutes les dix : le dos doit être couvert à au moins 80 %." },
        { title: 'Laisser durcir sans circulation', text: '24 heures minimum avant de marcher, 72 heures avant de remettre le mobilier lourd.' },
      ])}
      ${tip("<p>Travaillez à deux : un opérateur encolle, l'autre pose. Le respect du temps ouvert est le principal facteur de réussite d'une pose collée.</p>")}
    `,
    faq: [
      { q: 'Faut-il laisser un jeu périphérique en pose collée ?', a: "Oui, plus réduit qu'en flottant : 5 à 8 mm suffisent, mais le jeu reste nécessaire." },
      { q: 'Quand mettre en chauffe un plancher chauffant ?', a: "Après le durcissement complet de la colle, avec une montée progressive de la température, généralement 5 °C par jour." },
    ],
  },

  {
    slug: 'reussir-le-calepinage',
    title: 'Réussir son calepinage de parquet | Pose Parquet',
    h1: 'Réussir son calepinage',
    description:
      "Le calepinage détermine la position des coupes, l'axe de départ et la quantité de matière. Méthode de traçage pour une pose droite et pour un motif.",
    level: 'Accessible',
    duration: '1 à 2 heures',
    reading: '6 min',
    excerpt: "Une heure de traçage évite deux jours de rattrapage.",
    lead:
      "Le calepinage est le plan de pose : il fixe l'axe de départ, la répartition des coupes et le nombre de lames. Il se trace au sol, avant la première lame.",
    tools: ['Cordeau à tracer', 'Mètre 5 m', 'Équerre de maçon', 'Crayon de charpentier'],
    body: `
      <h2 id="pourquoi">Pourquoi tracer avant de poser</h2>
      <p>Une pièce n'est jamais parfaitement rectangulaire. Partir d'un mur revient à reporter son défaut sur toute la surface. Le calepinage permet de répartir l'erreur au lieu de la subir.</p>

      <h2 id="droite">Calepinage d'une pose droite</h2>
      ${steps([
        { title: 'Mesurer la largeur en trois points', text: "Aux deux extrémités et au milieu : l'écart entre ces mesures révèle le défaut d'équerrage." },
        { title: 'Calculer le nombre de rangées', text: "Largeur de la pièce divisée par la largeur utile d'une lame, jeux périphériques déduits." },
        { title: 'Répartir la coupe', text: "Si la dernière rangée fait moins d'un tiers de lame, retirez la moitié de la différence à la première rangée." },
        { title: 'Tracer la ligne de départ au cordeau', text: 'Cette ligne, et non le mur, sert de référence à toute la pose.' },
      ])}

      <h2 id="motif">Calepinage d'un motif</h2>
      <p>Point de Hongrie et bâton rompu se construisent depuis le centre de la pièce. On trace deux axes perpendiculaires passant par le centre, puis on monte le motif de part et d'autre.</p>
      ${warn("<p>Ne prenez jamais un mur comme référence d'axe pour un motif : le décalage se cumule et devient très visible sur la dernière colonne.</p>")}
      ${tip("<p>Photographiez votre tracé avant de poser : en cas de doute en cours de chantier, la photo évite de tout re-mesurer.</p>")}

      <h2 id="simuler">Vérifier le rendu avant de tracer</h2>
      <p>Le simulateur donne un aperçu du calepinage selon vos dimensions et le motif retenu.</p>
      <div data-visualizer data-mode="compact" data-base="../"></div>
    `,
    faq: [
      { q: 'Le calepinage change-t-il la quantité à commander ?', a: "Oui : il permet d'estimer précisément les coupes de rive et donc le pourcentage de chutes réel." },
    ],
  },
];

module.exports = { TUTOS };
