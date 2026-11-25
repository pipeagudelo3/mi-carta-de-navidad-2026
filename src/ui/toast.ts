const host = () => document.getElementById('toasts')!;

export function toast(message: string, duration = 4600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  const h = host();
  while (h.children.length >= 2) h.firstElementChild?.remove();
  h.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  window.setTimeout(() => {
    el.classList.remove('is-in');
    window.setTimeout(() => el.remove(), 400);
  }, duration);
}
