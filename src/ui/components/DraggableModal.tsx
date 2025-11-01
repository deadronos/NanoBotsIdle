import React, { useEffect, useRef, useState, useCallback } from "react";

interface DraggableModalProps {
  title?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string; // tailwind class like 'max-w-3xl'
  maxHeightClass?: string; // e.g. 'max-h-[80vh]'
}

export default function DraggableModal({
  title,
  onClose,
  children,
  className = "",
  maxWidthClass = "max-w-3xl",
  maxHeightClass = "max-h-[80vh]",
}: DraggableModalProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const [size, setSize] = useState<{ w?: number; h?: number }>({});
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const startRef = useRef<{
    mx: number;
    my: number;
    ox: number;
    oy: number;
    pointerId?: number;
  } | null>(null);
  const resizeStartRef = useRef<{ mx: number; my: number; w: number; h: number; pointerId?: number } | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // pointer-based movement to support touch & pen
    function onPointerMove(e: PointerEvent) {
      // handle resizing first
      if (resizingRef.current && resizeStartRef.current) {
        if (resizeStartRef.current.pointerId != null && e.pointerId !== resizeStartRef.current.pointerId) return;
        const dx = e.clientX - resizeStartRef.current.mx;
        const dy = e.clientY - resizeStartRef.current.my;
        const newW = Math.max(240, Math.min(window.innerWidth - 80, resizeStartRef.current.w + dx));
        const newH = Math.max(120, Math.min(window.innerHeight - 80, resizeStartRef.current.h + dy));
        setSize({ w: newW, h: newH });
        return;
      }
      if (!draggingRef.current || !startRef.current) return;
      // if pointerId was stored, ignore other pointers
      if (startRef.current.pointerId != null && e.pointerId !== startRef.current.pointerId) return;
      const mx = e.clientX;
      const my = e.clientY;
      const dx = mx - startRef.current.mx;
      const dy = my - startRef.current.my;
      const newX = startRef.current.ox + dx;
      const newY = startRef.current.oy + dy;

      // clamp to viewport so modal doesn't go fully off-screen
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = modalRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 600;
      const h = rect?.height ?? 400;

      const halfW = w / 2;
      const halfH = h / 2;

      const minX = -vw / 2 + halfW - 40; // allow some padding
      const maxX = vw / 2 - halfW + 40;
      const minY = -vh / 2 + halfH - 40;
      const maxY = vh / 2 - halfH + 40;

      const clamped = { x: Math.max(minX, Math.min(maxX, newX)), y: Math.max(minY, Math.min(maxY, newY)) };
      setOffset(clamped);
    }

    function onPointerUp(e: PointerEvent) {
      if (startRef.current?.pointerId != null && e.pointerId !== startRef.current.pointerId) return;
      draggingRef.current = false;
      startRef.current = null;
      // also stop resizing if active
      resizingRef.current = false;
      resizeStartRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (modalRef.current && 'releasePointerCapture' in modalRef.current) {
        try {
          (modalRef.current as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore release errors
        }
      }
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // Apply transform imperatively so we avoid inline styles in JSX
  const requestClose = useCallback(() => {
    // animate out then call onClose
    setVisible(false);
    // wait for animation to finish
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!modalRef.current) return;
    const node = modalRef.current;
    node.style.transform = `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`;
    // apply size if present
    if (size.w) node.style.width = `${size.w}px`;
    if (size.h) node.style.height = `${size.h}px`;
  }, [offset, size.w, size.h]);

  useEffect(() => {
    // reset offset when escape pressed; perform graceful close animation
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // animate close then notify parent
        requestClose();
      }
      if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
        // ctrl/cmd+R reset offset
        setOffset({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  function onMouseDown(e: React.MouseEvent) {
    // fallback for mouse; prefer pointer events via header pointerdown
    draggingRef.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    // prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  }

  function onPointerDownHeader(e: React.PointerEvent) {
    // start dragging for pointer events (touch/pen/mouse)
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    startRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y, pointerId: e.pointerId };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  }

  function onPointerDownResize(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    resizingRef.current = true;
    const rect = modalRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 600;
    const h = rect?.height ?? 400;
    resizeStartRef.current = { mx: e.clientX, my: e.clientY, w, h, pointerId: e.pointerId };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
  }

  // requestClose is defined above as a useCallback

  return (
    <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div
        ref={modalRef}
        className={`bg-neutral-900 border-2 border-neutral-800 rounded-lg shadow-lg w-full ${maxWidthClass} ${maxHeightClass} overflow-hidden ${className} fixed left-1/2 top-1/2`}
      >
        <div
          className={`px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-4 cursor-grab select-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1' } transition-all duration-200`}
          onPointerDown={onPointerDownHeader}
          onMouseDown={onMouseDown}
          onDoubleClick={() => setOffset({ x: 0, y: 0 })}
          // prevent dragging images etc.
          onDragStart={(e) => e.preventDefault()}
          title="Drag to move — double-click to reset"
        >
          <div className="flex-1">
            {typeof title === "string" ? (
              <div className="font-bold text-lg text-neutral-100 select-none">{title}</div>
            ) : (
              title
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Grab handle icon */}
            <div className="text-neutral-400 mr-2 select-none" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
                <path d="M3 6h2M3 12h2M3 18h2M9 6h2M9 12h2M9 18h2M15 6h2M15 12h2M15 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {onClose && (
              <button
                onClick={() => requestClose()}
                className="text-xl text-neutral-300 hover:text-white px-2"
                aria-label="Close"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className={`p-4 overflow-auto max-h-[calc(80vh-96px)] transition-transform duration-200 ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          {children}
        </div>
        {/* Resize handle */}
        <div
          className="absolute right-2 bottom-2 w-4 h-4 cursor-nwse-resize z-40"
          onPointerDown={onPointerDownResize}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-60">
            <path d="M3 21L21 3M14 21h7v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
