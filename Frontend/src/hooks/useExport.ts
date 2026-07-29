import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { downloadExport, type ExportOptions } from '../services/exportService';

interface UseExportOptions extends ExportOptions {
  /** Friendly name used in toast feedback, e.g. "Student Directory". */
  label?: string;
}

/**
 * useExport — shared Excel-export hook backing every module's ExportButton.
 *
 * Mirrors useConfirm()'s shape (small piece of state + a callback, toast-driven
 * feedback via 'sonner') so export adopts the same conventions as the rest of
 * the app's interaction patterns. Every list/report screen should call this
 * hook rather than hand-rolling axios + blob + toast plumbing — that duplication
 * is exactly what the "Generic Export Framework" requirement rules out.
 *
 * Usage:
 *   const { isExporting, exportToExcel } = useExport();
 *   <ExportButton ... />  // or call exportToExcel directly from a custom control
 */
export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = useCallback(async ({ label = 'Export', ...options }: UseExportOptions) => {
    setIsExporting(true);
    try {
      const fileName = await downloadExport(options);
      toast.success(`${label} exported`, { description: fileName });
    } catch (error: unknown) {
      toast.error(await resolveExportErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, exportToExcel };
}

const FALLBACK_MESSAGE = 'Failed to generate the export. Please try again.';

/**
 * Export endpoints respond with a binary workbook on success, so axios is told
 * responseType: 'blob'. On failure (403/404/500) the body is still JSON, but it
 * arrives as a Blob too — this unwraps it back into the ApiResponse `message`
 * the rest of the app already surfaces via toast.error().
 */
async function resolveExportErrorMessage(error: unknown): Promise<string> {
  const response = (error as { response?: { data?: unknown; statusText?: string } } | undefined)?.response;
  const data = response?.data;

  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.message ?? parsed?.data?.message ?? FALLBACK_MESSAGE;
    } catch {
      return FALLBACK_MESSAGE;
    }
  }

  const message = (data as { message?: string } | undefined)?.message;
  return message ?? FALLBACK_MESSAGE;
}
