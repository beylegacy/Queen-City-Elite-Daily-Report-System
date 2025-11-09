import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyReport, ShiftNotes, InsertShiftNotes } from "@shared/schema";
import { Edit3, Save, RefreshCw, AlertTriangle, MessageSquare, ArrowRightLeft, AlertCircle } from "lucide-react";

interface ShiftNotesProps {
  currentReport: DailyReport | null;
}

const noteTemplates = {
  incident: `INCIDENT REPORT
Date: ${new Date().toLocaleDateString()}
Time: 
Location: 
Description: 
Action Taken: 
Follow-up Required: `,
  
  communication: `RESIDENT COMMUNICATION
Resident Name/Apt: 
Date: ${new Date().toLocaleDateString()}
Issue/Request: 
Response/Action: 
Resolution Status: `,
  
  handover: `SHIFT HANDOVER
From: [Previous Shift]
To: [Next Shift]
Date: ${new Date().toLocaleDateString()}

Key Items:
• 
• 
• 

Pending Tasks:
• 
• 

Special Notes:
• `
};

export default function ShiftNotes({ currentReport }: ShiftNotesProps) {
  const [selectedShift, setSelectedShift] = useState<"1st" | "2nd" | "3rd">("1st");
  const [noteContent, setNoteContent] = useState("");
  const [agentName, setAgentName] = useState("");
  const [shiftTime, setShiftTime] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shiftNotes = [], isLoading } = useQuery<ShiftNotes[]>({
    queryKey: ['/api/reports', currentReport?.id, 'notes'],
    enabled: !!currentReport?.id,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notesData: InsertShiftNotes) => {
      const response = await apiRequest("PUT", "/api/notes", notesData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports', currentReport?.id, 'notes'] });
      toast({
        title: "Notes Saved",
        description: "Shift notes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save shift notes.",
        variant: "destructive",
      });
    },
  });

  // Load notes for selected shift whenever shiftNotes data or selectedShift changes
  useEffect(() => {
    const currentShiftNotes = shiftNotes.find(note => note.shift === selectedShift);
    setNoteContent(currentShiftNotes?.content || "");
    setAgentName(currentShiftNotes?.agentName || "");
    setShiftTime(currentShiftNotes?.shiftTime || "");
  }, [shiftNotes, selectedShift]);

  const handleShiftChange = (shift: "1st" | "2nd" | "3rd") => {
    setSelectedShift(shift);
  };

  const handleSaveNotes = () => {
    if (!currentReport) {
      toast({
        title: "No Report Selected",
        description: "Please create a daily report first.",
        variant: "destructive",
      });
      return;
    }

    saveNotesMutation.mutate({
      reportId: currentReport.id,
      content: noteContent,
      shift: selectedShift,
      agentName: agentName || undefined,
      shiftTime: shiftTime || undefined,
    });
  };

  const insertTemplate = (templateKey: keyof typeof noteTemplates) => {
    const template = noteTemplates[templateKey];
    setNoteContent(prevContent => 
      prevContent ? `${prevContent}\n\n${template}` : template
    );
  };

  if (!currentReport) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Report Selected</h3>
        <p className="text-slate-600">Please select a property and date to manage shift notes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gradient-yellow-amber text-white p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">
          <Edit3 className="inline mr-3" />
          Shift Notes & Communications
        </h2>
        <p className="text-yellow-100">Document important events, communications, and handover notes</p>
      </div>

      {/* Shift Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Shift for Notes</Label>
        <Select value={selectedShift} onValueChange={handleShiftChange}>
          <SelectTrigger className="w-full max-w-xs" data-testid="select-notes-shift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1st">1st Shift (7AM - 3PM)</SelectItem>
            <SelectItem value="2nd">2nd Shift (3PM - 11PM)</SelectItem>
            <SelectItem value="3rd">3rd Shift (11PM - 7AM)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent and Shift Time Information */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Agent Information for {selectedShift} Shift</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Agent Name</Label>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
              className="w-full"
              data-testid={`input-agent-name-${selectedShift}`}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-2">Shift Time</Label>
            <Select value={shiftTime} onValueChange={setShiftTime}>
              <SelectTrigger className="w-full" data-testid={`select-shift-time-${selectedShift}`}>
                <SelectValue placeholder="Select shift time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7:00 am to 3:00 pm">7:00 AM to 3:00 PM</SelectItem>
                <SelectItem value="3:00 pm to 11:00 pm">3:00 PM to 11:00 PM</SelectItem>
                <SelectItem value="11:00 pm to 7:00 am">11:00 PM to 7:00 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Notes Editor */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center space-x-4">
          <h3 className="font-semibold text-slate-800 flex-1">
            {selectedShift} Shift Notes Editor
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              title="Bold formatting (not implemented in basic textarea)"
              data-testid="button-format-bold"
            >
              <i className="fas fa-bold"></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              title="Italic formatting (not implemented in basic textarea)"
              data-testid="button-format-italic"
            >
              <i className="fas fa-italic"></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              title="Bullet list (not implemented in basic textarea)"
              data-testid="button-format-list"
            >
              <i className="fas fa-list-ul"></i>
            </Button>
          </div>
        </div>
        <div className="p-6">
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder={`Enter your ${selectedShift} shift notes here...

Examples:
• Important resident communications
• Maintenance issues reported
• Visitor access changes
• Emergency situations
• Next shift handover items

Use the templates below for structured notes...`}
            data-testid="textarea-shift-notes"
          />
        </div>
      </div>

      {/* Quick Note Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 mb-2">
            <AlertTriangle className="inline w-4 h-4 mr-2" />
            Incident Report
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertTemplate('incident')}
            className="text-sm text-blue-600 hover:text-blue-800 p-0"
            data-testid="button-template-incident"
          >
            Insert Template
          </Button>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-semibold text-green-800 mb-2">
            <MessageSquare className="inline w-4 h-4 mr-2" />
            Resident Communication
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertTemplate('communication')}
            className="text-sm text-green-600 hover:text-green-800 p-0"
            data-testid="button-template-communication"
          >
            Insert Template
          </Button>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-800 mb-2">
            <ArrowRightLeft className="inline w-4 h-4 mr-2" />
            Shift Handover
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertTemplate('handover')}
            className="text-sm text-purple-600 hover:text-purple-800 p-0"
            data-testid="button-template-handover"
          >
            Insert Template
          </Button>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Notes are automatically saved when you switch shifts
        </div>
        <div className="space-x-3">
          <Button
            variant="outline"
            onClick={() => setNoteContent("")}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            data-testid="button-clear-notes"
          >
            Clear Notes
          </Button>
          <Button
            onClick={handleSaveNotes}
            disabled={saveNotesMutation.isPending}
            className="px-6 py-2 gradient-yellow-amber text-white rounded-lg font-semibold transition-colors hover:opacity-90"
            data-testid="button-save-notes"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  );
}
