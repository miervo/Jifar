"use client";
import { useRef, useState } from "react";
import { content } from "@/config/content";
import { AdminLogin } from "./AdminLogin";

/**
 * Неприметное пятно в углу — обычная кнопка, доступная с клавиатуры.
 * Незаметность — только приём оформления: доступ защищает серверная проверка пароля.
 */
export function AdminEntry() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className="admin-spot" aria-label={content.admin.entryLabel} onClick={show}>
        <svg viewBox="0 0 30 26" aria-hidden="true" focusable="false">
          <path d="M5,12 Q3,4 12,3 Q22,1 26,9 Q29,18 20,22 Q10,25 6,19 Q4,16 5,12 Z" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog"
        aria-labelledby="admin-login-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // клик по подложке
        }}
      >
        {open ? <AdminLogin onClose={close} /> : null}
      </dialog>
    </>
  );
}
