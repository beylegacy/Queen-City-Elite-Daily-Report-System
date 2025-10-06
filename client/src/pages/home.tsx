import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertySelector from "@/components/property-selector";
import ShiftReports from "@/components/shift-reports";
import GuestCheckinLog from "@/components/guest-checkin-log";
import PackageAudit from "@/components/package-audit";
import DailyDuties from "@/components/daily-duties";
import ShiftNotes from "@/components/shift-notes";
import ReportsExport from "@/components/reports-export";
import { Clock, Zap } from "lucide-react";
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
        
        {/* Header */}
        <div className="gradient-slate-blue rounded-t-2xl text-white p-6 lg:p-8" data-testid="header">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h1 className="text-2xl lg:text-3xl font-bold">Front Desk Daily Report System</h1>
              </div>
              <p className="text-blue-100 mt-2 text-sm lg:text-base">Queen City Elite LLC</p>
            </div>
            <div className="text-right">
              <div className="bg-blue-500/20 px-4 py-2 rounded-lg">
                <div className="text-sm font-medium" data-testid="current-date">
                  {currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-xs text-blue-200 flex items-center gap-1" data-testid="current-time">
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
                <PackageAudit currentReport={currentReport} />
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
