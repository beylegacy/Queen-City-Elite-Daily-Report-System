import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPackageAuditSchema } from "@shared/schema";
import type { DailyReport, PackageAudit } from "@shared/schema";
import { getCurrentShift } from "@shared/utils";
import { Package, Trash2, AlertCircle, Plus } from "lucide-react";

interface PackageAuditProps {
  currentReport: DailyReport | null;
  propertyId: string | null;
}

const packageFormSchema = insertPackageAuditSchema.extend({
  roomNumber: z.string().min(1, "Room number is required"),
});

const carriers = ["UPS", "FedEx", "USPS", "Amazon", "DHL", "Other"];
const packageTypes = ["Box", "Envelope", "Oversized", "Letter", "Tube", "Other"];
const storageLocations = [
  "Shelf A1", "Shelf A2", "Shelf A3", "Shelf A4",
  "Shelf B1", "Shelf B2", "Shelf B3", "Shelf B4",
  "Bin 1", "Bin 2", "Bin 3", "Bin 4", "Bin 5", "Bin 6",
  "Oversized Area", "Refrigerated", "Secure Storage"
];

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function PackageAudit({ currentReport, propertyId }: PackageAuditProps) {
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [lookupApartment, setLookupApartment] = useState<string>("");
  const { toast } = useToast();

  const { data: allPackages = [], isLoading } = useQuery<PackageAudit[]>({
    queryKey: ['/api/reports', currentReport?.id, 'packages'],
    enabled: !!currentReport?.id,
  });

  // Filter active packages for display
  const activePackages = allPackages.filter(pkg => pkg.status === "active");
  const completedPackages = allPackages.filter(pkg => pkg.status !== "active");

  const form = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      reportId: currentReport?.id || "",
      residentName: "",
      roomNumber: "",
      storageLocation: "",
      carrier: "",
      trackingNumber: "",
      packageType: "",
      receivedTime: getCurrentTime(),
      notes: "",
      shift: getCurrentShift(),
    },
  });

  useEffect(() => {
    if (currentReport?.id) {
      form.setValue("reportId", currentReport.id);
      form.setValue("shift", getCurrentShift());
      form.setValue("receivedTime", getCurrentTime());
    }
  }, [currentReport, form]);

  // Lookup resident by apartment number
  const { data: residentData } = useQuery({
    queryKey: ['/api/residents/lookup', propertyId, lookupApartment],
    enabled: !!propertyId && !!lookupApartment && lookupApartment.length >= 1,
    retry: false,
  });

  // Auto-fill resident name when found
  useEffect(() => {
    if (residentData && typeof residentData === 'object' && 'residentName' in residentData) {
      form.setValue("residentName", residentData.residentName as string);
      toast({
        title: "Resident Found",
        description: `Auto-filled: ${residentData.residentName}`,
      });
    }
  }, [residentData, form, toast]);

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof packageFormSchema>) => {
      const response = await apiRequest("POST", "/api/packages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'packages'] });
      form.reset({
        reportId: currentReport?.id || "",
        residentName: "",
        roomNumber: "",
        storageLocation: "",
        carrier: "",
        trackingNumber: "",
        packageType: "",
        receivedTime: getCurrentTime(),
        notes: "",
        shift: getCurrentShift(),
      });
      setIsAddingPackage(false);
      toast({
        title: "Success",
        description: "Package added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add package",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "picked_up" | "returned_to_sender" }) => {
      const response = await apiRequest("PATCH", `/api/packages/${id}/status`, { status, changedBy: currentReport?.agentName || "Agent" });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'packages'] });
      toast({
        title: "Success",
        description: variables.status === "picked_up" ? "Package marked as picked up" : "Package marked as returned to sender",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update package status",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof packageFormSchema>) => {
    createPackageMutation.mutate(data);
  };

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to manage packages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-amber-orange text-white p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">
          <Package className="inline mr-3" />
          Package Tracking - Resident Directory
        </h2>
        <p className="text-amber-100">Track packages per resident with room location details</p>
      </div>

      {/* Add Package Button / Form */}
      {!isAddingPackage ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <Button
            onClick={() => setIsAddingPackage(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 min-h-[44px] touch-manipulation"
            data-testid="button-add-package"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Package
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Package</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="residentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resident Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} value={field.value || ""} data-testid="input-resident-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="roomNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room / Unit Number * {residentData ? '✓ Resident Found' : ''}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="304" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            setLookupApartment(e.target.value);
                          }}
                          data-testid="input-room-number" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="storageLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-storage-location">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storageLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="receivedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Received Time (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-received-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-carrier">
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {carriers.map((carrier) => (
                            <SelectItem key={carrier} value={carrier}>
                              {carrier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="1Z999AA10123456789" {...field} value={field.value || ""} data-testid="input-tracking-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="packageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Type (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-package-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {packageTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-shift">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1st">1st Shift (7AM - 3PM)</SelectItem>
                          <SelectItem value="2nd">2nd Shift (3PM - 11PM)</SelectItem>
                          <SelectItem value="3rd">3rd Shift (11PM - 7AM)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} value={field.value || ""} data-testid="input-package-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 min-h-[44px] touch-manipulation"
                  disabled={createPackageMutation.isPending}
                  data-testid="button-save-package"
                >
                  {createPackageMutation.isPending ? "Adding..." : "Add Package"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingPackage(false);
                    form.reset();
                  }}
                  className="min-h-[44px] touch-manipulation"
                  data-testid="button-cancel-package"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {/* Package List */}
      {/* Active Packages */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-white">
          <h3 className="font-semibold flex items-center justify-between">
            <span>Active Packages ({activePackages.length})</span>
            <span className="text-sm font-normal text-violet-200">Awaiting Pickup</span>
          </h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-4 text-slate-500">Loading packages...</div>
          ) : activePackages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No active packages. All packages have been picked up or returned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  data-testid={`package-item-${pkg.id}`}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-1 space-y-2 w-full sm:w-auto">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900 text-lg" data-testid={`text-resident-${pkg.id}`}>
                          {pkg.residentName}
                        </h4>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full" data-testid={`text-room-${pkg.id}`}>
                          Room {pkg.roomNumber}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Storage:</span> {pkg.storageLocation}
                        </div>
                        <div>
                          <span className="font-medium">Received:</span> {pkg.receivedTime} ({pkg.shift} Shift)
                        </div>
                        {pkg.carrier && (
                          <div>
                            <span className="font-medium">Carrier:</span> {pkg.carrier}
                          </div>
                        )}
                        {pkg.trackingNumber && (
                          <div>
                            <span className="font-medium">Tracking:</span> {pkg.trackingNumber}
                          </div>
                        )}
                        {pkg.packageType && (
                          <div>
                            <span className="font-medium">Type:</span> {pkg.packageType}
                          </div>
                        )}
                      </div>
                      
                      {pkg.notes && (
                        <div className="text-sm text-slate-600 italic bg-slate-50 p-2 rounded">
                          <span className="font-medium not-italic">Notes:</span> {pkg.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: pkg.id, status: "picked_up" })}
                        disabled={updateStatusMutation.isPending}
                        className="bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700 border-green-300 flex-1 sm:flex-none touch-manipulation min-h-[44px]"
                        data-testid={`button-picked-up-${pkg.id}`}
                      >
                        Picked Up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: pkg.id, status: "returned_to_sender" })}
                        disabled={updateStatusMutation.isPending}
                        className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border-red-300 flex-1 sm:flex-none touch-manipulation min-h-[44px]"
                        data-testid={`button-returned-${pkg.id}`}
                      >
                        Returned
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Package Summary */}
      {allPackages.length > 0 && (
        <div className="gradient-violet-purple text-white p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-4">Package Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" data-testid="text-active-packages">
                {activePackages.length}
              </div>
              <div className="text-violet-200 text-sm">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-picked-up-packages">
                {allPackages.filter(p => p.status === "picked_up").length}
              </div>
              <div className="text-violet-200 text-sm">Picked Up</div>
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-returned-packages">
                {allPackages.filter(p => p.status === "returned_to_sender").length}
              </div>
              <div className="text-violet-200 text-sm">Returned</div>
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-total-packages">
                {allPackages.length}
              </div>
              <div className="text-violet-200 text-sm">Total Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold" data-testid="text-shift-packages">
                {activePackages.filter(p => p.shift === getCurrentShift()).length}
              </div>
              <div className="text-violet-200 text-sm">Current Shift</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
