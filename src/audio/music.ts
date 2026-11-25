// Música navideña instrumental generada en el navegador con Web Audio.
// Melodía: «Noche de paz» (Franz X. Gruber, 1818), obra en dominio público.
// No se usa ninguna grabación: el sonido de caja de música se sintetiza aquí,
// así que no hay archivos de audio ni licencias de terceros.

type Note = [pitch: string | null, beats: number];

const BEAT = 0.66; // segundos por negra

const MELODY: Note[] = [
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['B4', 3],
  ['C5', 2], ['C5', 1], ['G4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
  ['C5', 3], ['E5', 3],
  ['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
  ['C4', 3], [null, 3],
];

// Un acorde por compás (3 tiempos): fundamental, quinta y tercera
const CHORDS: Record<string, [string, string, string]> = {
  C: ['C3', 'G3', 'E4'],
  G: ['G2', 'D3', 'B3'],
  F: ['F2', 'C3', 'A3'],
};
const BARS = ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C', 'G', 'G', 'C', 'C', 'C', 'G', 'C', 'C'];

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(note: string): number {
  const semis = SEMITONES[note[0]] + (Number(note.slice(1)) - 4) * 12 - 9;
  return 440 * Math.pow(2, semis / 12);
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer = 0;
let playing = false;
let nextBar = 0;
let barIndex = 0;

// Melodía agrupada por compás para programarla poco a poco
const melodyByBar: { note: string; offset: number; beats: number }[][] = [];
{
  let beat = 0;
  for (const [pitch, beats] of MELODY) {
    const bar = Math.floor(beat / 3);
    (melodyByBar[bar] ||= []);
    if (pitch) melodyByBar[bar].push({ note: pitch, offset: beat - bar * 3, beats });
    beat += beats;
  }
}

function pluck(f: number, when: number, dur: number, vol: number) {
  if (!ctx || !master) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  g.connect(master);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = f;
  o1.connect(g);
  // armónico brillante que se apaga rápido: timbre de caja de música
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(vol * 0.35, when);
  g2.gain.exponentialRampToValueAtTime(0.0001, when + Math.min(0.5, dur));
  g2.connect(master);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = f * 3.01;
  o2.connect(g2);
  o1.start(when);
  o2.start(when);
  o1.stop(when + dur + 0.05);
  o2.stop(when + dur + 0.05);
}

function scheduleBar(i: number, when: number) {
  const chord = CHORDS[BARS[i]];
  chord.forEach((n, k) => pluck(freq(n), when + k * BEAT, BEAT * 3.2, 0.055));
  for (const m of melodyByBar[i] || []) {
    pluck(freq(m.note) * 2, when + m.offset * BEAT, Math.max(1.4, m.beats * BEAT * 1.6), 0.16);
  }
}

function tick() {
  if (!ctx || !playing) return;
  while (nextBar < ctx.currentTime + 0.6) {
    scheduleBar(barIndex, nextBar);
    nextBar += BEAT * 3;
    barIndex = (barIndex + 1) % BARS.length;
  }
}

export function isMusicSupported(): boolean {
  return 'AudioContext' in window || 'webkitAudioContext' in window;
}

/** Debe llamarse desde un gesto del usuario (clic o toque). */
export async function setMusic(on: boolean): Promise<boolean> {
  if (!isMusicSupported()) return false;
  if (on) {
    if (!ctx) {
      const AC: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      // eco suave para dar ambiente
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.33;
      const fb = ctx.createGain();
      fb.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.3;
      master.connect(ctx.destination);
      master.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(ctx.destination);
    }
    await ctx.resume();
    playing = true;
    barIndex = 0;
    nextBar = ctx.currentTime + 0.15;
    master!.gain.cancelScheduledValues(ctx.currentTime);
    master!.gain.setTargetAtTime(0.8, ctx.currentTime, 0.4);
    window.clearInterval(timer);
    timer = window.setInterval(tick, 120);
    tick();
    return true;
  }
  playing = false;
  window.clearInterval(timer);
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    const c = ctx;
    window.setTimeout(() => {
      if (!playing) void c.suspend();
    }, 1200);
  }
  return false;
}
