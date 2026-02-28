"use client";

import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";

export type PanelId = "search" | "info";

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
  initialInfoRect,
  bottomGap,
}: {
  initialSearchRect: PanelRect;
  initialInfoRect: PanelRect;
  bottomGap: number;
}) {
  const [searchRect, setSearchRect] = useState<PanelRect>(initialSearchRect);
  const [infoRect, setInfoRect] = useState<PanelRect>(initialInfoRect);
  const [isInfoPanelReady, setIsInfoPanelReady] = useState(false);

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

  const getRect = (panel: PanelId) => (panel === "search" ? searchRect : infoRect);
  const setRect = (panel: PanelId, next: PanelRect) =>
    panel === "search" ? setSearchRect(next) : setInfoRect(next);

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
    const current = getRect(panel);
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

    setRect(drag.panel, next);
  };

  const endDrag = () => {
    dragRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
    document.body.style.userSelect = "";
  };

  const startResize = (e: PointerEvent<HTMLDivElement>, panel: PanelId) => {
    const current = getRect(panel);
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

    setRect(resize.panel, next);
  };

  const endResize = () => {
    resizeRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
    document.body.style.userSelect = "";
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setInfoRect((current) =>
      clampRect({
        ...current,
        x: (window.innerWidth - current.width) / 2,
        y: window.innerHeight - current.height - bottomGap,
      })
    );
    setIsInfoPanelReady(true);
  }, [bottomGap]);

  return {
    searchRect,
    infoRect,
    isInfoPanelReady,
    startDrag,
    onDragMove,
    endDrag,
    startResize,
    onResizeMove,
    endResize,
  };
}
