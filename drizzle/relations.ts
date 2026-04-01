import { relations } from "drizzle-orm/relations";
import { accountingClosures, accountingClosureOperationalExpenses, expenses, accountingClosureProjects, projects, users, clients, advisoryRequests, appointments, appointmentWorkTypes, auditLogs, backupMetadata, clientRevisionHistory, closureAuditLog, notifications, payments, priorEstimates, projectDetails, projectPayments, projectPhotos, projectStatusHistory, pushSubscriptions, quotations, quotationItems, reminders, tasks, taskReminders } from "./schema";

export const accountingClosureOperationalExpensesRelations = relations(accountingClosureOperationalExpenses, ({one}) => ({
	accountingClosure: one(accountingClosures, {
		fields: [accountingClosureOperationalExpenses.closureId],
		references: [accountingClosures.id]
	}),
	expense: one(expenses, {
		fields: [accountingClosureOperationalExpenses.expenseId],
		references: [expenses.id]
	}),
}));

export const accountingClosuresRelations = relations(accountingClosures, ({one, many}) => ({
	accountingClosureOperationalExpenses: many(accountingClosureOperationalExpenses),
	accountingClosureProjects: many(accountingClosureProjects),
	user: one(users, {
		fields: [accountingClosures.createdBy],
		references: [users.id]
	}),
	closureAuditLogs: many(closureAuditLog),
	projects: many(projects),
}));

