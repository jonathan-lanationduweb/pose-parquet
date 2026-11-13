import { qs, qsa, on } from '../utils/dom.js';



export function initToc(root) {
  const article = document.getElementById(root.dataset.tocFor || 'article-content');
  if (!article) return;

  const headings = qsa('h2[id], h3[id]', article);
  const list = qs('ol', root);
  if (!headings.length || !list) return;

  headings.forEach((heading) => {
    const item = document.createElement('li');
    if (heading.tagName === 'H3') item.className = 'toc__sub';
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.dataset.tocLabel || heading.textContent;
    item.appendChild(link);
    list.appendChild(item);
  });

  const links = qsa('a', list);

  const courant = qs('[data-toc-courant]', root);
  if (root.tagName === 'DETAILS') {
    links.forEach((link) => on(link, 'click', () => { root.open = false; }));
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.dataset.active = String(link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );
  headings.forEach((heading) => observer.observe(heading));



  if (courant) {
    let prevu = false;
    const majCourant = () => {
      prevu = false;
      const seuil = root.getBoundingClientRect().bottom + 24;
      let actuel = null;
      headings.forEach((heading) => { if (heading.getBoundingClientRect().top <= seuil) actuel = heading; });
      const texte = actuel ? actuel.dataset.tocLabel || actuel.textContent : '';
      if (courant.textContent !== texte) courant.textContent = texte;
    };
    on(window, 'scroll', () => { if (!prevu) { prevu = true; window.requestAnimationFrame(majCourant); } }, { passive: true });
    majCourant();
  }
}


export function initReadingProgress() {
  const bar = qs('[data-reading-progress]');
  const article = document.getElementById('article-content');
  if (!bar || !article) return;

  const update = () => {
    const start = article.offsetTop;
    const height = article.offsetHeight - window.innerHeight;
    const ratio = height > 0 ? (window.scrollY - start) / height : 0;
    bar.style.setProperty('--progress', String(Math.min(Math.max(ratio, 0), 1)));
  };
  update();
  on(window, 'scroll', update, { passive: true });
  on(window, 'resize', update);
}
