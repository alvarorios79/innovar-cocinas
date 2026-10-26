/**
 * Pizarra.tsx
 * Componente React que embebe pizarra.html en un iframe.
 *
 * Protocolo de mensajes (pizarra → portal):
 *   pizarra:ready   — pizarra lista para recibir mensajes
 *   pizarra:status  — {hasContent, items, photos, version} — se envía al cargar y en cada cambio
 *   pizarra:ack     — confirmación de que recibió pizarra:requestPdf
 *   pizarra:pdf     — {name, dataUrl, mb, levantamientoId, version}
 *   pizarra:pdfError — {reason} — 'empty' | 'empty-area' | <mensaje de error>
 *
 * Protocolo (portal → pizarra):
 *   pizarra:requestPdf — pide el PDF
 *   pizarra:setParams  — {job?, who?} actualiza metadatos sin recargar el iframe
 */

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface PizarraPdf {
  dataUrl: string;        // data:application/pdf;base64,...
  blob: Blob;
  name: string;
  mb: number;
}

export interface PizarraStatus {
  hasContent: boolean;
  items: number;
  photos: number;
  version: string;
}

export interface PizarraRef {
  /** Pide a la pizarra que genere y entregue el PDF.
   *  - Resuelve con el PDF si hay contenido.
   *  - Rechaza con Error(reason) si la pizarra envía pizarra:pdfError.
   *  - Resuelve con null si no hay respuesta en 20 s (timeout).
   */
  requestPdf(): Promise<PizarraPdf | null>;
  /** Actualiza job/who sin recargar el iframe. */
  setParams(params: { job?: string; who?: string }): void;
  /** Solicita pantalla completa sobre el iframe (nativo del navegador). */
  requestFullscreen(): void;
}

export interface PizarraProps {
  levantamientoId: string;
  job?: string;
  who?: string;
  date?: string;
  height?: string;
  onPdfReady?: (pdf: PizarraPdf) => void;
  onReady?: () => void;
  onStatus?: (status: PizarraStatus) => void;
  className?: string;
}

// ── Componente ────────────────────────────────────────────────────────────

export const Pizarra = forwardRef<PizarraRef, PizarraProps>(function Pizarra(
  { levantamientoId, job = '', who = '', date, height = '600px', onPdfReady, onReady, onStatus, className },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Último estado conocido de la pizarra (null = todavía no ha llegado ningún status)
  const [status, setStatus] = useState<PizarraStatus | null>(null);

  // Resolvedor / rechazador pendiente para requestPdf()
  const pdfResolveRef = useRef<((pdf: PizarraPdf | null) => void) | null>(null);
  const pdfRejectRef = useRef<((err: Error) => void) | null>(null);
  const pdfTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recibir mensajes del iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { type, levantamientoId: lid } = e.data;

      // Log de diagnóstico para todos los mensajes pizarra:*
      if (typeof type === 'string' && type.startsWith('pizarra:')) {
        const dataUrlLen = typeof e.data.dataUrl === 'string' ? e.data.dataUrl.length : null;
        const origin = e.origin || '(mismo origen)';
        if (dataUrlLen !== null) {
          const sizeMB = (dataUrlLen * 0.75 / 1024 / 1024).toFixed(2);
          console.log(`[Pizarra] ${type} | origen: ${origin} | levId: ${lid ?? '?'} | dataUrl: ${dataUrlLen} chars (~${sizeMB} MB PDF)`);
        } else {
          console.log(`[Pizarra] ${type} | origen: ${origin} | levId: ${lid ?? '?'} |`, JSON.stringify(e.data).slice(0, 200));
        }
      }

      // Pizarra lista
      if (type === 'pizarra:ready') {
        onReady?.();
      }

      // Primera carga de datos desde IndexedDB
      if (type === 'pizarra:loaded') {
        // solo log, ya registrado arriba
      }

      // Estado en vivo: hasContent, items, photos
      if (type === 'pizarra:status') {
        const s: PizarraStatus = {
          hasContent: !!e.data.hasContent,
          items: e.data.items ?? 0,
          photos: e.data.photos ?? 0,
          version: e.data.version ?? '',
        };
        setStatus(s);
        onStatus?.(s);
      }

      // Error de generación (hoja vacía, área vacía, fallo de jsPDF, etc.)
      if (type === 'pizarra:pdfError') {
        const reason: string = e.data.reason ?? 'error';
        if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null; }
        pdfResolveRef.current = null;
        const reject = pdfRejectRef.current;
        pdfRejectRef.current = null;
        reject?.(new Error(reason));
      }

      // PDF generado correctamente
      if (type === 'pizarra:pdf') {
        const dataUrl: string = e.data.dataUrl;
        const name: string = e.data.name;
        const mb: number = e.data.mb ?? 0;

        const byteStr = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/pdf' });

        const pdf: PizarraPdf = { dataUrl, blob, name, mb };
        onPdfReady?.(pdf);
        if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null; }
        pdfRejectRef.current = null;
        pdfResolveRef.current?.(pdf);
        pdfResolveRef.current = null;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onPdfReady, onReady, onStatus]);

  // API expuesta al padre via ref
  useImperativeHandle(ref, () => ({
    requestPdf(): Promise<PizarraPdf | null> {
      return new Promise((resolve, reject) => {
        // Si no hay respuesta en 20 s, retornar null en silencio
        const timeout = setTimeout(() => {
          pdfResolveRef.current = null;
          pdfRejectRef.current = null;
          pdfTimeoutRef.current = null;
          resolve(null);
        }, 20_000);
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

  // Congelar src: se calcula una sola vez al montar.
  // Cambios en job/who/date NO recargan el iframe — usar setParams() para actualizarlos en caliente.
  const srcRef = useRef<string | null>(null);
  if (!srcRef.current) {
    const p = new URLSearchParams({ levantamientoId, job, who });
    if (date) p.set('date', date);
    srcRef.current = `/pizarra-v9.3.html?${p.toString()}`;
  }
  const src = srcRef.current;

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
        allow="camera; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
      />
    </div>
  );
});

export default Pizarra;
