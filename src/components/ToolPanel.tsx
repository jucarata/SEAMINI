"use client";

import { MousePointer2, Pencil, Trash2 } from "lucide-react";
import styles from "./ToolPanel.module.css";

export type Tool = "cursor" | "draw";

type ToolOption = {
  id: Tool;
  label: string;
  icon: React.ReactNode;
};

const TOOLS: ToolOption[] = [
  {
    id: "cursor",
    label: "Cursor",
    icon: <MousePointer2 className={styles.toolIcon} size={20} strokeWidth={2} aria-hidden="true" />,
  },
  {
    id: "draw",
    label: "Dibujar",
    icon: <Pencil className={styles.toolIcon} size={20} strokeWidth={2} aria-hidden="true" />,
  },
];

type ToolPanelProps = {
  selectedTool: Tool;
  isDrawingOpen: boolean;
  onSelectTool: (tool: Tool) => void;
  onClearAllFish?: () => void;
};

export function ToolPanel({
  selectedTool,
  isDrawingOpen,
  onSelectTool,
  onClearAllFish,
}: ToolPanelProps) {
  return (
    <div className={styles.panelShell}>
      <div className={styles.panel} role="toolbar" aria-label="Herramientas del acuario">
        {TOOLS.map((tool) => {
          const isActive =
            selectedTool === tool.id || (tool.id === "draw" && isDrawingOpen);

          return (
            <button
              key={tool.id}
              type="button"
              className={`${styles.toolButton} ${isActive ? styles.toolButtonActive : ""}`}
              aria-label={tool.label}
              aria-pressed={isActive}
              title={tool.label}
              onClick={() => onSelectTool(tool.id)}
            >
              {tool.icon}
            </button>
          );
        })}
        {onClearAllFish ? (
          <button
            type="button"
            className={`${styles.toolButton} ${styles.toolButtonDanger}`}
            aria-label="Eliminar todos los peces"
            title="Eliminar todos los peces (prueba)"
            onClick={onClearAllFish}
          >
            <Trash2 className={styles.toolIcon} size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
