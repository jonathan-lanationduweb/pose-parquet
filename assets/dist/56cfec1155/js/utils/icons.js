/** Icones SVG inline reutilisables (aucune dependance externe). */
const wrap = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

export const icons = {
  arrowRight: wrap('<path d="M5 12h13"/><path d="m12 5 7 7-7 7"/>'),
  arrowLeft: wrap('<path d="M19 12H6"/><path d="m12 19-7-7 7-7"/>'),
  check: wrap('<path d="m4 12.5 5 5L20 6"/>'),
  info: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/>'),
  alert: wrap('<path d="M12 4.5 2.8 20h18.4L12 4.5Z"/><path d="M12 10v4"/><path d="M12 17.2h.01"/>'),
  bulb: wrap('<path d="M9.2 17.5h5.6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8V15h7.2v-1.2A6 6 0 0 0 12 3Z"/>'),
  close: wrap('<path d="m6 6 12 12"/><path d="m18 6-12 12"/>'),
  expand: wrap('<path d="M4 9V4h5"/><path d="M20 15v5h-5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/>'),
  ruler: wrap('<rect x="2.5" y="8.5" width="19" height="7" rx="1.4"/><path d="M7 8.5v3"/><path d="M12 8.5v4"/><path d="M17 8.5v3"/>'),
  sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>'),
  door: wrap('<path d="M4 21h16"/><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21"/><path d="M14.5 12h.01"/>'),
};

export default icons;
