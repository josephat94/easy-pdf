"use client";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

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
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-white via-slate-50 to-slate-100 px-6 py-16">
      <Card className="w-full max-w-4xl border-slate-200">
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
        <CardContent className="pt-0">
          <PdfUploader />
        </CardContent>
      </Card>
    </main>
  );
}
