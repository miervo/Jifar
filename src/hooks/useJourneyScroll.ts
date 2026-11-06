"use client";
import { useCallback, useEffect, useRef } from "react";
import { motionConfig } from "@/config/theme";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** Позиция, при которой элемент оказывается по центру экрана (или у верхнего края, если не влезает). */
function targetFor(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const offset = r.height <= vh - 48 ? r.height / 2 - vh / 2 : -24;
  const max = document.documentElement.scrollHeight - vh;
  return Math.max(0, Math.min(max, window.scrollY + r.top + offset));
}

/**
 * Плавная прокрутка к участку страницы.
 * — новая навигация отменяет предыдущую, поэтому прокрутки не конфликтуют;
 * — колесо, касание или клавиши прокрутки сразу отдают управление человеку;
 * — цель пересчитывается на каждом кадре (например, если закрылась клавиатура);
 * — при prefers-reduced-motion прокрутка мгновенная.
 */
export function useJourneyScroll(reduceMotion: boolean) {
  const frame = useRef<number | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    cleanup.current?.();
    cleanup.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  return useCallback(
    (el: HTMLElement, onDone?: () => void) => {
      stop();
      if (reduceMotion) {
        window.scrollTo(0, targetFor(el));
        onDone?.();
        return;
      }

      const startY = window.scrollY;
      const distance = Math.abs(targetFor(el) - startY);
      const duration = Math.min(motionConfig.scrollMaxMs, Math.max(motionConfig.scrollMinMs, 450 + distance * 0.35));
      const t0 = performance.now();
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        stop();
        onDone?.();
      };

      const interrupt = (e: Event) => {
        if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
        finish(); // человек взял прокрутку на себя — не спорим
      };
      window.addEventListener("wheel", interrupt, { passive: true });
      window.addEventListener("touchstart", interrupt, { passive: true });
      window.addEventListener("keydown", interrupt);
      cleanup.current = () => {
        window.removeEventListener("wheel", interrupt);
        window.removeEventListener("touchstart", interrupt);
        window.removeEventListener("keydown", interrupt);
      };

      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const y = startY + (targetFor(el) - startY) * easeInOutCubic(t);
        window.scrollTo(0, y);
        if (t < 1) frame.current = requestAnimationFrame(tick);
        else finish();
      };
      frame.current = requestAnimationFrame(tick);
    },
    [reduceMotion, stop],
  );
}
