"use client";

import { useEffect, useState } from "react";
import { sanitizeFishName } from "@/lib/sanitizeFishName";
import styles from "./SaveFishModal.module.css";

type SaveFishModalProps = {
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
};

export function SaveFishModal({
  isSaving,
  error,
  successMessage,
  onSave,
  onClose,
}: SaveFishModalProps) {
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
    if (!sanitizedName || isSaving || successMessage) return;
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
        <h3 className={styles.title}>Guardar pez</h3>
        <p className={styles.description}>
          Solo se exportará lo dibujado, sin el fondo blanco. El pez se guardará como imagen PNG.
        </p>

        <label className={styles.field}>
          <span className={styles.label}>Nombre del pez</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            placeholder="Ej: Nemo"
            autoFocus
            disabled={isSaving || Boolean(successMessage)}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {sanitizedName ? (
          <p className={styles.filePreview}>
            Archivo: <strong>{sanitizedName}.png</strong>
          </p>
        ) : null}

        {error ? <p className={styles.error}>{error}</p> : null}
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={isSaving}
            onClick={onClose}
          >
            {successMessage ? "Cerrar" : "Cancelar"}
          </button>
          {!successMessage ? (
            <button
              type="submit"
              className={styles.buttonPrimary}
              disabled={!sanitizedName || isSaving}
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
