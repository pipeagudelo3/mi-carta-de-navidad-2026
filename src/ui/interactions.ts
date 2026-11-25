import gsap from 'gsap';
import {
  budgetAnswer,
  europaSteps,
  gifts,
  justifications,
  nothingAnswer,
  ornaments,
  ornamentsComplete,
  surpriseMessage,
  wishes,
  wishesComplete,
  type GiftData,
} from '../content';
import { letter } from '../state';
import { confetti } from './confetti';
import { toast } from './toast';

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;

const ICON_CHECK =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500 10 17.500 19 7" /></svg>';
const ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>';

function burstFrom(el: Element, amount = 70) {
  const r = el.getBoundingClientRect();
  confetti((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight, amount);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

// ───────────────────────── Esferas: lo que ya tengo ─────────────────────────
function initOrnaments(reduced: boolean) {
  const host = $('#ornaments');
  const note = $('#ornament-note');
  const title = $('.ornament-note__title', note);
  const text = $('.ornament-note__text', note);
  const seen = new Set<string>();
  const lengths = [30, 58, 16, 50, 26];

  ornaments.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ornament';
    b.style.setProperty('--c', o.color);
    b.style.setProperty('--s', o.shade);
    b.style.setProperty('--len', `${lengths[i % lengths.length]}px`);
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `
      <span class="ornament__swing">
        <span class="ornament__string"></span>
        <span class="ornament__cap"></span>
        <span class="ornament__ball"></span>
      </span>
      <span class="ornament__label">${escapeHtml(o.label)}</span>`;
    b.addEventListener('click', () => {
      host.querySelectorAll('.ornament').forEach((el) => el.classList.remove('is-active'));
      b.classList.add('is-active', 'is-seen');
      b.setAttribute('aria-pressed', 'true');
      if (!reduced) {
        gsap.fromTo(
          $('.ornament__swing', b),
          { rotation: i % 2 ? 16 : -16 },
          { rotation: 0, duration: 2.2, ease: 'elastic.out(1.1, 0.22)' },
        );
      }
      note.style.setProperty('--c', o.color);
      note.classList.add('is-on');
      title.textContent = o.label;
      text.textContent = o.message;
      if (!reduced) gsap.fromTo([title, text], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 });

      const before = seen.size;
      seen.add(o.id);
      if (before < ornaments.length && seen.size === ornaments.length) {
        window.setTimeout(() => {
          toast(ornamentsComplete, 5600);
          burstFrom(host, 60);
        }, 900);
      }
    });
    host.appendChild(b);
  });
}

