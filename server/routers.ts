import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { clientsRouter } from "./routers/clients";
import { appointmentsRouter, availabilityRouter } from "./routers/appointments";
import { advisoryRouter, estimatesRouter } from "./routers/advisory";
import { quotationsRouter } from "./routers/quotations";
import { userManagementRouter } from "./routers/userManagement";
import { projectsRouter, projectPhotosRouter, projectDetailsRouter, projectMaterialsRouter } from "./routers/projects";
import { tasksRouter } from "./routers/tasks";
import { uploadRouter } from "./routers/upload";
import { notificationsRouter, remindersRouter } from "./routers/notifications";
import { pdfRouter } from "./routers/pdf";
import { hardwareCatalogRouter } from "./routers/hardwareCatalog";
import { publicGalleryRouter } from "./routers/publicGallery";
import { pricingRouter } from "./routers/pricing";
import { whatsappCloudRouter } from "./routers/whatsappCloud";
import { expensesRouter } from "./routers/expenses";
import { quotationsVersioningRouter } from "./routers/quotations-versioning";
import { systemRouter } from "./routers/system";
import { paymentsRouter } from "./routers/payments";
import { financialSettingsRouter } from "./routers/financialSettings";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  system: systemRouter,
  payments: paymentsRouter,
  financialSettings: financialSettingsRouter,
  dashboard: dashboardRouter,
  auth: authRouter,
  clients: clientsRouter,
  appointments: appointmentsRouter,
  availability: availabilityRouter,
  advisory: advisoryRouter,
  estimates: estimatesRouter,
  quotations: quotationsRouter,
  userManagement: userManagementRouter,
  projects: projectsRouter,
  projectPhotos: projectPhotosRouter,
  projectDetails: projectDetailsRouter,
  projectMaterials: projectMaterialsRouter,
  tasks: tasksRouter,
  upload: uploadRouter,
  notifications: notificationsRouter,
  reminders: remindersRouter,
  pdf: pdfRouter,
  hardwareCatalog: hardwareCatalogRouter,
  publicGallery: publicGalleryRouter,
  pricing: pricingRouter,
  whatsappCloud: whatsappCloudRouter,
  expenses: expensesRouter,
  quotationsVersioning: quotationsVersioningRouter,
});

// DEBUG: Confirmar ruta del AppRouter
if (typeof __filename !== 'undefined') {
  console.log('[AppRouter DEBUG] Loaded from:', __filename);
  console.log('[AppRouter DEBUG] appRouter keys:', Object.keys(appRouter._def.procedures));
}

export type AppRouter = typeof appRouter;
