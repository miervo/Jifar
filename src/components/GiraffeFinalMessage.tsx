"use client";
import { motion } from "motion/react";
import { content } from "@/config/content";
import { eventConfig } from "@/config/event";
import { motionConfig } from "@/config/theme";

type Props = {
  showComeButton: boolean;
  onCome: () => void;
  reduceMotion: boolean;
};

/** Облачко речи рядом с головой и кнопка «я приду!». */
export function GiraffeFinalMessage({ showComeButton, onCome, reduceMotion }: Props) {
  const f = content.final;
  return (
    <div className="final-message">
      <h2 id="final-title" className="visually-hidden" tabIndex={-1} data-focus-target>
        {f.srHeading}
      </h2>
      <motion.div
        className="bubble"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.86, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.3, 1.4, 0.5, 1] }}
      >
        {/* Текст выводится как есть, с переносом перед P.S. */}
        <p className="bubble__text">{f.message}</p>
        {eventConfig.wishlistUrl ? (
          <a className="bubble__link" href={eventConfig.wishlistUrl} target="_blank" rel="noopener noreferrer">
            {eventConfig.wishlistLabel}
          </a>
        ) : null}
      </motion.div>

      {showComeButton ? (
        <motion.div
          className="final-message__action"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : motionConfig.comeButtonDelayMs / 1000 }}
        >
          <button type="button" className="btn btn--primary btn--big" onClick={onCome}>
            {f.iWillCome}
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