// ───────────────────────── Lista de deseos ─────────────────────────
function initWishes() {
  const host = $('#wishes');
  const done = $('#wishes-done');
  wishes.forEach((w) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wish';
    b.dataset.id = w.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `
      <span class="wish__check">${ICON_CHECK}</span>
      <span class="wish__text">${escapeHtml(w.label)}</span>
      <span class="wish__action"><span class="wish__add">${ICON_PLUS} Agregar</span><span class="wish__added">En mi lista</span></span>`;
    b.addEventListener('click', () => {
      const added = letter.toggle({ id: w.id, label: w.label, kind: 'wish' });
      if (added && wishes.every((x) => letter.has(x.id))) {
        done.textContent = wishesComplete;
        burstFrom(b, 80);
      }
    });
    li.appendChild(b);
    host.appendChild(li);
  });
  letter.subscribe(() => {
    host.querySelectorAll<HTMLButtonElement>('.wish').forEach((b) => {
      const on = letter.has(b.dataset.id!);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (!wishes.every((x) => letter.has(x.id))) done.textContent = '';
  });
}

// ───────────────────────── Regalos ─────────────────────────
const FUND_LEVELS = [7, 28, 49, 71, 90, 99];
let fundStep = 0;
let pantsShort = false;
const opened = new Set<string>();

const FACES = ['front', 'back', 'left', 'right', 'top'].map((f) => `<i class="f f--${f}"></i>`).join('');

function pantsSvg() {
  return `
  <svg class="pants__svg" viewBox="0 0 200 240" role="img" aria-label="Ilustración de un pantalón convertible">
    <g class="pants__lower pants__lower--l">
      <path d="M35 126h57l-4 100H44z" />
      <path class="pants__hem" d="M43.500 214h44.900" />
    </g>
    <g class="pants__lower pants__lower--r">
      <path d="M108 126h57l-9 100h-44z" />
      <path class="pants__hem" d="M111.600 214h45.500" />
    </g>
    <g class="pants__upper">
      <path d="M40 12h120l6 110h-58l-8-52-8 52H34z" />
      <path class="pants__band" d="M40 12h120l1 16H39z" />
      <path class="pants__detail" d="M52 34c2 14 10 20 22 22M148 34c-2 14-10 20-22 22M100 28v40" />
      <rect class="pants__pocket" x="46" y="78" width="26" height="24" rx="3" />
      <rect class="pants__pocket" x="128" y="78" width="26" height="24" rx="3" />
    </g>
    <path class="pants__zip" d="M34 124h58M108 124h58" />
  </svg>`;
}

function renderGift(g: GiftData): string {
  const added = letter.has(g.id);
  let widget = '';
  if (g.widget === 'europa') {
    const pct = FUND_LEVELS[fundStep];
    widget = `
      <div class="fund">
        <div class="fund__head"><span>Fondo para Europa</span><b data-fund-pct>${pct} %</b></div>
        <div class="fund__bar" role="progressbar" aria-label="Fondo para Europa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <span data-fund-fill style="width:${pct}%"></span>
          <svg data-fund-plane style="left:${pct}%" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.500 13.500 21 4.500l-5 15-3.500-6.500z" /><path d="M12.500 13 21 4.500" /></svg>
        </div>
        <p class="fund__note" data-fund-note>${fundStep === 0 ? 'Por ahora, financiado con puras ganas.' : escapeHtml(europaSteps[fundStep - 1])}</p>
        <button class="btn btn--ghost btn--sm" type="button" data-fund ${fundStep >= FUND_LEVELS.length - 1 ? 'disabled' : ''}>Aportar buena energía</button>
      </div>`;
  } else if (g.widget === 'pants') {
    widget = `
      <div class="pants ${pantsShort ? 'is-short' : ''}">
        ${pantsSvg()}
        <div class="pants__side">
          <p class="pants__mode" data-pants-mode aria-live="polite">${pantsShort ? 'Modo pantaloneta' : 'Modo pantalón largo'}</p>
          <button class="btn btn--ghost btn--sm" type="button" data-pants aria-pressed="${pantsShort}">${pantsShort ? 'Volver a pantalón' : 'Convertir en pantaloneta'}</button>
          <p class="pants__tip">Clima frío: pantalón. Clima cálido: pantaloneta. Clima indeciso: los dos el mismo día.</p>
        </div>
      </div>`;
  } else if (g.widget === 'surprise') {
    widget = `<p class="surprise">${escapeHtml(surpriseMessage)}</p>`;
  }

  const justification = g.justification
    ? `<figure class="justif">
        <figcaption>Departamento de justificación de regalos</figcaption>
        <blockquote>${escapeHtml(g.justification)}</blockquote>
      </figure>`
    : '';

  const meters = g.meters
    ? `<div class="meters" aria-label="Necesidad frente a ganas">
        ${g.meters
          .map(
            (m, i) => `
          <div class="meter ${i === 1 ? 'meter--want' : ''}">
            <div class="meter__head"><span>${escapeHtml(m.label)}</span><b>${escapeHtml(m.text)}</b></div>
            <div class="meter__bar"><span style="--v:${m.value}%"></span></div>
          </div>`,
          )
          .join('')}
      </div>`
    : '';

  const facts = g.facts
    ? `<dl class="facts">${g.facts
        .map((f) => `<div><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`)
        .join('')}</dl>`
    : '';

  return `
    <p class="sheet__kicker">Sugerencia opcional n.º ${g.number}</p>
    <h3 id="gift-dialog-title">${escapeHtml(g.name)}</h3>
    <p class="sheet__desc">${escapeHtml(g.description)}</p>
    ${widget}
    ${justification}
    ${meters}
    ${facts}
    <div class="sheet__actions">
      <button class="btn btn--primary ${added ? 'is-added' : ''}" type="button" data-add aria-pressed="${added}">
        ${added ? `${ICON_CHECK}<span>En la carta</span>` : `${ICON_PLUS}<span>Agregar a la carta</span>`}
      </button>
      <button class="btn btn--text" type="button" data-close>Seguir mirando</button>
    </div>`;
}

function openDialog(d: HTMLDialogElement) {
  if (typeof d.showModal === 'function') d.showModal();
  else d.setAttribute('open', '');
  document.documentElement.classList.add('has-dialog');
  // El diálogo vive en la capa superior del navegador: el confeti y los mensajes se mudan con él
  d.append(document.getElementById('toasts')!, document.getElementById('confetti')!);
}

function wireDialog(d: HTMLDialogElement) {
  const close = () => {
    if (!d.open) return;
    d.classList.add('is-closing');
    window.setTimeout(() => {
      d.classList.remove('is-closing');
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }, 220);
  };
  d.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t === d || t.closest('[data-close]')) close();
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  d.addEventListener('close', () => {
    document.documentElement.classList.remove('has-dialog');
    document.body.append(document.getElementById('toasts')!, document.getElementById('confetti')!);
  });
}

