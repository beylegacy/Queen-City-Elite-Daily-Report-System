import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, Users, CheckCircle, AlertCircle } from "lucide-react";
import type { DailyReport, GuestCheckin, ShiftNotes } from "@shared/schema";

interface ShiftReportsProps {
  currentReport: DailyReport | null;
}

export default function ShiftReports({ currentReport }: ShiftReportsProps) {
  const { data: guestCheckins = [] } = useQuery<GuestCheckin[]>({
    queryKey: ['/api/reports', currentReport?.id, 'checkins'],
    enabled: !!currentReport?.id,
  });

  const { data: shiftNotes = [] } = useQuery<ShiftNotes[]>({
    queryKey: ['/api/reports', currentReport?.id, 'notes'],
    enabled: !!currentReport?.id,
  });

  const getShiftData = (shift: string) => {
    const shiftCheckins = guestCheckins.filter(g => g.shift === shift);
    const shiftNote = shiftNotes.find(note => note.shift === shift);
    
    return {
      checkins: shiftCheckins.length,
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
                <Button 
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
    </div>
  );
}
