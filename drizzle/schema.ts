import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Clientes de INNOVAR Cocinas
 * Almacena información de contacto y datos personales
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  whatsappPhone: varchar("whatsappPhone", { length: 20 }).notNull(),
  address: text("address"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Citas agendadas por clientes
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  scheduledDate: timestamp("scheduledDate"),
  status: mysqlEnum("status", ["pendiente", "confirmada", "completada", "cancelada"]).default("pendiente").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Solicitudes de asesoramiento telefónico
 */
export const advisoryRequests = mysqlTable("advisoryRequests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  status: mysqlEnum("status", ["pendiente", "contactado", "completado"]).default("pendiente").notNull(),
  preferredCallTime: text("preferredCallTime"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdvisoryRequest = typeof advisoryRequests.$inferSelect;
export type InsertAdvisoryRequest = typeof advisoryRequests.$inferInsert;

/**
 * Estimados previos opcionales (cuando el cliente tiene medidas)
 */
export const priorEstimates = mysqlTable("priorEstimates", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  kitchenShape: mysqlEnum("kitchenShape", ["L", "U", "lineal"]),
  measurements: text("measurements"),
  materialType: mysqlEnum("materialType", ["quarzone", "sinterizado"]),
  additionalDetails: text("additionalDetails"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriorEstimate = typeof priorEstimates.$inferSelect;
export type InsertPriorEstimate = typeof priorEstimates.$inferInsert;

/**
 * Cotizaciones generadas por administradores después de visitas
 */
export const quotations = mysqlTable("quotations", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id),
  appointmentId: int("appointmentId").references(() => appointments.id),
  workType: mysqlEnum("workType", ["cocina", "closet", "puertas", "centro_tv"]).notNull(),
  // Nuevos campos técnicos para cotizaciones detalladas
  kitchenShape: mysqlEnum("kitchenShape", ["L", "U", "lineal"]),
  measurements: text("measurements"), // Medidas específicas del proyecto
  materialType: mysqlEnum("materialType", ["quarzone", "sinterizado"]),
  description: text("description").notNull(),
  materials: text("materials"),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  validUntil: timestamp("validUntil"),
  status: mysqlEnum("status", ["borrador", "enviada", "aceptada", "rechazada"]).default("borrador").notNull(),
  sentViaWhatsApp: boolean("sentViaWhatsApp").default(false).notNull(),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = typeof quotations.$inferInsert;