function initGifts(reduced: boolean) {
  const host = $('#gifts');
  const dialog = $<HTMLDialogElement>('#gift-dialog');
  const body = $('#gift-dialog-body');
  wireDialog(dialog);
  let current: GiftData | null = null;

  const show = (g: GiftData) => {
    current = g;
    body.innerHTML = renderGift(g);
    dialog.style.setProperty('--c', g.color);
    openDialog(dialog);
    body.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-in')));
    if (g.confetti) window.setTimeout(() => confetti(0.5, 0.45, 130), 250);
  };
  dialog.addEventListener('close', () => body.classList.remove('is-in'));

  gifts.forEach((g, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gift';
    b.dataset.id = g.id;
    b.style.setProperty('--c', g.color);
    b.style.setProperty('--r', g.ribbon);
    b.style.setProperty('--i', String(i));
    b.setAttribute('aria-label', `Abrir el regalo ${i + 1}`);
    b.innerHTML = `
      <span class="gift__stage" aria-hidden="true">
        <span class="gift__shadow"></span>
        <span class="box">
          ${FACES}
          <span class="box__lid">${FACES}</span>
        </span>
        <span class="box__glow"></span>
      </span>
      <span class="gift__num">Regalo ${g.number}</span>
      <span class="gift__name">${g.widget === 'surprise' ? 'Misterioso' : 'Toca para abrir'}</span>
      <span class="gift__badge">${ICON_CHECK}</span>`;
    b.addEventListener('click', () => {
      if (opened.has(g.id) || reduced) {
        markOpened(b, g);
        show(g);
        return;
      }
      if (b.classList.contains('is-opening')) return;
      b.classList.add('is-opening');
      window.setTimeout(() => {
        b.classList.remove('is-opening');
        markOpened(b, g);
        show(g);
      }, 780);
    });
    host.appendChild(b);
  });

  function markOpened(b: HTMLElement, g: GiftData) {
    opened.add(g.id);
    b.classList.add('is-open');
    b.setAttribute('aria-label', g.name);
    $('.gift__name', b).textContent = g.short;
  }

  body.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (!current) return;
    const g = current;

    if (t.closest('[data-add]')) {
      const added = letter.toggle({ id: g.id, label: g.short, kind: 'gift' });
      const btn = t.closest<HTMLButtonElement>('[data-add]')!;
      btn.classList.toggle('is-added', added);
      btn.setAttribute('aria-pressed', String(added));
      btn.innerHTML = added ? `${ICON_CHECK}<span>En la carta</span>` : `${ICON_PLUS}<span>Agregar a la carta</span>`;
      if (added) {
        toast(g.addedToast);
        burstFrom(btn, 36);
      }
    }

    if (t.closest('[data-fund]')) {
      const btn = t.closest<HTMLButtonElement>('[data-fund]')!;
      if (fundStep < FUND_LEVELS.length - 1) {
        fundStep++;
        const pct = FUND_LEVELS[fundStep];
        $('[data-fund-fill]', body).style.width = `${pct}%`;
        $('[data-fund-plane]', body).style.left = `${pct}%`;
        $('[data-fund-pct]', body).textContent = `${pct} %`;
        $('.fund__bar', body).setAttribute('aria-valuenow', String(pct));
        $('[data-fund-note]', body).textContent = europaSteps[fundStep - 1];
        if (fundStep === FUND_LEVELS.length - 1) {
          btn.disabled = true;
          burstFrom(btn, 50);
        }
      }
    }

    if (t.closest('[data-pants]')) {
      pantsShort = !pantsShort;
      const btn = t.closest<HTMLButtonElement>('[data-pants]')!;
      $('.pants', body).classList.toggle('is-short', pantsShort);
      btn.setAttribute('aria-pressed', String(pantsShort));
      btn.textContent = pantsShort ? 'Volver a pantalón' : 'Convertir en pantaloneta';
      $('[data-pants-mode]', body).textContent = pantsShort ? 'Modo pantaloneta' : 'Modo pantalón largo';
    }
  });

  letter.subscribe(() => {
    host.querySelectorAll<HTMLElement>('.gift').forEach((b) => {
      b.classList.toggle('is-added', letter.has(b.dataset.id!));
    });
  });
}

