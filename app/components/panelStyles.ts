import { type CSSProperties } from "react";
import { type PanelRect } from "@/app/hooks/useDraggablePanels";

const panelBackground = "rgba(22, 28, 38, 0.95)";
const panelBorder = "1px solid rgba(107, 114, 128, 0.65)";
const panelShadow = "0 10px 36px rgba(0, 0, 0, 0.55)";

export function getBasePanelStyle(rect: PanelRect): CSSProperties {
  return {
    position: "absolute",
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    background: panelBackground,
    border: panelBorder,
    borderRadius: 14,
    boxShadow: panelShadow,
    zIndex: 1000,
  };
}

export const dragHandleStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 28,
  cursor: "move",
  background: "transparent",
  borderTopLeftRadius: 14,
  borderTopRightRadius: 14,
};

export const resizeHandleStyle: CSSProperties = {
  position: "absolute",
  right: 8,
  bottom: 8,
  width: 14,
  height: 14,
  cursor: "nwse-resize",
  borderRight: "2px solid #9ca3af",
  borderBottom: "2px solid #9ca3af",
};
