"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { content } from "@/config/content";
import { layoutConfig } from "@/config/theme";
import { useJourneyScroll } from "@/hooks/useJourneyScroll";
import {
  FIELD_STEP,
  TOTAL_STEPS,
  emptyFormValues,
  firstErrorField,
  isGiraffe,
  toSubmissionRequest,
  validateValues,
  type FieldErrors,
  type FieldName,
  type FormValues,
} from "@/lib/validation";
import { AdminEntry } from "./AdminEntry";
import { BirthdayForm } from "./BirthdayForm";
import { EnvelopeConfirmation, type EnvelopePhase } from "./EnvelopeConfirmation";
import { GiraffeFinalMessage } from "./GiraffeFinalMessage";
import { GiraffeIllustration } from "./GiraffeIllustration";
import type { Anchors } from "./giraffe/geometry";
import { SkyBackground } from "./SkyBackground";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { WelcomeSection } from "./WelcomeSection";

export type ExperienceStage = "welcome" | "questions" | "final-message" | "envelope-ready" | "submitting" | "success";

type NavTarget = { to: number | "final" | "envelope"; focus?: FieldName; seq: number };

const FINAL_STAGES: ExperienceStage[] = ["final-message", "envelope-ready", "submitting", "success"];
const errorsText = content.final.errors;

/** UUID v4 даже там, где нет crypto.randomUUID (старые браузеры, http в локальной сети). */
function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

declare global {
  interface Window {
    __gpPositioned?: boolean;
  }
}

/**
 * Длинная страница: старт у копыт, вопросы 1–5 вверх по ногам, туловищу и шее,
 * финал у головы. Порядок в DOM — старт → вопросы → финал (так их проходят
 * клавиатура и скринридер), визуально участки стоят снизу вверх.
 */
