import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { clientsRouter } from "./routers/clients";
import { appointmentsRouter, availabilityRouter } from "./routers/appointments";
import { leadsRouter } from "./routers/leads";
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
import { portfolioRouter, socialRouter } from "./routers/portfolio";
import { projectDocsRouter } from "./routers/projectDocs";
import { pricingRouter } from "./routers/pricing";
import { whatsappCloudRouter } from "./routers/whatsappCloud";
import { expensesRouter } from "./routers/expenses";
import { quotationsVersioningRouter } from "./routers/quotations-versioning";
import { quotationsDownloadRouter } from "./routers/quotations-download";
import { paymentsRouter } from "./routers/payments";
import { financialSettingsRouter } from "./routers/financialSettings";
import { dashboardRouter } from "./routers/dashboard";
import { dataProtectionRouter } from "./routers/dataProtection";
import { accountingClosuresRouter } from "./routers/accountingClosures";
import { postventaRouter } from "./routers/postventa";
import { contadorRouter } from "./routers/contador";
import { technicalVisitsRouter } from "./routers/technicalVisits";

export const appRouter = router({
  accountingClosures: accountingClosuresRouter,
  contador: contadorRouter,
  dataProtection: dataProtectionRouter,
  payments: paymentsRouter,
  financialSettings: financialSettingsRouter,
  dashboard: dashboardRouter,
  auth: authRouter,
  clients: clientsRouter,
  appointments: appointmentsRouter,
  availability: availabilityRouter,
  leads: leadsRouter,
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
  portfolio: portfolioRouter,
  social: socialRouter,
  projectDocs: projectDocsRouter,
  pricing: pricingRouter,
  whatsappCloud: whatsappCloudRouter,
  expenses: expensesRouter,
  quotationsVersioning: quotationsVersioningRouter,
  quotationsDownload: quotationsDownloadRouter,
  postventa: postventaRouter,
  technicalVisits: technicalVisitsRouter,
});

export type AppRouter = typeof appRouter;
