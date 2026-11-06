"use client";
import type { ReactNode, Ref } from "react";
import { content } from "@/config/content";
import { layoutConfig } from "@/config/theme";
import { LIMITS, TOTAL_STEPS, isGiraffe, type FieldErrors, type FieldName, type FormValues } from "@/lib/validation";
import { TextField } from "./Fields";
import { QuestionSection } from "./QuestionSection";

const t = content.form;

type Props = {
  values: FormValues;
  errors: FieldErrors;
  unlocked: number;
  /** Анкета уходит на сервер или уже ушла — поля только для чтения */
  readOnly: boolean;
  happyKey: number;
  update: (name: FieldName, value: string) => void;
  onNext: (step: number) => void;
  onBack: (step: number) => void;
  onToFinal: () => void;
  bindField: (name: FieldName) => (el: HTMLElement | null) => void;
  bindBand: (step: number) => Ref<HTMLElement>;
};

/**
 * Пять вопросов. В DOM они идут по порядку 1 → 5 (так их читают скринридер
 * и клавиатура), а визуально стоят снизу вверх благодаря column-reverse.
 */
export function BirthdayForm({
  values,
  errors,
  unlocked,
  readOnly,
  happyKey,
  update,
  onNext,
  onBack,
  onToFinal,
  bindField,
  bindBand,
}: Props) {
  const steps = t.steps;
  const giraffe = isGiraffe(values.favoriteAnimal);

  const navFor = (step: number) => (
    <>
      {step > 1 ? (
        <button type="button" className="btn btn--ghost" onClick={() => onBack(step)} disabled={readOnly}>
          {t.back}
        </button>
      ) : null}
      {step < TOTAL_STEPS ? (
        <button type="button" className="btn btn--primary" onClick={() => onNext(step)} disabled={readOnly}>
          {t.next}
          <svg className="btn__icon" viewBox="0 0 20 24" aria-hidden="true" focusable="false">
            <path d="M10,21 C11,15 9,11 10,5 M4,10 L10,4 L16,10" />
          </svg>
        </button>
      ) : (
        <button type="button" className="btn btn--primary btn--wide" onClick={onToFinal} disabled={readOnly}>
          {t.toFinal}
        </button>
      )}
    </>
  );

  const section = (step: number, title: string, body: ReactNode, extra?: ReactNode) => (
    <QuestionSection
      key={step}
      step={step}
      total={TOTAL_STEPS}
      open={unlocked >= step}
      side={layoutConfig.questionSides[step - 1]!}
      title={title}
      bandRef={bindBand(step)}
      nav={navFor(step)}
      decoration={extra}
    >
      {body}
    </QuestionSection>
  );

  return (
    <form className="journey__questions" noValidate onSubmit={(e) => e.preventDefault()}>
      {section(
        1,
        steps[1].title,
        <TextField
          id="nickname"
          labelledBy="step-1-title"
          hint={steps[1].hint}
          value={values.nickname}
          onChange={(v) => update("nickname", v)}
          error={errors.nickname}
          maxLength={LIMITS.nickname}
          autoComplete="nickname"
          inputRef={bindField("nickname")}
          onEnter={() => onNext(1)}
          disabled={readOnly}
        />,
      )}

      {section(
        2,
        steps[2].title,
        <TextField
          id="alcoholPreferencesText"
          label={steps[2].label}
          hint={steps[2].hint}
          value={values.alcoholPreferencesText}
          onChange={(v) => update("alcoholPreferencesText", v)}
          error={errors.alcoholPreferencesText}
          maxLength={LIMITS.alcoholPreferencesText}
          multiline
          rows={3}
          inputRef={bindField("alcoholPreferencesText")}
          disabled={readOnly}
        />,
      )}

      {section(
        3,
        steps[3].title,
        <TextField
          id="allergyText"
          labelledBy="step-3-title"
          intro={steps[3].intro}
          placeholder={steps[3].placeholder}
          hint={steps[3].hint}
          value={values.allergyText}
          onChange={(v) => update("allergyText", v)}
          error={errors.allergyText}
          maxLength={LIMITS.allergyText}
          multiline
          rows={4}
          inputRef={bindField("allergyText")}
          disabled={readOnly}
        />,
      )}

      {section(
        4,
        steps[4].title,
        <TextField
          id="favoriteAnimal"
          label={steps[4].label}
          placeholder={steps[4].placeholder}
          value={values.favoriteAnimal}
          onChange={(v) => update("favoriteAnimal", v)}
          error={errors.favoriteAnimal}
          maxLength={LIMITS.favoriteAnimal}
          inputRef={bindField("favoriteAnimal")}
          onEnter={() => onNext(4)}
          disabled={readOnly}
          after={
            <p className={`reaction ${giraffe ? "reaction--on" : ""}`} aria-live="polite">
              {giraffe ? (
                <>
                  <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
                    <path d="M4,11 Q3,3 13,3 Q24,2 25,11 Q26,21 14,21 Q3,21 4,11 Z" />
                  </svg>
                  {steps[4].giraffeReaction}
                </>
              ) : null}
            </p>
          }
        />,
        // Пятна «выпрыгивают» с шеи рядом с карточкой — один раз на каждое новое «жираф».
        happyKey > 0 ? (
          <span key={happyKey} className="burst" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }} />
            ))}
          </span>
        ) : null,
      )}

      {section(
        5,
        steps[5].title,
        <>
          <TextField
            id="favoriteCartoonCharacter"
            label={steps[5].label}
            value={values.favoriteCartoonCharacter}
            onChange={(v) => update("favoriteCartoonCharacter", v)}
            error={errors.favoriteCartoonCharacter}
            maxLength={LIMITS.favoriteCartoonCharacter}
            inputRef={bindField("favoriteCartoonCharacter")}
            disabled={readOnly}
          />
          <p className="consent">{t.consent}</p>
        </>,
      )}
    </form>
  );
}
