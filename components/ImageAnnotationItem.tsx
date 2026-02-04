"use client";

import {
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence } from "motion/react";
import type { ImageAnnotation } from "@/stores/annotationsStore";
import { ImageEditor } from "./ImageEditor";

type Props = {
  annotation: ImageAnnotation;
  isSelected: boolean;
  onPointerDown: (
    ann: ImageAnnotation
  ) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<ImageAnnotation>) => void;
  onClone?: (id: string) => void;
};

export function ImageAnnotationItem({
  annotation,
  isSelected,
  onPointerDown,
  onPointerUp,
  onSelect,
  onChange,
  onClone,
}: Props) {
  const imgRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorPosition, setEditorPosition] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  }>({ top: 0, left: 0, placement: "above" });

  // Mover anotación con las flechas del teclado
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        return;
      }

      event.preventDefault();

      const findMainContainer = (
        el: HTMLElement | null
      ): HTMLElement | null => {
        if (!el) return null;
        let current: HTMLElement | null = el.parentElement;
        while (current) {
          if (
            current.classList.contains("relative") &&
            current.classList.contains("overflow-hidden") &&
            current.classList.contains("shadow-inner")
          ) {
            return current;
          }
          current = current.parentElement;
        }
        return null;
      };

      const container = findMainContainer(imgRef.current);
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const pixelIncrement = event.shiftKey ? 10 : 1;
      const xIncrement = pixelIncrement / containerRect.width;
      const yIncrement = pixelIncrement / containerRect.height;

      let newX = annotation.x;
      let newY = annotation.y;

      switch (event.key) {
        case "ArrowLeft":
          newX = Math.max(0, annotation.x - xIncrement);
          break;
        case "ArrowRight":
          newX = Math.min(1, annotation.x + xIncrement);
          break;
        case "ArrowUp":
          newY = Math.max(0, annotation.y - yIncrement);
          break;
        case "ArrowDown":
          newY = Math.min(1, annotation.y + yIncrement);
          break;
      }

      onChange(annotation.id, { x: newX, y: newY });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected, annotation.id, annotation.x, annotation.y, onChange]);

  // Calcular posición del editor para evitar que se salga del contenedor
  useLayoutEffect(() => {
    if (!isSelected || !imgRef.current) {
      return;
    }

    const findMainContainer = (el: HTMLElement | null): HTMLElement | null => {
      if (!el) return null;
      let current: HTMLElement | null = el.parentElement;
      while (current) {
        if (
          current.classList.contains("relative") &&
          current.classList.contains("overflow-hidden") &&
          current.classList.contains("shadow-inner")
        ) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const mainContainer = findMainContainer(imgRef.current);
    if (!mainContainer) return;

    const calculatePosition = () => {
      if (!imgRef.current || !editorRef.current) return;

      const imageRect = imgRef.current.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      const containerRect = mainContainer.getBoundingClientRect();

      const editorHeight = editorRect.height || 200;
      const editorWidth = editorRect.width || 400;
      const padding = 16;
      const margin = 8;

      const containerTop = containerRect.top + padding;
      const containerBottom = containerRect.bottom - padding;
      const containerLeft = containerRect.left + padding;
      const containerRight = containerRect.right - padding;

      const spaceAbove = imageRect.top - containerTop;
      const spaceBelow = containerBottom - imageRect.bottom;

      const shouldPlaceAbove =
        spaceAbove >= editorHeight + margin &&
        (spaceAbove >= spaceBelow || spaceBelow < editorHeight + margin);

      let top: number;
      if (shouldPlaceAbove) {
        top = imageRect.top - editorHeight - margin;
        top = Math.max(containerTop, top);
      } else {
        top = imageRect.bottom + margin;
        const maxTop = containerBottom - editorHeight;
        top = Math.min(maxTop, top);
      }

      let left = imageRect.left + imageRect.width / 2 - editorWidth / 2;

      if (left < containerLeft) {
        left = containerLeft;
      }

      if (left + editorWidth > containerRight) {
        left = containerRight - editorWidth;
      }

      if (editorWidth > containerRight - containerLeft) {
        left =
          containerLeft +
          (containerRight - containerLeft) / 2 -
          editorWidth / 2;
      }

      setEditorPosition({
        top,
        left,
        placement: shouldPlaceAbove ? "above" : "below",
      });
    };

    calculatePosition();
    const timeoutId = setTimeout(calculatePosition, 10);

    let resizeObserver: ResizeObserver | null = null;
    let containerResizeObserver: ResizeObserver | null = null;

    if (editorRef.current) {
      resizeObserver = new ResizeObserver(calculatePosition);
      resizeObserver.observe(editorRef.current);
    }

    if (mainContainer) {
      containerResizeObserver = new ResizeObserver(calculatePosition);
      containerResizeObserver.observe(mainContainer);
    }

    const handleScroll = () => calculatePosition();
    if (mainContainer) {
      mainContainer.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      containerResizeObserver?.disconnect();
      if (mainContainer) {
        mainContainer.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isSelected, annotation.x, annotation.y, annotation.width, annotation.height]);

  return (
    <div
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      className="absolute"
    >
      <div
        ref={imgRef}
        onPointerDown={onPointerDown(annotation)}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(annotation.id);
        }}
        className={`cursor-move ${
          isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
        }`}
        style={{
          width: `${annotation.width}px`,
          height: `${annotation.height}px`,
        }}
      >
        <img
          src={annotation.imageSrc}
          alt="Firma"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      <AnimatePresence>
        {isSelected && (
          <div
            key={annotation.id}
            ref={editorRef}
            className="fixed pb-2"
            style={{
              left: `${editorPosition.left}px`,
              top: `${editorPosition.top}px`,
              zIndex: 1000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ImageEditor
              annotation={annotation}
              onChange={(patch) => onChange(annotation.id, patch)}
              onClone={onClone ? () => onClone(annotation.id) : undefined}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
