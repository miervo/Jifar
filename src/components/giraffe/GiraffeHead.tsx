import { palette as c } from "@/config/theme";

const LEAF = "M0,0 C10,-15 30,-15 42,0 C30,15 10,15 0,0 Z";

export function Leaf({ x, y, rot, s, tone }: { x: number; y: number; rot: number; s: number; tone: 0 | 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={LEAF} fill={tone ? c.leafLight : c.green} />
      <path d="M3,0 L38,0" stroke={c.milk} strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

const HEAD_D = "M-66,104 C-78,44 78,44 66,104 C80,172 76,232 60,272 C46,308 -46,308 -60,272 C-76,232 -80,172 -66,104 Z";

/** Голова в праздничном колпачке. Локальные координаты: x — от центра, y — от верха (рожки ≈ 30, подбородок ≈ 305). */
export function GiraffeHead() {
  return (
    <g className="giraffe-head">
      {/* рожки */}
      <path d="M-42,108 L-48,50 L-30,48 L-24,106 Z" fill={c.goldDeep} />
      <path d="M42,108 L48,50 L30,48 L24,106 Z" fill={c.goldDeep} />
      <circle cx={-39} cy={44} r={15} fill={c.brown} />
      <circle cx={39} cy={44} r={15} fill={c.brown} />

      {/* уши */}
      <g className="giraffe-ear giraffe-ear--left">
        <ellipse cx={-90} cy={112} rx={48} ry={18} transform="rotate(-20 -90 112)" fill={c.gold} />
        <ellipse cx={-94} cy={113} rx={30} ry={8} transform="rotate(-20 -94 113)" fill={c.terracotta} opacity={0.55} />
      </g>
      <g className="giraffe-ear giraffe-ear--right">
        <ellipse cx={90} cy={112} rx={48} ry={18} transform="rotate(20 90 112)" fill={c.gold} />
        <ellipse cx={94} cy={113} rx={30} ry={8} transform="rotate(20 94 113)" fill={c.terracotta} opacity={0.55} />
      </g>

      {/* голова */}
      <path d={HEAD_D} fill={c.gold} />
      <clipPath id="giraffe-head-clip">
        <path d={HEAD_D} />
      </clipPath>
      <g clipPath="url(#giraffe-head-clip)" fill={c.terracotta}>
        <path d="M-58,82 Q-40,66 -24,80 Q-20,100 -38,106 Q-58,104 -58,82 Z" />
        <path d="M18,78 Q34,64 50,74 Q58,92 44,102 Q24,104 18,78 Z" />
        <path d="M-74,150 Q-58,140 -50,156 Q-52,174 -70,176 Z" />
        <path d="M74,150 Q58,140 50,156 Q52,174 70,176 Z" />
      </g>

      {/* щёки */}
      <circle cx={-52} cy={206} r={13} fill={c.terracotta} opacity={0.32} />
      <circle cx={52} cy={206} r={13} fill={c.terracotta} opacity={0.32} />

      {/* глаза */}
      {[-1, 1].map((side) => (
        <g key={side} className="giraffe-eye">
          <ellipse cx={side * 33} cy={160} rx={12} ry={15} fill={c.brown} />
          <circle cx={side * 33 + 4} cy={154} r={4.2} fill={c.milk} />
          <path
            d={`M${side * 22},146 l${side * -4},-9 M${side * 32},143 l0,-10 M${side * 42},146 l${side * 4},-9`}
            stroke={c.brown}
            strokeWidth={3.4}
            strokeLinecap="round"
          />
        </g>
      ))}

      {/* морда */}
      <ellipse cx={0} cy={250} rx={58} ry={45} fill={c.sand} />
      <ellipse cx={-20} cy={242} rx={6} ry={9} transform="rotate(-18 -20 242)" fill={c.brown} />
      <ellipse cx={20} cy={242} rx={6} ry={9} transform="rotate(18 20 242)" fill={c.brown} />
      <path d="M-26,268 Q0,294 28,266" fill="none" stroke={c.brown} strokeWidth={4.5} strokeLinecap="round" />

      {/* праздничный колпачок */}
      <g className="giraffe-hat">
        <clipPath id="giraffe-hat-clip">
          <path d="M-34,74 L-2,-88 L36,64 Z" />
        </clipPath>
        <path d="M-34,74 L-2,-88 L36,64 Z" fill={c.terracotta} />
        <g clipPath="url(#giraffe-hat-clip)" stroke={c.gold} strokeWidth={11}>
          <path d="M-60,30 L60,-10" />
          <path d="M-60,-14 L60,-54" />
          <path d="M-60,72 L60,32" />
        </g>
        <g clipPath="url(#giraffe-hat-clip)" fill={c.milk}>
          <circle cx={-6} cy={50} r={4} />
          <circle cx={10} cy={6} r={3.5} />
          <circle cx={-4} cy={-34} r={3} />
        </g>
        <path d="M-38,72 Q2,82 40,62" fill="none" stroke={c.brown} strokeWidth={5} strokeLinecap="round" />
        <circle cx={-2} cy={-92} r={13} fill={c.green} />
        <circle cx={-6} cy={-96} r={4} fill={c.leafLight} />
      </g>
    </g>
  );
}
