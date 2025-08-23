import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
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
  location: text("location").notNull(), // "shelfA1", "bin1", "oversized", etc.
  count: integer("count").default(0),
  shift: text("shift").notNull(),
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
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipients: jsonb("recipients").notNull(), // Array of email addresses
  dailySendTime: text("daily_send_time").default("06:30"),
  format: text("format").default("both"), // "pdf", "html", "both"
  autoSend: boolean("auto_send").default(true),
});

// Insert schemas
export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({ id: true, createdAt: true });
export const insertGuestCheckinSchema = createInsertSchema(guestCheckins).omit({ id: true });
export const insertPackageAuditSchema = createInsertSchema(packageAudits).omit({ id: true });
export const insertDailyDutySchema = createInsertSchema(dailyDuties).omit({ id: true, completedAt: true });
export const insertShiftNotesSchema = createInsertSchema(shiftNotes).omit({ id: true, updatedAt: true });
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true });

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

// Utility types
export type ReportWithData = DailyReport & {
  guestCheckins: GuestCheckin[];
  packageAudits: PackageAudit[];
  dailyDuties: DailyDuty[];
  shiftNotes: ShiftNotes[];
};
