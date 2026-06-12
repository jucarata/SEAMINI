"use client";

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
    icon: (
      <svg
        className={styles.cursorIcon}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M4.5 2.5v16.8l4.6-4 2.4 5.8 2.3-.9-2.3-5.5h4.2L4.5 2.5z"
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "draw",
    label: "Dibujar",
    icon: (
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m13.5 6.5 3 3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

type ToolPanelProps = {
  selectedTool: Tool;
  isDrawingOpen: boolean;
  onSelectTool: (tool: Tool) => void;
};

export function ToolPanel({ selectedTool, isDrawingOpen, onSelectTool }: ToolPanelProps) {
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
      </div>
    </div>
  );
}
