import { useCallback, useEffect, useMemo } from "react";
import { type ChangeEvent } from "react";
import { usePdfStore } from "@/stores/pdfStore";
import { useAnnotationsStore } from "@/stores/annotationsStore";

export const MAX_SIZE_MB = 20;

export function usePdfLoader() {
  const {
    file,
    error,
    numPages,
    isLoading,
    setFile,
    setError,
    setNumPages,
    setIsLoading,
    reset,
  } = usePdfStore();

  const { clearAll } = useAnnotationsStore();

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      if (!nextFile) return;

      reset();

      if (nextFile.type !== "application/pdf") {
        setError("Solo se permiten archivos PDF.");
        return;
      }

      if (nextFile.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`El archivo supera ${MAX_SIZE_MB}MB.`);
        return;
      }

      setError(null);
      setIsLoading(true);
      setNumPages(0);
      clearAll();
      setFile(nextFile);
    },
    [reset, setError, setFile, setIsLoading, setNumPages, clearAll]
  );

  const handleLoadSuccess = useCallback(
    ({ numPages: pages }: { numPages: number }) => {
      setNumPages(pages);
      setIsLoading(false);
    },
    [setIsLoading, setNumPages]
  );

  const handleLoadError = useCallback(
    (err: Error) => {
      setIsLoading(false);
      setError(err.message);
    },
    [setError, setIsLoading]
  );

  const handleLoadProgress = useCallback(() => {
    setIsLoading(true);
  }, [setIsLoading]);

  return {
    file,
    error,
    numPages,
    isLoading,
    previewUrl,
    handleFileChange,
    handleLoadSuccess,
    handleLoadError,
    handleLoadProgress,
  };
}
