import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointLight,
  Points,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  type IUniform,
  type Texture,
} from 'three';

export interface Tree {
  group: Group;
  star: Mesh;
  /** t: tiempo en segundos · lit: 0-1 fracción de luces encendidas · boost: brillo extra del final */
  update(t: number, lit: number, boost: number): void;
}

const TIERS = 6;
const TIER_BASE = 0.7;
const TIER_STEP = 0.78;

function tier(i: number) {
  const f = i / (TIERS - 1);
  return {
    radius: 2.3 + (0.72 - 2.3) * f,
    height: 1.7 + (1.2 - 1.7) * f,
    base: TIER_BASE + i * TIER_STEP,
  };
}

export const TREE_TOP = TIER_BASE + (TIERS - 1) * TIER_STEP + 1.2;

/** Radio de la superficie del árbol a una altura dada. */
function surfaceRadius(y: number): number {
  let r = 0;
  for (let i = 0; i < TIERS; i++) {
    const t = tier(i);
    if (y >= t.base && y <= t.base + t.height) {
      r = Math.max(r, t.radius * (1 - (y - t.base) / t.height));
    }
  }
  return r;
}

const LIGHT_COLORS = [0xffd9a0, 0xffd9a0, 0xffd9a0, 0xffb347, 0xff4d4d, 0x7dffb0, 0x9fd4ff];

