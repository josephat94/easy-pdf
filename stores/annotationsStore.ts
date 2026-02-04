import { create } from "zustand";

export type TextAnnotation = {
  type: "text";
  id: string;
  page: number;
  x: number; // 0-1 relativo al ancho
  y: number; // 0-1 relativo al alto
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  lineHeight?: number; // espaciado entre líneas (múltiplo del fontSize, por defecto 1.2)
  textAlign?: "left" | "center" | "right"; // alineación del texto (por defecto "left")
  displayWidth?: number; // ancho renderizado de la página cuando se colocó
  boxWidth?: number; // ancho del span en pantalla
  boxHeight?: number; // alto del span en pantalla
  displayHeight?: number; // alto renderizado de la página cuando se colocó
};

export type ImageAnnotation = {
  type: "image";
  id: string;
  page: number;
  x: number; // 0-1 relativo al ancho
  y: number; // 0-1 relativo al alto
  imageSrc: string; // ruta de la imagen (ej: /signs/Brian.png)
  width: number; // ancho en píxeles del display
  height: number; // alto en píxeles del display
  displayWidth?: number; // ancho renderizado de la página cuando se colocó
  displayHeight?: number; // alto renderizado de la página cuando se colocó
};

export type Annotation = TextAnnotation | ImageAnnotation;

type Tool = "none" | "text" | "image";

type AnnotationsState = {
  items: Annotation[];
  activeTool: Tool;
  selectedSignature: string | null; // ruta de la firma seleccionada
  startTextPlacement: () => void;
  startImagePlacement: (imageSrc: string) => void;
  stopTool: () => void;
  addText: (annotation: Omit<TextAnnotation, "id" | "type">) => string;
  addImage: (annotation: Omit<ImageAnnotation, "id" | "type">) => string;
  updateText: (id: string, text: string) => void;
  moveAnnotation: (id: string, coords: { x: number; y: number }) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  cloneAnnotation: (id: string) => string | null;
  clearAll: () => void;
};

export const useAnnotationsStore = create<AnnotationsState>((set, get) => ({
  items: [],
  activeTool: "none",
  selectedSignature: null,
  startTextPlacement: () => set({ activeTool: "text" }),
  startImagePlacement: (imageSrc: string) =>
    set({ activeTool: "image", selectedSignature: imageSrc }),
  stopTool: () => set({ activeTool: "none", selectedSignature: null }),
  addText: (annotation) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    set((state) => ({
      items: [
        ...state.items,
        {
          type: "text",
          ...annotation,
          color: annotation.color ?? "#111111",
          fontSize: annotation.fontSize ?? 12,
          fontFamily: annotation.fontFamily ?? "Inter, system-ui, sans-serif",
          lineHeight: annotation.lineHeight ?? 1.2,
          textAlign: annotation.textAlign ?? "left",
          displayWidth: annotation.displayWidth,
          boxWidth: annotation.boxWidth,
          boxHeight: annotation.boxHeight,
          displayHeight: annotation.displayHeight,
          id,
        },
      ],
    }));
    return id;
  },
  addImage: (annotation) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    set((state) => ({
      items: [
        ...state.items,
        {
          type: "image",
          ...annotation,
          id,
        },
      ],
    }));
    return id;
  },
  updateText: (id, text) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id && item.type === "text"
          ? { ...item, text }
          : item
      ),
    })),
  moveAnnotation: (id, coords) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...coords } : item
      ),
    })),
  updateAnnotation: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;
        // TypeScript necesita ayuda aquí para entender que patch es compatible
        return { ...item, ...patch } as Annotation;
      }),
    })),
  cloneAnnotation: (id) => {
    const state = get();
    const annotation = state.items.find((item) => item.id === id);
    if (!annotation) return null;

    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    // Clonar el annotation con una posición ligeramente desplazada
    let clonedAnnotation: Annotation;
    if (annotation.type === "text") {
      clonedAnnotation = {
        ...annotation,
        id: newId,
        x: Math.min(annotation.x + 0.02, 0.98),
        y: Math.min(annotation.y + 0.02, 0.98),
      };
    } else {
      clonedAnnotation = {
        ...annotation,
        id: newId,
        x: Math.min(annotation.x + 0.02, 0.98),
        y: Math.min(annotation.y + 0.02, 0.98),
      };
    }

    set((state) => ({
      items: [...state.items, clonedAnnotation],
    }));

    return newId;
  },
  clearAll: () => set({ items: [], activeTool: "none", selectedSignature: null }),
}));
