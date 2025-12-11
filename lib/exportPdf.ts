import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { TextAnnotation } from "@/stores/annotationsStore";

type RGB = { r: number; g: number; b: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

const hexToRgb = (hex: string): RGB => {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length !== 6) return { r: 17, g: 17, b: 17 };
  const num = Number.parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const fontKeyFor = (family: string | undefined) => {
  const name = (family ?? "").toLowerCase();
  if (name.includes("inter")) return "inter" as const;
  if (name.includes("courier")) return "courier" as const;
  if (name.includes("georgia") || name.includes("times"))
    return "times" as const;
  return "helvetica" as const;
};

const buildDownloadName = (name: string) => {
  const base = name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
  return `${base}-annotated.pdf`;
};

export async function exportAnnotatedPdf(
  file: File,
  annotations: TextAnnotation[]
) {
  if (!file) throw new Error("No hay PDF para exportar");

  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  try {
    // @ts-ignore optional dep
    const fontkit = (await import("@pdf-lib/fontkit")).default;
    pdfDoc.registerFontkit(fontkit);
  } catch (err) {
    console.warn(
      "[exportPdf] fontkit no disponible; Inter hará fallback a Helvetica",
      err
    );
  }

  const wantsInter = annotations.some(
    (a) => fontKeyFor(a.fontFamily) === "inter"
  );

  const fonts: Record<"helvetica" | "times" | "courier" | "inter", any> = {
    helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
    times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    courier: await pdfDoc.embedFont(StandardFonts.Courier),
    inter: undefined,
  };

  if (wantsInter && !fonts.inter) {
    try {
      const interUrl =
        "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf";
      const interBuffer = await fetch(interUrl).then((r) => r.arrayBuffer());
      fonts.inter = await pdfDoc.embedFont(new Uint8Array(interBuffer));
    } catch (err) {
      console.warn(
        "[exportPdf] No se pudo cargar Inter, usando Helvetica",
        err
      );
      fonts.inter = fonts.helvetica;
    }
  }

  const pages = pdfDoc.getPages();

  for (const ann of annotations) {
    const page = pages[ann.page - 1];
    if (!page || !ann.text) continue;

    const { width, height } = page.getSize();
    const { r, g, b } = hexToRgb(ann.color ?? "#111111");
    const font = fonts[fontKeyFor(ann.fontFamily)] ?? fonts.helvetica;

    // Usar displayWidth/displayHeight si están disponibles
    const displayWidth = ann.displayWidth || width;
    const displayHeight = ann.displayHeight || height;

    // Calcular escalas del navegador al PDF
    const scaleX = width / displayWidth;
    const scaleY = height / displayHeight;

    const baseSize = ann.fontSize ?? 14;
    const size = baseSize * scaleY;

    // Calcular dimensiones del texto
    const textWidth = font.widthOfTextAtSize(ann.text, size);
    const textHeight =
      ann.boxHeight && ann.boxHeight > 0 ? ann.boxHeight * scaleY : size;

    // ENFOQUE DIRECTO: ann.x es un porcentaje, aplicarlo directamente al PDF
    // Esto asume que el navegador y el PDF mantienen las mismas proporciones visuales
    const finalX = ann.x * width;
    const finalY = height - ann.y * height - textHeight;

    console.log("=== EXPORT DEBUG (DIRECT) ===", {
      text: ann.text,
      "ann.x (%)": (ann.x * 100).toFixed(2) + "%",
      "PDF width": width,
      finalX: finalX,
      "displayWidth era": ann.displayWidth,
    });

    // Asegurar que el texto no se salga de los límites
    const clampedX = clamp(finalX, 0, width - textWidth);
    const clampedY = clamp(finalY, 0, height - textHeight);

    page.drawText(ann.text, {
      x: clampedX,
      y: clampedY,
      size,
      font,
      color: rgb(r / 255, g / 255, b / 255),
    });
  }

  const finalBytes = await pdfDoc.save();
  const bytes =
    finalBytes instanceof Uint8Array
      ? finalBytes
      : new Uint8Array(finalBytes as ArrayBuffer);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadName(file.name || "document");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
