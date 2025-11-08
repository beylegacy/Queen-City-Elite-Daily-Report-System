import { 
  type Property, 
  type InsertProperty,
  type DailyReport,
  type InsertDailyReport,
  type GuestCheckin,
  type InsertGuestCheckin,
  type PackageAudit,
  type InsertPackageAudit,
  type DailyDuty,
  type InsertDailyDuty,
  type ShiftNotes,
  type InsertShiftNotes,
  type EmailSettings,
  type InsertEmailSettings,
  type ReportWithData,
  type User,
  type InsertUser,
  type Resident,
  type InsertResident,
  type DutyTemplate,
  type InsertDutyTemplate,
  type AgentShiftAssignment,
  type InsertAgentShiftAssignment,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  users,
  properties,
  dailyReports,
  guestCheckins,
  packageAudits,
  dailyDuties,
  shiftNotes,
  emailSettings,
  residents,
  dutyTemplates,
  agentShiftAssignments,
  passwordResetTokens
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  
  // Daily Reports
  getDailyReports(): Promise<DailyReport[]>;
  getDailyReport(id: string): Promise<DailyReport | undefined>;
  getDailyReportWithData(id: string): Promise<ReportWithData | undefined>;
  getDailyReportByDateAndProperty(date: string, propertyId: string): Promise<DailyReport | undefined>;
  createDailyReport(report: InsertDailyReport): Promise<DailyReport>;
  updateDailyReport(id: string, report: Partial<InsertDailyReport>): Promise<DailyReport | undefined>;
  
  // Guest Check-ins
  getGuestCheckins(reportId: string): Promise<GuestCheckin[]>;
  createGuestCheckin(checkin: InsertGuestCheckin): Promise<GuestCheckin>;
  deleteGuestCheckin(id: string): Promise<boolean>;
  
  // Package Audits
  getPackageAudits(reportId: string): Promise<PackageAudit[]>;
  createPackageAudit(audit: InsertPackageAudit): Promise<PackageAudit>;
  updatePackageStatus(id: string, status: "picked_up" | "returned_to_sender", changedBy: string): Promise<PackageAudit | undefined>;
  deletePackageAudit(id: string): Promise<boolean>;
  
  // Daily Duties
  getDailyDuties(reportId: string): Promise<DailyDuty[]>;
  createDailyDuty(duty: InsertDailyDuty): Promise<DailyDuty>;
  updateDailyDuty(id: string, duty: Partial<InsertDailyDuty>): Promise<DailyDuty | undefined>;
  
  // Shift Notes
  getShiftNotes(reportId: string): Promise<ShiftNotes[]>;
  upsertShiftNotes(notes: InsertShiftNotes): Promise<ShiftNotes>;
  
  // Email Settings
  getEmailSettings(propertyId: string): Promise<EmailSettings | undefined>;
  upsertEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;
  
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string, requiresPasswordChange: boolean): Promise<void>;
  updateUserEmail(id: string, email: string): Promise<void>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  
  // Residents
  getResidentsByProperty(propertyId: string): Promise<Resident[]>;
  getResidentByApartment(propertyId: string, apartmentNumber: string): Promise<Resident | undefined>;
  createResident(resident: InsertResident): Promise<Resident>;
  updateResident(id: string, resident: Partial<InsertResident>): Promise<Resident | undefined>;
  deleteResident(id: string): Promise<boolean>;
  
  // Duty Templates
  getDutyTemplatesByProperty(propertyId: string): Promise<DutyTemplate[]>;
  createDutyTemplate(template: InsertDutyTemplate): Promise<DutyTemplate>;
  updateDutyTemplate(id: string, template: Partial<InsertDutyTemplate>): Promise<DutyTemplate | undefined>;
  deleteDutyTemplate(id: string): Promise<boolean>;
  
  // Agent Shift Assignments
  getAgentShiftAssignmentsByProperty(propertyId: string): Promise<AgentShiftAssignment[]>;
  getAgentShiftAssignment(propertyId: string, shift: string): Promise<AgentShiftAssignment | undefined>;
  upsertAgentShiftAssignment(assignment: InsertAgentShiftAssignment): Promise<AgentShiftAssignment>;
  deleteAgentShiftAssignment(id: string): Promise<boolean>;
  
  // Bulk Resident Import
  bulkCreateResidents(residents: InsertResident[]): Promise<Resident[]>;
}

