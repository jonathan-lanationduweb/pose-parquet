/** Cycle clavier, arrière-plan inerte et restitution du focus des fenêtres. */
export function activateDialog(dialog, { onClose, initialFocus } = {}) {
  const previous = document.activeElement;
  const muted = [];
  for (let branch = dialog; branch.parentElement; branch = branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling === branch || sibling.inert) continue;
      muted.push(sibling);
      sibling.inert = true;
    }
    if (branch.parentElement === document.body) break;
  }
  const controls = () => [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length && !el.closest('[hidden], [inert]'));
  const focusFirst = () => (initialFocus || controls()[0] || dialog).focus({ preventScroll: true });
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  const keydown = event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose?.();
    } else if (event.key === 'Tab') {
      const items = controls();
      const index = items.indexOf(document.activeElement);
      if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) : items[0] || dialog)?.focus({ preventScroll: true });
      }
    }
  };
  const focusin = event => { if (!dialog.contains(event.target)) focusFirst(); };
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('focusin', focusin, true);
  focusFirst();
  return () => {
    document.removeEventListener('keydown', keydown, true);
    document.removeEventListener('focusin', focusin, true);
    muted.forEach(el => { el.inert = false; });
    if (previous?.isConnected && !previous.closest('[hidden], [inert]')) previous.focus({ preventScroll: true });
  };
}
