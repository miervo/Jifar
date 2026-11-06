"use client";
import { memo, useMemo } from "react";
import { palette as c } from "@/config/theme";
import { BODY_PATH, buildGiraffe, type Anchors } from "./giraffe/geometry";
import { GiraffeHead, Leaf } from "./giraffe/GiraffeHead";

function Grass({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" strokeLinecap="round" strokeWidth={5}>
      <path d="M0,0 C-2,-18 -10,-30 -18,-38" stroke={c.green} />
      <path d="M6,0 C6,-22 8,-36 12,-48" stroke={c.leafLight} />
      <path d="M12,0 C16,-14 24,-24 32,-28" stroke={c.green} />
    </g>
  );
}

type Props = {
  anchors: Anchors;
  /** Голова открыта: облака разошлись, колпачок «выпрыгнул» */
  revealed: boolean;
};

/** Единая SVG-иллюстрация на всю высоту страницы: от копыт до колпачка. */
function GiraffeIllustrationBase({ anchors, revealed }: Props) {
  const g = useMemo(() => buildGiraffe(anchors), [anchors]);
  const { width: W, height: H, groundY } = anchors;
  const k = g.k;
  const toneFill = [c.terracotta, "#B35A2E", c.terracottaDeep];

  return (
    <svg
      className={`giraffe ${revealed ? "giraffe--revealed" : ""}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="giraffe-coat-clip">
          <path d={g.neckPath} />
          <path d={BODY_PATH} transform={g.bodyTransform} />
        </clipPath>
        <filter id="giraffe-soft" x="-20%" y="-2%" width="140%" height="104%">
          <feGaussianBlur stdDeviation={6 * k} />
        </filter>
      </defs>

      {/* земля */}
      <path
        d={`M0,${groundY - 6} C${W * 0.3},${groundY - 26} ${W * 0.7},${groundY - 20} ${W},${groundY - 4} L${W},${H} L0,${H} Z`}
        fill={c.sand}
      />
      <path
        d={`M0,${groundY - 6} C${W * 0.3},${groundY - 26} ${W * 0.7},${groundY - 20} ${W},${groundY - 4}`}
        fill="none"
        stroke={c.sandDeep}
        strokeWidth={3}
      />
      <ellipse cx={g.cx - 60 * k} cy={groundY - 6} rx={190 * k} ry={14 * k} fill={c.brown} opacity={0.12} />
      <Grass x={W * 0.08} y={groundY - 10} s={k} />
      <Grass x={W * 0.86} y={groundY - 8} s={1.15 * k} />
      <Grass x={g.cx - 90 * k} y={groundY - 12} s={0.8 * k} />

      {/* листья вдоль шеи */}
      {g.leaves.map(([x, y, rot, s, tone], i) => (
        <Leaf key={i} x={x} y={y} rot={rot} s={s} tone={tone} />
      ))}

      {/* хвост */}
      <g className="giraffe-tail">
        <path
          d={`M${g.tail.x},${g.tail.y} C${g.tail.x - 30 * k},${g.tail.y + 50 * k} ${g.tail.x - 34 * k},${g.tail.y + 90 * k} ${g.tail.x - 28 * k},${g.tail.y + 140 * k}`}
          fill="none"
          stroke={c.goldDeep}
          strokeWidth={9 * k}
          strokeLinecap="round"
        />
        <ellipse cx={g.tail.x - 28 * k} cy={g.tail.y + 160 * k} rx={10 * k} ry={22 * k} fill={c.brown} />
      </g>

      {/* ноги: дальние темнее */}
      {g.legs.map((l, i) => {
        const upper = l.far ? c.goldDeep : c.gold;
        const lower = l.far ? c.sandDeep : c.sand;
        const hoof = 24 * k;
        return (
          <g key={i}>
            <path
              d={`M${l.x - l.w / 2},${l.top} L${l.x + l.w / 2},${l.top} L${l.x + l.w * 0.4},${l.knee} L${l.x - l.w * 0.4},${l.knee} Z`}
              fill={upper}
            />
            <path
              d={`M${l.x - l.w * 0.4},${l.knee} L${l.x + l.w * 0.4},${l.knee} L${l.x + l.w * 0.34},${l.bottom - hoof} L${l.x - l.w * 0.34},${l.bottom - hoof} Z`}
              fill={lower}
            />
            <ellipse cx={l.x} cy={l.knee} rx={l.w * 0.48} ry={l.w * 0.38} fill={upper} />
            <rect x={l.x - l.w * 0.43} y={l.bottom - hoof} width={l.w * 0.86} height={hoof} rx={6 * k} fill={c.brown} />
          </g>
        );
      })}
      <g fill={c.terracotta}>
        {g.legSpots.map((s, i) => (
          <path key={i} d={s.d} />
        ))}
      </g>

      {/* грива — под шеей, видна только наружная половина */}
      <path
        d={g.manePath}
        fill="none"
        stroke={c.brown}
        strokeWidth={18 * k}
        strokeDasharray={`${3 * k} ${21 * k}`}
        strokeLinecap="round"
      />

      {/* шерсть: туловище и шея */}
      <path d={BODY_PATH} transform={g.bodyTransform} fill={c.gold} />
      <path d={g.neckPath} fill={c.gold} />
      <g clipPath="url(#giraffe-coat-clip)">
        {g.spots.map((s, i) => (
          <path key={i} d={s.d} fill={toneFill[s.tone]} />
        ))}
        <path
          d={g.shadePath}
          fill="none"
          stroke={c.brown}
          strokeOpacity={0.14}
          strokeWidth={34 * k}
          filter="url(#giraffe-soft)"
        />
      </g>

      {/* голова в колпачке */}
      <g transform={`translate(${g.cx} ${g.headY}) scale(${k})`}>
        <GiraffeHead />
      </g>
    </svg>
  );
}

export const GiraffeIllustration = memo(GiraffeIllustrationBase);
