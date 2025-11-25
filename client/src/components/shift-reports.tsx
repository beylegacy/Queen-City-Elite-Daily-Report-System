import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, Users, CheckCircle, AlertCircle, Package, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyReport, GuestCheckin, ShiftNotes } from "@shared/schema";

interface ShiftReportsProps {
  currentReport: DailyReport | null;
}

export default function ShiftReports({ currentReport }: ShiftReportsProps) {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const { data: guestCheckins = [] } = useQuery<GuestCheckin[]>({
    queryKey: ['/api/reports', currentReport?.id, 'checkins'],
    enabled: !!currentReport?.id,
  });

  const { data: shiftNotes = [] } = useQuery<ShiftNotes[]>({
    queryKey: ['/api/reports', currentReport?.id, 'notes'],
    enabled: !!currentReport?.id,
  });

  const { data: packageCounts1st = 0 } = useQuery<number>({
    queryKey: ['/api/properties', currentReport?.propertyId, 'packages', 'count', '1st', currentReport?.reportDate],
    enabled: !!currentReport?.propertyId && !!currentReport?.reportDate,
    queryFn: async () => {
      const response = await fetch(`/api/properties/${currentReport?.propertyId}/packages/count?shift=1st&date=${currentReport?.reportDate}`);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count;
    }
  });

  const { data: packageCounts2nd = 0 } = useQuery<number>({
    queryKey: ['/api/properties', currentReport?.propertyId, 'packages', 'count', '2nd', currentReport?.reportDate],
    enabled: !!currentReport?.propertyId && !!currentReport?.reportDate,
    queryFn: async () => {
      const response = await fetch(`/api/properties/${currentReport?.propertyId}/packages/count?shift=2nd&date=${currentReport?.reportDate}`);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count;
    }
  });

  const { data: packageCounts3rd = 0 } = useQuery<number>({
    queryKey: ['/api/properties', currentReport?.propertyId, 'packages', 'count', '3rd', currentReport?.reportDate],
    enabled: !!currentReport?.propertyId && !!currentReport?.reportDate,
    queryFn: async () => {
      const response = await fetch(`/api/properties/${currentReport?.propertyId}/packages/count?shift=3rd&date=${currentReport?.reportDate}`);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.count;
    }
  });

  const getShiftData = (shift: string) => {
    const shiftCheckins = guestCheckins.filter(g => g.shift === shift);
    const shiftNote = shiftNotes.find(note => note.shift === shift);
    
    let packageCount = 0;
    if (shift === '1st') packageCount = packageCounts1st;
    else if (shift === '2nd') packageCount = packageCounts2nd;
    else if (shift === '3rd') packageCount = packageCounts3rd;
    
    return {
      checkins: shiftCheckins.length,
      packages: packageCount,
      status: shiftCheckins.length > 0 ? 'Active' : 'Pending',
      agent: shiftNote?.agentName || 'Not assigned',
      shiftTime: shiftNote?.shiftTime || '',
    };
  };

  const shifts = [
    { 
      name: '1st Shift', 
      time: '7AM - 3PM', 
      key: '1st',
      gradient: 'from-blue-50 to-indigo-50 border-blue-200',
      badgeColor: 'bg-blue-500',
      checkinsColor: 'text-blue-600'
    },
    { 
      name: '2nd Shift', 
      time: '3PM - 11PM', 
      key: '2nd',
      gradient: 'from-emerald-50 to-green-50 border-emerald-200',
      badgeColor: 'bg-emerald-500',
      checkinsColor: 'text-emerald-600'
    },
    { 
      name: '3rd Shift', 
      time: '11PM - 7AM', 
      key: '3rd',
      gradient: 'from-violet-50 to-purple-50 border-violet-200',
      badgeColor: 'bg-violet-500',
      checkinsColor: 'text-violet-600'
    },
  ];

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to view shift reports.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {shifts.map((shift) => {
          const shiftData = getShiftData(shift.key);
          
          return (
            <div 
              key={shift.key}
              className={`bg-gradient-to-br ${shift.gradient} border rounded-2xl p-6 hover:shadow-lg transition-all`}
              data-testid={`card-shift-${shift.key}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">{shift.name}</h3>
                <span className={`${shift.badgeColor} text-white px-3 py-1 rounded-full text-xs font-semibold`}>
                  {shift.time}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Status:</span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    shiftData.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {shiftData.status === 'Active' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                    {shiftData.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Agent:</span>
                  <span className="text-sm font-medium text-slate-800" data-testid={`text-agent-${shift.key}`}>
                    {shiftData.agent}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Check-ins:</span>
                  <span className={`text-sm font-bold ${shift.checkinsColor}`} data-testid={`text-checkins-${shift.key}`}>
                    {shiftData.checkins}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    Packages:
                  </span>
                  <span className={`text-sm font-bold text-amber-600`} data-testid={`text-packages-${shift.key}`}>
                    {shiftData.packages}
                  </span>
                </div>
                <Button 
                  onClick={() => setExpandedShift(shift.key)}
                  className={`w-full mt-4 ${shift.badgeColor} hover:opacity-90 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors`}
                  data-testid={`button-view-details-${shift.key}`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Details Modal */}
      <Dialog open={!!expandedShift} onOpenChange={() => setExpandedShift(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {expandedShift && (() => {
            const shift = shifts.find(s => s.key === expandedShift);
            const shiftData = getShiftData(expandedShift);
            const shiftCheckins = guestCheckins.filter(g => g.shift === expandedShift);
            const shiftNote = shiftNotes.find(note => note.shift === expandedShift);
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className={`${shift?.badgeColor} text-white px-3 py-1 rounded-full text-sm`}>
                      {shift?.name}
                    </span>
                    <span className="text-slate-600 text-sm font-normal">{shift?.time}</span>
                  </DialogTitle>
                  <DialogDescription>
                    Detailed information for this shift
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Agent & Status Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Shift Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-600 font-medium mb-1">Agent Name</p>
                          <p className="text-sm font-semibold text-slate-900">{shiftData.agent}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 font-medium mb-1">Status</p>
                          <div className="flex items-center gap-2">
                            {shiftData.status === 'Active' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            <span className={`text-sm font-semibold ${shiftData.status === 'Active' ? 'text-green-600' : 'text-slate-600'}`}>
                              {shiftData.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Guest Check-ins */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Guest Check-ins ({shiftCheckins.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {shiftCheckins.length === 0 ? (
                        <p className="text-sm text-slate-600">No check-ins logged for this shift yet</p>
                      ) : (
                        <div className="space-y-3">
                          {shiftCheckins.map((checkin, idx) => (
                            <div key={idx} className="flex justify-between items-start pb-3 border-b last:border-0">
                              <div>
                                <p className="font-medium text-sm text-slate-900">{checkin.guestName}</p>
                                <p className="text-xs text-slate-600">Apt: {checkin.apartment}</p>
                              </div>
                              <p className="text-xs text-slate-600">{checkin.checkInTime}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Shift Notes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {shiftNote?.content ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{shiftNote.content}</p>
                      ) : (
                        <p className="text-sm text-slate-600">No notes for this shift</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Package Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Packages ({shiftData.packages})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {shiftData.packages > 0 ? (
                        <p className="text-sm text-slate-700">Total packages received: {shiftData.packages}</p>
                      ) : (
                        <p className="text-sm text-slate-600">No packages logged for this shift</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
