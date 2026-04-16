import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { clientsRouter } from "./routers/clients";
import { appointmentsRouter, availabilityRouter } from "./routers/appointments";
import { advisoryRouter, estimatesRouter } from "./routers/advisory";
import { quotationsRouter } from "./routers/quotations";
import { quotationsDebugRouter } from "./routers/quotations-debug";
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
import { quotationsDownloadRouter } from "./routers/quotations-download";
import { systemRouter } from "./routers/system";
import { cleanupRouter } from "./routers/cleanup";
import { paymentsRouter } from "./routers/payments";
import { financialSettingsRouter } from "./routers/financialSettings";
import { dashboardRouter } from "./routers/dashboard";
import { dataProtectionRouter } from "./routers/dataProtection";
import { backupsRouter } from "./routers/backups";
import { accountingClosuresRouter } from "./routers/accountingClosures";
import { debugSyncRouter } from "./routers/debug-sync";

export const appRouter = router({
  accountingClosures: accountingClosuresRouter,
  backups: backupsRouter,
  dataProtection: dataProtectionRouter,
  system: systemRouter,
  cleanup: cleanupRouter,
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
  quotationsDebug: quotationsDebugRouter,
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
  quotationsDownload: quotationsDownloadRouter,
  debugSync: debugSyncRouter,
});

export type AppRouter = typeof appRouter;