export class DbStorage implements IStorage {
  private initialized = false;
  
  constructor() {
    // Don't await in constructor - initialize on first use
    this.initializeDefaultData().catch(err => console.error('Failed to initialize storage:', err));
  }

  private async initializeDefaultData() {
    if (this.initialized) return;
    
    try {
      // Check if properties already exist
      const existingProperties = await db.select().from(properties);
      
      if (existingProperties.length === 0) {
        // Initialize default properties
        const defaultProperties = [
          "Element South Park (North)",
          "Element South Park (South)",
          "The Resident At South Park",
          "Ashton South End",
          "Hazel South Park",
          "The Ascher (North)",
          "The Ascher (South)",
          "Skye Condos",
          "Lennox  South Park",
          "Inspire South Park",
          "Ascent Uptown"
        ];
        
        for (const name of defaultProperties) {
          await db.insert(properties).values({ name, address: null, isActive: true });
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values({
      name: insertProperty.name,
      address: insertProperty.address ?? null,
      isActive: insertProperty.isActive ?? true
    }).returning();
    return result[0];
  }

  // Daily Reports
  async getDailyReports(): Promise<DailyReport[]> {
    return await db.select().from(dailyReports);
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    const result = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
    return result[0];
  }

  async getDailyReportWithData(id: string): Promise<ReportWithData | undefined> {
    try {
      const result = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).limit(1);
      const report = Array.isArray(result) ? result[0] : undefined;
      if (!report) return undefined;

      // Fetch related data with error handling for Neon driver issues
      const safeSelect = async <T>(promise: Promise<T[]>): Promise<T[]> => {
        try {
          const result = await promise;
          return Array.isArray(result) ? result : [];
        } catch (err) {
          // Handle Neon driver's null.map() error
          if (err instanceof TypeError && err.message.includes("Cannot read properties of null")) {
            return [];
          }
          throw err;
        }
      };

      const [reportGuestCheckins, reportPackageAudits, reportDailyDuties, reportShiftNotes] = await Promise.all([
        safeSelect(db.select().from(guestCheckins).where(eq(guestCheckins.reportId, id))),
        safeSelect(db.select().from(packageAudits).where(eq(packageAudits.reportId, id))),
        safeSelect(db.select().from(dailyDuties).where(eq(dailyDuties.reportId, id))),
        safeSelect(db.select().from(shiftNotes).where(eq(shiftNotes.reportId, id)))
      ]);

      return {
        ...report,
        guestCheckins: reportGuestCheckins,
        packageAudits: reportPackageAudits,
        dailyDuties: reportDailyDuties,
        shiftNotes: reportShiftNotes
      };
    } catch (error) {
      console.error('Error in getDailyReportWithData:', error);
      throw error;
    }
  }

  async getDailyReportByDateAndProperty(date: string, propertyId: string): Promise<DailyReport | undefined> {
    const result = await db.select().from(dailyReports)
      .where(and(
        eq(dailyReports.reportDate, date),
        eq(dailyReports.propertyId, propertyId)
      ))
      .limit(1);
    return result[0];
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    const result = await db.insert(dailyReports).values({
      propertyId: insertReport.propertyId,
      reportDate: insertReport.reportDate,
      agentName: insertReport.agentName,
      shiftTime: insertReport.shiftTime ?? null
    }).returning();
    return result[0];
  }

  async updateDailyReport(id: string, updateData: Partial<InsertDailyReport>): Promise<DailyReport | undefined> {
    const result = await db.update(dailyReports)
      .set(updateData)
      .where(eq(dailyReports.id, id))
      .returning();
    return result[0];
  }

  // Guest Check-ins
  async getGuestCheckins(reportId: string): Promise<GuestCheckin[]> {
    return await db.select().from(guestCheckins).where(eq(guestCheckins.reportId, reportId));
  }

  async createGuestCheckin(insertCheckin: InsertGuestCheckin): Promise<GuestCheckin> {
    const result = await db.insert(guestCheckins).values({
      reportId: insertCheckin.reportId,
      guestName: insertCheckin.guestName,
      apartment: insertCheckin.apartment,
      checkInTime: insertCheckin.checkInTime,
      notes: insertCheckin.notes ?? null,
      shift: insertCheckin.shift
    }).returning();
    return result[0];
  }

  async deleteGuestCheckin(id: string): Promise<boolean> {
    const result = await db.delete(guestCheckins).where(eq(guestCheckins.id, id)).returning();
    return result.length > 0;
  }

  // Package Audits
  async getPackageAudits(reportId: string): Promise<PackageAudit[]> {
    return await db.select().from(packageAudits).where(eq(packageAudits.reportId, reportId));
  }

  async createPackageAudit(insertAudit: InsertPackageAudit): Promise<PackageAudit> {
    const result = await db.insert(packageAudits).values({
      reportId: insertAudit.reportId,
      residentName: insertAudit.residentName ?? null,
      roomNumber: insertAudit.roomNumber,
      storageLocation: insertAudit.storageLocation ?? null,
      carrier: insertAudit.carrier ?? null,
      trackingNumber: insertAudit.trackingNumber ?? null,
      packageType: insertAudit.packageType ?? null,
      receivedTime: insertAudit.receivedTime ?? null,
      notes: insertAudit.notes ?? null,
      shift: insertAudit.shift,
      status: "active",
      statusChangedAt: null,
      statusChangedBy: null
    }).returning();
    return result[0];
  }

  async updatePackageStatus(id: string, status: "picked_up" | "returned_to_sender", changedBy: string): Promise<PackageAudit | undefined> {
    const result = await db.update(packageAudits)
      .set({
        status,
        statusChangedAt: new Date(),
        statusChangedBy: changedBy
      })
      .where(eq(packageAudits.id, id))
      .returning();
    return result[0];
  }

  async deletePackageAudit(id: string): Promise<boolean> {
    const result = await db.delete(packageAudits).where(eq(packageAudits.id, id)).returning();
    return result.length > 0;
  }

  // Daily Duties
  async getDailyDuties(reportId: string): Promise<DailyDuty[]> {
    return await db.select().from(dailyDuties).where(eq(dailyDuties.reportId, reportId));
  }

  async createDailyDuty(insertDuty: InsertDailyDuty): Promise<DailyDuty> {
    const result = await db.insert(dailyDuties).values({
      reportId: insertDuty.reportId,
      task: insertDuty.task,
      completed: insertDuty.completed ?? false,
      completedAt: null
    }).returning();
    return result[0];
  }

  async updateDailyDuty(id: string, updateData: Partial<InsertDailyDuty>): Promise<DailyDuty | undefined> {
    const setData: any = { ...updateData };
    if (updateData.completed !== undefined) {
      setData.completedAt = updateData.completed ? new Date() : null;
    }
    
    const result = await db.update(dailyDuties)
      .set(setData)
      .where(eq(dailyDuties.id, id))
      .returning();
    return result[0];
  }

  // Shift Notes
  async getShiftNotes(reportId: string): Promise<ShiftNotes[]> {
    return await db.select().from(shiftNotes).where(eq(shiftNotes.reportId, reportId));
  }

  async upsertShiftNotes(insertNotes: InsertShiftNotes): Promise<ShiftNotes> {
    const existingResult = await db.select().from(shiftNotes)
      .where(and(
        eq(shiftNotes.reportId, insertNotes.reportId),
        eq(shiftNotes.shift, insertNotes.shift)
      ))
      .limit(1);
    
    const existing = existingResult[0];

    if (existing) {
      const result = await db.update(shiftNotes)
        .set({
          content: insertNotes.content,
          updatedAt: new Date()
        })
        .where(eq(shiftNotes.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(shiftNotes).values({
        reportId: insertNotes.reportId,
        content: insertNotes.content,
        shift: insertNotes.shift,
        updatedAt: new Date()
      }).returning();
      return result[0];
    }
  }

  // Email Settings
  async getEmailSettings(propertyId: string): Promise<EmailSettings | undefined> {
    const result = await db.select().from(emailSettings).where(eq(emailSettings.propertyId, propertyId)).limit(1);
    return result[0];
  }

  async upsertEmailSettings(insertSettings: InsertEmailSettings): Promise<EmailSettings> {
    const existingResult = await db.select().from(emailSettings)
      .where(eq(emailSettings.propertyId, insertSettings.propertyId))
      .limit(1);
    
    const existing = existingResult[0];

    if (existing) {
      const result = await db.update(emailSettings)
        .set({
          recipients: insertSettings.recipients,
          format: insertSettings.format ?? existing.format,
          dailySendTime: insertSettings.dailySendTime ?? existing.dailySendTime,
          autoSend: insertSettings.autoSend ?? existing.autoSend
        })
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(emailSettings).values({
        propertyId: insertSettings.propertyId,
        recipients: insertSettings.recipients,
        format: insertSettings.format ?? null,
        dailySendTime: insertSettings.dailySendTime ?? null,
        autoSend: insertSettings.autoSend ?? null
      }).returning();
      return result[0];
    }
  }

  // Users - Using database
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserPassword(id: string, passwordHash: string, requiresPasswordChange: boolean = false): Promise<void> {
    await db.update(users)
      .set({ passwordHash, requiresPasswordChange })
      .where(eq(users.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async updateUserEmail(id: string, email: string): Promise<void> {
    await db.update(users)
      .set({ email })
      .where(eq(users.id, id));
  }

  // Password Reset Tokens
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const result = await db.insert(passwordResetTokens).values(token).returning();
    return result[0];
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
    return result[0];
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  // Residents
  async getResidentsByProperty(propertyId: string): Promise<Resident[]> {
    return await db.select().from(residents).where(eq(residents.propertyId, propertyId));
  }

  async getResidentByApartment(propertyId: string, apartmentNumber: string): Promise<Resident | undefined> {
    const result = await db.select().from(residents)
      .where(and(
        eq(residents.propertyId, propertyId),
        eq(residents.apartmentNumber, apartmentNumber)
      ))
      .limit(1);
    return result[0];
  }

  async createResident(insertResident: InsertResident): Promise<Resident> {
    const result = await db.insert(residents).values(insertResident).returning();
    return result[0];
  }

  async updateResident(id: string, updateData: Partial<InsertResident>): Promise<Resident | undefined> {
    const result = await db.update(residents)
      .set(updateData)
      .where(eq(residents.id, id))
      .returning();
    return result[0];
  }

  async deleteResident(id: string): Promise<boolean> {
    const result = await db.delete(residents).where(eq(residents.id, id));
    return true;
  }

  // Duty Templates
  async getDutyTemplatesByProperty(propertyId: string): Promise<DutyTemplate[]> {
    return await db.select().from(dutyTemplates).where(eq(dutyTemplates.propertyId, propertyId));
  }

  async createDutyTemplate(insertTemplate: InsertDutyTemplate): Promise<DutyTemplate> {
    const result = await db.insert(dutyTemplates).values(insertTemplate).returning();
    return result[0];
  }

  async updateDutyTemplate(id: string, updateData: Partial<InsertDutyTemplate>): Promise<DutyTemplate | undefined> {
    const result = await db.update(dutyTemplates)
      .set(updateData)
      .where(eq(dutyTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteDutyTemplate(id: string): Promise<boolean> {
    const result = await db.delete(dutyTemplates).where(eq(dutyTemplates.id, id));
    return true;
  }

  // Agent Shift Assignments
  async getAgentShiftAssignmentsByProperty(propertyId: string): Promise<AgentShiftAssignment[]> {
    return await db.select().from(agentShiftAssignments)
      .where(eq(agentShiftAssignments.propertyId, propertyId));
  }

  async getAgentShiftAssignment(propertyId: string, shift: string): Promise<AgentShiftAssignment | undefined> {
    const result = await db.select().from(agentShiftAssignments)
      .where(and(
        eq(agentShiftAssignments.propertyId, propertyId),
        eq(agentShiftAssignments.shift, shift)
      ))
      .limit(1);
    return result[0];
  }

  async upsertAgentShiftAssignment(assignment: InsertAgentShiftAssignment): Promise<AgentShiftAssignment> {
    const existing = await this.getAgentShiftAssignment(assignment.propertyId, assignment.shift);
    
    if (existing) {
      const result = await db.update(agentShiftAssignments)
        .set({ agentName: assignment.agentName })
        .where(eq(agentShiftAssignments.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(agentShiftAssignments)
        .values(assignment)
        .returning();
      return result[0];
    }
  }

  async deleteAgentShiftAssignment(id: string): Promise<boolean> {
    await db.delete(agentShiftAssignments).where(eq(agentShiftAssignments.id, id));
    return true;
  }

  // Bulk Resident Import
  async bulkCreateResidents(residentsData: InsertResident[]): Promise<Resident[]> {
    if (residentsData.length === 0) {
      return [];
    }
    
    const result = await db.insert(residents)
      .values(residentsData)
      .returning();
    return result;
  }
}

export const storage = new DbStorage();
