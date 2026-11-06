import type { ReactNode, Ref } from "react";
import { content } from "@/config/content";
import { StepProgress, TagChrome } from "./StepProgress";

type Props = {
  step: number;
  total: number;
  open: boolean;
  side: "left" | "right";
  title: string;
  bandRef: Ref<HTMLElement>;
  children?: ReactNode;
  nav?: ReactNode;
  decoration?: ReactNode;
};

/**
 * Участок страницы с одним вопросом. Пока вопрос не открыт, на его месте —
 * только ненавязчивое пятно-заглушка, скрытое от скринридеров и клавиатуры.
 */
export function QuestionSection({ step, total, open, side, title, bandRef, children, nav, decoration }: Props) {
  return (
    <section
      ref={bandRef}
      id={`step-${step}`}
      className={`band band--question band--${side} ${open ? "is-open" : "is-locked"}`}
      aria-labelledby={open ? `step-${step}-title` : undefined}
      aria-hidden={open ? undefined : true}
    >
      {open ? (
        <div className="tag tag--question" data-card>
          <TagChrome />
          <div className="tag__head">
            <StepProgress current={step} total={total} />
            <span className="tag__count">{content.form.stepOf(step, total)}</span>
          </div>
          <h2 id={`step-${step}-title`} className="step__title" tabIndex={-1} data-focus-target>
            {title}
          </h2>
          {children}
          <div className="nav">{nav}</div>
          {decoration}
        </div>
      ) : (
        <div className="locked" title={content.form.lockedLabel}>
          <svg viewBox="0 0 60 52" focusable="false">
            <path d="M10,24 Q6,8 24,6 Q44,2 52,18 Q58,36 40,44 Q20,50 12,38 Q8,32 10,24 Z" />
          </svg>
          <span>{step}</span>
        </div>
      )}
    </section>
  );
}
