import { toast } from "sonner";

/**
 * WhatsApp (wa.me) solo abre el chat con el texto escrito: no avisa si el mensaje salió.
 * Por eso NO se registra «enviado» al hacer clic. Se espera a que la persona regrese al CRM:
 *  - si estuvo fuera un rato razonable → se registra solo (sin clics extra);
 *  - si volvió enseguida (WhatsApp no cargó, falló la red…) → no se registra, solo sale un aviso con «Sí, se envió».
 * Si nunca vuelve, no queda nada registrado.
 */
const MIN_SEGUNDOS = 15;
const VENCE_MIN = 60;

export function registrarAlVolverDeWhatsApp(alConfirmar: () => void): void {
  if (typeof document === "undefined") return;
  const t0 = Date.now();
  let salio = false;
  let salioEn = 0;
  let listo = false;
  const limpiar = () => {
    listo = true;
    document.removeEventListener("visibilitychange", cambio);
    window.removeEventListener("blur", fuera);
    window.removeEventListener("focus", vuelta);
    clearTimeout(vencimiento);
  };
  const fuera = () => { if (!salio) { salio = true; salioEn = Date.now(); } };
  const vuelta = () => {
    if (listo || !salio) return; // todavía no se había ido a WhatsApp
    limpiar();
    const segundos = (Date.now() - salioEn) / 1000;
    if (segundos >= MIN_SEGUNDOS) { alConfirmar(); return; }
    toast.warning("Volviste muy rápido: parece que el mensaje no se envió", {
      description: "No lo marqué como enviado. Si sí lo enviaste, confírmalo.",
      duration: 20000,
      action: { label: "Sí, se envió", onClick: alConfirmar },
    });
  };
  const cambio = () => { if (document.hidden) fuera(); else vuelta(); };
  const vencimiento = setTimeout(limpiar, VENCE_MIN * 60_000);
  document.addEventListener("visibilitychange", cambio);
  window.addEventListener("blur", fuera);
  window.addEventListener("focus", vuelta);
  void t0;
}
