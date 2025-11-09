import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPackageSchema } from "@shared/schema";
import type { Package, Resident } from "@shared/schema";
import { getCurrentShift } from "@shared/utils";
import { Package as PackageIcon, Plus, ChevronDown, ChevronUp, AlertTriangle, Search, X, CheckCircle, XCircle, Eye, Undo, Truck, Building } from "lucide-react";

interface PackageAuditProps {
  propertyId: string | null;
  propertyName: string | null;
}

const packageFormSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
  trackingNumber: z.string().optional(),
  carrier: z.enum(["UPS", "FedEx", "USPS", "Amazon", "Other"]).optional(),
  packageSize: z.enum(["Small", "Medium", "Large", "Oversized"]).optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "picked_up", "returned_to_sender"]).default("pending"),
  keepExtended: z.boolean().default(false),
  pickedUpDate: z.string().optional().nullable(),
  pickedUpByAgent: z.string().optional().nullable(),
  returnedDate: z.string().optional().nullable(),
  returnedByAgent: z.string().optional().nullable(),
});

const carriers = ["UPS", "FedEx", "USPS", "Amazon", "Other"];
const packageSizes = ["Small", "Medium", "Large", "Oversized"];
const storageLocations = [
  "Shelf 1", "Shelf 2", "Shelf 3", "Shelf 4",
  "Bin 1", "Bin 2", "Bin 3", "Bin 4", "Bin 5", "Bin 6",
  "Oversized Area", "Other"
];

type FilterStatus = "all" | "pending" | "picked_up" | "returned_to_sender";
type SortBy = "receivedDate_newest" | "receivedDate_oldest" | "apartmentNumber" | "daysOld";

