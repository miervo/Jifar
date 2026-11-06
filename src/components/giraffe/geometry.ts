// Геометрия жирафа в пикселях страницы. Иллюстрация одна на всю высоту,
// а её опорные точки берутся из реального положения участков страницы:
// копыта — у стартового блока, туловище — на уровне второго вопроса,
// голова — в финальной сцене. Поэтому жираф всегда совпадает с карточками,
// даже если текст увеличен или карточка выросла.
import { layoutConfig } from "@/config/theme";

export type Anchors = {
  /** Размер страницы */
  width: number;
  height: number;
  /** Линия земли (под копытами) */
  groundY: number;
  /** Центр туловища */
  bodyCY: number;
  /** Нижняя граница места под голову в финальной сцене */
  headBottomY: number;
};

export type Spot = { d: string; tone: 0 | 1 | 2 };

export type GiraffeGeometry = {
  k: number;
  cx: number;
  headY: number;
  neckPath: string;
  manePath: string;
  shadePath: string;
  bodyTransform: string;
  legs: { x: number; top: number; knee: number; bottom: number; w: number; far: boolean }[];
  tail: { x: number; y: number };
  spots: Spot[];
  legSpots: Spot[];
  /** Листья вдоль шеи: x, y, поворот, масштаб, оттенок */
  leaves: [number, number, number, number, 0 | 1][];
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Туловище в локальных единицах: точка (0,0) — центр, шея выходит около x=0. */
export const BODY_PATH =
  "M-40,-92 C-110,-84 -200,-70 -232,-42 C-262,-14 -258,58 -214,82 C-130,108 20,110 70,86 C108,66 112,-6 84,-62 L40,-120 Z";

export function giraffeScale(width: number) {
  return clamp(width / 420, layoutConfig.scaleMin, layoutConfig.scaleMax);
}

/** Центральная линия жирафа: на телефоне чуть правее центра, чтобы влез круп. */
export function giraffeCenterX(width: number) {
  return width < 700 ? width * 0.56 : width * 0.5;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Неровное «сетчатое» пятно: многоугольник со скруглёнными углами. */
export function blobPath(cx: number, cy: number, r: number, rand: () => number, sides = 6, stretchX = 1.08) {
  const pts: [number, number][] = [];
  const turn = rand() * Math.PI;
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const rad = r * (0.78 + rand() * 0.34);
    pts.push([cx + Math.cos(a) * rad * stretchX, cy + Math.sin(a) * rad]);
  }
  const mid = (p: [number, number], q: [number, number]) => [r1((p[0] + q[0]) / 2), r1((p[1] + q[1]) / 2)];
  const start = mid(pts[sides - 1]!, pts[0]!);
  let d = `M${start[0]},${start[1]}`;
  for (let i = 0; i < sides; i++) {
    const p = pts[i]!;
    const n = mid(p, pts[(i + 1) % sides]!);
    d += ` Q${r1(p[0])},${r1(p[1])} ${n[0]},${n[1]}`;
  }
  return `${d} Z`;
}

export function buildGiraffe(a: Anchors): GiraffeGeometry {
  const k = giraffeScale(a.width);
  const cx = giraffeCenterX(a.width);

  // Голова (локальные координаты головы: верх рожек ≈ 30, подбородок ≈ 305)
  const headY = a.headBottomY - 312 * k;

  // Шея: от туловища до головы, мягкий S-изгиб, к низу шире
  const baseY = a.bodyCY - 40 * k;
  const topY = headY + 250 * k;
  const length = Math.max(1, baseY - topY);
  const amp = 22 * k;
  const centerX = (t: number) => cx + amp * Math.sin(t * Math.PI * 2);
  const widthAt = (t: number) => {
    let w = k * (100 + 56 * Math.pow(1 - t, 1.6));
    const flare = 110 / length; // доля длины шеи, где она расширяется в грудь
    if (t < flare) w += k * 120 * Math.pow((flare - t) / flare, 2);
    return w;
  };
  const step = 14;
  const samples: { t: number; y: number; x: number; w: number }[] = [];
  for (let y = baseY; y >= topY - 0.5; y -= step) {
    const t = clamp((baseY - y) / length, 0, 1);
    samples.push({ t, y, x: centerX(t), w: widthAt(t) });
  }
  const last = samples[samples.length - 1]!;
  if (last.y > topY) samples.push({ t: 1, y: topY, x: centerX(1), w: widthAt(1) });

  const edge = (side: -1 | 1, offset = 0, filter?: (t: number) => boolean) =>
    samples
      .filter((s) => (filter ? filter(s.t) : true))
      .map((s, i) => `${i ? "L" : "M"}${r1(s.x + side * (s.w / 2 + offset))},${r1(s.y)}`)
      .join(" ");

  const left = samples.map((s) => [r1(s.x - s.w / 2), r1(s.y)] as const);
  const right = samples.map((s) => [r1(s.x + s.w / 2), r1(s.y)] as const).reverse();
  const neckPath =
    `M${left.map(([x, y]) => `${x},${y}`).join(" L")} ` + `L${right.map(([x, y]) => `${x},${y}`).join(" L")} Z`;

  // Пятна вдоль шеи — плотная «сетка», как у сетчатого жирафа
  const rand = mulberry32(7);
  const spots: Spot[] = [];
  let row = 0;
  for (let y = baseY + 10 * k; y > topY + 10 * k; y -= 48 * k, row++) {
    const t = clamp((baseY - y) / length, 0, 1);
    const w = widthAt(t);
    const x0 = centerX(t);
    const count = Math.max(2, Math.round(w / (58 * k)));
    const gap = w / count;
    const shift = row % 2 ? gap / 2 : 0;
    for (let i = -1; i <= count; i++) {
      spots.push({
        d: blobPath(x0 - w / 2 + shift + i * gap + (rand() - 0.5) * 8 * k, y + (rand() - 0.5) * 10 * k, Math.min(27 * k, gap * 0.45), rand),
        tone: (rand() < 0.16 ? 1 : rand() < 0.08 ? 2 : 0) as Spot["tone"],
      });
    }
  }
  // Пятна на туловище
  for (let y = -80, r = 0; y < 110; y += 52, r++) {
    for (let x = -250 + (r % 2 ? 30 : 0); x < 110; x += 60) {
      spots.push({
        d: blobPath(cx + (x + (rand() - 0.5) * 10) * k, a.bodyCY + (y + (rand() - 0.5) * 10) * k, 27 * k, rand, 6, 1.15),
        tone: (rand() < 0.18 ? 1 : 0) as Spot["tone"],
      });
    }
  }

  // Ноги: от туловища до земли — длинные, через весь стартовый участок и первый вопрос
  const legTop = a.bodyCY + 50 * k;
  const legBottom = a.groundY;
  const knee = legTop + (legBottom - legTop) * 0.56;
  const legs = [
    { lx: -196, far: true },
    { lx: 18, far: true },
    { lx: -158, far: false },
    { lx: 58, far: false },
  ].map((l) => ({ x: cx + l.lx * k, top: legTop, knee, bottom: legBottom, w: 30 * k, far: l.far }));

  const legSpots: Spot[] = [];
  for (const leg of legs) {
    for (let y = leg.top + 60 * k; y < leg.top + (leg.knee - leg.top) * 0.7; y += 46 * k) {
      legSpots.push({ d: blobPath(leg.x + (rand() - 0.5) * 6 * k, y, 9 * k, rand, 5, 1), tone: 0 });
    }
  }

  return {
    k,
    cx,
    headY,
    neckPath,
    manePath: edge(-1, 1 * k, (t) => t > 0.05 && t < 0.97),
    shadePath: edge(1, -9 * k, (t) => t > 0.08),
    bodyTransform: `translate(${r1(cx)} ${r1(a.bodyCY)}) scale(${r1(k * 1000) / 1000})`,
    legs,
    tail: { x: cx - 236 * k, y: a.bodyCY - 30 * k },
    spots,
    legSpots,
    leaves: [
      [0.22, -1, 30, 1],
      [0.42, 1, -24, 0.9],
      [0.62, -1, 160, 1.05],
      [0.82, 1, 200, 0.9],
    ].map(([t, side, rot, s], i) => {
      const tt = t as number;
      return [
        r1(centerX(tt) + (side as number) * (widthAt(tt) / 2 + 70 * k)),
        r1(baseY - tt * length),
        rot as number,
        r1((s as number) * k * 100) / 100,
        (i % 2) as 0 | 1,
      ] as [number, number, number, number, 0 | 1];
    }),
  };
}
