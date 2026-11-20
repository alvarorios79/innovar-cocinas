/** Seguimiento de cotizaciones: qué mensaje toca enviar, registrarlo (y ampliar la validez en el aviso de vencimiento) o cerrar el seguimiento. */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { calcularSeguimientos, registrarPaso, cerrarSeguimiento } from "../quotation-followup-service";

const ROLES = ["super_admin", "admin", "comercial"];
const soloEquipo = (rol: string) => { if (!ROLES.includes(rol)) throw new TRPCError({ code: "FORBIDDEN", message: "Sin permisos" }); };

export const seguimientoCotizacionesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    soloEquipo(ctx.user.role);
    return calcularSeguimientos(new Date());
  }),

  registrar: protectedProcedure
    .input(z.object({ quotationId: z.number(), step: z.string().max(20), accion: z.enum(["enviado", "omitido"]), extender: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      soloEquipo(ctx.user.role);
      try {
        return await registrarPaso({ ...input, userId: ctx.user.id });
      } catch (e: any) {
        if (e?.message === "ESTADO_CAMBIO") throw new TRPCError({ code: "CONFLICT", message: "Este seguimiento ya cambió (alguien lo atendió). Se actualizó la lista." });
        throw e;
      }
    }),

  cerrar: protectedProcedure
    .input(z.object({ quotationId: z.number(), motivo: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      soloEquipo(ctx.user.role);
      await cerrarSeguimiento(input.quotationId, ctx.user.id, input.motivo);
      return { success: true };
    }),
});
