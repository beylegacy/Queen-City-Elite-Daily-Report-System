import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property, DailyReport, InsertDailyReport } from "@shared/schema";
import { Building, Calendar, Clock, User } from "lucide-react";

interface PropertySelectorProps {
  properties: Property[];
  selectedProperty: string;
  onPropertyChange: (propertyId: string) => void;
  reportDate: string;
  onDateChange: (date: string) => void;
  agentName: string;
  onAgentNameChange: (name: string) => void;
  shiftTime: string;
  onShiftTimeChange: (time: string) => void;
  currentReport: DailyReport | null;
  onReportCreated: (report: DailyReport) => void;
}

export default function PropertySelector({
  properties,
  selectedProperty,
  onPropertyChange,
  reportDate,
  onDateChange,
  agentName,
  onAgentNameChange,
  shiftTime,
  onShiftTimeChange,
  currentReport,
  onReportCreated,
}: PropertySelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createReportMutation = useMutation({
    mutationFn: async (reportData: InsertDailyReport) => {
      const response = await apiRequest("POST", "/api/reports", reportData);
      return response.json();
    },
    onSuccess: (data) => {
      onReportCreated(data);
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Report Created",
        description: "Daily report has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create daily report.",
        variant: "destructive",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDailyReport> }) => {
      const response = await apiRequest("PUT", `/api/reports/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Report Updated",
        description: "Daily report has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update daily report.",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrUpdateReport = () => {
    if (!selectedProperty || !reportDate || !agentName) {
      toast({
        title: "Missing Information",
        description: "Please fill in property, date, and agent name.",
        variant: "destructive",
      });
      return;
    }

    const reportData = {
      propertyId: selectedProperty,
      reportDate,
      agentName,
      shiftTime,
    };

    if (currentReport) {
      updateReportMutation.mutate({ id: currentReport.id, data: reportData });
    } else {
      createReportMutation.mutate(reportData);
    }
  };

  return (
    <div className="p-6 lg:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <Building className="w-4 h-4 inline mr-2 text-blue-500" />
            Property Location
          </Label>
          <Select value={selectedProperty} onValueChange={onPropertyChange} data-testid="select-property">
            <SelectTrigger className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-2 text-emerald-500" />
            Report Date
          </Label>
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            data-testid="input-report-date"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <User className="w-4 h-4 inline mr-2 text-amber-500" />
            Front Desk Agent
          </Label>
          <Input
            type="text"
            placeholder="Enter agent name"
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            data-testid="input-agent-name"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2 text-violet-500" />
            Shift Time
          </Label>
          <Input
            type="text"
            placeholder="e.g., 3:20pm-11:00pm"
            value={shiftTime}
            onChange={(e) => onShiftTimeChange(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            data-testid="input-shift-time"
          />
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleCreateOrUpdateReport}
          disabled={createReportMutation.isPending || updateReportMutation.isPending}
          className="gradient-slate-blue text-white hover:opacity-90"
          data-testid="button-create-update-report"
        >
          {currentReport ? "Update Report" : "Create Report"}
        </Button>
      </div>
    </div>
  );
}
