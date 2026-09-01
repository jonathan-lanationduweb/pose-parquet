/* Fragments HTML réutilisables pour le contenu éditorial. */

const ICON = {
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.2 17.5h5.6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8V15h7.2v-1.2A6 6 0 0 0 12 3Z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5 2.8 20h18.4L12 4.5Z"/><path d="M12 10v4"/><path d="M12 17.2h.01"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9 17.5 20 6.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 12.5 5 5L20 6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></svg>',
};

const callout = (type, label, body) => {
  const icon = type === 'warning' ? ICON.alert : type === 'key' ? ICON.key : ICON.bulb;
  const cls = type === 'warning' ? ' callout--warning' : type === 'key' ? ' callout--key' : '';
  return `<aside class="callout${cls}">
        <p class="callout__label">${icon}${label}</p>
        ${body}
      </aside>`;
};

const tip = (body) => callout('tip', 'Conseil', body);
const warn = (body) => callout('warning', 'Erreur à éviter', body);
const key = (body) => callout('key', 'À retenir', body);

const figure = (src, alt, caption, w = 1400, h = 875) => `<figure>
        <img src="${src}" alt="${alt}" loading="lazy" decoding="async" width="${w}" height="${h}" />
        <figcaption>${caption}</figcaption>
      </figure>`;

const table = (head, rows) => `<div class="table-wrap">
        <table class="table-compare">
          <thead><tr>${head.map((cell) => `<th scope="col">${cell}</th>`).join('')}</tr></thead>
          <tbody>${rows
            .map(
              (row) =>
                `<tr><th scope="row">${row[0]}</th>${row.slice(1).map((cell) => `<td>${cell}</td>`).join('')}</tr>`
            )
            .join('')}</tbody>
        </table>
      </div>`;

const steps = (items) => `<ol class="steps">${items
  .map((item) => `<li><h3>${item.title}</h3><p>${item.text}</p></li>`)
  .join('')}</ol>`;

const faq = (items) => `<div class="accordion" data-multiple="false">
        ${items
          .map(
            (item, index) => `<div class="accordion__item" data-open="${index === 0 ? 'true' : 'false'}">
          <h3><button class="accordion__trigger" type="button" aria-expanded="${index === 0}">
            <span>${item.q}</span><span class="accordion__icon" aria-hidden="true"></span>
          </button></h3>
          <div class="accordion__panel"><div><p>${item.a}</p></div></div>
        </div>`
          )
          .join('')}
      </div>`;

const faqJsonLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a.replace(/<[^>]+>/g, '') },
  })),
});

const beforeAfter = (before, after, labelBefore, labelAfter) => `<div class="ba">
        <div class="ba__layer"><img src="${before}" alt="${labelBefore}" loading="lazy" decoding="async" width="1200" height="750" /></div>
        <div class="ba__layer ba__layer--after"><img src="${after}" alt="${labelAfter}" loading="lazy" decoding="async" width="1200" height="750" /></div>
        <span class="ba__tag ba__tag--before">${labelBefore}</span>
        <span class="ba__tag ba__tag--after">${labelAfter}</span>
        <input class="ba__range" type="range" min="0" max="100" value="50" aria-label="Comparer avant et après" />
        <span class="ba__handle" aria-hidden="true"></span>
      </div>`;

const cta = (href, label, className = 'btn') =>
  `<a class="${className}" href="${href}">${label}${className.includes('btn') ? ICON.arrow.replace('<svg', '<svg class="btn__icon"') : ''}</a>`;

const linkArrow = (href, label) =>
  `<a class="link-arrow" href="${href}">${label}${ICON.arrow}</a>`;

module.exports = { ICON, callout, tip, warn, key, figure, table, steps, faq, faqJsonLd, beforeAfter, cta, linkArrow };
