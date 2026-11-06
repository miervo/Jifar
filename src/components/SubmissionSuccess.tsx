"use client";
import { useEffect, useRef } from "react";
import { content } from "@/config/content";

/** Показывается только после подтверждения сервера. */
export function SubmissionSuccess() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <p ref={ref} className="success" role="status" tabIndex={-1}>
      <svg viewBox="0 0 30 26" aria-hidden="true" focusable="false">
        <path d="M5,12 Q3,4 12,3 Q22,1 26,9 Q29,18 20,22 Q10,25 6,19 Q4,16 5,12 Z" />
      </svg>
      {content.final.success}
    </p>
  );
}
