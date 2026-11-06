"use client";
import { useEffect, type Ref } from "react";
import { content } from "@/config/content";
import { motionConfig, palette as c } from "@/config/theme";

export type EnvelopePhase = "sealing" | "ready" | "submitting" | "sent";

type Props = {
  phase: EnvelopePhase;
  onSealed: () => void;
  onSend: () => void;
  error: string | null;
  reduceMotion: boolean;
  sendRef: Ref<HTMLButtonElement>;
  envelopeRef: Ref<HTMLDivElement>;
};

/** Листочек-ответ: только условные строки, личные ответы на нём не пишутся. */
function Sheet({ n, rot }: { n: number; rot: number }) {
  return (
    <g className={`sheet sheet--${n}`}>
      <g transform={`rotate(${rot} 120 140)`}>
        <rect x={64} y={96} width={112} height={82} rx={6} fill={c.milk} stroke={c.brown} strokeWidth={2.5} />
        <rect x={76} y={108} width={60} height={6} rx={3} fill={c.terracotta} />
        <rect x={76} y={122} width={86} height={5} rx={2.5} fill={c.sand} />
        <rect x={76} y={134} width={72} height={5} rx={2.5} fill={c.sand} />
        <rect x={76} y={146} width={80} height={5} rx={2.5} fill={c.sand} />
      </g>
    </g>
  );
}

/**
 * Конверт: ответы складываются внутрь, конверт закрывается и запечатывается.
 * Это только визуальное подтверждение — сохранение запускает кнопка
 * «Отправить Леночку!», а улёт конверта начинается после ответа сервера.
 */
export function EnvelopeConfirmation({ phase, onSealed, onSend, error, reduceMotion, sendRef, envelopeRef }: Props) {
  const f = content.final;

  // Без анимации (reduced motion) конверт запечатан сразу; иначе страхуемся таймером.
  useEffect(() => {
    if (phase !== "sealing") return;
    const timer = window.setTimeout(onSealed, reduceMotion ? 0 : motionConfig.envelopeSealMs + 400);
    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion, onSealed]);

  return (
    <div ref={envelopeRef} className={`envelope envelope--${phase}`}>
      <svg
        className="envelope__art"
        viewBox="0 0 240 210"
        role="img"
        aria-label={f.envelopeLabel}
        focusable="false"
      >
        <rect x={20} y={80} width={200} height={122} rx={10} fill={c.sandDeep} stroke={c.brown} strokeWidth={3} />
        <path className="flap-back" d="M20,84 L120,14 L220,84 Z" fill={c.sand} stroke={c.brown} strokeWidth={3} strokeLinejoin="round" />
        <Sheet n={1} rot={-6} />
        <Sheet n={2} rot={4} />
        <Sheet n={3} rot={-1} />
        <path d="M20,192 L20,92 L120,152 L220,92 L220,192 Q220,202 210,202 L30,202 Q20,202 20,192 Z" fill={c.sand} stroke={c.brown} strokeWidth={3} strokeLinejoin="round" />
        <path className="flap-front" d="M20,84 L120,156 L220,84 Z" fill={c.gold} stroke={c.brown} strokeWidth={3} strokeLinejoin="round" />
        <g
          className="seal"
          onAnimationEnd={(e) => {
            if (e.animationName === "seal-pop") onSealed();
          }}
        >
          <circle cx={120} cy={150} r={20} fill={c.terracotta} stroke={c.brown} strokeWidth={3} />
          <path d="M110,148 Q108,138 119,138 Q131,137 132,147 Q133,159 121,159 Q110,159 110,148 Z" fill={c.terracottaDeep} />
        </g>
      </svg>

      {phase === "ready" || phase === "submitting" ? (
        <div className="envelope__action">
          <button
            ref={sendRef}
            type="button"
            className="btn btn--primary btn--big"
            onClick={onSend}
            disabled={phase === "submitting"}
            aria-describedby={error ? "send-error" : undefined}
          >
            {phase === "submitting" ? (
              <>
                <span className="btn__spinner" aria-hidden="true" />
                {f.sending}
              </>
            ) : (
              f.send
            )}
          </button>
        </div>
      ) : null}

      {error && phase !== "sent" ? (
        <p id="send-error" className="submit-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
