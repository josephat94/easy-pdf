import { create } from "zustand";

export type TextAnnotation = {
  id: string;
  page: number;
  x: number; // 0-1 relativo al ancho
  y: number; // 0-1 relativo al alto
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  displayWidth?: number; // ancho renderizado de la página cuando se colocó
  boxWidth?: number; // ancho del span en pantalla
  boxHeight?: number; // alto del span en pantalla
  displayHeight?: number; // alto renderizado de la página cuando se colocó
};

type Tool = "none" | "text";

type AnnotationsState = {
  items: TextAnnotation[];
  activeTool: Tool;
  startTextPlacement: () => void;
  stopTool: () => void;
  addText: (annotation: Omit<TextAnnotation, "id">) => string;
  updateText: (id: string, text: string) => void;
  moveText: (id: string, coords: { x: number; y: number }) => void;
  updateAnnotation: (id: string, patch: Partial<TextAnnotation>) => void;
  cloneAnnotation: (id: string) => string | null;
  clearAll: () => void;
};

export const useAnnotationsStore = create<AnnotationsState>((set, get) => ({
  items: [],
  activeTool: "none",
  startTextPlacement: () => set({ activeTool: "text" }),
  stopTool: () => set({ activeTool: "none" }),
  addText: (annotation) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    set((state) => ({
      items: [
        ...state.items,
        {
          ...annotation,
          color: annotation.color ?? "#111111",
          fontSize: annotation.fontSize ?? 14,
          fontFamily: annotation.fontFamily ?? "Inter, system-ui, sans-serif",
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
  updateText: (id, text) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    })),
  moveText: (id, coords) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...coords } : item
      ),
    })),
  updateAnnotation: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
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
    const clonedAnnotation: TextAnnotation = {
      ...annotation,
      id: newId,
      x: Math.min(annotation.x + 0.02, 0.98), // Desplazar un poco a la derecha
      y: Math.min(annotation.y + 0.02, 0.98), // Desplazar un poco hacia abajo
    };

    set((state) => ({
      items: [...state.items, clonedAnnotation],
    }));

    return newId;
  },
  clearAll: () => set({ items: [], activeTool: "none" }),
}));
