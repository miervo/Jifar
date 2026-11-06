"use client";
import type { KeyboardEventHandler, ReactNode, Ref } from "react";

export function FieldError({ id, message }: { id: string; message?: string }) {
  // Контейнер всегда в DOM, чтобы скринридер озвучил появившуюся ошибку.
  return (
    <p id={id} className="field__error" aria-live="polite">
      {message ? (
        <>
          <svg viewBox="0 0 20 18" aria-hidden="true" focusable="false">
            <path d="M3,8 Q2,2 9,2 Q17,1 18,8 Q19,16 10,16 Q2,16 3,8 Z" />
          </svg>
          <span>{message}</span>
        </>
      ) : null}
    </p>
  );
}

type TextFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Видимая подпись. Если её нет — передай labelledBy (доступное имя без видимой подписи). */
  label?: string;
  labelledBy?: string;
  /** Пояснения над полем и под ним (связываются с полем через aria-describedby) */
  intro?: string;
  hint?: string;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  onEnter?: () => void;
  disabled?: boolean;
  after?: ReactNode;
};

export function TextField({
  id,
  value,
  onChange,
  maxLength,
  label,
  labelledBy,
  intro,
  hint,
  placeholder,
  error,
  multiline,
  rows = 3,
  autoComplete = "off",
  inputRef,
  onEnter,
  disabled,
  after,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const introId = intro ? `${id}-intro` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [introId, hintId, errorId].filter(Boolean).join(" ");

  // Enter в однострочном поле = «полетели», но не отправка анкеты.
  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onEnter?.();
    }
  };

  const common = {
    id,
    value,
    placeholder,
    maxLength,
    autoComplete,
    disabled,
    "aria-labelledby": label ? undefined : labelledBy,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "input",
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  };

  return (
    <div className="field">
      {label ? (
        <label htmlFor={id} className="field__label">
          {label}
        </label>
      ) : null}
      {intro ? (
        <p id={introId} className="field__intro">
          {intro}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...common} ref={inputRef as Ref<HTMLTextAreaElement>} rows={rows} />
      ) : (
        <input
          {...common}
          ref={inputRef as Ref<HTMLInputElement>}
          type="text"
          enterKeyHint={onEnter ? "next" : "done"}
          onKeyDown={onKeyDown}
        />
      )}
      {hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
      <div className="field__foot">
        <FieldError id={errorId} message={error} />
        {multiline ? (
          <span className="field__counter" aria-hidden="true">
            {Array.from(value).length} / {maxLength}
          </span>
        ) : null}
      </div>
      {after}
    </div>
  );
}
