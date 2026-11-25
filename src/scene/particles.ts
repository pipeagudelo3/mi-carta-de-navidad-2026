import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from 'three';

export interface Snow {
  points: Points;
  uniforms: {
    uFall: IUniform<number>;
    uTime: IUniform<number>;
    uOpacity: IUniform<number>;
    uWind: IUniform<number>;
    uCenter: IUniform<Vector3>;
  };
  setCount(n: number): void;
}

export function createSnow(count: number, uPx: IUniform<number>): Snow {
  const box = new Vector3(26, 16, 26);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * box.x;
    pos[i * 3 + 1] = Math.random() * box.y;
    pos[i * 3 + 2] = Math.random() * box.z;
    seed[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const uniforms = {
    uPx,
    uFall: { value: 0 },
    uTime: { value: 0 },
    uOpacity: { value: 1 },
    uWind: { value: 0 },
    uCenter: { value: new Vector3() },
    uBox: { value: box },
  };
  const points = new Points(
    geo,
    new ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uPx; uniform float uFall; uniform float uTime; uniform float uWind;
        uniform vec3 uCenter; uniform vec3 uBox;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y -= uFall * (0.55 + aSeed * 0.75);
          p.x += sin(uTime * 0.45 + aSeed * 31.0) * 0.45 + uWind * (0.4 + aSeed);
          p.z += cos(uTime * 0.35 + aSeed * 17.0) * 0.35;
          p = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = -mv.z;
          gl_PointSize = clamp((0.035 + aSeed * 0.06) * uPx / dist, 1.0, 26.0);
          vA = (0.35 + aSeed * 0.6) * smoothstep(13.0, 8.0, length(p - uCenter)) * smoothstep(0.2, 1.4, dist);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.12, d) * vA * uOpacity;
          gl_FragColor = vec4(vec3(0.95, 0.97, 1.0), a);
        }`,
      blending: NormalBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    uniforms,
    setCount(n: number) {
      geo.setDrawRange(0, Math.min(count, n));
    },
  };
}

export interface Dust {
  points: Points;
  uIntensity: IUniform<number>;
}

/** Partículas doradas que ascienden en espiral alrededor del árbol. */
export function createDust(count: number, uPx: IUniform<number>, uTime: IUniform<number>): Dust {
  const pos = new Float32Array(count * 3);
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = Math.random() * Math.PI * 2; // ángulo
    data[i * 4 + 1] = 0.3 + Math.random() * 1.6; // separación del árbol
    data[i * 4 + 2] = Math.random() * 7.5; // altura inicial
    data[i * 4 + 3] = Math.random(); // semilla
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aData', new BufferAttribute(data, 4));
  const uIntensity = { value: 0.5 };
  const points = new Points(
    geo,
    new ShaderMaterial({
      uniforms: { uPx, uTime, uIntensity },
      vertexShader: /* glsl */ `
        attribute vec4 aData;
        uniform float uPx; uniform float uTime; uniform float uIntensity;
        varying float vA;
        void main() {
          float sp = 0.25 + aData.w * 0.5;
          float y = mod(aData.z + uTime * sp * 0.35, 7.5);
          float treeR = max(0.0, 2.4 * (1.0 - y / 6.2));
          float r = treeR + aData.y;
          float a = aData.x + uTime * sp * 0.4;
          vec3 p = vec3(cos(a) * r, y + 0.2, sin(a) * r);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.07 + aData.w * 0.1) * uPx / -mv.z;
          float tw = 0.5 + 0.5 * sin(uTime * (1.5 + aData.w * 3.0) + aData.x * 9.0);
          vA = tw * smoothstep(0.0, 0.8, y) * smoothstep(7.5, 6.0, y) * uIntensity;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.48) * a * a * vA, 1.0);
        }`,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  points.frustumCulled = false;
  return { points, uIntensity };
}
