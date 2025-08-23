import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyReport, DailyDuty, InsertDailyDuty } from "@shared/schema";
import { ClipboardCheck, AlertCircle } from "lucide-react";

interface DailyDutiesProps {
  currentReport: DailyReport | null;
}

const defaultDuties = [
  "Check and organize mail room",
  "Update resident directory", 
  "Clean and sanitize front desk area",
  "Check amenity areas (pool, gym, common areas)",
  "Review maintenance requests",
  "Process package deliveries",
  "Update security logs",
  "Charge concierge desk phone",
  "Audit lock box at beginning and end of shift",
  "Complete daily facility inspection",
  "Update visitor access logs",
  "Review and respond to resident communications"
];

export default function DailyDuties({ currentReport }: DailyDutiesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: duties = [], isLoading } = useQuery<DailyDuty[]>({
    queryKey: ['/api/reports', currentReport?.id, 'duties'],
    enabled: !!currentReport?.id,
  });

  const createDutyMutation = useMutation({
    mutationFn: async (dutyData: InsertDailyDuty) => {
      const response = await apiRequest("POST", "/api/duties", dutyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'duties'] });
    },
  });

  const updateDutyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDailyDuty> }) => {
      const response = await apiRequest("PUT", `/api/duties/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'duties'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update duty status.",
        variant: "destructive",
      });
    },
  });

  // Initialize default duties when report is created
  useEffect(() => {
    if (currentReport && duties.length === 0 && !isLoading) {
      defaultDuties.forEach(task => {
        createDutyMutation.mutate({
          reportId: currentReport.id,
          task,
          completed: false,
        });
      });
    }
  }, [currentReport, duties.length, isLoading]);

  const handleDutyToggle = (duty: DailyDuty, completed: boolean) => {
    updateDutyMutation.mutate({
      id: duty.id,
      data: { completed },
    });
  };

  const getProgress = () => {
    if (duties.length === 0) return 0;
    const completedCount = duties.filter(d => d.completed).length;
    return Math.round((completedCount / duties.length) * 100);
  };

  const getCompletedCount = () => {
    return duties.filter(d => d.completed).length;
  };

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to manage daily duties.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="gradient-orange-red text-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            <ClipboardCheck className="inline mr-3" />
            Daily Duties Checklist
          </h2>
          <div className="bg-white/20 px-4 py-2 rounded-lg">
            <span className="text-sm font-semibold" data-testid="text-progress">
              {getCompletedCount()}/{duties.length} Complete
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-sm font-bold text-orange-600" data-testid="text-percentage">
            {getProgress()}%
          </span>
        </div>
        <Progress 
          value={getProgress()} 
          className="w-full h-3 bg-slate-200"
          data-testid="progress-bar"
        />
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500">Loading duties...</div>
        ) : duties.length === 0 ? (
          <div className="p-6 text-center text-slate-500">Initializing daily duties...</div>
        ) : (
          duties.map((duty) => (
            <div key={duty.id} className="p-6 hover:bg-slate-50 transition-colors" data-testid={`duty-item-${duty.id}`}>
              <Label className="flex items-center space-x-4 cursor-pointer">
                <Checkbox
                  checked={duty.completed || false}
                  onCheckedChange={(checked) => handleDutyToggle(duty, !!checked)}
                  className="w-5 h-5 text-orange-500 border-2 border-slate-300 rounded focus:ring-orange-500 focus:ring-2"
                  data-testid={`checkbox-duty-${duty.id}`}
                />
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${duty.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {duty.task}
                  </div>
                </div>
                <span className={`text-xs font-medium ${
                  duty.completed 
                    ? 'text-green-600' 
                    : 'text-slate-400'
                }`}>
                  {duty.completed ? '✓ Completed' : 'Pending'}
                </span>
              </Label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