export const expensesRelations = relations(expenses, ({one, many}) => ({
	accountingClosureOperationalExpenses: many(accountingClosureOperationalExpenses),
	project: one(projects, {
		fields: [expenses.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [expenses.createdBy],
		references: [users.id]
	}),
}));

export const accountingClosureProjectsRelations = relations(accountingClosureProjects, ({one}) => ({
	accountingClosure: one(accountingClosures, {
		fields: [accountingClosureProjects.closureId],
		references: [accountingClosures.id]
	}),
	project: one(projects, {
		fields: [accountingClosureProjects.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	accountingClosureProjects: many(accountingClosureProjects),
	clientRevisionHistories: many(clientRevisionHistory),
	expenses: many(expenses),
	payments: many(payments),
	projectDetails: many(projectDetails),
	projectPayments: many(projectPayments),
	projectPhotos: many(projectPhotos),
	projectStatusHistories: many(projectStatusHistory),
	client: one(clients, {
		fields: [projects.clientId],
		references: [clients.id]
	}),
	user_createdBy: one(users, {
		fields: [projects.createdBy],
		references: [users.id],
		relationName: "projects_createdBy_users_id"
	}),
	user_designerId: one(users, {
		fields: [projects.designerId],
		references: [users.id],
		relationName: "projects_designerId_users_id"
	}),
	accountingClosure: one(accountingClosures, {
		fields: [projects.accountingClosureId],
		references: [accountingClosures.id]
	}),
	reminders: many(reminders),
	tasks: many(tasks),
}));

export const usersRelations = relations(users, ({many}) => ({
	accountingClosures: many(accountingClosures),
	auditLogs: many(auditLogs),
	backupMetadata: many(backupMetadata),
	clients: many(clients),
	closureAuditLogs: many(closureAuditLog),
	expenses: many(expenses),
	notifications: many(notifications),
	payments: many(payments),
	projectDetails: many(projectDetails),
	projectPayments: many(projectPayments),
	projectPhotos: many(projectPhotos),
	projectStatusHistories: many(projectStatusHistory),
	projects_createdBy: many(projects, {
		relationName: "projects_createdBy_users_id"
	}),
	projects_designerId: many(projects, {
		relationName: "projects_designerId_users_id"
	}),
	pushSubscriptions: many(pushSubscriptions),
	quotations: many(quotations),
	reminders: many(reminders),
	taskReminders_sentBy: many(taskReminders, {
		relationName: "taskReminders_sentBy_users_id"
	}),
	taskReminders_sentTo: many(taskReminders, {
		relationName: "taskReminders_sentTo_users_id"
	}),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	tasks_assignedBy: many(tasks, {
		relationName: "tasks_assignedBy_users_id"
	}),
}));

export const advisoryRequestsRelations = relations(advisoryRequests, ({one}) => ({
	client: one(clients, {
		fields: [advisoryRequests.clientId],
		references: [clients.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	advisoryRequests: many(advisoryRequests),
	appointments: many(appointments),
	user: one(users, {
		fields: [clients.userId],
		references: [users.id]
	}),
	priorEstimates: many(priorEstimates),
	projects: many(projects),
	quotations: many(quotations),
}));

export const appointmentWorkTypesRelations = relations(appointmentWorkTypes, ({one}) => ({
	appointment: one(appointments, {
		fields: [appointmentWorkTypes.appointmentId],
		references: [appointments.id]
	}),
}));

export const appointmentsRelations = relations(appointments, ({one, many}) => ({
	appointmentWorkTypes: many(appointmentWorkTypes),
	client: one(clients, {
		fields: [appointments.clientId],
		references: [clients.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const backupMetadataRelations = relations(backupMetadata, ({one}) => ({
	user: one(users, {
		fields: [backupMetadata.createdBy],
		references: [users.id]
	}),
}));

export const clientRevisionHistoryRelations = relations(clientRevisionHistory, ({one}) => ({
	project: one(projects, {
		fields: [clientRevisionHistory.projectId],
		references: [projects.id]
	}),
}));

export const closureAuditLogRelations = relations(closureAuditLog, ({one}) => ({
	accountingClosure: one(accountingClosures, {
		fields: [closureAuditLog.closureId],
		references: [accountingClosures.id]
	}),
	user: one(users, {
		fields: [closureAuditLog.performedBy],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	project: one(projects, {
		fields: [payments.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [payments.registeredBy],
		references: [users.id]
	}),
}));

export const priorEstimatesRelations = relations(priorEstimates, ({one}) => ({
	client: one(clients, {
		fields: [priorEstimates.clientId],
		references: [clients.id]
	}),
}));

export const projectDetailsRelations = relations(projectDetails, ({one}) => ({
	project: one(projects, {
		fields: [projectDetails.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectDetails.createdBy],
		references: [users.id]
	}),
}));

export const projectPaymentsRelations = relations(projectPayments, ({one}) => ({
	project: one(projects, {
		fields: [projectPayments.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectPayments.registeredBy],
		references: [users.id]
	}),
}));

export const projectPhotosRelations = relations(projectPhotos, ({one}) => ({
	project: one(projects, {
		fields: [projectPhotos.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectPhotos.uploadedBy],
		references: [users.id]
	}),
}));

export const projectStatusHistoryRelations = relations(projectStatusHistory, ({one}) => ({
	project: one(projects, {
		fields: [projectStatusHistory.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectStatusHistory.changedBy],
		references: [users.id]
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id]
	}),
}));

export const quotationItemsRelations = relations(quotationItems, ({one}) => ({
	quotation: one(quotations, {
		fields: [quotationItems.quotationId],
		references: [quotations.id]
	}),
}));

export const quotationsRelations = relations(quotations, ({one, many}) => ({
	quotationItems: many(quotationItems),
	client: one(clients, {
		fields: [quotations.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [quotations.createdBy],
		references: [users.id]
	}),
	quotation_parentQuotationId: one(quotations, {
		fields: [quotations.parentQuotationId],
		references: [quotations.id],
		relationName: "quotations_parentQuotationId_quotations_id"
	}),
	quotations_parentQuotationId: many(quotations, {
		relationName: "quotations_parentQuotationId_quotations_id"
	}),
	quotation_baseQuotationId: one(quotations, {
		fields: [quotations.baseQuotationId],
		references: [quotations.id],
		relationName: "quotations_baseQuotationId_quotations_id"
	}),
	quotations_baseQuotationId: many(quotations, {
		relationName: "quotations_baseQuotationId_quotations_id"
	}),
}));

export const remindersRelations = relations(reminders, ({one}) => ({
	project: one(projects, {
		fields: [reminders.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [reminders.assignedTo],
		references: [users.id]
	}),
}));

export const taskRemindersRelations = relations(taskReminders, ({one}) => ({
	task: one(tasks, {
		fields: [taskReminders.taskId],
		references: [tasks.id]
	}),
	user_sentBy: one(users, {
		fields: [taskReminders.sentBy],
		references: [users.id],
		relationName: "taskReminders_sentBy_users_id"
	}),
	user_sentTo: one(users, {
		fields: [taskReminders.sentTo],
		references: [users.id],
		relationName: "taskReminders_sentTo_users_id"
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskReminders: many(taskReminders),
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id]
	}),
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
	user_assignedBy: one(users, {
		fields: [tasks.assignedBy],
		references: [users.id],
		relationName: "tasks_assignedBy_users_id"
	}),
}));