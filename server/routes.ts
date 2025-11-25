import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { z } from "zod";
import sanitizeHtmlLib from "sanitize-html";
import { 
  insertPropertySchema,
  insertDailyReportSchema,
  insertGuestCheckinSchema,
  insertPackageAuditSchema,
  insertDailyDutySchema,
  insertShiftNotesSchema,
  insertEmailSettingsSchema,
  insertResidentSchema,
  insertDutyTemplateSchema,
  insertAgentShiftAssignmentSchema,
  insertPackageSchema,
  insertAnnouncementSchema,
  type Announcement,
  type InsertAnnouncement,
  type User
} from "@shared/schema";

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid username or password' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Authentication Middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// HTML Sanitization Utility
function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto']
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Authentication Routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ message: 'Authentication error', error: err.message });
      }
      if (!user) {
        console.log('Login failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: 'Login error', error: err.message });
        }
        
        // Set cookie maxAge based on rememberMe
        if (req.body.rememberMe && req.session) {
          (req.session as any).cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        }
        
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          requiresPasswordChange: user.requiresPasswordChange
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout error' });
      }
      if (req.session) {
        (req.session as any).destroy((err: any) => {
          if (err) {
            return res.status(500).json({ message: 'Session destruction error' });
          }
          res.json({ message: 'Logged out successfully' });
        });
      } else {
        res.json({ message: 'Logged out successfully' });
      }
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        requiresPasswordChange: user.requiresPasswordChange
      });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user as any;
      
      // Validate current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Validate new password (min 10 chars, mixed case, digit)
      if (newPassword.length < 10) {
        return res.status(400).json({ message: 'Password must be at least 10 characters' });
      }
      if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({ message: 'Password must contain uppercase, lowercase, and a number' });
      }
      
      // Hash and update password, mark as no longer requiring change
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword, false);
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update password' });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { identifier } = req.body;
      
      if (!identifier) {
        return res.status(400).json({ message: 'Email or username is required' });
      }
      
      // Find user by email or username
      let user = await storage.getUserByEmail(identifier);
      if (!user) {
        user = await storage.getUserByUsername(identifier);
      }
      
      // Always return success even if user not found (security best practice)
      if (!user || !user.email) {
        // Send success response but don't reveal user doesn't exist or has no email
        return res.json({ message: 'If an account with that information exists, a password reset email has been sent.' });
      }
      
      // Generate secure random token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Create token expiration (1 hour from now)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Save reset token to database
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });
      
      // Try to send reset email, but don't fail if email service is unavailable
      try {
        const { sendPasswordResetEmail } = await import('./email-util.js');
        await sendPasswordResetEmail(user.email, resetToken, user.username);
        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError: any) {
        // Log the email error but don't expose it to the user
        console.error('Failed to send password reset email:', emailError.message);
        console.log(`Password reset token created for user ${user.username}, but email failed to send.`);
        console.log(`Reset URL: ${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/reset-password?token=${resetToken}`);
      }
      
      // Always return success (security best practice - don't reveal if email actually sent)
      res.json({ message: 'If an account with that information exists, a password reset email has been sent.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(404).json({ valid: false, message: 'Invalid reset token' });
      }
      
      if (resetToken.used) {
        return res.status(400).json({ valid: false, message: 'This reset token has already been used' });
      }
      
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ valid: false, message: 'This reset token has expired' });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({ valid: false, message: 'Failed to verify reset token' });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      // Validate new password (min 10 chars, mixed case, digit)
      if (newPassword.length < 10) {
        return res.status(400).json({ message: 'Password must be at least 10 characters' });
      }
      if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({ message: 'Password must contain uppercase, lowercase, and a number' });
      }
      
      // Get reset token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(404).json({ message: 'Invalid reset token' });
      }
      
      if (resetToken.used) {
        return res.status(400).json({ message: 'This reset token has already been used' });
      }
      
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: 'This reset token has expired' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user password and mark as not requiring password change
      await storage.updateUserPassword(resetToken.userId, hashedPassword, false);
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);
      
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });
  
  // Properties
  app.get("/api/properties", async (_req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ message: "Invalid property data" });
    }
  });

  // Daily Reports
  app.get("/api/reports", async (_req, res) => {
    try {
      const reports = await storage.getDailyReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const report = await storage.getDailyReportWithData(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ message: "Failed to fetch report", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/reports/by-date/:date/:propertyId", async (req, res) => {
    try {
      const { date, propertyId } = req.params;
      const report = await storage.getDailyReportByDateAndProperty(date, propertyId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertDailyReportSchema.parse(req.body);
      const report = await storage.createDailyReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid report data" });
    }
  });

  app.put("/api/reports/:id", async (req, res) => {
    try {
      const validatedData = insertDailyReportSchema.partial().parse(req.body);
      const report = await storage.updateDailyReport(req.params.id, validatedData);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid report data" });
    }
  });

  // Guest Check-ins
  app.get("/api/reports/:reportId/checkins", async (req, res) => {
    try {
      const checkins = await storage.getGuestCheckins(req.params.reportId);
      res.json(checkins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch check-ins" });
    }
  });

  app.post("/api/checkins", async (req, res) => {
    try {
      const validatedData = insertGuestCheckinSchema.parse(req.body);
      const checkin = await storage.createGuestCheckin(validatedData);
      res.status(201).json(checkin);
    } catch (error) {
      res.status(400).json({ message: "Invalid check-in data" });
    }
  });

  app.delete("/api/checkins/:id", async (req, res) => {
    try {
      const success = await storage.deleteGuestCheckin(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Check-in not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete check-in" });
    }
  });

  // Package Audits
  app.get("/api/reports/:reportId/packages", async (req, res) => {
    try {
      const packages = await storage.getPackageAudits(req.params.reportId);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch package audits" });
    }
  });

  app.post("/api/packages", async (req, res) => {
    try {
      const validatedData = insertPackageAuditSchema.parse(req.body);
      const packageAudit = await storage.createPackageAudit(validatedData);
      res.json(packageAudit);
    } catch (error) {
      res.status(400).json({ message: "Invalid package audit data" });
    }
  });

  app.patch("/api/packages/:id/status", async (req, res) => {
    try {
      const { status, changedBy } = req.body;
      if (status !== "picked_up" && status !== "returned_to_sender") {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await storage.updatePackageStatus(req.params.id, status, changedBy || "Agent");
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ message: "Package not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update package status" });
    }
  });

  app.delete("/api/packages/:id", async (req, res) => {
    try {
      const success = await storage.deletePackageAudit(req.params.id);
      if (success) {
        res.json({ message: "Package deleted successfully" });
      } else {
        res.status(404).json({ message: "Package not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Daily Duties
  app.get("/api/reports/:reportId/duties", async (req, res) => {
    try {
      const duties = await storage.getDailyDuties(req.params.reportId);
      res.json(duties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch duties" });
    }
  });

  app.post("/api/duties", async (req, res) => {
    try {
      const validatedData = insertDailyDutySchema.parse(req.body);
      const duty = await storage.createDailyDuty(validatedData);
      res.status(201).json(duty);
    } catch (error) {
      res.status(400).json({ message: "Invalid duty data" });
    }
  });

  app.put("/api/duties/:id", async (req, res) => {
    try {
      const validatedData = insertDailyDutySchema.partial().parse(req.body);
      const duty = await storage.updateDailyDuty(req.params.id, validatedData);
      if (!duty) {
        return res.status(404).json({ message: "Duty not found" });
      }
      res.json(duty);
    } catch (error) {
      res.status(400).json({ message: "Invalid duty data" });
    }
  });

  // Shift Notes
  app.get("/api/reports/:reportId/notes", async (req, res) => {
    try {
      const notes = await storage.getShiftNotes(req.params.reportId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shift notes" });
    }
  });

  app.put("/api/notes", async (req, res) => {
    try {
      const validatedData = insertShiftNotesSchema.parse(req.body);
      const notes = await storage.upsertShiftNotes(validatedData);
      res.json(notes);
    } catch (error) {
      res.status(400).json({ message: "Invalid notes data" });
    }
  });

  // Email Settings
  app.get("/api/email-settings/:propertyId", async (req, res) => {
    try {
      const settings = await storage.getEmailSettings(req.params.propertyId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  app.put("/api/email-settings", async (req, res) => {
    try {
      const validatedData = insertEmailSettingsSchema.parse(req.body);
      const settings = await storage.upsertEmailSettings(validatedData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid email settings data" });
    }
  });

  // Comprehensive Package Tracking Routes
  app.get("/api/properties/:propertyId/packages", async (req, res) => {
    try {
      const querySchema = z.object({
        status: z.enum(['pending', 'picked_up', 'returned_to_sender']).optional(),
        search: z.string().optional(),
        sortBy: z.enum(['receivedDate', 'apartmentNumber', 'daysOld']).optional(),
        limit: z.coerce.number().positive().optional(),
        offset: z.coerce.number().nonnegative().optional(),
      });

      const validatedQuery = querySchema.parse(req.query);
      const packages = await storage.getPackagesByProperty(req.params.propertyId, validatedQuery);
      res.json(packages);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.get("/api/properties/:propertyId/packages/alerts", async (req, res) => {
    try {
      const alerts = await storage.getPackageAlerts(req.params.propertyId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch package alerts" });
    }
  });

  app.get("/api/properties/:propertyId/packages/count", async (req, res) => {
    try {
      const querySchema = z.object({
        shift: z.enum(['1st', '2nd', '3rd']),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
      });

      const validatedQuery = querySchema.parse(req.query);
      const count = await storage.getPackageCountByProperty(
        req.params.propertyId,
        validatedQuery.shift,
        validatedQuery.date
      );
      res.json({ count });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to get package count" });
    }
  });

  app.post("/api/properties/:propertyId/packages", async (req, res) => {
    try {
      // Convert date strings/numbers to Date objects before validation
      const convertDate = (value: any) => {
        if (value === null) return null;
        if (value === undefined) return undefined;
        if (value instanceof Date) return value; // Pass through existing Date objects
        if (typeof value === 'number') return new Date(value); // Convert timestamps
        if (typeof value === 'string' && value.length > 0) return new Date(value); // Convert ISO strings
        return undefined;
      };
      
      const bodyWithDates = {
        ...req.body,
        propertyId: req.params.propertyId,
        receivedDate: convertDate(req.body.receivedDate),
        pickedUpDate: convertDate(req.body.pickedUpDate),
        returnedDate: convertDate(req.body.returnedDate),
      };
      
      const validatedData = insertPackageSchema.parse(bodyWithDates);
      const pkg = await storage.createPackage(validatedData);
      res.status(201).json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(400).json({ message: "Invalid package data" });
    }
  });

  app.patch("/api/packages/:packageId", async (req, res) => {
    try {
      // Convert date strings/numbers to Date objects before validation, preserve null for clearing dates
      const convertDate = (value: any) => {
        if (value === null) return null;
        if (value === undefined) return undefined;
        if (value instanceof Date) return value; // Pass through existing Date objects
        if (typeof value === 'number') return new Date(value); // Convert timestamps
        if (typeof value === 'string' && value.length > 0) return new Date(value); // Convert ISO strings
        return undefined;
      };
      
      const bodyWithDates = {
        ...req.body,
        receivedDate: convertDate(req.body.receivedDate),
        pickedUpDate: convertDate(req.body.pickedUpDate),
        returnedDate: convertDate(req.body.returnedDate),
      };
      
      const validatedData = insertPackageSchema.partial().parse(bodyWithDates);
      const pkg = await storage.updatePackage(req.params.packageId, validatedData);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid package data", errors: error.errors });
      }
      res.status(400).json({ message: "Invalid package data" });
    }
  });

  app.delete("/api/packages/:packageId", async (req, res) => {
    try {
      const success = await storage.deletePackage(req.params.packageId);
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Export endpoints
  app.post("/api/reports/:id/export/pdf", async (req, res) => {
    try {
      const report = await storage.getDailyReportWithData(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const property = await storage.getProperty(report.propertyId);
      
      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${report.reportDate}.pdf"`);
      
      doc.pipe(res);
      
      // Add header
      doc.fontSize(20).text('Front Desk Daily Report', { align: 'center' });
      doc.fontSize(14).text(`Property: ${property?.name || 'Unknown'}`, { align: 'center' });
      doc.text(`Date: ${report.reportDate}`, { align: 'center' });
      doc.text(`Agent: ${report.agentName}`, { align: 'center' });
      doc.moveDown(2);

      // Guest Check-ins
      doc.fontSize(16).text('Guest Check-ins', { underline: true });
      doc.moveDown();
      report.guestCheckins.forEach(guest => {
        doc.fontSize(12).text(`${guest.guestName} - Apt ${guest.apartment} at ${guest.checkInTime}`);
        if (guest.notes) doc.text(`Notes: ${guest.notes}`);
        doc.moveDown(0.5);
      });

      // Package Audits - Grouped by status
      doc.addPage();
      doc.fontSize(16).text('Package Audit', { underline: true });
      doc.moveDown();
      
      const activePackages = report.packageAudits.filter(p => p.status === 'active');
      const pickedUpPackages = report.packageAudits.filter(p => p.status === 'picked_up');
      const returnedPackages = report.packageAudits.filter(p => p.status === 'returned_to_sender');
      
      doc.fontSize(14).text(`Active Packages (${activePackages.length})`, { underline: true });
      doc.moveDown(0.5);
      if (activePackages.length === 0) {
        doc.fontSize(10).text('No active packages awaiting pickup');
      } else {
        activePackages.forEach(pkg => {
          doc.fontSize(12).text(`${pkg.residentName} - Room ${pkg.roomNumber}`);
          doc.fontSize(10).text(`  Storage: ${pkg.storageLocation} | Received: ${pkg.receivedTime} | Shift: ${pkg.shift}`);
          if (pkg.carrier) doc.fontSize(10).text(`  Carrier: ${pkg.carrier}${pkg.trackingNumber ? ` | Tracking: ${pkg.trackingNumber}` : ''}`);
          if (pkg.packageType) doc.fontSize(10).text(`  Type: ${pkg.packageType}`);
          if (pkg.notes) doc.fontSize(10).text(`  Notes: ${pkg.notes}`);
          doc.moveDown(0.5);
        });
      }
      
      doc.moveDown();
      doc.fontSize(14).text(`Picked Up Today (${pickedUpPackages.length})`, { underline: true });
      doc.moveDown(0.5);
      if (pickedUpPackages.length === 0) {
        doc.fontSize(10).text('No packages picked up today');
      } else {
        pickedUpPackages.forEach(pkg => {
          doc.fontSize(12).text(`${pkg.residentName} - Room ${pkg.roomNumber}`);
          doc.fontSize(10).text(`  Received: ${pkg.receivedTime} | Picked up: ${pkg.statusChangedAt || 'Unknown'}`);
          if (pkg.statusChangedBy) doc.fontSize(10).text(`  Handled by: ${pkg.statusChangedBy}`);
          doc.moveDown(0.5);
        });
      }
      
      doc.moveDown();
      doc.fontSize(14).text(`Returned to Sender (${returnedPackages.length})`, { underline: true });
      doc.moveDown(0.5);
      if (returnedPackages.length === 0) {
        doc.fontSize(10).text('No packages returned to sender today');
      } else {
        returnedPackages.forEach(pkg => {
          doc.fontSize(12).text(`${pkg.residentName} - Room ${pkg.roomNumber}`);
          doc.fontSize(10).text(`  Received: ${pkg.receivedTime} | Returned: ${pkg.statusChangedAt || 'Unknown'}`);
          if (pkg.statusChangedBy) doc.fontSize(10).text(`  Handled by: ${pkg.statusChangedBy}`);
          if (pkg.carrier) doc.fontSize(10).text(`  Carrier: ${pkg.carrier}${pkg.trackingNumber ? ` | Tracking: ${pkg.trackingNumber}` : ''}`);
          doc.moveDown(0.5);
        });
      }

      // Daily Duties
      doc.moveDown(2);
      doc.fontSize(16).text('Daily Duties', { underline: true });
      doc.moveDown();
      report.dailyDuties.forEach(duty => {
        const status = duty.completed ? '✓' : '○';
        doc.fontSize(12).text(`${status} ${duty.task}`);
      });

      // Shift Notes
      doc.moveDown(2);
      doc.fontSize(16).text('Shift Notes', { underline: true });
      doc.moveDown();
      report.shiftNotes.forEach(note => {
        doc.fontSize(12).text(`${note.shift} Shift: ${note.content}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/reports/:id/export/csv", async (req, res) => {
    try {
      const report = await storage.getDailyReportWithData(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Generate CSV for guest check-ins
      let csv = "Type,Guest Name,Apartment,Check-in Time,Shift,Notes\n";
      report.guestCheckins.forEach(guest => {
        csv += `Check-in,"${guest.guestName}","${guest.apartment}","${guest.checkInTime}","${guest.shift}","${guest.notes || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daily-report-${report.reportDate}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate CSV" });
    }
  });

  app.post("/api/reports/:id/send-email", async (req, res) => {
    try {
      const report = await storage.getDailyReportWithData(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const emailSettings = await storage.getEmailSettings(report.propertyId);
      if (!emailSettings) {
        return res.status(400).json({ message: "Email settings not configured for this property" });
      }

      const property = await storage.getProperty(report.propertyId);

      // Create transporter (using environment variables for email config)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Group packages by status
      const activePackages = report.packageAudits.filter(p => p.status === 'active');
      const pickedUpPackages = report.packageAudits.filter(p => p.status === 'picked_up');
      const returnedPackages = report.packageAudits.filter(p => p.status === 'returned_to_sender');

      // Generate HTML email content
      const htmlContent = `
        <h2>Front Desk Daily Report</h2>
        <p><strong>Property:</strong> ${property?.name || 'Unknown'}</p>
        <p><strong>Date:</strong> ${report.reportDate}</p>
        <p><strong>Agent:</strong> ${report.agentName}</p>
        
        <h3>Guest Check-ins (${report.guestCheckins.length})</h3>
        <ul>
          ${report.guestCheckins.map(guest => 
            `<li>${guest.guestName} - Apt ${guest.apartment} at ${guest.checkInTime} ${guest.notes ? `(${guest.notes})` : ''}</li>`
          ).join('')}
        </ul>
        
        <h3>Package Summary</h3>
        <p><strong>Total Packages:</strong> ${report.packageAudits.length} | <strong>Active:</strong> ${activePackages.length} | <strong>Picked Up:</strong> ${pickedUpPackages.length} | <strong>Returned:</strong> ${returnedPackages.length}</p>
        
        <h4>📦 Active Packages (${activePackages.length})</h4>
        ${activePackages.length === 0 ? '<p><em>No active packages awaiting pickup</em></p>' : `
        <ul>
          ${activePackages.map(pkg => 
            `<li><strong>${pkg.residentName}</strong> - Room ${pkg.roomNumber}<br/>
            Storage: ${pkg.storageLocation} | Received: ${pkg.receivedTime} | Shift: ${pkg.shift}
            ${pkg.carrier ? `<br/>Carrier: ${pkg.carrier}${pkg.trackingNumber ? ` | Tracking: ${pkg.trackingNumber}` : ''}` : ''}
            ${pkg.packageType ? `<br/>Type: ${pkg.packageType}` : ''}
            ${pkg.notes ? `<br/>Notes: ${pkg.notes}` : ''}</li>`
          ).join('')}
        </ul>`}
        
        <h4>✅ Picked Up Today (${pickedUpPackages.length})</h4>
        ${pickedUpPackages.length === 0 ? '<p><em>No packages picked up today</em></p>' : `
        <ul>
          ${pickedUpPackages.map(pkg => 
            `<li><strong>${pkg.residentName}</strong> - Room ${pkg.roomNumber}<br/>
            Received: ${pkg.receivedTime} | Picked up: ${pkg.statusChangedAt || 'Unknown'}
            ${pkg.statusChangedBy ? `<br/>Handled by: ${pkg.statusChangedBy}` : ''}</li>`
          ).join('')}
        </ul>`}
        
        <h4>📮 Returned to Sender (${returnedPackages.length})</h4>
        ${returnedPackages.length === 0 ? '<p><em>No packages returned to sender today</em></p>' : `
        <ul>
          ${returnedPackages.map(pkg => 
            `<li><strong>${pkg.residentName}</strong> - Room ${pkg.roomNumber}<br/>
            Received: ${pkg.receivedTime} | Returned: ${pkg.statusChangedAt || 'Unknown'}
            ${pkg.statusChangedBy ? `<br/>Handled by: ${pkg.statusChangedBy}` : ''}
            ${pkg.carrier ? `<br/>Carrier: ${pkg.carrier}${pkg.trackingNumber ? ` | Tracking: ${pkg.trackingNumber}` : ''}` : ''}</li>`
          ).join('')}
        </ul>`}
        
        <h3>Daily Duties</h3>
        <ul>
          ${report.dailyDuties.map(duty => 
            `<li>${duty.completed ? '✅' : '⭕'} ${duty.task}</li>`
          ).join('')}
        </ul>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: emailSettings.recipients as string[],
        subject: `Daily Report - ${property?.name} - ${report.reportDate}`,
        html: htmlContent
      });

      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error('Email error:', error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Shift Handoff Endpoints
  app.post("/api/reports/:id/end-shift", async (req, res) => {
    try {
      const report = await storage.getDailyReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      const currentShift = report.currentShift || 'unknown';
      const shiftStatus = (report.shiftStatusJson as any) || {};
      
      // Mark current shift as completed
      const updatedStatus = {
        ...shiftStatus,
        [currentShift]: { ...(shiftStatus[currentShift] || {}), completed: true, completedAt: new Date().toISOString() }
      };

      // Update report to mark shift as ended
      const updated = await storage.updateDailyReport(req.params.id, {
        shiftStatusJson: updatedStatus
      });

      res.json({ message: "Shift ended successfully", report: updated });
    } catch (error) {
      console.error('Error ending shift:', error);
      res.status(500).json({ message: "Failed to end shift" });
    }
  });

  // Get current shift's active report or create one
  app.get("/api/reports/current/:propertyId", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      
      // Determine current shift based on time
      let currentShift: '1st' | '2nd' | '3rd';
      if (hour >= 7 && hour < 15) currentShift = '1st';
      else if (hour >= 15 && hour < 23) currentShift = '2nd';
      else currentShift = '3rd';

      // Get existing report
      let report = await storage.getDailyReportByDateAndProperty(today, req.params.propertyId);

      // If no report exists or shift mismatch, create/update for current shift
      if (!report) {
        report = await storage.createDailyReport({
          propertyId: req.params.propertyId,
          reportDate: today,
          agentName: "Agent",
          shiftTime: currentShift === '1st' ? '7:00 am to 3:00 pm' : currentShift === '2nd' ? '3:00 pm to 11:00 pm' : '11:00 pm to 7:00 am',
          currentShift: currentShift
        } as any);
      } else if (report.currentShift !== currentShift) {
        // Update to current shift if different
        report = await storage.updateDailyReport(report.id, {
          currentShift: currentShift,
          shiftTime: currentShift === '1st' ? '7:00 am to 3:00 pm' : currentShift === '2nd' ? '3:00 pm to 11:00 pm' : '11:00 pm to 7:00 am'
        });
      }

      res.json(report);
    } catch (error) {
      console.error('Error getting current report:', error);
      res.status(500).json({ message: "Failed to get current report" });
    }
  });

  // Send report now (manual backup)
  app.post("/api/reports/:id/send-now", async (req, res) => {
    try {
      const report = await storage.getDailyReportWithData(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Call the existing send-email endpoint logic
      const emailSettings = await storage.getEmailSettings(report.propertyId);
      if (!emailSettings) {
        return res.status(400).json({ message: "Email settings not configured for this property" });
      }

      const property = await storage.getProperty(report.propertyId);

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const activePackages = report.packageAudits.filter(p => p.status === 'active');
      const pickedUpPackages = report.packageAudits.filter(p => p.status === 'picked_up');
      const returnedPackages = report.packageAudits.filter(p => p.status === 'returned_to_sender');

      const htmlContent = `
        <h2>Front Desk Daily Report</h2>
        <p><strong>Property:</strong> ${property?.name || 'Unknown'}</p>
        <p><strong>Date:</strong> ${report.reportDate}</p>
        <p><strong>Agent:</strong> ${report.agentName}</p>
        <p><strong>Manually Sent</strong></p>
        
        <h3>Guest Check-ins (${report.guestCheckins.length})</h3>
        <ul>
          ${report.guestCheckins.length === 0 ? '<li>No check-ins recorded</li>' : report.guestCheckins.map(guest => 
            `<li>${guest.guestName} - Apt ${guest.apartment} at ${guest.checkInTime}</li>`
          ).join('')}
        </ul>
        
        <h3>Total Packages: ${report.packageAudits.length}</h3>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: emailSettings.recipients as string[],
        subject: `[MANUAL] Daily Report - ${property?.name} - ${report.reportDate}`,
        html: htmlContent
      });

      res.json({ message: "Report sent manually" });
    } catch (error) {
      console.error('Error sending report:', error);
      res.status(500).json({ message: "Failed to send report" });
    }
  });

  // Resident Routes
  app.get("/api/residents/:propertyId", async (req, res) => {
    try {
      const residents = await storage.getResidentsByProperty(req.params.propertyId);
      res.json(residents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch residents" });
    }
  });

  app.get("/api/residents/lookup/:propertyId/:apartmentNumber", async (req, res) => {
    try {
      const resident = await storage.getResidentByApartment(req.params.propertyId, req.params.apartmentNumber);
      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }
      res.json(resident);
    } catch (error) {
      res.status(500).json({ message: "Failed to lookup resident" });
    }
  });

  app.post("/api/residents", async (req, res) => {
    try {
      const validatedData = insertResidentSchema.parse(req.body);
      const resident = await storage.createResident(validatedData);
      res.status(201).json(resident);
    } catch (error) {
      res.status(400).json({ message: "Invalid resident data" });
    }
  });

  app.patch("/api/residents/:id", async (req, res) => {
    try {
      const validatedData = insertResidentSchema.partial().parse(req.body);
      const resident = await storage.updateResident(req.params.id, validatedData);
      if (!resident) {
        return res.status(404).json({ message: "Resident not found" });
      }
      res.json(resident);
    } catch (error) {
      res.status(400).json({ message: "Invalid resident data" });
    }
  });

  app.delete("/api/residents/:id", async (req, res) => {
    try {
      await storage.deleteResident(req.params.id);
      res.json({ message: "Resident deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete resident" });
    }
  });

  // Duty Template Routes
  app.get("/api/duty-templates/:propertyId", async (req, res) => {
    try {
      const templates = await storage.getDutyTemplatesByProperty(req.params.propertyId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch duty templates" });
    }
  });

  app.post("/api/duty-templates", async (req, res) => {
    try {
      const validatedData = insertDutyTemplateSchema.parse(req.body);
      const template = await storage.createDutyTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid duty template data" });
    }
  });

  app.patch("/api/duty-templates/:id", async (req, res) => {
    try {
      const validatedData = insertDutyTemplateSchema.partial().parse(req.body);
      const template = await storage.updateDutyTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ message: "Duty template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid duty template data" });
    }
  });

  app.delete("/api/duty-templates/:id", async (req, res) => {
    try {
      await storage.deleteDutyTemplate(req.params.id);
      res.json({ message: "Duty template deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete duty template" });
    }
  });

  // Agent Shift Assignment Routes
  app.get("/api/agent-shifts/:propertyId", async (req, res) => {
    try {
      const assignments = await storage.getAgentShiftAssignmentsByProperty(req.params.propertyId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent shift assignments" });
    }
  });

  app.post("/api/agent-shifts", async (req, res) => {
    try {
      const validatedData = insertAgentShiftAssignmentSchema.parse(req.body);
      const assignment = await storage.upsertAgentShiftAssignment(validatedData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Invalid agent shift assignment data" });
    }
  });

  app.delete("/api/agent-shifts/:id", async (req, res) => {
    try {
      await storage.deleteAgentShiftAssignment(req.params.id);
      res.json({ message: "Agent shift assignment deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agent shift assignment" });
    }
  });

  // Bulk Resident Import Route
  app.post("/api/residents/import", async (req, res) => {
    try {
      const { residents: residentsData } = req.body;
      
      if (!Array.isArray(residentsData) || residentsData.length === 0) {
        return res.status(400).json({ message: "Invalid import data - expected array of residents" });
      }

      // Validate each resident
      const validatedResidents = residentsData.map(resident => 
        insertResidentSchema.parse(resident)
      );

      const createdResidents = await storage.bulkCreateResidents(validatedResidents);
      
      res.json({
        success: true,
        imported: createdResidents.length,
        residents: createdResidents
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(500).json({ message: "Failed to import residents" });
    }
  });

  // Announcement Routes
  app.get("/api/announcements", async (req, res) => {
    try {
      const includeArchived = req.query.includeArchived === 'true';
      const includeDrafts = req.query.includeDrafts === 'true';
      
      // Only admins and managers can view drafts
      const user = req.user as User | undefined;
      const canViewDrafts = includeDrafts && user && 
        (user.role === 'admin' || user.role === 'manager');
      
      const announcements = await storage.getAnnouncements(
        user?.id,
        includeArchived,
        canViewDrafts
      );
      
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.get("/api/announcements/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadAnnouncementCount(user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const announcement = await storage.getAnnouncementById(req.params.id);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch announcement" });
    }
  });

  app.post("/api/announcements", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      
      // Sanitize content
      const sanitizedData: InsertAnnouncement = {
        ...validatedData,
        content: sanitizeHtml(validatedData.content)
      };
      
      // Set publishedAt if isPublished is true but publishedAt is null
      if (sanitizedData.isPublished && !sanitizedData.publishedAt) {
        sanitizedData.publishedAt = new Date();
      }
      
      const announcement = await storage.createAnnouncement(sanitizedData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(400).json({ message: "Invalid announcement data" });
    }
  });

  app.patch("/api/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.partial().parse(req.body);
      
      // Sanitize content if being updated
      const sanitizedData: Partial<InsertAnnouncement> = { ...validatedData };
      if (sanitizedData.content) {
        sanitizedData.content = sanitizeHtml(sanitizedData.content);
      }
      
      // Set publishedAt if isPublished is changing to true and publishedAt is null
      if (sanitizedData.isPublished === true && !sanitizedData.publishedAt) {
        sanitizedData.publishedAt = new Date();
      }
      
      const announcement = await storage.updateAnnouncement(req.params.id, sanitizedData);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors
        });
      }
      res.status(400).json({ message: "Invalid announcement data" });
    }
  });

  app.delete("/api/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteAnnouncement(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  app.post("/api/announcements/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.markAnnouncementAsRead(req.params.id, user.id);
      res.json({ message: "Marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark announcement as read" });
    }
  });

  app.post("/api/announcements/batch-read", requireAuth, async (req, res) => {
    try {
      const { announcementIds } = req.body;
      
      if (!Array.isArray(announcementIds)) {
        return res.status(400).json({ message: "announcementIds must be an array" });
      }
      
      const user = req.user as User;
      await storage.markAnnouncementsAsRead(announcementIds, user.id);
      res.json({ message: "Announcements marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark announcements as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
