import { AnnotationEditor } from "./AnnotationEditor";
import type { TextAnnotation } from "@/stores/annotationsStore";
import { AnimatePresence } from "motion/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

type Props = {
  annotation: TextAnnotation;
  isSelected: boolean;
  onPointerDown: (
    ann: TextAnnotation
  ) => (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDoubleClick: (
    ann: TextAnnotation
  ) => (event: ReactMouseEvent<HTMLDivElement>) => void;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<TextAnnotation>) => void;
  onClone?: (id: string) => void;
  onMeasure?: (id: string, box: { width: number; height: number }) => void;
};

export function AnnotationItem({
  annotation,
  isSelected,
  onPointerDown,
  onPointerUp,
  onDoubleClick,
  onSelect,
  onChange,
  onClone,
  onMeasure,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorPosition, setEditorPosition] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  }>({ top: 0, left: 0, placement: "above" });

  useLayoutEffect(() => {
    if (!onMeasure) return;
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (
      Math.abs((annotation.boxWidth ?? 0) - rect.width) > 0.5 ||
      Math.abs((annotation.boxHeight ?? 0) - rect.height) > 0.5
    ) {
      onMeasure(annotation.id, { width: rect.width, height: rect.height });
    }
  }, [
    annotation.boxHeight,
    annotation.boxWidth,
    annotation.fontFamily,
    annotation.fontSize,
    annotation.lineHeight,
    annotation.textAlign,
    annotation.text,
    onMeasure,
    annotation.id,
  ]);

  // Mover anotación con las flechas del teclado
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Solo procesar si son teclas de flecha
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        return;
      }

      // Prevenir el scroll de la página
      event.preventDefault();

      // Encontrar el contenedor principal para calcular el incremento relativo
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

      const container = findMainContainer(divRef.current);
      if (!container) return;

      const containerRect = container.getBoundingClientRect();

      // Incremento en píxeles (1px normal, 10px con Shift)
      const pixelIncrement = event.shiftKey ? 10 : 1;

      // Convertir píxeles a porcentaje relativo al contenedor
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
    if (!isSelected || !divRef.current) {
      return;
    }

    // Buscar el contenedor principal (CardContent con overflow-hidden)
    // Este es el contenedor del cual no queremos que se desborde el editor
    const findMainContainer = (el: HTMLElement | null): HTMLElement | null => {
      if (!el) return null;
      let current: HTMLElement | null = el.parentElement;
      while (current) {
        // Buscar el CardContent que tiene overflow-hidden y shadow-inner
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

    const mainContainer = findMainContainer(divRef.current);
    if (!mainContainer) return;

    // Función para calcular y actualizar la posición usando position: fixed
    const calculatePosition = () => {
      if (!divRef.current || !editorRef.current) return;

      const textRect = divRef.current.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      const containerRect = mainContainer.getBoundingClientRect();

      const editorHeight = editorRect.height || 200;
      const editorWidth = editorRect.width || 400;
      const padding = 16; // Padding del contenedor
      const margin = 8; // Margen entre texto y editor

      // Límites del contenedor (CardContent)
      const containerTop = containerRect.top + padding;
      const containerBottom = containerRect.bottom - padding;
      const containerLeft = containerRect.left + padding;
      const containerRight = containerRect.right - padding;

      // Calcular espacio disponible
      const spaceAbove = textRect.top - containerTop;
      const spaceBelow = containerBottom - textRect.bottom;

      // Decidir si poner arriba o abajo
      const shouldPlaceAbove =
        spaceAbove >= editorHeight + margin &&
        (spaceAbove >= spaceBelow || spaceBelow < editorHeight + margin);

      // Calcular posición vertical (en píxeles desde el top del viewport)
      let top: number;
      if (shouldPlaceAbove) {
        // Colocar arriba del texto
        top = textRect.top - editorHeight - margin;
        // Asegurar que no se salga por arriba
        top = Math.max(containerTop, top);
      } else {
        // Colocar abajo del texto
        top = textRect.bottom + margin;
        // Asegurar que no se salga por abajo
        const maxTop = containerBottom - editorHeight;
        top = Math.min(maxTop, top);
      }

      // Calcular posición horizontal (centrado en el texto)
      let left = textRect.left + textRect.width / 2 - editorWidth / 2;

      // Ajustar si se sale por la izquierda
      if (left < containerLeft) {
        left = containerLeft;
      }

      // Ajustar si se sale por la derecha
      if (left + editorWidth > containerRight) {
        left = containerRight - editorWidth;
      }

      // Si el editor es más ancho que el contenedor, centrarlo
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

    // Ejecutar inmediatamente
    calculatePosition();

    // Ejecutar después de que el DOM se actualice
    const timeoutId = setTimeout(calculatePosition, 10);

    // Observar cambios de tamaño del editor y del contenedor
    let resizeObserver: ResizeObserver | null = null;
    let containerResizeObserver: ResizeObserver | null = null;

    if (editorRef.current) {
      resizeObserver = new ResizeObserver(calculatePosition);
      resizeObserver.observe(editorRef.current);
    }

    // Observar cambios en el contenedor principal (CardContent)
    if (mainContainer) {
      containerResizeObserver = new ResizeObserver(calculatePosition);
      containerResizeObserver.observe(mainContainer);
    }

    // Observar scroll del contenedor principal y de la ventana
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
  }, [isSelected, annotation.x, annotation.y, annotation.text]);

  return (
    <div
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      className="absolute"
    >
      <div
        ref={divRef}
        onPointerDown={onPointerDown(annotation)}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick(annotation)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(annotation.id);
        }}
        className="cursor-move rounded bg-transparent whitespace-pre-wrap"
        style={{
          color: annotation.color,
          fontSize: `${annotation.fontSize}px`,
          fontFamily: annotation.fontFamily,
          lineHeight: annotation.lineHeight ?? 1.2,
          textAlign: annotation.textAlign ?? "left",
        }}
      >
        {annotation.text}
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
            <AnnotationEditor
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
