import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyReport, PackageAudit, InsertPackageAudit } from "@shared/schema";
import { Package, TrendingUp, AlertCircle } from "lucide-react";

interface PackageAuditProps {
  currentReport: DailyReport | null;
}

const packageLocations = [
  { id: "oversized", name: "Oversized", icon: "📏" },
  { id: "shelf1", name: "1st Shelf", icon: "📦" },
  { id: "shelf2", name: "2nd Shelf", icon: "📦" },
  { id: "shelf3", name: "3rd Shelf", icon: "📦" },
  { id: "shelf4", name: "4th Shelf", icon: "📦" },
  { id: "bin1", name: "Bin 1", icon: "🗂️" },
  { id: "bin2", name: "Bin 2", icon: "🗂️" },
  { id: "bin3", name: "Bin 3", icon: "🗂️" },
  { id: "bin4", name: "Bin 4", icon: "🗂️" },
  { id: "bin5", name: "Bin 5", icon: "🗂️" },
  { id: "bin6", name: "Bin 6", icon: "🗂️" },
];

export default function PackageAudit({ currentReport }: PackageAuditProps) {
  const [selectedShift, setSelectedShift] = useState<"1st" | "2nd" | "3rd">("1st");
  const [packageCounts, setPackageCounts] = useState<Record<string, number>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packageAudits = [], isLoading } = useQuery<PackageAudit[]>({
    queryKey: ['/api/reports', currentReport?.id, 'packages'],
    enabled: !!currentReport?.id,
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (auditData: InsertPackageAudit) => {
      const response = await apiRequest("PUT", "/api/packages", auditData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'packages'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update package count.",
        variant: "destructive",
      });
    },
  });

  // Update local state when data changes
  useEffect(() => {
    const counts: Record<string, number> = {};
    packageAudits.forEach(audit => {
      const key = `${audit.location}-${audit.shift}`;
      counts[key] = audit.count || 0;
    });
    setPackageCounts(counts);
  }, [packageAudits]);

  const handlePackageCountChange = (location: string, count: number) => {
    if (!currentReport) return;

    const key = `${location}-${selectedShift}`;
    setPackageCounts({ ...packageCounts, [key]: count });

    updatePackageMutation.mutate({
      reportId: currentReport.id,
      location,
      count,
      shift: selectedShift,
    });
  };

  const getPackageCount = (location: string, shift: string) => {
    const key = `${location}-${shift}`;
    return packageCounts[key] || 0;
  };

  const getTotalPackages = () => {
    return Object.values(packageCounts).reduce((total, count) => total + count, 0);
  };

  const getShiftTotal = (shift: string) => {
    return packageLocations.reduce((total, location) => {
      return total + getPackageCount(location.id, shift);
    }, 0);
  };

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to manage package audits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-amber-orange text-white p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">
          <Package className="inline mr-3" />
          Package Audit & Location Tracking
        </h2>
        <p className="text-amber-100">Track package locations and maintain inventory accuracy</p>
      </div>

      {/* Shift Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Shift to Audit</Label>
        <Select value={selectedShift} onValueChange={(value: "1st" | "2nd" | "3rd") => setSelectedShift(value)}>
          <SelectTrigger className="w-full max-w-xs" data-testid="select-audit-shift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1st">1st Shift (7AM - 3PM)</SelectItem>
            <SelectItem value="2nd">2nd Shift (3PM - 11PM)</SelectItem>
            <SelectItem value="3rd">3rd Shift (11PM - 7AM)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Package Location Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {packageLocations.map((location) => (
          <div
            key={location.id}
            className="bg-white border-2 border-slate-200 rounded-xl p-4 text-center hover:border-amber-400 hover:shadow-lg transition-all"
            data-testid={`package-location-${location.id}`}
          >
            <div className="text-2xl mb-2">{location.icon}</div>
            <h4 className="font-semibold text-slate-800 mb-2 text-sm">{location.name}</h4>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={getPackageCount(location.id, selectedShift)}
              onChange={(e) => handlePackageCountChange(location.id, parseInt(e.target.value) || 0)}
              className="w-full text-center py-2 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold text-amber-600"
              data-testid={`input-package-count-${location.id}`}
            />
            <div className="text-xs text-slate-500 mt-1">Packages</div>
          </div>
        ))}
      </div>

      {/* Package Summary */}
      <div className="gradient-violet-purple text-white p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold" data-testid="text-total-current">
              {getTotalPackages()}
            </div>
            <div className="text-violet-200 text-sm">Total Inventory</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-shift1-total">
              {getShiftTotal("1st")}
            </div>
            <div className="text-violet-200 text-sm">1st Shift Packages</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-shift2-total">
              {getShiftTotal("2nd")}
            </div>
            <div className="text-violet-200 text-sm">2nd Shift Packages</div>
          </div>
          <div>
            <div className="text-2xl font-bold" data-testid="text-shift3-total">
              {getShiftTotal("3rd")}
            </div>
            <div className="text-violet-200 text-sm">3rd Shift Packages</div>
          </div>
        </div>
      </div>

      {/* Package Activity Log */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Package Activity Summary
          </h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4 text-slate-500">Loading package data...</div>
          ) : packageAudits.length === 0 ? (
            <div className="text-center py-4 text-slate-500">No package audits recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {["1st", "2nd", "3rd"].map((shift) => (
                <div key={shift} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">{shift} Shift Total:</span>
                  <span className="text-sm font-bold text-amber-600">{getShiftTotal(shift)} packages</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
