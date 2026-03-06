import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ImportRow {
  fecha: string;
  descripcion: string;
  monto: string;
  tipo: string;
  proyecto?: string;
  categoria?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ExpenseImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
}

export function ExpenseImportModal({
  open,
  onOpenChange,
  projects,
}: ExpenseImportModalProps) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<"upload" | "processing" | "results">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.getAll.invalidate();
    },
  });

  const downloadTemplate = () => {
    const template = [
      ["fecha", "descripcion", "monto", "tipo", "proyecto", "categoria"],
      [
        "2026-01-10",
        "Herrajes Blum",
        "450000",
        "proyecto",
        "Cocina Arrubla",
        "",
      ],
      [
        "2026-01-12",
        "Transporte MDF",
        "80000",
        "operativo",
        "",
        "Transporte",
      ],
      [
        "2026-01-15",
        "Mano de obra instalación",
        "300000",
        "proyecto",
        "Cocina Arrubla",
        "",
      ],
    ];

    const csv = template.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_gastos.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const parseFile = async (file: File): Promise<ImportRow[]> => {
    return new Promise((resolve, reject) => {
      if (file.name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results: any) => {
            resolve(results.data as ImportRow[]);
          },
          error: (error: any) => {
            reject(new Error(`Error parsing CSV: ${error.message}`));
          },
        });
      } else if (file.name.endsWith(".xlsx")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet) as ImportRow[];
            resolve(rows);
          } catch (error) {
            reject(new Error("Error parsing Excel file"));
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error("Unsupported file format. Use CSV or XLSX."));
      }
    });
  };

  const validateRow = (
    row: ImportRow,
    rowIndex: number
  ): { valid: boolean; error?: string } => {
    if (!row.fecha) return { valid: false, error: "Fecha requerida" };
    if (!row.descripcion)
      return { valid: false, error: "Descripción requerida" };
    if (!row.monto) return { valid: false, error: "Monto requerido" };
    if (isNaN(Number(row.monto)))
      return { valid: false, error: "Monto debe ser un número" };

    const tipo = row.tipo?.toLowerCase().trim();
    if (tipo !== "proyecto" && tipo !== "operativo") {
      return {
        valid: false,
        error: 'Tipo debe ser "proyecto" u "operativo"',
      };
    }

    if (tipo === "proyecto") {
      if (!row.proyecto) {
        return { valid: false, error: "Proyecto requerido para tipo proyecto" };
      }
      const projectExists = projects?.some(
        (p) => p.name?.toLowerCase() === row.proyecto?.toLowerCase()
      );
      if (!projectExists) {
        return { valid: false, error: `Proyecto "${row.proyecto}" no existe` };
      }
    }

    if (tipo === "operativo") {
      if (!row.categoria) {
        return {
          valid: false,
          error: "Categoría requerida para tipo operativo",
        };
      }
    }

    return { valid: true };
  };

  const processFile = async (file: File) => {
    try {
      setIsProcessing(true);
      setStep("processing");

      // Check file size and row limit
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size exceeds 10MB limit");
      }

      const rows = await parseFile(file);

      if (rows.length > 500) {
        throw new Error("File exceeds 500 rows limit");
      }

      const errors: Array<{ row: number; error: string }> = [];
      let successful = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const validation = validateRow(row, i + 2); // +2 because row 1 is header, row 2 is first data

        if (!validation.valid) {
          errors.push({ row: i + 2, error: validation.error || "Unknown error" });
          continue;
        }

        try {
          const projectId = projects?.find(
            (p) => p.name?.toLowerCase() === row.proyecto?.toLowerCase()
          )?.id;

          await createExpense.mutateAsync({
            expenseType: row.tipo === "proyecto" ? "materiales_proyecto" : "gasto_operativo",
            projectId: row.tipo === "proyecto" ? projectId : undefined,
            generalCategory:
              row.tipo === "operativo" ? (row.categoria as any) : undefined,
            description: row.descripcion,
            amount: Number(row.monto),
            expenseDate: new Date(row.fecha).toISOString().split("T")[0],
          })

          successful++;
        } catch (error) {
          errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      setResult({
        total: rows.length,
        successful,
        failed: errors.length,
        errors,
      });

      setStep("results");

      if (successful > 0) {
        toast.success(`✅ ${successful} gastos importados correctamente`);
        utils.expenses.getAll.invalidate();
      }

      if (errors.length > 0) {
        toast.warning(`⚠️ ${errors.length} filas con errores`);
      }
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("upload");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar gastos desde Excel o CSV</DialogTitle>
          <DialogDescription>
            Cargue un archivo con múltiples gastos para importarlos al sistema
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Pasos:</h3>
              <ol className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
                    1
                  </span>
                  Descargue la plantilla
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
                    2
                  </span>
                  Complete los datos
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs">
                    3
                  </span>
                  Suba el archivo
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar plantilla
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="sr-only"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    asChild
                    className="w-full cursor-pointer"
                    disabled={isProcessing}
                  >
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {isProcessing ? "Procesando..." : "Subir archivo"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              <p>Formatos soportados: CSV, XLSX</p>
              <p>Máximo: 500 filas por archivo</p>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-gray-600">Procesando archivo...</p>
          </div>
        )}

        {step === "results" && result && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="font-semibold mb-3">Resumen de importación</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total de filas:</span>
                  <span className="font-semibold">{result.total}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Importadas:</span>
                  <span className="font-semibold">{result.successful}</span>
                </div>
                <div className="flex justify-between text-red-700">
                  <span>Errores:</span>
                  <span className="font-semibold">{result.failed}</span>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Errores encontrados:</h3>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="flex gap-2 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Fila {error.row}: {error.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
