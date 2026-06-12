"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { FISH_SELECTED_EVENT, type FishSelectedDetail } from "@/lib/fishEvents";
import { getFish, revokeFishUrls, type StoredFish } from "@/lib/fishStore";
import { DrawingCanvas } from "./DrawingCanvas";
import { FishDetailModal } from "./FishDetailModal";
import { ToolPanel, type Tool } from "./ToolPanel";
import styles from "./Aquarium.module.css";

export function Aquarium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>("cursor");
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [selectedFish, setSelectedFish] = useState<StoredFish | null>(null);

  const [fishReloadKey, setFishReloadKey] = useState(0);
  const dragEnabledRef = useRef(true);

  dragEnabledRef.current = selectedTool === "cursor" && !isDrawingOpen && selectedFish === null;

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

  const handleCloseFishDetail = useCallback(() => {
    setSelectedFish((current) => {
      if (current) {
        revokeFishUrls([current]);
      }
      return null;
    });
  }, []);

  const handleClearAllFish = () => {
    void (async () => {
      try {
        const { clearAllFish } = await import("@/lib/fishStore");
        await clearAllFish();
        setFishReloadKey((current) => current + 1);
      } catch {
        // Botón de prueba: fallo silencioso.
      }
    })();
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
  }, [selectedTool, isDrawingOpen, selectedFish]);

  useEffect(() => {
    const handleFishSelected = (event: Event) => {
      const { fileName } = (event as CustomEvent<FishSelectedDetail>).detail;

      void (async () => {
        try {
          const fish = await getFish(fileName);
          if (!fish) return;

          setSelectedFish((current) => {
            if (current) {
              revokeFishUrls([current]);
            }
            return fish;
          });
        } catch {
          // Fallo silencioso al abrir el detalle.
        }
      })();
    };

    window.addEventListener(FISH_SELECTED_EVENT, handleFishSelected);
    return () => window.removeEventListener(FISH_SELECTED_EVENT, handleFishSelected);
  }, []);

  useEffect(() => {
    return () => {
      setSelectedFish((current) => {
        if (current) {
          revokeFishUrls([current]);
        }
        return null;
      });
    };
  }, []);

  return (
    <div className={styles.wrapper} aria-label="Pecera vacía">
      <ToolPanel
        selectedTool={selectedTool}
        isDrawingOpen={isDrawingOpen}
        onSelectTool={handleSelectTool}
        onClearAllFish={handleClearAllFish}
      />
      <div ref={containerRef} className={styles.gameContainer} />
      {isDrawingOpen ? (
        <DrawingCanvas onClose={handleCloseDrawing} onFishSaved={handleFishSaved} />
      ) : null}
      {selectedFish ? <FishDetailModal fish={selectedFish} onClose={handleCloseFishDetail} /> : null}
    </div>
  );
}