// ───────────────────────── Departamento de justificación ─────────────────────────
function initDepartment(reduced: boolean) {
  const quote = $('#dept-quote');
  const stamp = $('.dept__stamp');
  let n = 0;
  const say = (text: string, cls = '') => {
    quote.className = `dept__quote ${cls}`;
    quote.textContent = text;
    if (!reduced) {
      gsap.fromTo(quote, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      gsap.fromTo(stamp, { scale: 1.5, rotation: -4, opacity: 0.2 }, { scale: 1, rotation: -11, opacity: 1, duration: 0.45, ease: 'back.out(2.5)' });
    }
  };
  const hint = $('#dept-hint');
  const btnJustify = $('#btn-justify');
  const total = justifications.length;
  const baseHint = `Presiona varias veces «Emitir justificación oficial»: cada vez sale una justificación distinta. Son ${total} en total.`;
  hint.textContent = baseHint;
  btnJustify.addEventListener('click', () => {
    const i = n % total;
    say(justifications[i]);
    n++;
    const left = total - 1 - i;
    hint.textContent =
      left > 0
        ? `Justificación ${i + 1} de ${total}. Presiona otra vez para leer la siguiente (${left === 1 ? 'falta 1' : `faltan ${left}`}).`
        : `Justificación ${total} de ${total}. Ya las leíste todas; si presionas otra vez, vuelven a empezar.`;
    btnJustify.textContent = left > 0 ? 'Emitir la siguiente justificación' : 'Emitir justificación oficial';
  });
  $('#btn-budget').addEventListener('click', () => say(`«${budgetAnswer}»`, 'is-official'));
  $('#btn-nothing').addEventListener('click', (e) => {
    say(nothingAnswer, 'is-heart');
    burstFrom(e.currentTarget as Element, 110);
  });
}

// ───────────────────────── Mi carta (resumen) ─────────────────────────
function initLetter(reduced: boolean) {
  const chip = $('#letter-chip');
  const count = $('#letter-count');
  const dialog = $<HTMLDialogElement>('#letter-dialog');
  const body = $('#letter-dialog-body');
  wireDialog(dialog);

  letter.subscribe((items, changed, added) => {
    count.textContent = String(items.length);
    chip.classList.toggle('has-items', items.length > 0);
    chip.setAttribute('aria-label', `Mi carta: ${items.length} ${items.length === 1 ? 'deseo seleccionado' : 'deseos seleccionados'}`);
    if (changed && added && !reduced) {
      gsap.fromTo(chip, { scale: 1.16 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
    }
  });

  chip.addEventListener('click', () => {
    const items = letter.all();
    const w = items.filter((i) => i.kind === 'wish');
    const g = items.filter((i) => i.kind === 'gift');
    const list = (arr: typeof items) => arr.map((i) => `<li>${ICON_CHECK}<span>${escapeHtml(i.label)}</span></li>`).join('');
    body.innerHTML = `
      <p class="sheet__kicker">Navidad 2026</p>
      <h3 id="letter-dialog-title">Mi carta</h3>
      ${
        items.length === 0
          ? `<p class="sheet__desc">Todavía está en blanco. Y, siendo sincero, así también está perfecta: lo importante ya lo tengo.</p>
             <p class="sheet__desc sheet__desc--muted">Más abajo puedes agregar deseos tocando «Agregar».</p>`
          : `
        ${w.length ? `<h4>Lo importante</h4><ul class="letter-list">${list(w)}</ul>` : ''}
        ${g.length ? `<h4>Lo completamente opcional</h4><ul class="letter-list letter-list--gifts">${list(g)}</ul>` : ''}
        <p class="letter-total"><span>Total a pagar</span><b>$ 0</b></p>
        <p class="sheet__desc sheet__desc--muted">Lo importante de esta carta ya está pago, y con creces, por ustedes.</p>`
      }
      <div class="sheet__actions"><button class="btn btn--primary" type="button" data-close>Listo</button></div>`;
    openDialog(dialog);
    requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-in')));
  });
  dialog.addEventListener('close', () => body.classList.remove('is-in'));
}

export function initInteractions(reduced: boolean) {
  initOrnaments(reduced);
  initWishes();
  initGifts(reduced);
  initDepartment(reduced);
  initLetter(reduced);
}
