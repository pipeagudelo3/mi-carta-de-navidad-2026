import {
  ACESFilmicToneMapping,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import gsap from 'gsap';
import { createTree, TREE_TOP } from './tree';
import {
  HORIZON,
  createCabin,
  createConstellation,
  createGround,
  createMoon,
  createPines,
  createSky,
  createStars,
} from './environment';
import { createDust, createSnow } from './particles';
import { createGifts } from './gifts';
import { glowTexture, moonTexture } from './textures';

export type Pick = { type: 'gift'; index: number } | { type: 'star' } | null;

export interface World {
  /** Mezcla 0-1 hacia cada capítulo siguiente, según el scroll. */
  setBlends(blends: number[]): void;
  setLit(v: number): void;
  setSnow(on: boolean): void;
  setMemoryProgress(p: number): void;
  setFinale(on: boolean): void;
  setPointer(x: number, y: number): void;
  /** Fracción de la pantalla (0-1) bajo la cual debe quedar la estrella en portada y cierre. */
  setFraming(hero: number, finale: number): void;
  pick(clientX: number, clientY: number): Pick;
  hover(clientX: number, clientY: number): boolean;
  pokeGift(index: number): void;
  pokeStar(): void;
  playOpen(duration: number): Promise<void>;
  resetOpen(): void;
  snap(): void;
}

interface Options {
  reducedMotion: boolean;
  mobile: boolean;
  onReady: () => void;
}

interface KF {
  p: Vector3;
  l: Vector3;
  /** Desplazamiento lateral de la mirada en pantallas anchas (el texto va a la izquierda). */
  wide: number;
}
const kf = (px: number, py: number, pz: number, lx: number, ly: number, lz: number, wide = 0): KF => ({
  p: new Vector3(px, py, pz),
  l: new Vector3(lx, ly, lz),
  wide,
});

// Un encuadre por capítulo: bienvenida, lo que tengo, gracias (cielo),
// todos los días (cabaña), deseos, regalos, final y cierre.
const KEYFRAMES: KF[] = [
  kf(0, 2.4, 13.5, 0, 4.5, 0, -3.3),
  kf(4.6, 3.0, 7.8, 0, 3.0, 0, -2.3),
  kf(2, 3.5, 9, 0, 14, -10),
  kf(-3.2, 1.7, 4.2, -8.3, 1.5, -6.6),
  kf(-3.8, 2.6, 9.0, 0, 3.0, 0, -2.6),
  kf(0.6, 1.6, 6.6, 0, 1.2, 0.8),
  kf(0, 3.0, 15, 0, 3.9, 0),
  kf(0, 2.5, 12.5, 0, 4.4, 0),
];
const OPEN_KF = kf(0, 5.7, 4.4, 0, TREE_TOP + 0.3, 0);

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export function createWorld(canvas: HTMLCanvasElement, opts: Options): World {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, opts.mobile ? 1.6 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(HORIZON);

  const scene = new Scene();
  scene.fog = new FogExp2(HORIZON, 0.021);
  const camera = new PerspectiveCamera(45, 1, 0.1, 400);

  const uPx = { value: 800 };
  const uTime = { value: 0 };
  const uDpr = { value: pixelRatio };

  // Luces generales: noche azul
  scene.add(new HemisphereLight(0x5f7fc4, 0x1a2540, 0.85));
  const moonLight = new DirectionalLight(0x9db8ff, 0.9);
  moonLight.position.set(-18, 26, -30);
  scene.add(moonLight);

  const glow = glowTexture();
  scene.add(createSky());
  scene.add(createStars(opts.mobile ? 650 : 1100, uTime, uDpr));
  scene.add(createMoon(moonTexture()));
  const ground = createGround(glow);
  scene.add(ground.group);
  scene.add(createPines(opts.mobile ? 55 : 90));
  scene.add(createCabin(glow));

  const tree = createTree(glow, uPx, opts.mobile ? 150 : 210);
  scene.add(tree.group);

  const starHit = new Mesh(new SphereGeometry(0.6, 8, 6), new MeshBasicMaterial());
  starHit.position.copy(tree.star.position);
  starHit.visible = false;
  scene.add(starHit);

  const gifts: Group[] = createGifts();
  gifts.forEach((g) => scene.add(g));

  const snowCount = opts.mobile ? 900 : 1800;
  const snow = createSnow(snowCount, uPx);
  scene.add(snow.points);
  const dust = createDust(opts.mobile ? 70 : 120, uPx, uTime);
  scene.add(dust.points);

  const constellation = createConstellation(glow);
  {
    const k = KEYFRAMES[2];
    const dir = k.l.clone().sub(k.p).normalize();
    constellation.group.position.copy(k.p).addScaledVector(dir, 42);
    constellation.group.lookAt(k.p);
  }
  scene.add(constellation.group);

  // ---------- Estado ----------
  let blends: number[] = [];
  let litTarget = 0.5;
  let lit = 0.5;
  let finale = false;
  const fx = { boost: 0, open: 0 };
  let snowOn = !opts.reducedMotion;
  let snowOpacity = snowOn ? 1 : 0;
  const pointer = new Vector2();
  const pointerSmooth = new Vector2();
  let wind = 0;
  let hovered = -1;
  let needSnap = true;

  const target = { p: new Vector3(), l: new Vector3() };
  const current = { p: KEYFRAMES[0].p.clone(), l: KEYFRAMES[0].l.clone() };

  // ---------- Tamaño ----------
  let width = 0;
  let height = 0;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // En vertical se abre el campo de visión para que el árbol quepa completo
    camera.fov = camera.aspect < 1 ? Math.min(74, 45 + (1 - camera.aspect) * 34) : 45;
    camera.updateProjectionMatrix();
    uPx.value = (h * pixelRatio) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  const look = new Vector3();
  let heroFrac = 0;
  let finaleFrac = 0;
  // En vertical el título va arriba: se baja el árbol lo justo para que la estrella no lo pise
  function framedY(k: KF, frac: number) {
    if (!frac) return k.l.y;
    const visible = 2 * k.p.z * Math.tan((camera.fov * Math.PI) / 360);
    return Math.min(6.7, Math.max(k.l.y - 0.5, TREE_TOP + 0.75 - (0.5 - frac) * visible));
  }
  function computeTarget() {
    const isWide = camera.aspect > 1.25;
    const last = KEYFRAMES.length - 1;
    target.p.copy(KEYFRAMES[0].p);
    target.l.copy(KEYFRAMES[0].l);
    if (isWide) target.l.x += KEYFRAMES[0].wide;
    else target.l.y = framedY(KEYFRAMES[0], heroFrac);
    for (let i = 0; i < blends.length && i + 1 < KEYFRAMES.length; i++) {
      const b = smooth(blends[i]);
      if (b <= 0) continue;
      const k = KEYFRAMES[i + 1];
      look.copy(k.l);
      if (isWide) look.x += k.wide;
      else if (i + 1 === last) look.y = framedY(k, finaleFrac);
      target.p.lerp(k.p, b);
      target.l.lerp(look, b);
    }
    if (fx.open > 0) {
      target.p.lerp(OPEN_KF.p, fx.open);
      target.l.lerp(OPEN_KF.l, fx.open);
    }
  }

  // ---------- Bucle ----------
  let last = performance.now();
  let time = 0;
  let frames = 0;
  let slowAcc = 0;
  let adapted = false;
  let ready = false;
  let raf = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const speed = opts.reducedMotion ? 0.35 : 1;
    time += dt * speed;
    uTime.value = time;

    // Rendimiento adaptativo: si el equipo sufre, se baja la resolución y la nieve
    if (!adapted && ready) {
      frames++;
      slowAcc += dt;
      if (frames === 80) {
        if (slowAcc / frames > 0.03) {
          pixelRatio = Math.min(pixelRatio, 1);
          renderer.setPixelRatio(pixelRatio);
          uDpr.value = pixelRatio;
          width = 0;
          resize();
          snow.setCount(Math.floor(snowCount * 0.5));
        }
        adapted = true;
      }
    }

    computeTarget();
    const k = needSnap || opts.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    needSnap = false;
    current.p.lerp(target.p, k);
    current.l.lerp(target.l, k);

    pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 3));
    camera.position.copy(current.p);
    if (!opts.reducedMotion) {
      camera.position.x += Math.sin(time * 0.13) * 0.28 + pointerSmooth.x * 0.55;
      camera.position.y += Math.sin(time * 0.17) * 0.08 + pointerSmooth.y * 0.22;
    }
    camera.lookAt(current.l);

    lit += (litTarget - lit) * (1 - Math.exp(-dt * (finale ? 0.9 : 2.2)));
    tree.update(time, lit, fx.boost);
    (ground.warmGlow.material as MeshBasicMaterial).opacity = 0.14 + lit * 0.34 + fx.boost * 0.2;
    dust.uIntensity.value += ((finale ? 1.9 : 0.35 + lit * 0.5) - dust.uIntensity.value) * 0.03;

    snowOpacity += ((snowOn ? 1 : 0) - snowOpacity) * (1 - Math.exp(-dt * 2.5));
    snow.points.visible = snowOpacity > 0.01;
    wind += (pointerSmooth.x * 1.4 - wind) * 0.03;
    snow.uniforms.uFall.value += dt * 0.95;
    snow.uniforms.uTime.value = time;
    snow.uniforms.uOpacity.value = snowOpacity;
    snow.uniforms.uWind.value = wind;
    snow.uniforms.uCenter.value.copy(camera.position);

    constellation.update(time);

    gifts.forEach((g, i) => {
      const s = hovered === i ? 1.08 : 1;
      g.scale.x += (s - g.scale.x) * 0.2;
      g.scale.z = g.scale.x;
      if (!g.userData.busy) g.scale.y = g.scale.x;
    });

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady();
    }
  }
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    document.documentElement.classList.add('no-webgl');
  });

  // ---------- Interacción ----------
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  function pick(clientX: number, clientY: number): Pick {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...gifts, starHit], true);
    if (!hits.length) return null;
    const obj = hits[0].object;
    if (obj === starHit) return { type: 'star' };
    const index = obj.userData.giftIndex as number | undefined;
    return index === undefined ? null : { type: 'gift', index };
  }

  return {
    setBlends(b) {
      blends = b;
    },
    setLit(v) {
      litTarget = v;
    },
    setSnow(on) {
      snowOn = on;
    },
    setMemoryProgress(p) {
      constellation.setProgress(p);
    },
    setFinale(on) {
      if (on === finale) return;
      finale = on;
      gsap.killTweensOf(fx, 'boost');
      if (on) {
        gsap
          .timeline()
          .to(fx, { boost: 1.25, duration: 2.6, ease: 'power2.inOut' })
          .to(fx, { boost: 0.7, duration: 3, ease: 'sine.inOut' });
      } else {
        gsap.to(fx, { boost: 0, duration: 1.2 });
      }
    },
    setPointer(x, y) {
      pointer.set(x, y);
    },
    setFraming(hero, fin) {
      heroFrac = hero;
      finaleFrac = fin;
    },
    pick,
    hover(x, y) {
      const p = pick(x, y);
      hovered = p && p.type === 'gift' ? p.index : -1;
      return p !== null;
    },
    pokeGift(index) {
      const g = gifts[index];
      if (!g || g.userData.busy) return;
      g.userData.busy = true;
      const y0 = g.position.y;
      const r0 = g.rotation.z;
      gsap
        .timeline({
          onComplete: () => {
            g.userData.busy = false;
          },
        })
        .to(g.scale, { y: 0.82, duration: 0.1, ease: 'power2.out' })
        .to(g.scale, { y: 1.12, duration: 0.14, ease: 'power2.out' })
        .to(g.position, { y: y0 + 0.55, duration: 0.26, ease: 'power2.out' }, '<')
        .to(g.rotation, { z: r0 + (index % 2 ? 0.22 : -0.22), duration: 0.26, ease: 'sine.inOut' }, '<')
        .to(g.position, { y: y0, duration: 0.42, ease: 'bounce.out' })
        .to(g.rotation, { z: r0, duration: 0.42, ease: 'power2.out' }, '<')
        .to(g.scale, { y: 1, duration: 0.3, ease: 'elastic.out(1,0.5)' }, '<');
    },
    pokeStar() {
      gsap.fromTo(fx, { boost: fx.boost + 1.1 }, { boost: finale ? 0.7 : 0, duration: 1.6, ease: 'power2.out' });
      gsap.fromTo(tree.star.scale, { x: 1.6, y: 1.6, z: 1.6 }, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'elastic.out(1,0.4)' });
    },
    playOpen(duration) {
      return new Promise((resolve) => {
        gsap.to(fx, { open: 1, duration, ease: 'power2.inOut', onComplete: resolve });
        gsap.to(fx, { boost: 1, duration, ease: 'power2.in' });
      });
    },
    resetOpen() {
      gsap.killTweensOf(fx);
      fx.open = 0;
      gsap.to(fx, { boost: 0, duration: 1.5 });
      needSnap = true;
    },
    snap() {
      needSnap = true;
    },
  };
}
