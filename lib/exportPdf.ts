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

    const baseSize = ann.fontSize ?? 12;
    const size = baseSize * scaleY;

    // Dividir el texto en líneas para manejar saltos de línea
    const lines = ann.text.split("\n");
    const lineHeightMultiplier = ann.lineHeight ?? 1.2;
    const lineHeight = size * lineHeightMultiplier; // Espaciado entre líneas personalizado

    // Calcular dimensiones del texto (usar la línea más ancha para determinar el ancho del "contenedor")
    const containerWidth = Math.max(
      ...lines.map((line) => font.widthOfTextAtSize(line, size))
    );
    const textHeight =
      ann.boxHeight && ann.boxHeight > 0
        ? ann.boxHeight * scaleY
        : lines.length * lineHeight;

    // ann.x marca el borde IZQUIERDO del contenedor, igual que en el navegador
    // El textAlign actúa DENTRO de ese contenedor
    // ann.x es relativo (0-1) al ancho del canvas/PDF renderizado
    // Convertimos a píxeles del PDF: ann.x * width (o equivalente: ann.x * displayWidth * scaleX)
    const containerLeftX = ann.x * width;

    // Calcular la posición Y del TOP del texto en el PDF
    // ann.y es la posición del top relativo a la altura de la página (0-1)
    // En PDF, el origen está abajo, así que: height - (ann.y * height) = top del texto
    const textTopY = height - ann.y * height;

    // drawText usa la línea base del texto, no el top
    // La línea base de la primera línea está a una distancia del top
    // Esta distancia es aproximadamente el tamaño de la fuente (ascender)
    // Para simplificar, usamos el tamaño de fuente como aproximación
    // La primera línea base debería estar en: textTopY - size (aproximadamente)
    // Pero considerando que el texto puede tener múltiples líneas, calculamos desde el top
    const firstLineBaseY = textTopY - size * 0.8; // Ajuste para alinear mejor con el navegador

    console.log("=== EXPORT DEBUG (DIRECT) ===", {
      text: ann.text,
      lines: lines.length,
      "ann.x (%)": (ann.x * 100).toFixed(2) + "%",
      "ann.y (%)": (ann.y * 100).toFixed(2) + "%",
      "PDF width": width.toFixed(2),
      "PDF height": height.toFixed(2),
      displayWidth: displayWidth.toFixed(2),
      displayHeight: displayHeight.toFixed(2),
      scaleX: scaleX.toFixed(4),
      scaleY: scaleY.toFixed(4),
      containerLeftX: containerLeftX.toFixed(2),
      containerWidth: containerWidth.toFixed(2),
      textTopY: textTopY.toFixed(2),
      firstLineBaseY: firstLineBaseY.toFixed(2),
      textHeight: textHeight.toFixed(2),
      size: size.toFixed(2),
      textAlign: ann.textAlign ?? "left",
    });

    const clampedFirstLineY = clamp(firstLineBaseY, size, height);
    const textAlign = ann.textAlign ?? "left";

    // Dibujar cada línea por separado
    lines.forEach((line, index) => {
      if (line.trim() === "" && index < lines.length - 1) {
        // Línea vacía, solo avanzar la posición Y
        return;
      }

      // Calcular el ancho de la línea actual
      const lineWidth = font.widthOfTextAtSize(line, size);

      // Calcular la posición X de la línea dentro del contenedor virtual
      // según la alineación (igual que hace CSS con textAlign)
      let lineX = containerLeftX; // Por defecto (left)

      if (textAlign === "center") {
        // Centrar la línea dentro del contenedor
        // containerLeftX + (containerWidth - lineWidth) / 2
        lineX = containerLeftX + (containerWidth - lineWidth) / 2;
      } else if (textAlign === "right") {
        // Alinear a la derecha dentro del contenedor
        // containerLeftX + (containerWidth - lineWidth)
        lineX = containerLeftX + (containerWidth - lineWidth);
      }
      // Para "left", lineX ya está en containerLeftX

      // Asegurar que el texto no se salga de los límites
      const clampedX = clamp(lineX, 0, width - lineWidth);

      // Calcular la línea base de cada línea
      // La primera línea (index 0) está en clampedFirstLineY
      // Las líneas siguientes están más abajo
      const lineY = clampedFirstLineY - index * lineHeight;

      page.drawText(line, {
        x: clampedX,
        y: lineY,
        size,
        font,
        color: rgb(r / 255, g / 255, b / 255),
      });
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
