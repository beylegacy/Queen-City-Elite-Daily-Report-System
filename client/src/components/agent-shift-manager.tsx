import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Pencil, Save, X } from "lucide-react";
import type { AgentShiftAssignment } from "@shared/schema";

interface AgentShiftManagerProps {
  propertyId: string;
  propertyName: string;
}

const SHIFTS = [
  "7:00 am to 3:00 pm",
  "3:00 pm to 11:00 pm",
  "11:00 pm to 7:00 am",
  "7:00 am to 7:00 pm",
  "7:00 pm to 7:00 am"
];

export function AgentShiftManager({ propertyId, propertyName }: AgentShiftManagerProps) {
  const { toast } = useToast();
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");

  // Fetch agent shift assignments for the property
  const { data: assignments = [], isLoading } = useQuery<AgentShiftAssignment[]>({
    queryKey: ['/api/agent-shifts', propertyId],
    enabled: !!propertyId,
  });

  // Create or update assignment mutation
  const saveAssignmentMutation = useMutation({
    mutationFn: async (data: { propertyId: string; shift: string; agentName: string }) => {
      const response = await apiRequest("POST", "/api/agent-shifts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-shifts', propertyId] });
      setEditingShift(null);
      setAgentName("");
      toast({
        title: "Success",
        description: "Agent assignment updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agent assignment",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (shift: string) => {
    setEditingShift(shift);
    const existing = assignments.find(a => a.shift === shift);
    setAgentName(existing?.agentName || "");
  };

  const handleSave = () => {
    if (!editingShift || !agentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Agent name is required",
        variant: "destructive",
      });
      return;
    }

    saveAssignmentMutation.mutate({
      propertyId,
      shift: editingShift,
      agentName: agentName.trim()
    });
  };

  const handleCancel = () => {
    setEditingShift(null);
    setAgentName("");
  };

  const getAssignmentForShift = (shift: string) => {
    return assignments.find(a => a.shift === shift);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Shift Assignments for {propertyName}</CardTitle>
        <CardDescription>
          Configure which agent is assigned to each shift. The front desk will automatically populate the agent name based on the current time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Time</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SHIFTS.map((shift) => {
                  const assignment = getAssignmentForShift(shift);
                  const isEditing = editingShift === shift;

                  return (
                    <TableRow key={shift}>
                      <TableCell className="font-medium">{shift}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="Enter agent name"
                            data-testid={`input-agent-${shift}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSave();
                              } else if (e.key === "Escape") {
                                handleCancel();
                              }
                            }}
                          />
                        ) : (
                          <span className={assignment ? "" : "text-gray-400 italic"}>
                            {assignment?.agentName || "Not assigned"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={saveAssignmentMutation.isPending}
                              data-testid={`button-save-agent-${shift}`}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              data-testid={`button-cancel-agent-${shift}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(shift)}
                            data-testid={`button-edit-agent-${shift}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-blue-900 mb-2">How Auto-Population Works</h4>
              <p className="text-sm text-blue-800">
                When a front desk agent starts a new daily report, the system will automatically determine which shift they're on based on the current time and populate the agent name field with the assigned agent for that shift. This saves time and ensures consistency.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
