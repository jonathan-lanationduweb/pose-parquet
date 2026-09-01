import { qsa, on } from '../utils/dom.js';

/** Onglets avec navigation clavier (fleches, Home, End). */
export function initTabs(root) {
  const tabs = qsa('[role="tab"]', root);
  const panels = qsa('[role="tabpanel"]', root);
  if (!tabs.length) return;

  const activate = (index, focus = true) => {
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (panels[i]) panels[i].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, index) => {
    on(tab, 'click', () => activate(index, false));
    on(tab, 'keydown', (event) => {
      const map = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in map)) return;
      event.preventDefault();
      activate((map[event.key] + tabs.length) % tabs.length);
    });
  });

  const initial = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  activate(initial < 0 ? 0 : initial, false);
}
