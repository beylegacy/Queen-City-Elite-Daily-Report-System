import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyReport, EmailSettings, InsertEmailSettings } from "@shared/schema";
import { 
  BarChart3, 
  Mail, 
  FileText, 
  Download, 
  Send, 
  RefreshCw, 
  AlertCircle,
  FileDown,
  RotateCcw
} from "lucide-react";

interface ReportsExportProps {
  currentReport: DailyReport | null;
}

export default function ReportsExport({ currentReport }: ReportsExportProps) {
  const [emailRecipients, setEmailRecipients] = useState({
    rsanders: true,
    ascher: true,
    greystar: true,
    extreme: true,
  });
  const [dailySendTime, setDailySendTime] = useState("06:30");
  const [reportFormat, setReportFormat] = useState<"pdf" | "html" | "both">("both");
  const [autoSend, setAutoSend] = useState(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emailSettings } = useQuery<EmailSettings>({
    queryKey: ['/api/email-settings'],
  });

  const { data: recentReports = [] } = useQuery<DailyReport[]>({
    queryKey: ['/api/reports'],
  });

  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (settings: InsertEmailSettings) => {
      const response = await apiRequest("PUT", "/api/email-settings", settings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-settings'] });
      toast({
        title: "Settings Updated",
        description: "Email settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email settings.",
        variant: "destructive",
      });
    },
  });

  const exportPdfMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest("POST", `/api/reports/${reportId}/export/pdf`, {});
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "PDF Generated",
        description: "Daily report PDF has been downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest("POST", `/api/reports/${reportId}/export/csv`, {});
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "CSV Exported",
        description: "Daily report CSV has been downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export CSV report.",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest("POST", `/api/reports/${reportId}/send-email`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Daily report has been sent to management team.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send email report. Please check email configuration.",
        variant: "destructive",
      });
    },
  });

  const handleSaveEmailSettings = () => {
    const recipients = [];
    if (emailRecipients.rsanders) recipients.push("rsanders@queencityelite.com");
    if (emailRecipients.ascher) recipients.push("theaschernorthclt@gmail.com");
    if (emailRecipients.greystar) recipients.push("theaschermgr@greystar.com");
    if (emailRecipients.extreme) recipients.push("dtownes@extremepropertyservice.com");

    updateEmailSettingsMutation.mutate({
      recipients,
      dailySendTime,
      format: reportFormat,
      autoSend,
    });
  };

  // Initialize form with existing settings
  useEffect(() => {
    if (emailSettings) {
      const recipients = emailSettings.recipients as string[];
      setEmailRecipients({
        rsanders: recipients.includes("rsanders@queencityelite.com"),
        ascher: recipients.includes("theaschernorthclt@gmail.com"),
        greystar: recipients.includes("theaschermgr@greystar.com"),
        extreme: recipients.includes("dtownes@extremepropertyservice.com"),
      });
      setDailySendTime(emailSettings.dailySendTime || "06:30");
      setReportFormat(emailSettings.format as "pdf" | "html" | "both");
      setAutoSend(emailSettings.autoSend ?? true);
    }
  }, [emailSettings]);

  const canExport = currentReport !== null;

  return (
    <div className="space-y-6">
      <div className="gradient-emerald-teal text-white p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">
          <BarChart3 className="inline mr-3" />
          Reports & Export
        </h2>
        <p className="text-emerald-100">Generate comprehensive reports and export data for management review</p>
      </div>

      {/* Email Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">
            <Mail className="inline w-5 h-5 mr-2 text-blue-500" />
            Email Report Settings
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-semibold text-slate-700 mb-3">Recipients</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">rsanders@queencityelite.com</span>
                  <Checkbox
                    checked={emailRecipients.rsanders}
                    onCheckedChange={(checked) => setEmailRecipients({ ...emailRecipients, rsanders: !!checked })}
                    className="text-emerald-500"
                    data-testid="checkbox-recipient-rsanders"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">theaschernorthclt@gmail.com</span>
                  <Checkbox
                    checked={emailRecipients.ascher}
                    onCheckedChange={(checked) => setEmailRecipients({ ...emailRecipients, ascher: !!checked })}
                    className="text-emerald-500"
                    data-testid="checkbox-recipient-ascher"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">theaschermgr@greystar.com</span>
                  <Checkbox
                    checked={emailRecipients.greystar}
                    onCheckedChange={(checked) => setEmailRecipients({ ...emailRecipients, greystar: !!checked })}
                    className="text-emerald-500"
                    data-testid="checkbox-recipient-greystar"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">dtownes@extremepropertyservice.com</span>
                  <Checkbox
                    checked={emailRecipients.extreme}
                    onCheckedChange={(checked) => setEmailRecipients({ ...emailRecipients, extreme: !!checked })}
                    className="text-emerald-500"
                    data-testid="checkbox-recipient-extreme"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label className="block text-sm font-semibold text-slate-700 mb-3">Schedule Settings</Label>
              <div className="space-y-4">
                <div>
                  <Label className="block text-xs text-slate-600 mb-1">Daily Send Time</Label>
                  <Input
                    type="time"
                    value={dailySendTime}
                    onChange={(e) => setDailySendTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    data-testid="input-daily-send-time"
                  />
                </div>
                <div>
                  <Label className="block text-xs text-slate-600 mb-1">Report Format</Label>
                  <Select value={reportFormat} onValueChange={(value: "pdf" | "html" | "both") => setReportFormat(value)}>
                    <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" data-testid="select-report-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">PDF + HTML</SelectItem>
                      <SelectItem value="pdf">PDF Only</SelectItem>
                      <SelectItem value="html">HTML Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={autoSend}
                    onCheckedChange={(checked) => setAutoSend(!!checked)}
                    className="text-emerald-500"
                    data-testid="checkbox-auto-send"
                  />
                  <Label className="text-sm text-slate-700">Enable automatic daily send</Label>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSaveEmailSettings}
              disabled={updateEmailSettingsMutation.isPending}
              className="gradient-emerald-teal text-white hover:opacity-90"
              data-testid="button-save-email-settings"
            >
              {updateEmailSettingsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Save Email Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">PDF Report</h3>
          <p className="text-sm text-slate-600 mb-4">Professional formatted report with all daily data</p>
          <Button
            onClick={() => canExport && exportPdfMutation.mutate(currentReport!.id)}
            disabled={!canExport || exportPdfMutation.isPending}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileDown className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">CSV Export</h3>
          <p className="text-sm text-slate-600 mb-4">Raw data export for analysis and record keeping</p>
          <Button
            onClick={() => canExport && exportCsvMutation.mutate(currentReport!.id)}
            disabled={!canExport || exportCsvMutation.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">Send Now</h3>
          <p className="text-sm text-slate-600 mb-4">Immediately send current report to management</p>
          <Button
            onClick={() => canExport && sendEmailMutation.mutate(currentReport!.id)}
            disabled={!canExport || sendEmailMutation.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
            data-testid="button-send-immediate"
          >
            <Send className="w-4 h-4 mr-2" />
            Send Report
          </Button>
        </div>
      </div>

      {!canExport && (
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-slate-600">Please select a property and date to export or send reports.</p>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Recent Reports</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {recentReports.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No reports found.</div>
          ) : (
            recentReports.slice(0, 5).map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors" data-testid={`recent-report-${report.id}`}>
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800" data-testid={`text-report-title-${report.id}`}>
                      Daily Report - {report.reportDate}
                    </div>
                    <div className="text-xs text-slate-500">
                      Agent: {report.agentName} • Created: {new Date(report.createdAt!).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportPdfMutation.mutate(report.id)}
                    disabled={exportPdfMutation.isPending}
                    className="text-slate-400 hover:text-blue-600 p-2"
                    title="Download PDF"
                    data-testid={`button-download-${report.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sendEmailMutation.mutate(report.id)}
                    disabled={sendEmailMutation.isPending}
                    className="text-slate-400 hover:text-emerald-600 p-2"
                    title="Resend Email"
                    data-testid={`button-resend-${report.id}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
