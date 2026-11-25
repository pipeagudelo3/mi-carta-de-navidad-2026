// Personalización por enlace (?para=Nombre) y cuenta regresiva a la Nochebuena.
import { people } from '../content';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);

/** Minúsculas, sin tildes ni signos: «Mamá» → «mama». */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function readRecipient(): { name: string; message?: string } | null {
  const raw = new URLSearchParams(location.search).get('para');
  if (!raw) return null;
  // Solo letras, espacios y guiones; el texto siempre se inserta con textContent.
  const clean = raw
    .replace(/[^\p{L}\p{M} .'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
  if (!clean) return null;
  const key = slug(clean);
  const known = Object.entries(people).find(([k]) => slug(k) === key);
  if (known) return { name: known[1].name, message: known[1].message };
  return { name: clean.charAt(0).toLocaleUpperCase('es') + clean.slice(1) };
}

function countdownText(now = new Date()): string | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eve = new Date(now.getFullYear(), 11, 24);
  const days = Math.round((eve.getTime() - today.getTime()) / 86_400_000);
  if (days > 120) return null;
  if (days > 1) return `Faltan ${days} días para Nochebuena`;
  if (days === 1) return 'Falta 1 día para Nochebuena';
  if (days === 0) return 'Hoy es Nochebuena';
  if (days === -1) return 'Feliz Navidad';
  return null;
}

export function initPersonal() {
  const who = readRecipient();
  if (who) {
    const eyebrow = $('.hero__eyebrow');
    if (eyebrow) eyebrow.textContent = `Para ${who.name}`;
    document.title = `${who.name}, esta carta es para ti · Navidad 2026`;
    const footer = $('#footer-line');
    if (footer) footer.textContent = `Hecha con cariño para ${who.name} y toda la familia · Navidad 2026`;
    const card = $('#dedication');
    if (card && who.message) {
      $('#dedication-to')!.textContent = `Y para ti, ${who.name}`;
      $('#dedication-text')!.textContent = who.message;
      card.hidden = false;
    }
  }

  const text = countdownText();
  if (text) {
    for (const el of document.querySelectorAll<HTMLElement>('[data-countdown]')) {
      el.textContent = text;
      el.hidden = false;
    }
  }
}
