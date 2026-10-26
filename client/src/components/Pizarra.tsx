/**
 * Pizarra.tsx
 * Componente React que embebe pizarra.html en un iframe.
 *
 * INSTALACIÓN:
 *   1. Copiar pizarra.html a client/public/pizarra.html
 *   2. Copiar este archivo a client/src/components/Pizarra.tsx
 *
 * USO en el formulario de levantamiento:
 *
 *   import { Pizarra, type PizarraRef } from '@/components/Pizarra';
 *
 *   const pizarraRef = useRef<PizarraRef>(null);
 *
 *   // Para obtener el PDF al enviar el formulario:
 *   const pdf = await pizarraRef.current?.requestPdf();
 *   if (pdf) {
 *     // pdf.dataUrl  → string base64 para mostrar / enviar
 *     // pdf.blob     → Blob para subir a S3 / FormData
 *     // pdf.name     → nombre de archivo sugerido
 *   }
 *
 *   <Pizarra
 *     ref={pizarraRef}
 *     levantamientoId={levantamiento.id.toString()}
 *     job={`${cliente.nombre} — ${proyecto.nombre}`}
 *     who={medidor.nombre}
 *     date={new Date().toISOString()}
 *     onPdfReady={(pdf) => console.log('PDF listo', pdf.name)}
 *     height="600px"
 *   />
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface PizarraPdf {
  dataUrl: string;        // data:application/pdf;base64,...
  blob: Blob;
  name: string;
  mb: number;
}

export interface PizarraRef {
  /** Pide a la pizarra que genere y entregue el PDF. Retorna el PDF o null si la hoja está vacía. */
  requestPdf(): Promise<PizarraPdf | null>;
  /** Actualiza job/who sin recargar el iframe (útil si el nombre del cliente cambia mid-session). */
  setParams(params: { job?: string; who?: string }): void;
  /** Solicita pantalla completa sobre el iframe (nativo del navegador). */
  requestFullscreen(): void;
}

export interface PizarraProps {
  levantamientoId: string;
  job?: string;
  who?: string;
  date?: string;             // ISO string: se muestra en el encabezado del PDF
  height?: string;           // CSS, por defecto '600px'
  onPdfReady?: (pdf: PizarraPdf) => void;
  onReady?: () => void;      // La pizarra terminó de cargar
  className?: string;
}

// ── Componente ────────────────────────────────────────────────────────────

export const Pizarra = forwardRef<PizarraRef, PizarraProps>(function Pizarra(
  { levantamientoId, job = '', who = '', date, height = '600px', onPdfReady, onReady, className },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Resolvedor pendiente para requestPdf()
  const pdfResolveRef = useRef<((pdf: PizarraPdf | null) => void) | null>(null);
  const pdfRejectRef = useRef<((err: Error) => void) | null>(null);
  const pdfTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recibir mensajes del iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'pizarra:ready') {
        onReady?.();
      }

      if (e.data.type === 'pizarra:pdfError') {
        const reason: string = e.data.reason ?? 'La pizarra está vacía o hubo un error al generar el PDF';
        if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null; }
        pdfResolveRef.current = null;
        const reject = pdfRejectRef.current;
        pdfRejectRef.current = null;
        reject?.(new Error(reason));
      }

      if (e.data.type === 'pizarra:pdf') {
        const dataUrl: string = e.data.dataUrl;
        const name: string = e.data.name;
        const mb: number = e.data.mb ?? 0;

        // Convertir dataUrl → Blob
        const byteStr = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });

        const pdf: PizarraPdf = { dataUrl, blob, name, mb };
        onPdfReady?.(pdf);
        pdfResolveRef.current?.(pdf);
        pdfResolveRef.current = null;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPdfReady, onReady]);

  // API expuesta al padre via ref
  useImperativeHandle(ref, () => ({
    requestPdf(): Promise<PizarraPdf | null> {
      return new Promise((resolve, reject) => {
        // Si no hay respuesta en 15 s, retornar null (pizarra vacía)
        const timeout = setTimeout(() => {
          pdfResolveRef.current = null;
          pdfRejectRef.current = null;
          pdfTimeoutRef.current = null;
          resolve(null);
        }, 15_000);
        pdfTimeoutRef.current = timeout;

        pdfResolveRef.current = (pdf) => {
          clearTimeout(timeout);
          pdfTimeoutRef.current = null;
          pdfRejectRef.current = null;
          resolve(pdf);
        };
        pdfRejectRef.current = (err) => {
          clearTimeout(timeout);
          pdfTimeoutRef.current = null;
          pdfResolveRef.current = null;
          reject(err);
        };

        iframeRef.current?.contentWindow?.postMessage(
          { type: 'pizarra:requestPdf' },
          '*'
        );
      });
    },

    setParams(params: { job?: string; who?: string }) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'pizarra:setParams', ...params },
        '*'
      );
    },

    requestFullscreen() {
      const el = iframeRef.current as any;
      if (!el) return;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    },
  }));

  // Construir URL del iframe
  const params = new URLSearchParams({ levantamientoId, job, who });
  if (date) params.set('date', date);
  const src = `/pizarra.html?${params.toString()}`;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #2c3945',
        background: '#ffffff',
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Pizarra del Medidor"
        allow="camera; fullscreen"      // cámara iPad + pantalla completa
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </div>
  );
});

export default Pizarra;
