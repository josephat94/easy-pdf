import { AnnotationEditor } from "./AnnotationEditor";
import type { TextAnnotation } from "@/stores/annotationsStore";
import {
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

type Props = {
  annotation: TextAnnotation;
  isSelected: boolean;
  onPointerDown: (
    ann: TextAnnotation
  ) => (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onDoubleClick: (
    ann: TextAnnotation
  ) => (event: ReactMouseEvent<HTMLSpanElement>) => void;
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
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!onMeasure) return;
    const el = spanRef.current;
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
    annotation.text,
    onMeasure,
    annotation.id,
  ]);

  return (
    <div
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
      className="absolute"
    >
      <span
        ref={spanRef}
        onPointerDown={onPointerDown(annotation)}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick(annotation)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(annotation.id);
        }}
        className="cursor-move rounded bg-transparent"
        style={{
          color: annotation.color,
          fontSize: `${annotation.fontSize}px`,
          fontFamily: annotation.fontFamily,
        }}
      >
        {annotation.text}
      </span>
      {isSelected && (
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <AnnotationEditor
            annotation={annotation}
            onChange={(patch) => onChange(annotation.id, patch)}
            onClone={onClone ? () => onClone(annotation.id) : undefined}
          />
        </div>
      )}
    </div>
  );
}
