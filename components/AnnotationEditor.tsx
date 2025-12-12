import { Label } from "./ui/label";
import { Button } from "./ui/button";
import type { TextAnnotation } from "@/stores/annotationsStore";

type Props = {
  annotation: TextAnnotation;
  onChange: (patch: Partial<TextAnnotation>) => void;
  onClone?: () => void;
};

export function AnnotationEditor({ annotation, onChange, onClone }: Props) {
  return (
    <div className="flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg min-w-fit ">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-black">Texto</Label>
        <input
          className="rounded border border-slate-200 px-2 py-1 text-sm outline-none text-black"
          value={annotation.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-600">Tamaño</Label>
        <input
          type="number"
          min={8}
          max={72}
          className="w-24 rounded border border-slate-200 px-2 py-1 text-sm outline-none text-black"
          value={annotation.fontSize}
          onChange={(e) =>
            onChange({
              fontSize: Number(e.target.value) || annotation.fontSize,
            })
          }
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-600">Fuente</Label>
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm outline-none text-black"
          value={annotation.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          <option value="Inter, system-ui, sans-serif">Inter</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="Courier New, monospace">Courier New</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-600">Color</Label>
        <input
          type="color"
          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white p-1"
          value={annotation.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </div>
      {onClone && (
        <div className="flex flex-col gap-1 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClone();
            }}
            className="whitespace-nowrap"
            title="Clonar este texto"
          >
            📋 Clonar
          </Button>
        </div>
      )}
    </div>
  );
}
