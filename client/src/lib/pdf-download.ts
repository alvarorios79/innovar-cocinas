import { toast } from "sonner";

/**
 * Descarga PDF compatible con iOS
 * En iOS, el atributo 'download' no funciona bien en Safari
 * Esta función obtiene el PDF como blob y lo descarga correctamente
 */
export async function downloadPDFiOS(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error descargando PDF: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Error descargando PDF:", error);
    toast.error("Error al descargar el PDF");
  }
}
