"use client";

import { useEffect } from "react";
import { XP_PER_LEVEL, xpProgress } from "@/lib/fishXp";
import type { StoredFish } from "@/lib/fishStore";
import styles from "./FishDetailModal.module.css";

type FishDetailModalProps = {
  fish: StoredFish;
  onClose: () => void;
};

export function FishDetailModal({ fish, onClose }: FishDetailModalProps) {
  const progress = xpProgress(fish.xp);
  const progressPercent = Math.round(progress * 100);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalles de ${fish.name}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.dialog}>
        <div className={styles.hero}>
          <div className={styles.fishPreview}>
            <div className={styles.waterShine} aria-hidden="true" />
            <img
              className={styles.fishImage}
              src={fish.url}
              alt={fish.name}
              draggable={false}
            />
          </div>
          <div className={styles.levelCircle} aria-label={`Nivel ${fish.level}`}>
            {fish.level}
          </div>
        </div>

        <div className={styles.identity}>
          <h3 className={styles.title}>{fish.name}</h3>
        </div>

        <div className={styles.xpSection}>
          <div className={styles.xpHeader}>
            <span className={styles.xpLabel}>Experiencia</span>
            <span className={styles.xpValue}>
              {fish.xp} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div
            className={styles.xpTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={XP_PER_LEVEL}
            aria-valuenow={fish.xp}
            aria-label={`Experiencia: ${fish.xp} de ${XP_PER_LEVEL}`}
          >
            <div className={styles.xpFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
