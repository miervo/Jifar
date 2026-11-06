import { blobPath } from "./giraffe/geometry";

// Пять пятен жирафа: пройденные закрашены, текущее — золотое.
const SHAPES = [3, 11, 19, 29, 41].map((seed) => {
  let a = seed;
  const rand = () => {
    a = (a * 9301 + 49297) % 233280;
    return a / 233280;
  };
  return blobPath(14, 12, 9.5, rand, 6, 1.15);
});

export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="progress" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const state = i + 1 < current ? "done" : i + 1 === current ? "current" : "todo";
        return (
          <svg key={i} viewBox="0 0 28 24" className={`progress__spot progress__spot--${state}`}>
            <path d={SHAPES[i % SHAPES.length]} />
          </svg>
        );
      })}
    </div>
  );
}

/** Бирка на верёвочке: вешается на жирафа. */
export function TagChrome() {
  return (
    <>
      <svg className="tag__string" viewBox="0 0 120 110" aria-hidden="true" focusable="false">
        <path d="M58,104 C50,70 30,40 -6,6" />
      </svg>
      <span className="tag__tab" aria-hidden="true">
        <span className="tag__eyelet" />
      </span>
    </>
  );
}
