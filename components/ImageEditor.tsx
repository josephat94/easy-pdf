"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import type { ImageAnnotation } from "@/stores/annotationsStore";

type Props = {
  annotation: ImageAnnotation;
  onChange: (patch: Partial<ImageAnnotation>) => void;
  onClone?: () => void;
};

const EditorLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="text-sm text-slate-600 font-extrabold">{children}</Label>
);

export function ImageEditor({ annotation, onChange, onClone }: Props) {
  const [aspectRatio, setAspectRatio] = useState(
    annotation.width / annotation.height
  );
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  // Calcular aspect ratio inicial cuando se carga la imagen
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      setAspectRatio(ratio);
    };
    img.src = annotation.imageSrc;
  }, [annotation.imageSrc]);

  const handleWidthChange = (newWidth: number) => {
    if (lockAspectRatio) {
      const newHeight = newWidth / aspectRatio;
      onChange({ width: newWidth, height: newHeight });
    } else {
      onChange({ width: newWidth });
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (lockAspectRatio) {
      const newWidth = newHeight * aspectRatio;
      onChange({ width: newWidth, height: newHeight });
    } else {
      onChange({ height: newHeight });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg min-w-fit"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-row gap-3 items-end">
        <div className="flex flex-col gap-1">
          <EditorLabel>Ancho (px)</EditorLabel>
          <input
            type="number"
            min={20}
            max={1000}
            step={5}
            className="h-9 w-24 rounded border border-slate-200 px-2 py-1 text-sm outline-none text-black"
            value={Math.round(annotation.width)}
            onChange={(e) => {
              const value = Number(e.target.value) || annotation.width;
              handleWidthChange(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <EditorLabel>Alto (px)</EditorLabel>
          <input
            type="number"
            min={20}
            max={1000}
            step={5}
            className="h-9 w-24 rounded border border-slate-200 px-2 py-1 text-sm outline-none text-black"
            value={Math.round(annotation.height)}
            onChange={(e) => {
              const value = Number(e.target.value) || annotation.height;
              handleHeightChange(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-4"></div>
          <Button
            variant={lockAspectRatio ? "primary" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLockAspectRatio(!lockAspectRatio);
            }}
            className="whitespace-nowrap"
            title={lockAspectRatio ? "Desbloquear proporción" : "Bloquear proporción"}
          >
            {lockAspectRatio ? "🔒" : "🔓"}
          </Button>
        </div>
        {onClone && (
          <div className="flex flex-col gap-1">
            <div className="h-4"></div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClone();
              }}
              className="whitespace-nowrap"
              title="Clonar esta firma"
            >
              📋 Duplicar
            </Button>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {lockAspectRatio
          ? "Proporción bloqueada"
          : "Proporción libre"}
      </div>
    </motion.div>
  );
}