export function createTree(glow: Texture, uPx: IUniform<number>, lightCount: number): Tree {
  const group = new Group();

  // Follaje: conos facetados con borde irregular
  const foliage = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    side: DoubleSide,
  });
  const dark = new Color(0x0b3f29);
  const mid = new Color(0x1e9159);
  const snow = new Color(0xcfe3da);
  const tmp = new Color();

  for (let i = 0; i < TIERS; i++) {
    const t = tier(i);
    const segs = 18;
    const geo = new ConeGeometry(t.radius, t.height, segs, 1, true);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const isRim = pos.getY(v) < 0;
      if (isRim) {
        const j = v % (segs + 1);
        const tip = j % 2 === 0;
        if (!tip) {
          pos.setX(v, pos.getX(v) * 0.78);
          pos.setZ(v, pos.getZ(v) * 0.78);
          pos.setY(v, pos.getY(v) + 0.16);
          tmp.copy(mid).multiplyScalar(0.75);
        } else {
          tmp.copy(mid).lerp(snow, 0.42);
        }
      } else {
        tmp.copy(dark);
      }
      colors[v * 3] = tmp.r;
      colors[v * 3 + 1] = tmp.g;
      colors[v * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new Mesh(geo, foliage);
    mesh.position.y = t.base + t.height / 2;
    mesh.rotation.y = i * 0.55;
    group.add(mesh);
  }

  const trunk = new Mesh(
    new CylinderGeometry(0.26, 0.34, 0.9, 10),
    new MeshStandardMaterial({ color: 0x4a2f1b, roughness: 1 }),
  );
  trunk.position.y = 0.4;
  group.add(trunk);

  // Estrella
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.36 : 0.15;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const starGeo = new ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 1,
  });
  starGeo.translate(0, 0, -0.035);
  const star = new Mesh(starGeo, new MeshBasicMaterial({ color: 0xffe7a3, toneMapped: false }));
  star.position.y = TREE_TOP + 0.28;
  group.add(star);

  const starGlow = new Sprite(
    new SpriteMaterial({
      map: glow,
      color: 0xffcf7a,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  starGlow.position.copy(star.position);
  group.add(starGlow);

  // Luz cálida que baña la nieve y los regalos
  const warm = new PointLight(0xffe0b4, 0, 22, 1.6);
  warm.position.set(0, 2.7, 5.2);
  group.add(warm);
  const topLight = new PointLight(0xffd48a, 0, 14, 1.8);
  topLight.position.set(0, TREE_TOP + 0.4, 0.6);
  group.add(topLight);

  // Luces: bombillos instanciados + halo aditivo
  const N = lightCount;
  const bulbs = new InstancedMesh(
    new SphereGeometry(0.042, 8, 6),
    new MeshBasicMaterial({ toneMapped: false }),
    N,
  );
  const positions = new Float32Array(N * 3);
  const haloColors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const base: Color[] = [];
  const threshold = new Float32Array(N);
  const phase = new Float32Array(N);
  const speed = new Float32Array(N);
  const m = new Matrix4();
  const yMin = TIER_BASE + 0.12;
  const yMax = TREE_TOP - 0.12;
  for (let k = 0; k < N; k++) {
    const h = (k + 0.5) / N;
    // más densidad abajo, donde el árbol es más ancho
    const hh = 1 - Math.pow(1 - h, 1.35);
    const y = yMin + hh * (yMax - yMin);
    const r = surfaceRadius(y) + 0.045;
    const a = k * 2.39996 + Math.sin(k * 12.9898) * 0.3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    positions[k * 3] = x;
    positions[k * 3 + 1] = y;
    positions[k * 3 + 2] = z;
    m.makeTranslation(x, y, z);
    bulbs.setMatrixAt(k, m);
    const rnd = fract(Math.sin(k * 78.233) * 43758.5453);
    const rnd2 = fract(Math.sin(k * 39.425) * 24634.6345);
    base.push(new Color(LIGHT_COLORS[Math.floor(rnd * LIGHT_COLORS.length)]));
    threshold[k] = 0.55 * rnd2 + 0.45 * hh;
    phase[k] = rnd * Math.PI * 2;
    speed[k] = 0.8 + rnd2 * 2.2;
    sizes[k] = 0.62 + rnd * 0.3;
    bulbs.setColorAt(k, tmp.setRGB(0, 0, 0));
  }
  bulbs.instanceMatrix.needsUpdate = true;
  group.add(bulbs);

  const haloGeo = new BufferGeometry();
  haloGeo.setAttribute('position', new BufferAttribute(positions, 3));
  haloGeo.setAttribute('aColor', new BufferAttribute(haloColors, 3));
  haloGeo.setAttribute('aSize', new BufferAttribute(sizes, 1));
  const halos = new Points(
    haloGeo,
    new ShaderMaterial({
      uniforms: { uPx },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        uniform float uPx;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPx / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a = a * a * a;
          gl_FragColor = vec4(vColor * a, 1.0);
        }`,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  halos.frustumCulled = false;
  group.add(halos);

  // Esferas decorativas
  const ORN = 30;
  const orn = new InstancedMesh(
    new SphereGeometry(0.105, 14, 10),
    new MeshStandardMaterial({ roughness: 0.28, metalness: 0.15, emissive: 0x220a06, emissiveIntensity: 0.6 }),
    ORN,
  );
  const ornColors = [0xc22633, 0xe3b866, 0xf4ead8, 0xc22633, 0xe3b866];
  let o = 0;
  for (let i = 0; i < TIERS && o < ORN; i++) {
    const t = tier(i);
    const count = Math.max(3, 7 - i);
    for (let j = 0; j < count && o < ORN; j++) {
      const a = (j / count) * Math.PI * 2 + i * 1.1;
      const y = t.base + 0.2;
      const r = t.radius * (1 - 0.2 / t.height) * 0.9;
      m.makeTranslation(Math.cos(a) * r, y - 0.06, Math.sin(a) * r);
      orn.setMatrixAt(o, m);
      orn.setColorAt(o, tmp.set(ornColors[(i + j) % ornColors.length]));
      o++;
    }
  }
  orn.count = o;
  orn.instanceMatrix.needsUpdate = true;
  if (orn.instanceColor) orn.instanceColor.needsUpdate = true;
  group.add(orn);

  const haloAttr = haloGeo.attributes.aColor as BufferAttribute;

  function update(t: number, lit: number, boost: number) {
    for (let k = 0; k < N; k++) {
      const on = Math.min(1, Math.max(0, (lit - threshold[k]) * 9));
      const tw = 0.72 + 0.28 * Math.sin(t * speed[k] + phase[k]);
      const b = base[k];
      const bulb = 0.1 + on * tw * 1.25;
      bulbs.setColorAt(k, tmp.setRGB(b.r * bulb, b.g * bulb, b.b * bulb));
      const halo = on * tw * (0.75 + boost * 0.6);
      haloColors[k * 3] = b.r * halo;
      haloColors[k * 3 + 1] = b.g * halo;
      haloColors[k * 3 + 2] = b.b * halo;
    }
    if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
    haloAttr.needsUpdate = true;

    const flicker = 0.94 + 0.06 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
    warm.intensity = (9 + lit * 20 + boost * 5) * flicker;
    topLight.intensity = 6 + lit * 8 + boost * 10;
    const s = 1.7 + lit * 0.9 + boost * 1.6 + Math.sin(t * 1.7) * 0.12;
    starGlow.scale.set(s, s, 1);
    star.rotation.y = Math.sin(t * 0.6) * 0.5;
  }

  return { group, star, update };
}

function fract(n: number) {
  return n - Math.floor(n);
}
