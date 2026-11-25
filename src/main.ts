import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource-variable/manrope/index.css';
import '@fontsource/great-vibes/latin-400.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneGiftMessages, starMessage } from './content';
import { letter } from './state';
import { initInteractions } from './ui/interactions';
import { confetti, setConfettiEnabled } from './ui/confetti';
import { toast } from './ui/toast';
import { isMusicSupported, setMusic } from './audio/music';
import { initPersonal } from './ui/personal';
import type { World } from './scene/world';

gsap.registerPlugin(ScrollTrigger);
initPersonal();

const params = new URLSearchParams(location.search);
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

root.classList.add('js');
if (reduced) root.classList.add('reduced-motion');
if (params.has('og')) root.classList.add('og-mode');
setConfettiEnabled(!reduced);

let world: World | null = null;
let opened = false;
let finaleOn = false;

// ───────────────────────── Escena 3D (carga diferida) ─────────────────────────
function hasWebGL(): boolean {
  if (params.has('nowebgl')) return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function useFallback() {
  root.classList.add('no-webgl');
  $('#hero-hint').textContent = 'Hecha con cariño. Ábrela con calma.';
}

async function loadWorld() {
  if (!hasWebGL()) {
    useFallback();
    return;
  }
  try {
    const { createWorld } = await import('./scene/world');
    world = createWorld($<HTMLCanvasElement>('#scene'), {
      reducedMotion: reduced,
      mobile,
      onReady: () => root.classList.add('scene-ready'),
    });
    world.setSnow(snowOn);
    remeasure();
    updateLit();
    window.setTimeout(updateFraming, 2200);
  } catch (err) {
    console.warn('No fue posible iniciar la escena 3D; se usa la alternativa visual.', err);
    world = null;
    useFallback();
  }
}

// ───────────────────────── Scroll → cámara ─────────────────────────
let chapters: HTMLElement[] = [];
let tops: number[] = [];
const progressBar = $('#progress-bar');

function measure() {
  chapters = [$('#inicio'), ...document.querySelectorAll<HTMLElement>('#carta > section')];
  tops = chapters.map((el) => el.getBoundingClientRect().top + window.scrollY);
}

function updateFraming() {
  if (!world || !tops.length) return;
  const vh = window.innerHeight;
  const below = (sel: string, top: number) =>
    (document.querySelector(sel)!.getBoundingClientRect().bottom + window.scrollY - top + 30) / vh;
  const last = tops.length - 1;
  world.setFraming(below('.hero__subtitle', tops[0]), opened && last > 0 ? below('#finale-words', tops[last]) : 0);
}

function updateScroll() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  if (world) {
    const blends: number[] = [];
    if (opened) {
      for (let i = 1; i < tops.length; i++) {
        blends.push(Math.min(1, Math.max(0, (y + vh - tops[i]) / vh)));
      }
    }
    world.setBlends(blends);
  }
  const max = document.documentElement.scrollHeight - vh;
  progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
}

function updateLit() {
  world?.setLit(finaleOn ? 1 : Math.min(0.97, 0.5 + letter.count() * 0.036));
}

let scrollQueued = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      updateScroll();
    });
  },
  { passive: true },
);
const remeasure = () => {
  measure();
  updateScroll();
  updateFraming();
};
window.addEventListener('resize', remeasure);
if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.getElementById('carta')!);

// ───────────────────────── Controles: nieve y música ─────────────────────────
let snowOn = !reduced;
const btnSnow = $('#btn-snow');
btnSnow.setAttribute('aria-pressed', String(snowOn));
root.classList.toggle('snow-off', !snowOn);
btnSnow.addEventListener('click', () => {
  snowOn = !snowOn;
  btnSnow.setAttribute('aria-pressed', String(snowOn));
  root.classList.toggle('snow-off', !snowOn);
  world?.setSnow(snowOn);
  toast(snowOn ? 'Nieve activada. Abríguense.' : 'Nieve en pausa. Se despejó la noche.', 2400);
});

let musicOn = false;
const btnMusic = $('#btn-music');
if (!isMusicSupported()) btnMusic.hidden = true;
btnMusic.addEventListener('click', async () => {
  musicOn = await setMusic(!musicOn);
  btnMusic.setAttribute('aria-pressed', String(musicOn));
  btnMusic.classList.remove('is-hinting');
  if (musicOn) toast('Suena «Noche de paz», en versión caja de música.', 3000);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && musicOn) {
    void setMusic(false);
    musicOn = false;
    btnMusic.setAttribute('aria-pressed', 'false');
  }
});

// ───────────────────────── Puntero: paralaje y regalos del árbol ─────────────────────────
const inScene = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el || !el.closest) return false;
  if (el.closest('button, a, dialog, .hud')) return false;
  return !!el.closest('.hero, .finale');
};

window.addEventListener(
  'pointermove',
  (e) => {
    if (!world) return;
    world.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    if (e.pointerType === 'mouse') {
      const over = inScene(e.target) && world.hover(e.clientX, e.clientY);
      root.classList.toggle('can-poke', over);
    }
  },
  { passive: true },
);

