import { CanvasTexture, SRGBColorSpace } from 'three';

/** Degradado radial suave para halos y resplandores. */
export function glowTexture(size = 128): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.62)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Luna: disco nítido con un halo amplio. */
export function moonTexture(size = 256): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const h = size / 2;
  const halo = g.createRadialGradient(h, h, size * 0.1, h, h, h);
  halo.addColorStop(0, 'rgba(200,220,255,0.55)');
  halo.addColorStop(0.35, 'rgba(160,190,255,0.14)');
  halo.addColorStop(1, 'rgba(160,190,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, size, size);
  const disc = g.createRadialGradient(h - size * 0.03, h - size * 0.03, 0, h, h, size * 0.13);
  disc.addColorStop(0, 'rgba(255,253,244,1)');
  disc.addColorStop(0.9, 'rgba(236,240,252,1)');
  disc.addColorStop(1, 'rgba(236,240,252,0)');
  g.fillStyle = disc;
  g.beginPath();
  g.arc(h, h, size * 0.13, 0, Math.PI * 2);
  g.fill();
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}