export default function PackageAudit({ propertyId, propertyName }: PackageAuditProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("receivedDate_newest");
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [actionAgentName, setActionAgentName] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const { toast } = useToast();

  const { data: packages = [], isLoading } = useQuery<Package[]>({
    queryKey: ['/api/properties', propertyId, 'packages'],
    enabled: !!propertyId,
  });

  const { data: alerts = [] } = useQuery<Package[]>({
    queryKey: ['/api/properties', propertyId, 'packages', 'alerts'],
    enabled: !!propertyId,
  });

  const { data: residents = [] } = useQuery<Resident[]>({
    queryKey: ['/api/residents', propertyId],
    enabled: !!propertyId,
  });

  const { data: agentAssignments = [] } = useQuery<Array<{shift: string; agentName: string}>>({
    queryKey: ['/api/agent-shifts', propertyId],
    enabled: !!propertyId,
  });

  const form = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      recipientName: "",
      apartmentNumber: "",
      status: "pending",
      keepExtended: false,
    },
  });

  const getCurrentAgentName = () => {
    const currentShift = getCurrentShift();
    const shiftTimeMap: Record<string, string> = {
      "1st": "7:00 am to 3:00 pm",
      "2nd": "3:00 pm to 11:00 pm",
      "3rd": "11:00 pm to 7:00 am",
    };
    const shiftTime = shiftTimeMap[currentShift];
    const assignment = agentAssignments.find((a: any) => a.shift === shiftTime);
    return assignment?.agentName || "";
  };

  const createPackageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof packageFormSchema>) => {
      const response = await apiRequest("POST", `/api/properties/${propertyId}/packages`, {
        ...data,
        receivedDate: new Date().toISOString(),
        receivedByAgent: getCurrentAgentName(),
        receivedShift: getCurrentShift(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'packages', 'alerts'] });
      form.reset();
      setIsFormOpen(false);
      toast({
        title: "Package Added",
        description: "Package has been successfully logged.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add package.",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/packages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'packages', 'alerts'] });
      toast({
        title: "Package Updated",
        description: "Package has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update package.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof packageFormSchema>) => {
    createPackageMutation.mutate(data);
  };

  const handleMarkPickedUp = () => {
    if (!selectedPackage) return;
    updatePackageMutation.mutate({
      id: selectedPackage.id,
      data: {
        status: "picked_up",
        pickedUpDate: new Date().toISOString(),
        pickedUpByAgent: actionAgentName || getCurrentAgentName(),
      },
    });
    setPickupDialogOpen(false);
    setSelectedPackage(null);
    setActionAgentName("");
  };

  const handleReturnToSender = () => {
    if (!selectedPackage) return;
    updatePackageMutation.mutate({
      id: selectedPackage.id,
      data: {
        status: "returned_to_sender",
        returnedDate: new Date().toISOString(),
        returnedByAgent: actionAgentName || getCurrentAgentName(),
        notes: returnNotes || selectedPackage.notes,
      },
    });
    setReturnDialogOpen(false);
    setSelectedPackage(null);
    setActionAgentName("");
    setReturnNotes("");
  };

  const handleKeepExtendedToggle = (pkg: Package) => {
    updatePackageMutation.mutate({
      id: pkg.id,
      data: {
        keepExtended: !pkg.keepExtended,
      },
    });
  };

  const handleUndo = (pkg: Package) => {
    updatePackageMutation.mutate({
      id: pkg.id,
      data: {
        status: "pending",
        pickedUpDate: null,
        pickedUpByAgent: null,
        returnedDate: null,
        returnedByAgent: null,
      },
    });
  };

  const getDaysOld = (receivedDate: string | Date) => {
    return differenceInDays(new Date(), new Date(receivedDate));
  };

  const getDaysOldBadgeColor = (days: number) => {
    if (days <= 4) return "bg-green-100 text-green-800 border-green-300";
    if (days <= 7) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "picked_up":
        return "bg-green-100 text-green-800 border-green-300";
      case "returned_to_sender":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const filteredAndSortedPackages = useMemo(() => {
    let filtered = [...packages];

    if (showAlertsOnly) {
      filtered = filtered.filter(pkg => 
        pkg.status === "pending" && 
        !pkg.keepExtended && 
        getDaysOld(pkg.receivedDate) >= 5
      );
    } else {
      if (filterStatus !== "all") {
        if (filterStatus === "picked_up") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          filtered = filtered.filter(pkg => 
            pkg.status === "picked_up" && 
            pkg.pickedUpDate && 
            new Date(pkg.pickedUpDate) >= sevenDaysAgo
          );
        } else {
          filtered = filtered.filter(pkg => pkg.status === filterStatus);
        }
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(pkg =>
          pkg.recipientName.toLowerCase().includes(query) ||
          pkg.apartmentNumber.toLowerCase().includes(query) ||
          (pkg.trackingNumber && pkg.trackingNumber.toLowerCase().includes(query))
        );
      }
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "receivedDate_newest":
          return new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime();
        case "receivedDate_oldest":
          return new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime();
        case "apartmentNumber":
          return a.apartmentNumber.localeCompare(b.apartmentNumber);
        case "daysOld":
          return getDaysOld(b.receivedDate) - getDaysOld(a.receivedDate);
        default:
          return 0;
      }
    });

    return filtered;
  }, [packages, filterStatus, searchQuery, sortBy, showAlertsOnly]);

  const alertCount = alerts.filter(pkg => !pkg.keepExtended && getDaysOld(pkg.receivedDate) >= 5).length;

  const clearFilters = () => {
    setFilterStatus("all");
    setSearchQuery("");
    setSortBy("receivedDate_newest");
    setShowAlertsOnly(false);
  };

  if (!propertyId) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Property Selected</h3>
        <p className="text-slate-600">Please select a property to manage packages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-amber-orange text-white p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">
          <PackageIcon className="inline mr-3" />
          Package Tracking System
        </h2>
        <p className="text-amber-100">{propertyName || "Property"} - Comprehensive Package Management</p>
      </div>

      {alertCount > 0 && !showAlertsOnly && (
        <Alert className="border-yellow-300 bg-yellow-50" data-testid="alert-packages-old">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 font-medium">
              ⚠️ {alertCount} package{alertCount !== 1 ? 's' : ''} need attention (5+ days old)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlertsOnly(true)}
              className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              data-testid="button-view-alerts"
            >
              View Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showAlertsOnly && (
        <Alert className="border-blue-300 bg-blue-50">
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              Showing packages that need attention (5+ days old)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlertsOnly(false)}
              className="border-blue-600 text-blue-700 hover:bg-blue-100"
              data-testid="button-clear-alert-filter"
            >
              Show All Packages
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <CardContent className="p-4">
            <CollapsibleTrigger asChild>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                data-testid="button-toggle-form"
              >
                {isFormOpen ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Package Entry Form
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Package
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              {...field}
                              list="recipient-suggestions"
                              data-testid="input-recipient-name"
                            />
                          </FormControl>
                          <datalist id="recipient-suggestions">
                            {residents.map((resident) => (
                              <option key={resident.id} value={resident.residentName} />
                            ))}
                          </datalist>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apartmentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apartment Number *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="304"
                              {...field}
                              list="apartment-suggestions"
                              onChange={(e) => {
                                field.onChange(e);
                                const resident = residents.find(r => r.apartmentNumber === e.target.value);
                                if (resident) {
                                  form.setValue("recipientName", resident.residentName);
                                }
                              }}
                              data-testid="input-apartment-number"
                            />
                          </FormControl>
                          <datalist id="apartment-suggestions">
                            {residents.map((resident) => (
                              <option key={resident.id} value={resident.apartmentNumber} />
                            ))}
                          </datalist>
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
                      name="carrier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carrier</FormLabel>
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
                      name="packageSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-package-size">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {packageSizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
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
                      name="storageLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Location</FormLabel>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes..."
                            {...field}
                            value={field.value || ""}
                            rows={3}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setIsFormOpen(false);
                      }}
                      data-testid="button-cancel-form"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPackageMutation.isPending}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      data-testid="button-submit-package"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {createPackageMutation.isPending ? "Adding..." : "Add Package"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Status Filter</Label>
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packages</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="picked_up">Picked Up (Last 7 Days)</SelectItem>
                  <SelectItem value="returned_to_sender">Returned to Sender</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Recipient, apt, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Sort By</Label>
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivedDate_newest">Received Date (Newest)</SelectItem>
                  <SelectItem value="receivedDate_oldest">Received Date (Oldest)</SelectItem>
                  <SelectItem value="apartmentNumber">Apartment Number</SelectItem>
                  <SelectItem value="daysOld">Days Old</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full"
              data-testid="button-clear-filters"
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading packages...</div>
          ) : filteredAndSortedPackages.length === 0 ? (
            <div className="p-8 text-center">
              <PackageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Packages Found</h3>
              <p className="text-slate-500">
                {searchQuery || filterStatus !== "all" ? "Try adjusting your filters or search query." : "Start by adding a new package using the form above."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredAndSortedPackages.map((pkg) => {
                const daysOld = getDaysOld(pkg.receivedDate);
                const isPending = pkg.status === "pending";

                return (
                  <div
                    key={pkg.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                    data-testid={`package-${pkg.id}`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-2">
                        <div className="font-semibold text-slate-800">{pkg.recipientName}</div>
                        <div className="text-sm text-slate-500">Recipient</div>
                      </div>

                      <div className="md:col-span-1">
                        <div className="font-semibold text-slate-800">
                          <Building className="inline h-4 w-4 mr-1 text-slate-400" />
                          {pkg.apartmentNumber}
                        </div>
                        <div className="text-sm text-slate-500">Apt #</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-sm font-mono text-slate-700">
                          {pkg.trackingNumber 
                            ? pkg.trackingNumber.length > 15 
                              ? `${pkg.trackingNumber.substring(0, 15)}...`
                              : pkg.trackingNumber
                            : "—"}
                        </div>
                        <div className="text-sm text-slate-500">Tracking</div>
                      </div>

                      <div className="md:col-span-1">
                        <div className="flex items-center text-sm">
                          <Truck className="h-4 w-4 mr-1 text-slate-400" />
                          {pkg.carrier || "—"}
                        </div>
                        <div className="text-sm text-slate-500">Carrier</div>
                      </div>

                      <div className="md:col-span-1">
                        <div className="text-sm text-slate-700">{pkg.packageSize || "—"}</div>
                        <div className="text-sm text-slate-500">Size</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-sm text-slate-700">{pkg.storageLocation || "—"}</div>
                        <div className="text-sm text-slate-500">Location</div>
                      </div>

                      <div className="md:col-span-1">
                        <div className="text-sm text-slate-700">
                          {format(new Date(pkg.receivedDate), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-slate-500">Received</div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`${getDaysOldBadgeColor(daysOld)} border`}>
                            {daysOld} {daysOld === 1 ? "day" : "days"}
                          </Badge>
                          <Badge className={`${getStatusBadgeColor(pkg.status)} border`}>
                            {pkg.status === "pending" ? "Pending" : pkg.status === "picked_up" ? "Picked Up" : "Returned"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setActionAgentName(getCurrentAgentName());
                                  setPickupDialogOpen(true);
                                }}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                data-testid={`button-mark-picked-up-${pkg.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Picked Up
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setActionAgentName(getCurrentAgentName());
                                  setReturnDialogOpen(true);
                                }}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                data-testid={`button-return-sender-${pkg.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Return
                              </Button>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={pkg.keepExtended || false}
                                  onCheckedChange={() => handleKeepExtendedToggle(pkg)}
                                  data-testid={`checkbox-keep-extended-${pkg.id}`}
                                />
                                <Label className="text-xs text-slate-600 cursor-pointer">Keep Extended</Label>
                              </div>
                            </>
                          )}
                          {!isPending && (
                            <>
                              <div className="text-xs text-slate-600">
                                {pkg.status === "picked_up" && pkg.pickedUpDate && (
                                  <div>
                                    Picked up: {format(new Date(pkg.pickedUpDate), "MMM dd, yyyy")}
                                    {pkg.pickedUpByAgent && <div>By: {pkg.pickedUpByAgent}</div>}
                                  </div>
                                )}
                                {pkg.status === "returned_to_sender" && pkg.returnedDate && (
                                  <div>
                                    Returned: {format(new Date(pkg.returnedDate), "MMM dd, yyyy")}
                                    {pkg.returnedByAgent && <div>By: {pkg.returnedByAgent}</div>}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUndo(pkg)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                data-testid={`button-undo-${pkg.id}`}
                              >
                                <Undo className="h-4 w-4 mr-1" />
                                Undo
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setDetailsDialogOpen(true);
                            }}
                            data-testid={`button-view-details-${pkg.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
        <DialogContent data-testid="dialog-mark-picked-up">
          <DialogHeader>
            <DialogTitle>Mark Package as Picked Up?</DialogTitle>
            <DialogDescription>
              Confirm that this package has been picked up by the resident.
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold text-slate-700">Recipient:</div>
                <div className="text-slate-600">{selectedPackage.recipientName}</div>
                <div className="font-semibold text-slate-700">Apartment:</div>
                <div className="text-slate-600">{selectedPackage.apartmentNumber}</div>
                <div className="font-semibold text-slate-700">Tracking:</div>
                <div className="text-slate-600">{selectedPackage.trackingNumber || "—"}</div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">Agent Name</Label>
                <Input
                  value={actionAgentName}
                  onChange={(e) => setActionAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  data-testid="input-pickup-agent-name"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupDialogOpen(false)} data-testid="button-cancel-pickup">
              Cancel
            </Button>
            <Button
              onClick={handleMarkPickedUp}
              disabled={updatePackageMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-confirm-pickup"
            >
              Confirm Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent data-testid="dialog-return-sender">
          <DialogHeader>
            <DialogTitle>Return Package to Sender?</DialogTitle>
            <DialogDescription>
              Confirm that this package is being returned to the sender.
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold text-slate-700">Recipient:</div>
                <div className="text-slate-600">{selectedPackage.recipientName}</div>
                <div className="font-semibold text-slate-700">Apartment:</div>
                <div className="text-slate-600">{selectedPackage.apartmentNumber}</div>
                <div className="font-semibold text-slate-700">Tracking:</div>
                <div className="text-slate-600">{selectedPackage.trackingNumber || "—"}</div>
                <div className="font-semibold text-slate-700">Carrier:</div>
                <div className="text-slate-600">{selectedPackage.carrier || "—"}</div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">Agent Name</Label>
                <Input
                  value={actionAgentName}
                  onChange={(e) => setActionAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  data-testid="input-return-agent-name"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-2 block">Return Notes (Optional)</Label>
                <Textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Add any notes about the return..."
                  rows={3}
                  data-testid="input-return-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)} data-testid="button-cancel-return">
              Cancel
            </Button>
            <Button
              onClick={handleReturnToSender}
              disabled={updatePackageMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-return"
            >
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent data-testid="dialog-package-details">
          <DialogHeader>
            <DialogTitle>Package Details</DialogTitle>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="font-semibold text-slate-700">Recipient:</div>
                <div className="text-slate-600">{selectedPackage.recipientName}</div>
                
                <div className="font-semibold text-slate-700">Apartment:</div>
                <div className="text-slate-600">{selectedPackage.apartmentNumber}</div>
                
                <div className="font-semibold text-slate-700">Tracking Number:</div>
                <div className="text-slate-600 break-all">{selectedPackage.trackingNumber || "—"}</div>
                
                <div className="font-semibold text-slate-700">Carrier:</div>
                <div className="text-slate-600">{selectedPackage.carrier || "—"}</div>
                
                <div className="font-semibold text-slate-700">Package Size:</div>
                <div className="text-slate-600">{selectedPackage.packageSize || "—"}</div>
                
                <div className="font-semibold text-slate-700">Storage Location:</div>
                <div className="text-slate-600">{selectedPackage.storageLocation || "—"}</div>
                
                <div className="font-semibold text-slate-700">Received Date:</div>
                <div className="text-slate-600">{format(new Date(selectedPackage.receivedDate), "MMM dd, yyyy 'at' h:mm a")}</div>
                
                <div className="font-semibold text-slate-700">Received By:</div>
                <div className="text-slate-600">{selectedPackage.receivedByAgent}</div>
                
                <div className="font-semibold text-slate-700">Received Shift:</div>
                <div className="text-slate-600">{selectedPackage.receivedShift}</div>
                
                <div className="font-semibold text-slate-700">Days Old:</div>
                <div className="text-slate-600">{getDaysOld(selectedPackage.receivedDate)} days</div>
                
                <div className="font-semibold text-slate-700">Status:</div>
                <div className="text-slate-600 capitalize">{selectedPackage.status.replace(/_/g, " ")}</div>
                
                {selectedPackage.pickedUpDate && (
                  <>
                    <div className="font-semibold text-slate-700">Picked Up:</div>
                    <div className="text-slate-600">{format(new Date(selectedPackage.pickedUpDate), "MMM dd, yyyy 'at' h:mm a")}</div>
                    
                    {selectedPackage.pickedUpByAgent && (
                      <>
                        <div className="font-semibold text-slate-700">Picked Up By:</div>
                        <div className="text-slate-600">{selectedPackage.pickedUpByAgent}</div>
                      </>
                    )}
                  </>
                )}
                
                {selectedPackage.returnedDate && (
                  <>
                    <div className="font-semibold text-slate-700">Returned:</div>
                    <div className="text-slate-600">{format(new Date(selectedPackage.returnedDate), "MMM dd, yyyy 'at' h:mm a")}</div>
                    
                    {selectedPackage.returnedByAgent && (
                      <>
                        <div className="font-semibold text-slate-700">Returned By:</div>
                        <div className="text-slate-600">{selectedPackage.returnedByAgent}</div>
                      </>
                    )}
                  </>
                )}
                
                {selectedPackage.notes && (
                  <>
                    <div className="font-semibold text-slate-700 col-span-2">Notes:</div>
                    <div className="text-slate-600 col-span-2 bg-slate-50 p-3 rounded">{selectedPackage.notes}</div>
                  </>
                )}
                
                <div className="font-semibold text-slate-700">Keep Extended:</div>
                <div className="text-slate-600">{selectedPackage.keepExtended ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)} data-testid="button-close-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
