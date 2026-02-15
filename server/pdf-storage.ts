import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const PDF_STORAGE_DIR = '/tmp/quotation-pdfs';

// Crear directorio si no existe
import { mkdirSync } from 'fs';
try {
  mkdirSync(PDF_STORAGE_DIR, { recursive: true });
} catch (e) {
  // Directory already exists
}

export function savePDFToStorage(quotationId: number, pdfBuffer: Buffer): string {
  const filename = `quotation_${quotationId}_${Date.now()}.pdf`;
  const filepath = join(PDF_STORAGE_DIR, filename);
  writeFileSync(filepath, pdfBuffer);
  return filename;
}

export function getPDFFromStorage(filename: string): Buffer | null {
  const filepath = join(PDF_STORAGE_DIR, filename);
  if (!existsSync(filepath)) {
    return null;
  }
  return readFileSync(filepath);
}

export function deletePDFFromStorage(filename: string): void {
  const filepath = join(PDF_STORAGE_DIR, filename);
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
}

export function getPDFPath(filename: string): string {
  return join(PDF_STORAGE_DIR, filename);
}
