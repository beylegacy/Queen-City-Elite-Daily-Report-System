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
  type InsertUser
} from "@shared/schema";
import { randomUUID } from "crypto";

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
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string, requiresPasswordChange: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private properties: Map<string, Property> = new Map();
  private dailyReports: Map<string, DailyReport> = new Map();
  private guestCheckins: Map<string, GuestCheckin> = new Map();
  private packageAudits: Map<string, PackageAudit> = new Map();
  private dailyDuties: Map<string, DailyDuty> = new Map();
  private shiftNotes: Map<string, ShiftNotes> = new Map();
  private emailSettings: Map<string, EmailSettings> = new Map();
  private users: Map<string, User> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
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

    defaultProperties.forEach(name => {
      const id = randomUUID();
      this.properties.set(id, { id, name, address: null, isActive: true });
    });

    // Email settings will be configured per property by users
  }

  // Properties
  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { 
      ...insertProperty, 
      id, 
      address: insertProperty.address ?? null,
      isActive: insertProperty.isActive ?? true 
    };
    this.properties.set(id, property);
    return property;
  }

  // Daily Reports
  async getDailyReports(): Promise<DailyReport[]> {
    return Array.from(this.dailyReports.values());
  }

  async getDailyReport(id: string): Promise<DailyReport | undefined> {
    return this.dailyReports.get(id);
  }

  async getDailyReportWithData(id: string): Promise<ReportWithData | undefined> {
    const report = this.dailyReports.get(id);
    if (!report) return undefined;

    const guestCheckins = Array.from(this.guestCheckins.values()).filter(g => g.reportId === id);
    const packageAudits = Array.from(this.packageAudits.values()).filter(p => p.reportId === id);
    const dailyDuties = Array.from(this.dailyDuties.values()).filter(d => d.reportId === id);
    const shiftNotes = Array.from(this.shiftNotes.values()).filter(s => s.reportId === id);

    return {
      ...report,
      guestCheckins,
      packageAudits,
      dailyDuties,
      shiftNotes
    };
  }

  async getDailyReportByDateAndProperty(date: string, propertyId: string): Promise<DailyReport | undefined> {
    return Array.from(this.dailyReports.values()).find(
      report => report.reportDate === date && report.propertyId === propertyId
    );
  }

  async createDailyReport(insertReport: InsertDailyReport): Promise<DailyReport> {
    const id = randomUUID();
    const report: DailyReport = { 
      ...insertReport, 
      id, 
      shiftTime: insertReport.shiftTime || null,
      createdAt: new Date()
    };
    this.dailyReports.set(id, report);
    return report;
  }

  async updateDailyReport(id: string, updateData: Partial<InsertDailyReport>): Promise<DailyReport | undefined> {
    const existing = this.dailyReports.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updateData };
    this.dailyReports.set(id, updated);
    return updated;
  }

  // Guest Check-ins
  async getGuestCheckins(reportId: string): Promise<GuestCheckin[]> {
    return Array.from(this.guestCheckins.values()).filter(g => g.reportId === reportId);
  }

  async createGuestCheckin(insertCheckin: InsertGuestCheckin): Promise<GuestCheckin> {
    const id = randomUUID();
    const checkin: GuestCheckin = { ...insertCheckin, id, notes: insertCheckin.notes || null };
    this.guestCheckins.set(id, checkin);
    return checkin;
  }

  async deleteGuestCheckin(id: string): Promise<boolean> {
    return this.guestCheckins.delete(id);
  }

  // Package Audits
  async getPackageAudits(reportId: string): Promise<PackageAudit[]> {
    return Array.from(this.packageAudits.values()).filter(p => p.reportId === reportId);
  }

  async createPackageAudit(insertAudit: InsertPackageAudit): Promise<PackageAudit> {
    const id = randomUUID();
    const audit: PackageAudit = { 
      ...insertAudit, 
      id,
      carrier: insertAudit.carrier ?? null,
      trackingNumber: insertAudit.trackingNumber ?? null,
      packageType: insertAudit.packageType ?? null,
      notes: insertAudit.notes ?? null,
      status: "active",
      statusChangedAt: null,
      statusChangedBy: null
    };
    this.packageAudits.set(id, audit);
    return audit;
  }

  async updatePackageStatus(id: string, status: "picked_up" | "returned_to_sender", changedBy: string): Promise<PackageAudit | undefined> {
    const existing = this.packageAudits.get(id);
    if (!existing) return undefined;

    const updated = {
      ...existing,
      status,
      statusChangedAt: new Date(),
      statusChangedBy: changedBy
    };
    this.packageAudits.set(id, updated);
    return updated;
  }

  async deletePackageAudit(id: string): Promise<boolean> {
    return this.packageAudits.delete(id);
  }

  // Daily Duties
  async getDailyDuties(reportId: string): Promise<DailyDuty[]> {
    return Array.from(this.dailyDuties.values()).filter(d => d.reportId === reportId);
  }

  async createDailyDuty(insertDuty: InsertDailyDuty): Promise<DailyDuty> {
    const id = randomUUID();
    const duty: DailyDuty = { ...insertDuty, id, completed: insertDuty.completed ?? false, completedAt: null };
    this.dailyDuties.set(id, duty);
    return duty;
  }

  async updateDailyDuty(id: string, updateData: Partial<InsertDailyDuty>): Promise<DailyDuty | undefined> {
    const existing = this.dailyDuties.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...updateData,
      completedAt: updateData.completed ? new Date() : null
    };
    this.dailyDuties.set(id, updated);
    return updated;
  }

  // Shift Notes
  async getShiftNotes(reportId: string): Promise<ShiftNotes[]> {
    return Array.from(this.shiftNotes.values()).filter(s => s.reportId === reportId);
  }

  async upsertShiftNotes(insertNotes: InsertShiftNotes): Promise<ShiftNotes> {
    // Find existing notes for same report and shift
    const existing = Array.from(this.shiftNotes.values()).find(
      s => s.reportId === insertNotes.reportId && s.shift === insertNotes.shift
    );

    if (existing) {
      const updated = { 
        ...existing, 
        content: insertNotes.content,
        updatedAt: new Date()
      };
      this.shiftNotes.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const notes: ShiftNotes = { 
        ...insertNotes, 
        id,
        updatedAt: new Date()
      };
      this.shiftNotes.set(id, notes);
      return notes;
    }
  }

  // Email Settings
  async getEmailSettings(propertyId: string): Promise<EmailSettings | undefined> {
    return Array.from(this.emailSettings.values()).find(s => s.propertyId === propertyId);
  }

  async upsertEmailSettings(insertSettings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = Array.from(this.emailSettings.values()).find(
      s => s.propertyId === insertSettings.propertyId
    );

    if (existing) {
      const updated = { 
        ...existing, 
        ...insertSettings,
        format: insertSettings.format || existing.format,
        dailySendTime: insertSettings.dailySendTime || existing.dailySendTime,
        autoSend: insertSettings.autoSend ?? existing.autoSend
      };
      this.emailSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const settings: EmailSettings = { 
        ...insertSettings, 
        id,
        format: insertSettings.format || null,
        dailySendTime: insertSettings.dailySendTime || null,
        autoSend: insertSettings.autoSend ?? null
      };
      this.emailSettings.set(id, settings);
      return settings;
    }
  }

  // Users
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string, requiresPasswordChange: boolean = false): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.passwordHash = passwordHash;
      user.requiresPasswordChange = requiresPasswordChange;
      this.users.set(id, user);
    }
  }
}

export const storage = new MemStorage();
