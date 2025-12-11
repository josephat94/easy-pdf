import { create } from "zustand";

type PdfState = {
  file: File | null;
  error: string | null;
  numPages: number;
  isLoading: boolean;
  setFile: (file: File | null) => void;
  setError: (error: string | null) => void;
  setNumPages: (numPages: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  reset: () => void;
};

export const usePdfStore = create<PdfState>((set) => ({
  file: null,
  error: null,
  numPages: 0,
  isLoading: false,
  setFile: (file) => set({ file }),
  setError: (error) => set({ error }),
  setNumPages: (numPages) => set({ numPages }),
  setIsLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      file: null,
      error: null,
      numPages: 0,
      isLoading: false,
    }),
}));
