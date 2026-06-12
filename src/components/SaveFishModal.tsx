"use client";

import { Fish } from "lucide-react";
import { useEffect, useState } from "react";
import { sanitizeFishName } from "@/lib/sanitizeFishName";
import styles from "./SaveFishModal.module.css";

type SaveFishModalProps = {
  isSaving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
};

export function SaveFishModal({ isSaving, error, onSave, onClose }: SaveFishModalProps) {
  const [name, setName] = useState("");
  const sanitizedName = sanitizeFishName(name);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSaving, onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sanitizedName || isSaving) return;
    onSave(name.trim());
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Guardar pez"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Fish size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>Guardar pez</h3>
            <p className={styles.description}>
              Ponle un nombre y lo soltaremos en tu acuario.
            </p>
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Nombre del pez</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            placeholder="Ej: Nemo"
            autoFocus
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {sanitizedName ? (
          <p className={styles.filePreview}>
            Se guardará como <strong>{sanitizedName}.png</strong>
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.button} disabled={isSaving} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.buttonPrimary}
            disabled={!sanitizedName || isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