let pokes = 0;
document.addEventListener('click', (e) => {
  if (!world || !inScene(e.target)) return;
  const hit = world.pick(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.type === 'star') {
    world.pokeStar();
    toast(starMessage);
    confetti(e.clientX / window.innerWidth, e.clientY / window.innerHeight, 40);
  } else {
    world.pokeGift(hit.index);
    toast(sceneGiftMessages[(hit.index + pokes) % sceneGiftMessages.length], 3600);
    pokes++;
  }
});

// ───────────────────────── Abrir la carta ─────────────────────────
const btnOpen = $<HTMLButtonElement>('#btn-open');
const carta = $('#carta');
const flash = $('#flash');
const wait = (s: number) => new Promise<void>((r) => window.setTimeout(r, s * 1000));

async function openLetter() {
  if (opened) {
    $('#lo-que-tengo').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    return;
  }
  opened = true;
  btnOpen.disabled = true;
  const heroParts = ['.hero__content', '.hero__actions'];
  const dur = reduced ? 0.25 : 1.9;

  if (!reduced) {
    gsap.to(heroParts, { opacity: 0, y: -24, duration: 0.7, ease: 'power2.in', stagger: 0.05 });
    void world?.playOpen(dur);
  }
  gsap.to(flash, {
    opacity: 1,
    duration: reduced ? 0.25 : 0.75,
    delay: reduced ? 0 : dur - 0.75,
    ease: 'power2.in',
  });
  await wait(dur + 0.05);

  carta.hidden = false;
  document.body.classList.remove('is-sealed');
  $('#letter-chip').hidden = false;
  $('#btn-open-label').textContent = 'Seguir leyendo';
  btnOpen.disabled = false;
  gsap.set(heroParts, { opacity: 1, y: 0 });

  measure();
  window.scrollTo({ top: tops[1], behavior: 'instant' as ScrollBehavior });
  world?.resetOpen();
  remeasure();
  world?.snap();
  initLetterAnimations();
  ScrollTrigger.refresh();
  $('#t2').setAttribute('tabindex', '-1');
  $('#t2').focus({ preventScroll: true });

  gsap.to(flash, { opacity: 0, duration: reduced ? 0.3 : 1.3, ease: 'power2.out' });
  if (!musicOn && !btnMusic.hidden) btnMusic.classList.add('is-hinting');
}
btnOpen.addEventListener('click', () => void openLetter());

$('#btn-again').addEventListener('click', () => {
  window.scrollTo({ top: tops[1] ?? 0, behavior: reduced ? 'auto' : 'smooth' });
});

// ───────────────────────── Animaciones de lectura ─────────────────────────
function initLetterAnimations() {
  // Aparición suave de los textos
  if (!reduced) {
    const items = gsap.utils.toArray<HTMLElement>('#carta [data-reveal]');
    gsap.set(items, { opacity: 0, y: 26 });
    ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.12, overwrite: true }),
    });
  }

  // Camino de estrellas
  const trail = $('#trail');
  const trailItems = gsap.utils.toArray<HTMLElement>('.trail__item');
  let litCount = 0;
  trailItems.forEach((item, i) => {
    ScrollTrigger.create({
      trigger: item,
      start: 'top 70%',
      onEnter: () => {
        item.classList.add('is-lit');
        litCount = Math.max(litCount, i + 1);
        world?.setMemoryProgress(litCount / trailItems.length);
      },
    });
  });
  ScrollTrigger.create({
    trigger: trail,
    start: 'top 70%',
    end: 'bottom 70%',
    onUpdate: (self) => trail.style.setProperty('--fill', String(self.progress)),
  });

  // Cierre: el árbol se enciende por completo
  const words = gsap.utils.toArray<HTMLElement>('#finale-words span');
  if (!reduced) gsap.set(words, { opacity: 0, y: 18, filter: 'blur(6px)' });
  ScrollTrigger.create({
    trigger: '#finale',
    start: 'top 45%',
    onEnter: () => {
      finaleOn = true;
      world?.setFinale(true);
      updateLit();
      root.classList.add('is-finale');
      if (!reduced) {
        gsap.to(words, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.16,
          delay: 1.1,
        });
        window.setTimeout(() => finaleOn && confetti(0.5, 0.5, 120), 2900);
      }
    },
    onLeaveBack: () => {
      finaleOn = false;
      world?.setFinale(false);
      updateLit();
      root.classList.remove('is-finale');
    },
  });
}

// ───────────────────────── Arranque ─────────────────────────
initInteractions(reduced);
letter.subscribe(() => updateLit());
measure();
updateScroll();

// La portada entra con suavidad
if (!reduced) {
  gsap.from('.hero__eyebrow, .hero__title, .hero__subtitle, .hero__actions', {
    opacity: 0,
    y: 22,
    duration: 1.2,
    ease: 'power3.out',
    stagger: 0.16,
    delay: 0.25,
  });
}

// La escena 3D se descarga después del primer pintado
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(() => void loadWorld(), { timeout: 600 });
} else {
  setTimeout(() => void loadWorld(), 60);
}

if (document.fonts?.ready) {
  void document.fonts.ready.then(() => {
    remeasure();
    if (opened) ScrollTrigger.refresh();
  });
}