export function GiraffePage() {
  const reduceMotion = useReducedMotion() ?? false;

  const [stage, setStage] = useState<ExperienceStage>("welcome");
  const [unlocked, setUnlocked] = useState(0);
  // Ответы живут только в памяти страницы: в localStorage ничего не пишется.
  const [values, setValues] = useState<FormValues>(emptyFormValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [happyKey, setHappyKey] = useState(0);
  const [anchors, setAnchors] = useState<Anchors | null>(null);
  const [nav, setNav] = useState<NavTarget | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLElement>(null);
  const bands = useRef<Record<number, HTMLElement | null>>({});
  const finalRef = useRef<HTMLElement>(null);
  const headSpaceRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const fields = useRef<Partial<Record<FieldName, HTMLElement | null>>>({});
  const submitting = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const navSeq = useRef(0);
  const sealedOnce = useRef(false);

  const scrollToEl = useJourneyScroll(reduceMotion);

  // --- Начальная позиция у копыт: ровно один раз за загрузку страницы ---------
  useLayoutEffect(() => {
    if (!window.__gpPositioned) {
      window.__gpPositioned = true;
      window.scrollTo(0, document.documentElement.scrollHeight);
    }
    document.documentElement.classList.remove("gp-pending");

    // Если шрифты догрузились и высота страницы изменилась, а человек ещё
    // ничего не трогал, — снова встаём к копытам (Safari не умеет scroll anchoring).
    let touched = false;
    const mark = () => {
      touched = true;
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true, once: true }));
    document.fonts?.ready.then(() => {
      if (!touched) window.scrollTo(0, document.documentElement.scrollHeight);
    });
    return () => events.forEach((e) => window.removeEventListener(e, mark));
  }, []);

  // --- Опорные точки иллюстрации из реального положения участков ---------------
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const measure = () => {
      const welcome = welcomeRef.current;
      const body = bands.current[2];
      const head = headSpaceRef.current;
      if (!welcome || !body || !head) return;
      const p = page.getBoundingClientRect();
      const w = welcome.getBoundingClientRect();
      const b = body.getBoundingClientRect();
      const h = head.getBoundingClientRect();
      const next: Anchors = {
        width: Math.round(p.width),
        height: Math.round(p.height),
        groundY: Math.round(w.bottom - p.top - layoutConfig.groundOffset),
        bodyCY: Math.round((b.top + b.bottom) / 2 - p.top),
        headBottomY: Math.round(h.bottom - p.top),
      };
      setAnchors((prev) =>
        prev &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.groundY === next.groundY &&
        prev.bodyCY === next.bodyCY &&
        prev.headBottomY === next.headBottomY
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(page);
    for (const el of [welcomeRef.current, bands.current[2], headSpaceRef.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- Навигация: прокрутка к участку, затем фокус без второго скачка -----------
  const navigate = useCallback((to: NavTarget["to"], focus?: FieldName) => {
    navSeq.current += 1;
    setNav({ to, focus, seq: navSeq.current });
  }, []);

  useEffect(() => {
    if (!nav) return;
    let el: HTMLElement | null = null;
    if (nav.to === "final") el = finalRef.current;
    else if (nav.to === "envelope") el = envelopeRef.current;
    else el = bands.current[nav.to]?.querySelector<HTMLElement>("[data-card]") ?? null;
    if (!el) return;
    const target = el;
    scrollToEl(target, () => {
      const focusEl = nav.focus
        ? fields.current[nav.focus]
        : nav.to === "envelope"
          ? null
          : target.querySelector<HTMLElement>("[data-focus-target]");
      focusEl?.focus({ preventScroll: true });
    });
    // nav.seq меняется на каждую навигацию — повторное нажатие тоже срабатывает
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav?.seq]);

  // --- Реакция на «жираф»: один раз при каждом новом совпадении ---------------
  const giraffeNow = isGiraffe(values.favoriteAnimal);
  const giraffeBefore = useRef(false);
  useEffect(() => {
    if (giraffeNow && !giraffeBefore.current && !reduceMotion) setHappyKey((k) => k + 1);
    giraffeBefore.current = giraffeNow;
  }, [giraffeNow, reduceMotion]);

  // --- Действия --------------------------------------------------------------
  const update = useCallback((name: FieldName, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }, []);

  const showErrors = useCallback(
    (errs: FieldErrors, currentStep?: number) => {
      const field = firstErrorField(errs);
      setErrors(errs);
      if (!field) return;
      if (FIELD_STEP[field] === currentStep) {
        requestAnimationFrame(() => fields.current[field]?.focus());
      } else {
        setUnlocked((u) => Math.max(u, FIELD_STEP[field]));
        navigate(FIELD_STEP[field], field);
      }
    },
    [navigate],
  );

  const start = () => {
    setStage((s) => (s === "welcome" ? "questions" : s));
    setUnlocked((u) => Math.max(u, 1));
    navigate(1);
  };

  const next = (step: number) => {
    const errs = validateValues(values, [step]);
    if (Object.keys(errs).length) {
      setErrors((e) => ({ ...e, ...errs }));
      const field = firstErrorField(errs);
      if (field) requestAnimationFrame(() => fields.current[field]?.focus());
      return;
    }
    setUnlocked((u) => Math.max(u, step + 1));
    navigate(step + 1);
  };

  const back = (step: number) => navigate(Math.max(1, step - 1));

  const toFinal = () => {
    const errs = validateValues(values);
    if (Object.keys(errs).length) {
      showErrors(errs, TOTAL_STEPS);
      return;
    }
    setErrors({});
    setStage((s) => (s === "questions" || s === "welcome" ? "final-message" : s));
    navigate("final");
  };

  const come = () => {
    sealedOnce.current = false;
    setAttendanceConfirmed(true);
    navigate("envelope");
  };

  const onSealed = useCallback(() => {
    if (sealedOnce.current) return;
    sealedOnce.current = true;
    setStage((s) => (s === "final-message" ? "envelope-ready" : s));
    requestAnimationFrame(() => sendRef.current?.focus({ preventScroll: true }));
  }, []);

  const send = async () => {
    if (submitting.current) return; // повторные нажатия не создают дубликатов
    const errs = validateValues(values);
    if (Object.keys(errs).length) {
      setSubmitError(errorsText.validation);
      showErrors(errs);
      return;
    }

    submitting.current = true;
    setSubmitError(null);
    setStage("submitting");
    // Один ключ на одну анкету: повтор после сбоя сети обновит ту же запись.
    idempotencyKey.current ??= makeIdempotencyKey();

    let ok = false;
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSubmissionRequest(values, idempotencyKey.current, attendanceConfirmed)),
        signal: controller.signal,
        credentials: "same-origin",
      }).finally(() => window.clearTimeout(timer));
      const data = (await res.json().catch(() => null)) as { ok?: boolean; fieldErrors?: FieldErrors } | null;

      if (res.ok && data?.ok) ok = true;
      else if (res.status === 400 && data?.fieldErrors && Object.keys(data.fieldErrors).length) {
        setSubmitError(errorsText.validation);
        showErrors(data.fieldErrors);
      } else if (res.status === 429) setSubmitError(errorsText.rateLimited);
      else if (res.status === 503) setSubmitError(errorsText.notConfigured);
      else setSubmitError(errorsText.server);
    } catch {
      setSubmitError(errorsText.network);
    } finally {
      submitting.current = false;
    }

    // Успех — только после подтверждения сервера; иначе конверт и ответы остаются.
    setStage(ok ? "success" : "envelope-ready");
  };

  const finalOpen = FINAL_STAGES.includes(stage);
  const envelopePhase: EnvelopePhase | null = !attendanceConfirmed
    ? null
    : stage === "final-message"
      ? "sealing"
      : stage === "envelope-ready"
        ? "ready"
        : stage === "submitting"
          ? "submitting"
          : stage === "success"
            ? "sent"
            : null;

  const bindBand = useCallback(
    (step: number) => (el: HTMLElement | null) => {
      bands.current[step] = el;
    },
    [],
  );
  const bindField = useCallback(
    (name: FieldName) => (el: HTMLElement | null) => {
      fields.current[name] = el;
    },
    [],
  );

  return (
    <div className="giraffe-page">
      <div ref={pageRef} className="journey">
        <SkyBackground />
        {anchors ? <GiraffeIllustration anchors={anchors} revealed={finalOpen} /> : null}

        <WelcomeSection onStart={start} bandRef={welcomeRef} />

        <BirthdayForm
          values={values}
          errors={errors}
          unlocked={unlocked}
          readOnly={stage === "submitting" || stage === "success"}
          happyKey={happyKey}
          update={update}
          onNext={next}
          onBack={back}
          onToFinal={toFinal}
          bindField={bindField}
          bindBand={bindBand}
        />

        <section
          ref={finalRef}
          id="final"
          className={`band band--final ${finalOpen ? "is-open" : "is-locked"}`}
          aria-labelledby={finalOpen ? "final-title" : undefined}
          aria-hidden={finalOpen ? undefined : true}
        >
          <div ref={headSpaceRef} className="final__head-space">
            <div className={`reveal-clouds ${finalOpen ? "is-open" : ""}`} aria-hidden="true">
              <svg className="reveal-cloud reveal-cloud--left" viewBox="0 0 200 90" focusable="false">
                <path d="M30,78 C8,78 4,52 24,46 C20,22 52,12 66,30 C74,6 118,4 126,30 C140,14 172,22 168,46 C192,48 194,78 170,78 Z" />
              </svg>
              <svg className="reveal-cloud reveal-cloud--right" viewBox="0 0 200 90" focusable="false">
                <path d="M30,78 C8,78 4,52 24,46 C20,22 52,12 66,30 C74,6 118,4 126,30 C140,14 172,22 168,46 C192,48 194,78 170,78 Z" />
              </svg>
            </div>
          </div>

          {finalOpen ? (
            <div className="final__content">
              <GiraffeFinalMessage showComeButton={!attendanceConfirmed} onCome={come} reduceMotion={reduceMotion} />
              {envelopePhase ? (
                <EnvelopeConfirmation
                  phase={envelopePhase}
                  onSealed={onSealed}
                  onSend={send}
                  error={submitError}
                  reduceMotion={reduceMotion}
                  sendRef={sendRef}
                  envelopeRef={envelopeRef}
                />
              ) : null}
              {stage === "success" ? <SubmissionSuccess /> : null}
            </div>
          ) : null}
        </section>
      </div>

      <AdminEntry />
    </div>
  );
}
