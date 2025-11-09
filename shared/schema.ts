import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const packageStatusEnum = pgEnum("package_status", ["pending", "picked_up", "returned_to_sender"]);
export const packageCarrierEnum = pgEnum("package_carrier", ["UPS", "FedEx", "USPS", "Amazon", "Other"]);
export const packageSizeEnum = pgEnum("package_size", ["Small", "Medium", "Large", "Oversized"]);
export const packageShiftEnum = pgEnum("package_shift", ["1st", "2nd", "3rd"]);

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  isActive: boolean("is_active").default(true),
});

export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  reportDate: text("report_date").notNull(), // YYYY-MM-DD format
  agentName: text("agent_name").notNull(),
  shiftTime: text("shift_time"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const guestCheckins = pgTable("guest_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  guestName: text("guest_name").notNull(),
  apartment: text("apartment").notNull(),
  checkInTime: text("check_in_time").notNull(),
  notes: text("notes"),
  shift: text("shift").notNull(), // "1st", "2nd", "3rd"
});

export const packageAudits = pgTable("package_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  residentName: text("resident_name"),
  roomNumber: text("room_number").notNull(),
  storageLocation: text("storage_location"),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  packageType: text("package_type"),
  receivedTime: text("received_time"),
  notes: text("notes"),
  shift: text("shift").notNull(),
  status: text("status").notNull().default("active"), // "active", "picked_up", "returned_to_sender"
  statusChangedAt: timestamp("status_changed_at"),
  statusChangedBy: text("status_changed_by"),
});

export const dailyDuties = pgTable("daily_duties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  task: text("task").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
});

export const shiftNotes = pgTable("shift_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  content: text("content").notNull(),
  shift: text("shift").notNull(),
  agentName: text("agent_name"),
  shiftTime: text("shift_time"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  recipients: jsonb("recipients").notNull(), // Array of email addresses
  dailySendTime: text("daily_send_time").default("06:30"),
  format: text("format").default("both"), // "pdf", "html", "both"
  autoSend: boolean("auto_send").default(true),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // "admin", "manager", "agent"
  requiresPasswordChange: boolean("requires_password_change").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  used: boolean("used").default(false),
});

export const dutyTemplates = pgTable("duty_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  shift: text("shift").notNull(), // "1st", "2nd", "3rd"
  task: text("task").notNull(),
  displayOrder: integer("display_order").default(0),
});

export const propertyAssignments = pgTable("property_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  propertyId: varchar("property_id").notNull(),
});

export const residents = pgTable("residents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  apartmentNumber: text("apartment_number").notNull(),
  residentName: text("resident_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  moveInDate: text("move_in_date"), // YYYY-MM-DD format
  leaseEndDate: text("lease_end_date"), // YYYY-MM-DD format
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const agentShiftAssignments = pgTable("agent_shift_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  shift: text("shift").notNull(), // "7:00 am to 3:00 pm", "3:00 pm to 11:00 pm", etc.
  agentName: text("agent_name").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  trackingNumber: text("tracking_number"),
  recipientName: text("recipient_name").notNull(),
  apartmentNumber: text("apartment_number").notNull(),
  carrier: packageCarrierEnum("carrier"),
  packageSize: packageSizeEnum("package_size"),
  storageLocation: text("storage_location"),
  receivedDate: timestamp("received_date").notNull(),
  receivedByAgent: text("received_by_agent").notNull(),
  receivedShift: packageShiftEnum("received_shift").notNull(),
  status: packageStatusEnum("status").notNull().default("pending"),
  pickedUpDate: timestamp("picked_up_date"),
  pickedUpByAgent: text("picked_up_by_agent"),
  returnedDate: timestamp("returned_date"),
  returnedByAgent: text("returned_by_agent"),
  notes: text("notes"),
  keepExtended: boolean("keep_extended").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
}, (table) => ({
  propertyIdIdx: index("packages_property_id_idx").on(table.propertyId),
  propertyIdStatusIdx: index("packages_property_id_status_idx").on(table.propertyId, table.status),
  receivedDateIdx: index("packages_received_date_idx").on(table.receivedDate),
}));

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ id: true, createdAt: true });
export const insertGuestCheckinSchema = createInsertSchema(guestCheckins).omit({ id: true });
export const insertPackageAuditSchema = createInsertSchema(packageAudits).omit({ id: true });
export const insertDailyDutySchema = createInsertSchema(dailyDuties).omit({ id: true, completedAt: true });
export const insertShiftNotesSchema = createInsertSchema(shiftNotes).omit({ id: true, updatedAt: true });
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertDutyTemplateSchema = createInsertSchema(dutyTemplates).omit({ id: true });
export const insertPropertyAssignmentSchema = createInsertSchema(propertyAssignments).omit({ id: true });
export const insertResidentSchema = createInsertSchema(residents).omit({ id: true, createdAt: true });
export const insertAgentShiftAssignmentSchema = createInsertSchema(agentShiftAssignments).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true, used: true });
export const insertPackageSchema = createInsertSchema(packages).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type DailyReport = typeof dailyReports.$inferSelect;
export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type GuestCheckin = typeof guestCheckins.$inferSelect;
export type InsertGuestCheckin = z.infer<typeof insertGuestCheckinSchema>;
export type PackageAudit = typeof packageAudits.$inferSelect;
export type InsertPackageAudit = z.infer<typeof insertPackageAuditSchema>;
export type DailyDuty = typeof dailyDuties.$inferSelect;
export type InsertDailyDuty = z.infer<typeof insertDailyDutySchema>;
export type ShiftNotes = typeof shiftNotes.$inferSelect;
export type InsertShiftNotes = z.infer<typeof insertShiftNotesSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DutyTemplate = typeof dutyTemplates.$inferSelect;
export type InsertDutyTemplate = z.infer<typeof insertDutyTemplateSchema>;
export type PropertyAssignment = typeof propertyAssignments.$inferSelect;
export type InsertPropertyAssignment = z.infer<typeof insertPropertyAssignmentSchema>;
export type Resident = typeof residents.$inferSelect;
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type AgentShiftAssignment = typeof agentShiftAssignments.$inferSelect;
export type InsertAgentShiftAssignment = z.infer<typeof insertAgentShiftAssignmentSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

// Utility types
export type ReportWithData = DailyReport & {
  guestCheckins: GuestCheckin[];
  packageAudits: PackageAudit[];
  dailyDuties: DailyDuty[];
  shiftNotes: ShiftNotes[];
};
