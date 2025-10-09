import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property, DailyReport, InsertDailyReport, InsertProperty } from "@shared/schema";
import { Building, Calendar, Clock, User, PlusCircle } from "lucide-react";

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
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyAddress, setNewPropertyAddress] = useState("");

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData: InsertProperty) => {
      const response = await apiRequest("POST", "/api/properties", propertyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      setIsAddPropertyOpen(false);
      setNewPropertyName("");
      setNewPropertyAddress("");
      toast({
        title: "Property Added",
        description: "New property has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add property.",
        variant: "destructive",
      });
    },
  });

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

  const handleAddProperty = () => {
    if (!newPropertyName) {
      toast({
        title: "Missing Information",
        description: "Please enter a property name.",
        variant: "destructive",
      });
      return;
    }

    createPropertyMutation.mutate({
      name: newPropertyName,
      address: newPropertyAddress || null,
      isActive: true,
    });
  };

  const handleCreateOrUpdateReport = () => {
    if (!selectedProperty || !reportDate) {
      toast({
        title: "Missing Information",
        description: "Please select property and date.",
        variant: "destructive",
      });
      return;
    }

    // If report already exists, just use it - don't update agent info
    if (currentReport) {
      toast({
        title: "Report Ready",
        description: `Using existing report. You can now add your shift data.`,
      });
      return;
    }

    // Creating new report - agent name is required
    if (!agentName) {
      toast({
        title: "Missing Information",
        description: "Please enter your name to create the report.",
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

    createReportMutation.mutate(reportData);
  };

  return (
    <div className="p-6 lg:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <Building className="w-4 h-4 inline mr-2 text-blue-500" />
            Property Location
          </Label>
          <div className="flex gap-2">
            <Select value={selectedProperty} onValueChange={onPropertyChange}>
              <SelectTrigger className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" data-testid="select-property">
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
            
            <Dialog open={isAddPropertyOpen} onOpenChange={setIsAddPropertyOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="px-3 border-slate-300 hover:bg-blue-50 hover:border-blue-400"
                  data-testid="button-add-property-dialog"
                >
                  <PlusCircle className="h-5 w-5 text-blue-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Add a new property location to the system. You can track daily reports for this property.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="property-name" className="block text-sm font-semibold text-slate-700 mb-2">
                      Property Name *
                    </Label>
                    <Input
                      id="property-name"
                      placeholder="e.g., Element South Park (North)"
                      value={newPropertyName}
                      onChange={(e) => setNewPropertyName(e.target.value)}
                      data-testid="input-new-property-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="property-address" className="block text-sm font-semibold text-slate-700 mb-2">
                      Property Address (Optional)
                    </Label>
                    <Input
                      id="property-address"
                      placeholder="e.g., 4425 Sharon Rd Charlotte, NC 28211"
                      value={newPropertyAddress}
                      onChange={(e) => setNewPropertyAddress(e.target.value)}
                      data-testid="input-new-property-address"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddPropertyOpen(false);
                      setNewPropertyName("");
                      setNewPropertyAddress("");
                    }}
                    data-testid="button-cancel-add-property"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddProperty}
                    disabled={createPropertyMutation.isPending}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    data-testid="button-save-property"
                  >
                    {createPropertyMutation.isPending ? "Adding..." : "Add Property"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
            Front Desk Agent {currentReport && "(Report Created By)"}
          </Label>
          <Input
            type="text"
            placeholder="Enter agent name"
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            disabled={!!currentReport}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            data-testid="input-agent-name"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-semibold text-slate-700 mb-2">
            <Clock className="w-4 h-4 inline mr-2 text-violet-500" />
            Shift Time {currentReport && "(Original)"}
          </Label>
          <Select 
            value={shiftTime} 
            onValueChange={onShiftTimeChange}
            disabled={!!currentReport}
          >
            <SelectTrigger 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed" 
              data-testid="select-shift-time"
            >
              <SelectValue placeholder="Select shift time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7:00 am to 3:00 pm">7:00 am to 3:00 pm</SelectItem>
              <SelectItem value="3:00 pm to 11:00 pm">3:00 pm to 11:00 pm</SelectItem>
              <SelectItem value="11:00 pm to 7:00 am">11:00 pm to 7:00 am</SelectItem>
              <SelectItem value="7:00 am to 7:00 pm">7:00 am to 7:00 pm</SelectItem>
              <SelectItem value="7:00 pm to 7:00 am">7:00 pm to 7:00 am</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleCreateOrUpdateReport}
          disabled={createReportMutation.isPending}
          className="gradient-slate-blue text-white hover:opacity-90"
          data-testid="button-create-update-report"
        >
          {currentReport ? "Use Existing Report" : "Create Report"}
        </Button>
      </div>
    </div>
  );
}
