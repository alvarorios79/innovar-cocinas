import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { clientsRouter } from "./routers/clients";
import { appointmentsRouter, availabilityRouter } from "./routers/appointments";
import { advisoryRouter, estimatesRouter } from "./routers/advisory";
import { quotationsRouter } from "./routers/quotations";
import { userManagementRouter } from "./routers/userManagement";
import { projectsRouter, projectPaymentsRouter, projectPhotosRouter, projectDetailsRouter, projectMaterialsRouter } from "./routers/projects";
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

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  clients: clientsRouter,
  appointments: appointmentsRouter,
  availability: availabilityRouter,
  advisory: advisoryRouter,
  estimates: estimatesRouter,
  quotations: quotationsRouter,
  userManagement: userManagementRouter,
  projects: projectsRouter,
  projectPayments: projectPaymentsRouter,
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

export type AppRouter = typeof appRouter;
