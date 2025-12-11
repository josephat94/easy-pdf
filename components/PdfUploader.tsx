"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
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

const MAX_SIZE_MB = 20;

// Configura el worker de PDF.js para que funcione en el navegador.
// Usamos import.meta.url para que Next sirva el worker en local sin depender de un CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    if (nextFile.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF.");
      setFile(null);
      return;
    }

    if (nextFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_SIZE_MB}MB.`);
      setFile(null);
      return;
    }

    setError(null);
    setIsLoading(true);
    setFile(nextFile);
  };

  const handleLoadSuccess = ({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setIsLoading(false);
  };

  const pageWidth = containerRef.current?.clientWidth
    ? Math.min(containerRef.current.clientWidth, 900)
    : 900;

  const triggerFileDialog = () => fileInputRef.current?.click();

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Carga
          </p>
          <CardTitle>Sube un PDF</CardTitle>
          <CardDescription>
            Selecciona un archivo para previsualizarlo en el navegador. Nada se
            envía a servidores.
          </CardDescription>
        </CardHeader>
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
          className="min-h-[400px] w-full overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 p-4 shadow-inner"
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
                onLoadError={(err) => setError(err.message)}
                loading={
                  <div className="text-sm text-neutral-500">Cargando...</div>
                }
                onSourceError={(err) => setError(err.message)}
                onLoadProgress={() => setIsLoading(true)}
                className="flex flex-col gap-6"
              >
                {Array.from(new Array(numPages), (_, index) => (
                  <div
                    key={`page_${index + 1}`}
                    className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white shadow"
                  >
                    <Page
                      pageNumber={index + 1}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    {/* Aquí puedes superponer un canvas de firma en el futuro */}
                    <div className="pointer-events-none absolute inset-0 border border-transparent" />
                  </div>
                ))}
              </Document>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
