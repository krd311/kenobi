"use client";

import { useRef, useState, type PointerEvent } from "react";

export type PanelId = "search";

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  panel: PanelId | null;
  startX: number;
  startY: number;
  startRect: PanelRect | null;
}

export function useDraggablePanels({
  initialSearchRect,
}: {
  initialSearchRect: PanelRect;
}) {
  const [searchRect, setSearchRect] = useState<PanelRect>(initialSearchRect);

  const dragRef = useRef<DragState>({
    panel: null,
    startX: 0,
    startY: 0,
    startRect: null,
  });

  const resizeRef = useRef<DragState>({
    panel: null,
    startX: 0,
    startY: 0,
    startRect: null,
  });

  const getRect = () => searchRect;
  const setRect = (next: PanelRect) => setSearchRect(next);

  const clampRect = (rect: PanelRect): PanelRect => {
    if (typeof window === "undefined") return rect;

    const minW = 320;
    const minH = 180;
    const width = Math.max(minW, rect.width);
    const height = Math.max(minH, rect.height);
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);

    return {
      width,
      height,
      x: Math.min(Math.max(0, rect.x), maxX),
      y: Math.min(Math.max(0, rect.y), maxY),
    };
  };

  const startDrag = (e: PointerEvent<HTMLDivElement>, panel: PanelId) => {
    const current = getRect();
    dragRef.current = { panel, startX: e.clientX, startY: e.clientY, startRect: current };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  };

  const onDragMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.panel || !drag.startRect) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const next = clampRect({
      ...drag.startRect,
      x: drag.startRect.x + dx,
      y: drag.startRect.y + dy,
    });

    setRect(next);
  };

  const endDrag = () => {
    dragRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
    document.body.style.userSelect = "";
  };

  const startResize = (e: PointerEvent<HTMLDivElement>, panel: PanelId) => {
    const current = getRect();
    resizeRef.current = { panel, startX: e.clientX, startY: e.clientY, startRect: current };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
  };

  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize.panel || !resize.startRect) return;

    const dx = e.clientX - resize.startX;
    const dy = e.clientY - resize.startY;

    const next = clampRect({
      ...resize.startRect,
      width: resize.startRect.width + dx,
      height: resize.startRect.height + dy,
    });

    setRect(next);
  };

  const endResize = () => {
    resizeRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
    document.body.style.userSelect = "";
  };

  return {
    searchRect,
    startDrag,
    onDragMove,
    endDrag,
    startResize,
    onResizeMove,
    endResize,
  };
}
