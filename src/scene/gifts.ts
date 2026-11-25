import { BoxGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three';

interface GiftSpec {
  size: [number, number, number];
  pos: [number, number];
  rot: number;
  color: number;
  ribbon: number;
}

const SPECS: GiftSpec[] = [
  { size: [0.95, 0.7, 0.95], pos: [-1.75, 2.35], rot: 0.35, color: 0xa51d2a, ribbon: 0xe9bf6c },
  { size: [0.7, 0.95, 0.7], pos: [-0.75, 2.85], rot: -0.2, color: 0x17694a, ribbon: 0xd8343f },
  { size: [1.15, 0.55, 0.85], pos: [0.55, 2.95], rot: 0.15, color: 0xf0e6d2, ribbon: 0xb3202c },
  { size: [0.8, 0.8, 0.8], pos: [1.75, 2.4], rot: -0.5, color: 0x1d4f8f, ribbon: 0xf4ead8 },
  { size: [0.6, 0.5, 0.6], pos: [2.75, 1.35], rot: 0.6, color: 0xc9973c, ribbon: 0x0f3d2e },
  { size: [0.55, 0.62, 0.55], pos: [-2.8, 1.25], rot: -0.3, color: 0x5b2a86, ribbon: 0xe9bf6c },
];

export function createGifts(): Group[] {
  return SPECS.map((s, index) => {
    const [w, h, d] = s.size;
    const g = new Group();
    const paper = new MeshStandardMaterial({ color: s.color, roughness: 0.62, metalness: 0.05 });
    const ribbon = new MeshStandardMaterial({ color: s.ribbon, roughness: 0.4, metalness: 0.2 });

    const box = new Mesh(new BoxGeometry(w, h, d), paper);
    box.position.y = h / 2;
    g.add(box);

    const lidH = Math.min(0.16, h * 0.24);
    const lid = new Mesh(new BoxGeometry(w * 1.07, lidH, d * 1.07), paper);
    lid.position.y = h - lidH / 2 + 0.03;
    g.add(lid);

    const rw = Math.min(w, d) * 0.17;
    const r1 = new Mesh(new BoxGeometry(rw, h + 0.045, d * 1.085), ribbon);
    r1.position.y = h / 2 + 0.015;
    const r2 = new Mesh(new BoxGeometry(w * 1.085, h + 0.045, rw), ribbon);
    r2.position.y = h / 2 + 0.015;
    g.add(r1, r2);

    const bowGeo = new TorusGeometry(rw * 0.85, rw * 0.28, 6, 14);
    const b1 = new Mesh(bowGeo, ribbon);
    b1.position.set(-rw * 0.75, h + rw * 0.75, 0);
    b1.rotation.set(0, 0, -0.6);
    const b2 = new Mesh(bowGeo, ribbon);
    b2.position.set(rw * 0.75, h + rw * 0.75, 0);
    b2.rotation.set(0, 0, 0.6);
    const knot = new Mesh(new SphereGeometry(rw * 0.45, 8, 6), ribbon);
    knot.position.y = h + rw * 0.35;
    g.add(b1, b2, knot);

    g.position.set(s.pos[0], 0.02, s.pos[1]);
    g.rotation.y = s.rot;
    g.userData.giftIndex = index;
    g.traverse((o) => {
      o.userData.giftIndex = index;
    });
    return g;
  });
}
