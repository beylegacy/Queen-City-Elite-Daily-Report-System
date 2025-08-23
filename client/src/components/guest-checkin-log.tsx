import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyReport, GuestCheckin, InsertGuestCheckin } from "@shared/schema";
import { UserPlus, Trash2, Users, AlertCircle } from "lucide-react";

interface GuestCheckinLogProps {
  currentReport: DailyReport | null;
}

export default function GuestCheckinLog({ currentReport }: GuestCheckinLogProps) {
  const [newGuest, setNewGuest] = useState({
    guestName: "",
    apartment: "",
    checkInTime: new Date().toTimeString().slice(0, 5), // HH:MM format
    notes: "",
    shift: "1st" as "1st" | "2nd" | "3rd",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guestCheckins = [], isLoading } = useQuery<GuestCheckin[]>({
    queryKey: ['/api/reports', currentReport?.id, 'checkins'],
    enabled: !!currentReport?.id,
  });

  const addGuestMutation = useMutation({
    mutationFn: async (guestData: InsertGuestCheckin) => {
      const response = await apiRequest("POST", "/api/checkins", guestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'checkins'] });
      setNewGuest({
        guestName: "",
        apartment: "",
        checkInTime: new Date().toTimeString().slice(0, 5),
        notes: "",
        shift: "1st",
      });
      toast({
        title: "Guest Added",
        description: "Guest check-in has been logged successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add guest check-in.",
        variant: "destructive",
      });
    },
  });

  const removeGuestMutation = useMutation({
    mutationFn: async (guestId: string) => {
      await apiRequest("DELETE", `/api/checkins/${guestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'checkins'] });
      toast({
        title: "Guest Removed",
        description: "Guest check-in has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove guest check-in.",
        variant: "destructive",
      });
    },
  });

  const handleAddGuest = () => {
    if (!currentReport) {
      toast({
        title: "No Report Selected",
        description: "Please create a daily report first.",
        variant: "destructive",
      });
      return;
    }

    if (!newGuest.guestName || !newGuest.apartment) {
      toast({
        title: "Missing Information",
        description: "Please fill in guest name and apartment number.",
        variant: "destructive",
      });
      return;
    }

    addGuestMutation.mutate({
      reportId: currentReport.id,
      guestName: newGuest.guestName,
      apartment: newGuest.apartment,
      checkInTime: newGuest.checkInTime,
      notes: newGuest.notes,
      shift: newGuest.shift,
    });
  };

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to manage guest check-ins.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="gradient-emerald-green text-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            <Users className="inline mr-3" />
            Guest Check-in Log
          </h2>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold" data-testid="text-guest-count">
            {guestCheckins.length} Total Check-ins
          </span>
        </div>
      </div>
      
      {/* Guest Entry Form */}
      <div className="p-6 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Guest Name</Label>
            <Input
              type="text"
              placeholder="Full name"
              value={newGuest.guestName}
              onChange={(e) => setNewGuest({ ...newGuest, guestName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              data-testid="input-guest-name"
            />
          </div>
          <div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Apartment #</Label>
            <Input
              type="text"
              placeholder="e.g., 2B, 105"
              value={newGuest.apartment}
              onChange={(e) => setNewGuest({ ...newGuest, apartment: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              data-testid="input-apartment"
            />
          </div>
          <div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Check-in Time</Label>
            <Input
              type="time"
              value={newGuest.checkInTime}
              onChange={(e) => setNewGuest({ ...newGuest, checkInTime: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              data-testid="input-checkin-time"
            />
          </div>
          <div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Shift</Label>
            <Select value={newGuest.shift} onValueChange={(value: "1st" | "2nd" | "3rd") => setNewGuest({ ...newGuest, shift: value })}>
              <SelectTrigger className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" data-testid="select-shift">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1st">1st Shift</SelectItem>
                <SelectItem value="2nd">2nd Shift</SelectItem>
                <SelectItem value="3rd">3rd Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-sm font-semibold text-slate-700 mb-2">Notes</Label>
            <Input
              type="text"
              placeholder="Optional notes"
              value={newGuest.notes}
              onChange={(e) => setNewGuest({ ...newGuest, notes: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              data-testid="input-notes"
            />
          </div>
          <div>
            <Button
              onClick={handleAddGuest}
              disabled={addGuestMutation.isPending}
              className="w-full gradient-emerald-green text-white py-3 px-6 rounded-lg font-semibold transition-colors hover:opacity-90"
              data-testid="button-add-guest"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Guest
            </Button>
          </div>
        </div>
      </div>

      {/* Guest List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-slate-500">Loading guest check-ins...</div>
        ) : guestCheckins.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No guest check-ins recorded yet.</div>
        ) : (
          guestCheckins.map((guest) => (
            <div key={guest.id} className="p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`guest-entry-${guest.id}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-800" data-testid={`text-guest-name-${guest.id}`}>
                      {guest.guestName}
                    </div>
                    <div className="text-xs text-slate-500">Guest Name</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-600" data-testid={`text-apartment-${guest.id}`}>
                      {guest.apartment}
                    </div>
                    <div className="text-xs text-slate-500">Apartment</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-700" data-testid={`text-time-${guest.id}`}>
                      {guest.checkInTime}
                    </div>
                    <div className="text-xs text-slate-500">Check-in Time</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-violet-600" data-testid={`text-shift-${guest.id}`}>
                      {guest.shift}
                    </div>
                    <div className="text-xs text-slate-500">Shift</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600" data-testid={`text-notes-${guest.id}`}>
                      {guest.notes || "-"}
                    </div>
                    <div className="text-xs text-slate-500">Notes</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGuestMutation.mutate(guest.id)}
                  disabled={removeGuestMutation.isPending}
                  className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                  data-testid={`button-remove-guest-${guest.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
