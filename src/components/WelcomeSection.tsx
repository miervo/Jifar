import type { Ref } from "react";
import { content } from "@/config/content";
import { TagChrome } from "./StepProgress";

export function WelcomeSection({ onStart, bandRef }: { onStart: () => void; bandRef: Ref<HTMLElement> }) {
  const w = content.welcome;
  return (
    <section ref={bandRef} id="start" className="band band--welcome" aria-labelledby="welcome-title">
      <div className="tag tag--welcome" data-card>
        <TagChrome />
        <h1 id="welcome-title" className="welcome__title" tabIndex={-1} data-focus-target>
          {w.title}
        </h1>
        <p className="welcome__subtitle">{w.subtitle}</p>
        <p className="welcome__line">{w.line}</p>
        <button type="button" className="btn btn--primary btn--big" onClick={onStart}>
          {w.start}
          <svg className="btn__icon" viewBox="0 0 20 24" aria-hidden="true" focusable="false">
            <path d="M10,21 C11,15 9,11 10,5 M4,10 L10,4 L16,10" />
          </svg>
        </button>
      </div>
    </section>
  );
}
