import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type IUniform,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const HORIZON = 0x18274a;
export const CABIN_POS = new Vector3(-8.5, 0, -7);

/** Relieve suave de la nieve; plano cerca del árbol y de la cabaña. */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const k = smooth(7, 26, d);
  const dc = Math.hypot(x - CABIN_POS.x, z - CABIN_POS.z);
  const kc = smooth(3, 9, dc);
  return (Math.sin(x * 0.16) * Math.cos(z * 0.13) * 1.1 + Math.sin(x * 0.05 + 1.3) * 1.8 + Math.cos(z * 0.07) * 1.2) * k * kc;
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createSky(): Mesh {
  const mat = new ShaderMaterial({
    uniforms: {
      uTop: { value: new Color(0x040817) },
      uMid: { value: new Color(0x0c1736) },
      uHorizon: { value: new Color(HORIZON) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
        c = mix(c, uTop, smoothstep(0.25, 0.9, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new Mesh(new SphereGeometry(150, 24, 16), mat);
  sky.renderOrder = -10;
  return sky;
}

export function createStars(count: number, uTime: IUniform<number>, uDpr: IUniform<number>): Points {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = 0.04 + Math.random() * 0.96;
    const th = u * Math.PI * 2;
    const y = v;
    const r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(th) * r * 130;
    pos[i * 3 + 1] = y * 130;
    pos[i * 3 + 2] = Math.sin(th) * r * 130;
    seed[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const stars = new Points(
    geo,
    new ShaderMaterial({
      uniforms: { uTime, uDpr },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime; uniform float uDpr;
        varying float vA;
        void main() {
          float tw = 0.6 + 0.4 * sin(uTime * (0.6 + aSeed * 2.4) + aSeed * 40.0);
          vA = tw * (0.35 + aSeed * 0.65);
          gl_PointSize = (1.0 + aSeed * aSeed * 2.6) * uDpr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(vec3(1.0, 0.96, 0.88) * a * vA, 1.0);
        }`,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      fog: false,
    }),
  );
  stars.frustumCulled = false;
  stars.renderOrder = -9;
  return stars;
}

export function createMoon(tex: Texture): Sprite {
  const moon = new Sprite(
    new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, blending: AdditiveBlending }),
  );
  moon.position.set(-38, 46, -95);
  moon.scale.set(46, 46, 1);
  moon.renderOrder = -8;
  return moon;
}

export function createGround(glow: Texture): { group: Group; warmGlow: Mesh } {
  const group = new Group();
  const geo = new PlaneGeometry(220, 220, 72, 72);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, groundHeight(p.getX(i), p.getZ(i)));
  }
  geo.computeVertexNormals();
  const ground = new Mesh(geo, new MeshStandardMaterial({ color: 0xb9c9e6, roughness: 1, metalness: 0 }));
  group.add(ground);

  // Resplandor cálido del árbol sobre la nieve
  const warmGlow = new Mesh(
    new CircleGeometry(8.5, 40),
    new MeshBasicMaterial({
      map: glow,
      color: 0xffa95a,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  warmGlow.rotation.x = -Math.PI / 2;
  warmGlow.position.y = 0.03;
  group.add(warmGlow);

  return { group, warmGlow };
}

export function createPines(count: number): InstancedMesh {
  const parts = [0, 1, 2].map((i) => {
    const g = new ConeGeometry(1.25 - i * 0.32, 1.7 - i * 0.2, 7, 1, false);
    g.translate(0, 1.5 + i * 0.95, 0);
    return g;
  });
  const trunk = new CylinderGeometry(0.16, 0.2, 0.9, 5);
  trunk.translate(0, 0.4, 0);
  const geo = mergeGeometries([...parts, trunk])!;
  const mesh = new InstancedMesh(
    geo,
    new MeshStandardMaterial({ roughness: 1, flatShading: true }),
    count,
  );
  const dummy = new Object3D();
  const c = new Color();
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < 4000) {
    const a = Math.random() * Math.PI * 2;
    const r = 13 + Math.pow(Math.random(), 0.8) * 55;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // despeja la vista de la cámara y los alrededores de la cabaña
    if (z > 4 && Math.abs(x) < 10) continue;
    if (Math.hypot(x - CABIN_POS.x, z - CABIN_POS.z) < 5.5) continue;
    if (x < -2 && x > -11 && z > -7 && z < 6) continue;
    const s = 0.9 + Math.random() * 1.5;
    dummy.position.set(x, groundHeight(x, z) - 0.1, z);
    dummy.scale.set(s, s * (0.9 + Math.random() * 0.4), s);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    c.setHSL(0.42 + Math.random() * 0.04, 0.35, 0.1 + Math.random() * 0.07);
    mesh.setColorAt(n, c);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createCabin(glow: Texture): Group {
  const g = new Group();
  const wood = new MeshStandardMaterial({ color: 0x4b2e1c, roughness: 1 });
  const snowMat = new MeshStandardMaterial({ color: 0xdfe8f7, roughness: 1 });
  const lit = new MeshBasicMaterial({ color: 0xffc56e, toneMapped: false, fog: false });

  const body = new Mesh(new BoxGeometry(3, 1.7, 2.4), wood);
  body.position.y = 0.85;
  g.add(body);

  // Techo a dos aguas cubierto de nieve
  const roof = new Mesh(new CylinderGeometry(0.02, 2.05, 1.25, 4, 1), snowMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.18, 1, 0.95);
  roof.position.y = 1.7 + 0.62;
  g.add(roof);

  const chimney = new Mesh(new BoxGeometry(0.36, 0.9, 0.36), new MeshStandardMaterial({ color: 0x5a3a2a, roughness: 1 }));
  chimney.position.set(0.8, 2.45, -0.3);
  g.add(chimney);
  const cap = new Mesh(new BoxGeometry(0.46, 0.1, 0.46), snowMat);
  cap.position.set(0.8, 2.93, -0.3);
  g.add(cap);

  const door = new Mesh(new BoxGeometry(0.55, 1.05, 0.06), new MeshStandardMaterial({ color: 0x2c1a10, roughness: 1 }));
  door.position.set(0, 0.53, 1.21);
  g.add(door);

  const addWindow = (x: number, y: number, z: number, ry: number) => {
    const w = new Mesh(new PlaneGeometry(0.62, 0.56), lit);
    w.position.set(x, y, z);
    w.rotation.y = ry;
    g.add(w);
    const barMat = new MeshBasicMaterial({ color: 0x2c1a10 });
    const b1 = new Mesh(new BoxGeometry(0.66, 0.045, 0.02), barMat);
    const b2 = new Mesh(new BoxGeometry(0.045, 0.6, 0.02), barMat);
    for (const b of [b1, b2]) {
      b.position.copy(w.position);
      b.rotation.y = ry;
      b.translateZ(0.012);
      g.add(b);
    }
    const halo = new Sprite(
      new SpriteMaterial({ map: glow, color: 0xffa64a, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75, fog: false }),
    );
    halo.position.copy(w.position);
    halo.scale.set(2.6, 2.6, 1);
    g.add(halo);
  };
  addWindow(-0.92, 0.98, 1.205, 0);
  addWindow(0.92, 0.98, 1.205, 0);
  addWindow(1.505, 0.98, 0, Math.PI / 2);

  const light = new PointLight(0xffa550, 16, 12, 1.7);
  light.position.set(0.6, 1.1, 2.6);
  g.add(light);

  g.position.copy(CABIN_POS);
  g.rotation.y = 0.75;
  return g;
}

export interface Constellation {
  group: Group;
  setProgress(p: number): void;
  update(t: number): void;
}

/** Camino de estrellas que se enciende mientras se lee la sección de agradecimiento. */
export function createConstellation(glow: Texture): Constellation {
  const group = new Group();
  const pts: Vector3[] = [
    new Vector3(-7.5, -8, 0),
    new Vector3(-4.2, -5.2, 0),
    new Vector3(-5.4, -1.6, 0),
    new Vector3(-1.2, 0.2, 0),
    new Vector3(1.4, 3.4, 0),
    new Vector3(5.2, 3.9, 0),
    new Vector3(4.2, 7.4, 0),
    new Vector3(7.6, 9.6, 0),
  ];
  const sprites = pts.map((p) => {
    const s = new Sprite(
      new SpriteMaterial({ map: glow, color: 0xffdf9e, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }),
    );
    s.position.copy(p);
    s.scale.setScalar(2.6);
    group.add(s);
    return s;
  });
  const lineGeo = new BufferGeometry().setFromPoints(pts);
  const line = new Line(
    lineGeo,
    new LineBasicMaterial({ color: 0xffdf9e, transparent: true, opacity: 0.28, fog: false, depthWrite: false }),
  );
  line.geometry.setDrawRange(0, 0);
  group.add(line);

  let progress = 0;
  let shown = 0;
  return {
    group,
    setProgress(p: number) {
      progress = p;
    },
    update(t: number) {
      shown += (progress - shown) * 0.06;
      const f = shown * pts.length;
      sprites.forEach((s, i) => {
        const on = Math.min(1, Math.max(0, f - i + 0.4));
        s.material.opacity = on * (0.8 + 0.2 * Math.sin(t * 1.4 + i));
        s.scale.setScalar(1.8 + on * 1.2);
      });
      line.geometry.setDrawRange(0, Math.max(0, Math.min(pts.length, Math.floor(f + 0.4))));
    },
  };
}
