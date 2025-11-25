import cron from 'node-cron';
import { db } from './db';
import { dailyReports } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';

export function initializeScheduler() {
  console.log('Initializing report scheduler...');

  // Helper function to send reports for a specific shift at end time
  const sendReportsForShift = async (shiftName: string, shiftEndHour: number) => {
    try {
      console.log(`[${new Date().toISOString()}] Auto-sending ${shiftName} shift reports...`);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Find all reports for today with the specified shift as current
      const reportsToSend = await db
        .select()
        .from(dailyReports)
        .where(
          and(
            eq(dailyReports.reportDate, today),
            eq(dailyReports.currentShift, shiftName)
          )
        );

      console.log(`Found ${reportsToSend.length} ${shiftName} shift reports to send`);

      // Send email for each report
      for (const report of reportsToSend) {
        try {
          // Check if report was already sent
          const shiftStatus = (report.shiftStatusJson as any) || {};
          const shiftData = shiftStatus[shiftName] || {};

          if (shiftData.sent) {
            console.log(`Report ${report.id} already sent, skipping`);
            continue;
          }

          // Send the report via email (call the existing send email logic)
          await sendReportEmail(report.id);

          // Mark shift as sent
          const updatedStatus = {
            ...shiftStatus,
            [shiftName]: { ...shiftData, sent: true, sentAt: new Date().toISOString() }
          };

          await db
            .update(dailyReports)
            .set({ shiftStatusJson: updatedStatus })
            .where(eq(dailyReports.id, report.id));

          console.log(`Report ${report.id} sent successfully`);
        } catch (error) {
          console.error(`Failed to send report ${report.id}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error in sendReportsForShift for ${shiftName}:`, error);
    }
  };

  // Helper function to send report via email (mimics the POST endpoint logic)
  const sendReportEmail = async (reportId: string) => {
    try {
      // Fetch the report with all its data
      const [report] = await db
        .select()
        .from(dailyReports)
        .where(eq(dailyReports.id, reportId));

      if (!report) {
        throw new Error('Report not found');
      }

      // Check if email settings are configured (for now, skip if not configured)
      // In production, you'd want to handle this better
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`Email not configured, skipping email for report ${reportId}`);
        return;
      }

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

      // Simple email (in production, you'd fetch all the report data and format it properly)
      const htmlContent = `
        <h2>Shift Report - Auto-Sent</h2>
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Date:</strong> ${report.reportDate}</p>
        <p><strong>Agent:</strong> ${report.agentName}</p>
        <p><strong>Shift:</strong> ${report.currentShift || report.shiftTime}</p>
        <p>This report was automatically generated at shift end time.</p>
      `;

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.REPORT_EMAIL_RECIPIENTS || 'reports@queencityelite.com',
        subject: `Shift Report - ${report.reportDate}`,
        html: htmlContent
      });

      console.log(`Email sent successfully for report ${reportId}`);
    } catch (error) {
      console.error(`Error sending email for report ${reportId}:`, error);
      throw error;
    }
  };

  // Schedule auto-send at shift end times
  // 7:00 AM - End of 3rd shift (11pm-7am)
  cron.schedule('0 7 * * *', () => sendReportsForShift('3rd', 7));

  // 3:00 PM - End of 1st shift (7am-3pm)
  cron.schedule('0 15 * * *', () => sendReportsForShift('1st', 15));

  // 11:00 PM - End of 2nd shift (3pm-11pm)
  cron.schedule('0 23 * * *', () => sendReportsForShift('2nd', 23));

  console.log('Scheduler initialized with 3 auto-send tasks');
}

// Helper function to determine current shift based on time
export function getCurrentShift(): '1st' | '2nd' | '3rd' {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 15) return '1st'; // 7am-3pm
  if (hour >= 15 && hour < 23) return '2nd'; // 3pm-11pm
  return '3rd'; // 11pm-7am
}

// Helper function to get shift time range
export function getShiftTimeRange(shift: '1st' | '2nd' | '3rd'): string {
  switch (shift) {
    case '1st':
      return '7:00 am to 3:00 pm';
    case '2nd':
      return '3:00 pm to 11:00 pm';
    case '3rd':
      return '11:00 pm to 7:00 am';
  }
}
