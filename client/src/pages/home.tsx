import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertySelector from "@/components/property-selector";
import ShiftReports from "@/components/shift-reports";
import GuestCheckinLog from "@/components/guest-checkin-log";
import PackageAudit from "@/components/package-audit";
import DailyDuties from "@/components/daily-duties";
import ShiftNotes from "@/components/shift-notes";
import ReportsExport from "@/components/reports-export";
import { Clock, Zap, LogIn, Megaphone } from "lucide-react";
import type { Property, DailyReport } from "@shared/schema";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [agentName, setAgentName] = useState<string>("");
  const [shiftTime, setShiftTime] = useState<string>("");
  const [currentReport, setCurrentReport] = useState<DailyReport | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Get or create current report when property and date change
  const { data: report, refetch: refetchReport } = useQuery({
    queryKey: ['/api/reports/by-date', reportDate, selectedProperty],
    enabled: !!selectedProperty && !!reportDate,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/announcements/unread-count'],
  });

  useEffect(() => {
    if (report && typeof report === 'object' && 'id' in report && 'agentName' in report) {
      setCurrentReport(report as DailyReport);
      setAgentName((report as DailyReport).agentName || "");
      setShiftTime((report as DailyReport).shiftTime || "");
    } else {
      setCurrentReport(null);
    }
  }, [report]);

  return (
    <div className="min-h-screen p-4 lg:p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        
        {/* Enhanced Header with Gradient and Animations */}
        <div className="gradient-slate-blue rounded-t-2xl text-white p-6 lg:p-8 shadow-xl" data-testid="header">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="status-indicator"></span>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Front Desk Daily Report System</h1>
              </div>
              <p className="text-blue-100 text-sm lg:text-base font-medium">
                Multi-Property Operations Management  
                <span className="time-badge ml-3">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/announcements">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 min-h-[44px] touch-manipulation transition-all hover:scale-105 relative"
                  data-testid="link-announcements"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Company News
                  {unreadCountData && unreadCountData.count > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse"
                      data-testid="badge-unread-count"
                    >
                      {unreadCountData.count > 9 ? '9+' : unreadCountData.count}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/login">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 min-h-[44px] touch-manipulation transition-all hover:scale-105"
                  data-testid="button-manager-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Manager Login
                </Button>
              </Link>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <div className="text-sm font-semibold" data-testid="current-date">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric'
                  })}
                </div>
                <div className="text-xs text-blue-100 flex items-center gap-1" data-testid="current-time">
                  <Clock className="w-3 h-3" />
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-b-2xl shadow-xl">
          
          {/* Property Selector */}
          <PropertySelector
            properties={properties || []}
            selectedProperty={selectedProperty}
            onPropertyChange={setSelectedProperty}
            reportDate={reportDate}
            onDateChange={setReportDate}
            agentName={agentName}
            onAgentNameChange={setAgentName}
            shiftTime={shiftTime}
            onShiftTimeChange={setShiftTime}
            currentReport={currentReport}
            onReportCreated={(report) => {
              setCurrentReport(report);
              refetchReport();
            }}
          />

          {/* Tab Navigation */}
          <Tabs defaultValue="shift-reports" className="w-full">
            <TabsList className="flex flex-wrap border-b border-slate-200 bg-slate-50 rounded-none h-auto p-0">
              <TabsTrigger 
                value="shift-reports" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-shift-reports"
              >
                <Zap className="w-4 h-4 mr-2" />
                Shift Reports
              </TabsTrigger>
              <TabsTrigger 
                value="guest-log" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-guest-log"
              >
                <i className="fas fa-users mr-2"></i>
                Guest Check-in Log
              </TabsTrigger>
              <TabsTrigger 
                value="package-audit" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-package-audit"
              >
                <i className="fas fa-box mr-2"></i>
                Package Audit
              </TabsTrigger>
              <TabsTrigger 
                value="daily-duties" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-daily-duties"
              >
                <i className="fas fa-tasks mr-2"></i>
                Daily Duties
              </TabsTrigger>
              <TabsTrigger 
                value="notes" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-notes"
              >
                <i className="fas fa-sticky-note mr-2"></i>
                Shift Notes
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="px-6 py-4 text-sm font-semibold data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none"
                data-testid="tab-reports"
              >
                <i className="fas fa-file-export mr-2"></i>
                Reports & Export
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              
              <TabsContent value="shift-reports" className="mt-0">
                <ShiftReports currentReport={currentReport} />
              </TabsContent>

              <TabsContent value="guest-log" className="mt-0">
                <GuestCheckinLog currentReport={currentReport} />
              </TabsContent>

              <TabsContent value="package-audit" className="mt-0">
                <PackageAudit propertyId={selectedProperty} propertyName={properties?.find(p => p.id === selectedProperty)?.name || null} />
              </TabsContent>

              <TabsContent value="daily-duties" className="mt-0">
                <DailyDuties currentReport={currentReport} />
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <ShiftNotes currentReport={currentReport} />
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <ReportsExport currentReport={currentReport} />
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
