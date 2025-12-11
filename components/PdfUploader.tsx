"use client";

import {
  useRef,
  useCallback,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { usePdfLoader, MAX_SIZE_MB } from "@/hooks/usePdfLoader";
import { useAnnotationsStore } from "@/stores/annotationsStore";
import { AnnotationItem } from "./AnnotationItem";

// Configura el worker de PDF.js para que funcione en el navegador.
// Usamos import.meta.url para que Next sirva el worker en local sin depender de un CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function PdfUploader() {
  const {
    file,
    error,
    numPages,
    isLoading,
    previewUrl,
    handleFileChange,
    handleLoadSuccess,
    handleLoadError,
    handleLoadProgress,
  } = usePdfLoader();
  const {
    items,
    activeTool,
    addText,
    stopTool,
    moveText,
    updateText,
    updateAnnotation,
  } = useAnnotationsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef<{
    id: string;
    page: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});

  const annotationsByPage = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const ann of items) {
      const list = map.get(ann.page) ?? [];
      list.push(ann);
      map.set(ann.page, list);
    }
    return map;
  }, [items]);

  const registerPageHeight = useCallback(
    (pageIndex: number, el: HTMLDivElement | null) => {
      if (!el) return;
      const h = el.clientHeight;
      setPageHeights((prev) => {
        if (prev[pageIndex] === h) return prev;
        return { ...prev, [pageIndex]: h };
      });
    },
    []
  );

  const handlePageClick = useCallback(
    (pageIndex: number) => (event: ReactMouseEvent<HTMLDivElement>) => {
      if (activeTool !== "text") {
        setSelectedId(null);
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.min(
        Math.max((event.clientX - rect.left) / rect.width, 0),
        1
      );
      const y = Math.min(
        Math.max((event.clientY - rect.top) / rect.height, 0),
        1
      );

      console.log("=== CLICK DEBUG ===", {
        clientX: event.clientX,
        "rect.left": rect.left,
        "rect.width": rect.width,
        "x (normalized)": x,
        "x * rect.width (px)": x * rect.width,
      });

      const text = window.prompt("Texto a insertar:");
      if (!text) {
        stopTool();
        return;
      }
      const id = addText({
        page: pageIndex + 1,
        x,
        y,
        text,
        color: "#111111",
        fontSize: 14,
        fontFamily: "Inter, system-ui, sans-serif",
        displayWidth: rect.width, // ← DEBE SER rect.width (794), NO pageWidth (842)
        displayHeight: rect.height, // ← DEBE SER rect.height, NO pageHeights
      });
      setSelectedId(id);
      stopTool();
    },
    [activeTool, addText, stopTool]
  );

  const handleAnnotationPointerDown = useCallback(
    (annPage: number, annId: string) =>
      (event: ReactPointerEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        draggingRef.current = { id: annId, page: annPage };
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      },
    []
  );

  const handleAnnotationPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      event.stopPropagation();
      if (
        event.currentTarget.hasPointerCapture &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      draggingRef.current = null;
    },
    []
  );

  const handleAnnotationDoubleClick = useCallback(
    (annId: string) => (event: ReactMouseEvent<HTMLSpanElement>) => {
      event.stopPropagation();
      const text = window.prompt("Editar texto:");
      if (text != null && text !== "") {
        updateText(annId, text);
        setSelectedId(annId);
      }
    },
    [updateText]
  );

  const handlePagePointerMove = useCallback(
    (pageIndex: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      if (draggingRef.current.page !== pageIndex + 1) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = Math.min(
        Math.max((event.clientX - rect.left) / rect.width, 0),
        1
      );
      const y = Math.min(
        Math.max((event.clientY - rect.top) / rect.height, 0),
        1
      );
      moveText(draggingRef.current.id, { x, y });
      setSelectedId(draggingRef.current.id);
    },
    [moveText]
  );

  const handlePagePointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const selectedAnnotation = useMemo(
    () => items.find((ann) => ann.id === selectedId) ?? null,
    [items, selectedId]
  );

  const pageWidth = containerRef.current?.clientWidth
    ? Math.min(containerRef.current.clientWidth, 900)
    : 900;

  const triggerFileDialog = () => fileInputRef.current?.click();

  return (
    <div className="flex w-full flex-col gap-6 pt-4">
      <Card className="shadow-lg">
        {!file && (
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Carga
            </p>
            <CardTitle>Sube un PDF</CardTitle>
            <CardDescription>
              Selecciona un archivo para previsualizarlo en el navegador. Nada
              se envía a servidores.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <Label>Archivo</Label>
              <p className="text-sm text-neutral-600">
                {file
                  ? `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "Ningún archivo seleccionado"}
              </p>
            </div>
            <Button size="sm" onClick={triggerFileDialog}>
              Examinar
            </Button>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="text-xs text-neutral-500">
            Solo PDF. Máximo {MAX_SIZE_MB}MB.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Previsualización
          </p>
          <CardTitle className="text-xl">Documento</CardTitle>
          <CardDescription>Renderizado con react-pdf.</CardDescription>
        </CardHeader>
        <CardContent
          ref={containerRef}
          className="relative min-h-[400px] w-full overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-4 shadow-inner"
          onClick={() => setSelectedId(null)}
        >
          {!previewUrl ? (
            <div className="flex h-[400px] items-center justify-center px-6 text-center text-sm text-neutral-500">
              Tu PDF aparecerá aquí una vez que lo cargues.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {isLoading && (
                <div className="text-sm text-neutral-500">Cargando...</div>
              )}
              <Document
                file={previewUrl}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                loading={
                  <div className="text-sm text-neutral-500">Cargando...</div>
                }
                onSourceError={handleLoadError}
                onLoadProgress={handleLoadProgress}
                className="flex flex-col gap-6"
              >
                {Array.from(new Array(numPages), (_, index) => {
                  const pageAnnotations =
                    annotationsByPage.get(index + 1) ?? [];
                  return (
                    <div
                      key={`page_${index + 1}`}
                      ref={(el) => registerPageHeight(index + 1, el)}
                      onClick={handlePageClick(index)}
                      onPointerMove={handlePagePointerMove(index)}
                      onPointerUp={handlePagePointerUp}
                      className="relative overflow-hidden"
                    >
                      <Page
                        pageNumber={index + 1}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                      {/* Anotaciones de texto superpuestas */}
                      {pageAnnotations.map((ann) => {
                        const isSelected = selectedId === ann.id;
                        return (
                          <AnnotationItem
                            key={ann.id}
                            annotation={ann}
                            isSelected={isSelected}
                            onPointerDown={(a) =>
                              handleAnnotationPointerDown(a.page, a.id)
                            }
                            onPointerUp={handleAnnotationPointerUp}
                            onDoubleClick={(a) =>
                              handleAnnotationDoubleClick(a.id)
                            }
                            onSelect={setSelectedId}
                            onChange={updateAnnotation}
                            onMeasure={(id, box) =>
                              updateAnnotation(id, {
                                boxWidth: box.width,
                                boxHeight: box.height,
                              })
                            }
                          />
                        );
                      })}
                      <div className="pointer-events-none absolute inset-0 border border-transparent" />
                    </div>
                  );
                })}
              </Document>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
