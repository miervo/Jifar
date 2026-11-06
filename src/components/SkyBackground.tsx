// Небо с облаками на всю высоту страницы. Облака лежат под жирафом и карточками,
// поэтому никогда не закрывают поля.

// [верх в % высоты страницы, левый край в %, ширина в px, скорость дрейфа в с]
const CLOUDS: [number, number, number, number][] = [
  [3, 62, 190, 46],
  [9, 4, 150, 38],
  [16, 70, 220, 52],
  [24, -6, 170, 44],
  [31, 74, 140, 36],
  [39, 8, 210, 50],
  [47, 66, 180, 42],
  [55, -4, 150, 40],
  [63, 72, 200, 48],
  [71, 10, 160, 38],
  [79, 68, 150, 44],
  [86, 2, 190, 50],
];

function Cloud({ top, left, width, speed, index }: { top: number; left: number; width: number; speed: number; index: number }) {
  return (
    <svg
      className="cloud"
      viewBox="0 0 200 90"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: `clamp(${Math.round(width * 0.6)}px, ${(width / 14).toFixed(1)}vw, ${width}px)`,
        animationDuration: `${speed}s`,
        animationDelay: `${-index * 3.7}s`,
      }}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M30,78 C8,78 4,52 24,46 C20,22 52,12 66,30 C74,6 118,4 126,30 C140,14 172,22 168,46 C192,48 194,78 170,78 Z" />
    </svg>
  );
}

export function SkyBackground() {
  return (
    <div className="sky" aria-hidden="true">
      {CLOUDS.map(([top, left, width, speed], i) => (
        <Cloud key={i} index={i} top={top} left={left} width={width} speed={speed} />
      ))}
    </div>
  );
}
