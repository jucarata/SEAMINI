"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import styles from "./Aquarium.module.css";

export function Aquarium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    let cancelled = false;

    void (async () => {
      const PhaserLib = (await import("phaser")).default;
      const { createAquariumGame } = await import("@/game/createGame");

      if (cancelled || !containerRef.current) return;

      gameRef.current?.destroy(true);
      gameRef.current = createAquariumGame(containerRef.current, PhaserLib);
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className={styles.wrapper} aria-label="Pecera vacía">
      <div ref={containerRef} className={styles.gameContainer} />
    </div>
  );
}
