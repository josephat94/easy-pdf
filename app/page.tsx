"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { usePdfStore } from "@/stores/pdfStore";
import { useAnnotationsStore } from "@/stores/annotationsStore";
import { Button } from "@/components/ui/button";
import { exportAnnotatedPdf } from "@/lib/exportPdf";

const PdfUploader = dynamic(
  () => import("@/components/PdfUploader").then((m) => m.PdfUploader),
  {
    ssr: false,
    loading: () => (
      <div className="text-sm text-slate-600">Cargando visor…</div>
    ),
  }
);

export default function Home() {
  const { file, setError } = usePdfStore();
  const { items, startTextPlacement, activeTool, clearAll } =
    useAnnotationsStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!file) return;
    try {
      setIsExporting(true);
      await exportAnnotatedPdf(file, items);
    } catch (err) {
      console.error(err);
      setError("No se pudo exportar el PDF");
      alert("No se pudo exportar el PDF. Revisa la consola para más detalles.");
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <main className="flex min-h-screen items-start justify-center bg-linear-to-br from-white via-slate-50 to-slate-100 px-6 py-16 gap-6">
      <Card className="w-full max-w-4xl border-slate-200">
        {!file && (
          <CardHeader className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              visor rápido
            </p>
            <CardTitle className="text-3xl font-semibold text-slate-900">
              Carga un PDF y míralo al instante
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Selecciona cualquier archivo PDF desde tu equipo. Lo procesamos de
              forma local, sin subidas a servidores externos.
            </CardDescription>
          </CardHeader>
        )}

        <CardContent className="pt-0">
          <PdfUploader />
        </CardContent>
      </Card>

      {file && (
        <Card className="sticky top-[100px] justify-self-start">
          <CardHeader>
            <div className="flex gap-2 flex-col justify-start">
              <Button
                variant={activeTool === "text" ? "ghost" : "outline"}
                onClick={startTextPlacement}
              >
                {activeTool === "text" ? "Haz clic en el PDF" : "Agregar Texto"}
              </Button>

              <Button variant="outline" onClick={clearAll}>
                Limpiar anotaciones
              </Button>

              <Button
                variant="primary"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? "Exportando..." : "Exportar PDF"}
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
