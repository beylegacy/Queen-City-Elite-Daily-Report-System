import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { 
  insertPropertySchema,
  insertDailyReportSchema,
  insertGuestCheckinSchema,
  insertPackageAuditSchema,
  insertDailyDutySchema,
  insertShiftNotesSchema,
  insertEmailSettingsSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      res.status(500).json({ message: "Failed to fetch report" });
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

  const httpServer = createServer(app);
  return httpServer;
}
