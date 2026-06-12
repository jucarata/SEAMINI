"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { DrawingCanvas } from "./DrawingCanvas";
import { ToolPanel, type Tool } from "./ToolPanel";
import styles from "./Aquarium.module.css";

export function Aquarium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("cursor");
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const [fishReloadKey, setFishReloadKey] = useState(0);
  const dragEnabledRef = useRef(true);

  dragEnabledRef.current = selectedTool === "cursor" && !isDrawingOpen;

  const syncFishDragEnabled = (game: Phaser.Game | null) => {
    game?.registry.set("fishDragEnabled", dragEnabledRef.current);
  };

  const handleSelectTool = (tool: Tool) => {
    if (tool === "draw") {
      setIsDrawingOpen(true);
      return;
    }

    setSelectedTool(tool);
    setIsDrawingOpen(false);
  };

  const handleCloseDrawing = () => {
    setIsDrawingOpen(false);
    setSelectedTool("cursor");
  };

  const handleFishSaved = () => {
    setFishReloadKey((current) => current + 1);
  };

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
      syncFishDragEnabled(gameRef.current);
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [fishReloadKey]);

  useEffect(() => {
    syncFishDragEnabled(gameRef.current);
  }, [selectedTool, isDrawingOpen]);

  return (
    <div className={styles.wrapper} aria-label="Pecera vacía">
      <ToolPanel
        selectedTool={selectedTool}
        isDrawingOpen={isDrawingOpen}
        onSelectTool={handleSelectTool}
      />
      <div ref={containerRef} className={styles.gameContainer} />
      {isDrawingOpen ? (
        <DrawingCanvas onClose={handleCloseDrawing} onFishSaved={handleFishSaved} />
      ) : null}
    </div>
  );
}
