import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Lock, Settings, User, Plus, Pencil, Trash2, Upload, Clock } from "lucide-react";
import { ResidentImporter } from "@/components/resident-importer";
import { AgentShiftManager } from "@/components/agent-shift-manager";
import type { Property, Resident, DutyTemplate } from "@shared/schema";

export default function Manager() {
  const [, setLocation] = useLocation();
  const { user, isLoading, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Management features state
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [isAddingResident, setIsAddingResident] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DutyTemplate | null>(null);

  // Resident form state
  const [residentForm, setResidentForm] = useState({
    apartmentNumber: "",
    residentName: "",
    email: "",
    phone: "",
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    task: "",
    shift: "1st",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user?.requiresPasswordChange) {
      setShowPasswordDialog(true);
    }
  }, [user]);

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch residents for selected property
  const { data: residents = [], isLoading: loadingResidents } = useQuery<Resident[]>({
    queryKey: ['/api/residents', selectedProperty],
    enabled: !!selectedProperty,
  });

  // Fetch duty templates for selected property
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<DutyTemplate[]>({
    queryKey: ['/api/duty-templates', selectedProperty],
    enabled: !!selectedProperty,
  });

  // Create resident mutation
  const createResidentMutation = useMutation({
    mutationFn: async (data: typeof residentForm & { propertyId: string }) => {
      const response = await apiRequest("POST", "/api/residents", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/residents', selectedProperty] });
      setIsAddingResident(false);
      resetResidentForm();
      toast({
        title: "Success",
        description: "Resident added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add resident",
        variant: "destructive",
      });
    },
  });

  // Update resident mutation
  const updateResidentMutation = useMutation({
    mutationFn: async (data: typeof residentForm & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/residents/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/residents', selectedProperty] });
      setEditingResident(null);
      resetResidentForm();
      toast({
        title: "Success",
        description: "Resident updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update resident",
        variant: "destructive",
      });
    },
  });

  // Delete resident mutation
  const deleteResidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/residents/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/residents', selectedProperty] });
      toast({
        title: "Success",
        description: "Resident deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete resident",
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateForm & { propertyId: string }) => {
      const response = await apiRequest("POST", "/api/duty-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-templates', selectedProperty] });
      setIsAddingTemplate(false);
      resetTemplateForm();
      toast({
        title: "Success",
        description: "Task template added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add task template",
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: typeof templateForm & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/duty-templates/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-templates', selectedProperty] });
      setEditingTemplate(null);
      resetTemplateForm();
      toast({
        title: "Success",
        description: "Task template updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/duty-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/duty-templates', selectedProperty] });
      toast({
        title: "Success",
        description: "Task template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task template",
        variant: "destructive",
      });
    },
  });

  const resetResidentForm = () => {
    setResidentForm({
      apartmentNumber: "",
      residentName: "",
      email: "",
      phone: "",
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      task: "",
      shift: "1st",
    });
  };

  const handleEditResident = (resident: Resident) => {
    setEditingResident(resident);
    setResidentForm({
      apartmentNumber: resident.apartmentNumber,
      residentName: resident.residentName,
      email: resident.email || "",
      phone: resident.phone || "",
    });
  };

  const handleEditTemplate = (template: DutyTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      task: template.task,
      shift: template.shift,
    });
  };

  const handleSaveResident = () => {
    if (!selectedProperty) {
      toast({
        title: "Error",
        description: "Please select a property first",
        variant: "destructive",
      });
      return;
    }

    if (!residentForm.apartmentNumber || !residentForm.residentName) {
      toast({
        title: "Error",
        description: "Apartment and resident name are required",
        variant: "destructive",
      });
      return;
    }

    if (editingResident) {
      updateResidentMutation.mutate({ ...residentForm, id: editingResident.id });
    } else {
      createResidentMutation.mutate({ ...residentForm, propertyId: selectedProperty });
    }
  };

  const handleSaveTemplate = () => {
    if (!selectedProperty) {
      toast({
        title: "Error",
        description: "Please select a property first",
        variant: "destructive",
      });
      return;
    }

    if (!templateForm.task) {
      toast({
        title: "Error",
        description: "Task description is required",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...templateForm, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate({ ...templateForm, propertyId: selectedProperty });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 10) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast({
        title: "Invalid password",
        description: "Password must contain uppercase, lowercase, and digit",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must match",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      toast({
        title: "Password changed",
        description: "Your password has been successfully changed",
      });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Manager Dashboard</h1>
            <p className="text-slate-600 mt-1">Queen City Elite LLC</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="min-h-[44px] touch-manipulation"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600">Full Name</p>
                <p className="text-lg font-medium" data-testid="text-full-name">{user.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Username</p>
                <p className="text-lg font-medium" data-testid="text-username">{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Role</p>
                <p className="text-lg font-medium capitalize" data-testid="text-role">{user.role}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowPasswordDialog(true)}
                variant="outline"
                className="w-full min-h-[44px] touch-manipulation"
                data-testid="button-change-password"
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
            <CardDescription>Choose a property to manage residents and task templates</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProperty && (
          <Tabs defaultValue="residents" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="residents" data-testid="tab-residents">
                <Settings className="w-4 h-4 mr-2" />
                Residents
              </TabsTrigger>
              <TabsTrigger value="import" data-testid="tab-import">
                <Upload className="w-4 h-4 mr-2" />
                Import Residents
              </TabsTrigger>
              <TabsTrigger value="agents" data-testid="tab-agents">
                <Clock className="w-4 h-4 mr-2" />
                Agent Shifts
              </TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates">
                <Settings className="w-4 h-4 mr-2" />
                Daily Task Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="residents">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Resident Directory</CardTitle>
                      <CardDescription>Manage resident information for auto-fill in package tracking</CardDescription>
                    </div>
                    <Dialog open={isAddingResident} onOpenChange={setIsAddingResident}>
                      <DialogTrigger asChild>
                        <Button onClick={() => resetResidentForm()} data-testid="button-add-resident">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Resident
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Resident</DialogTitle>
                          <DialogDescription>Enter resident information for package auto-fill</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="apartmentNumber">Apartment / Unit Number *</Label>
                            <Input
                              id="apartmentNumber"
                              value={residentForm.apartmentNumber}
                              onChange={(e) => setResidentForm({ ...residentForm, apartmentNumber: e.target.value })}
                              placeholder="304"
                              data-testid="input-apartment"
                            />
                          </div>
                          <div>
                            <Label htmlFor="residentName">Resident Name *</Label>
                            <Input
                              id="residentName"
                              value={residentForm.residentName}
                              onChange={(e) => setResidentForm({ ...residentForm, residentName: e.target.value })}
                              placeholder="John Smith"
                              data-testid="input-resident-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                              id="email"
                              type="email"
                              value={residentForm.email}
                              onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                              placeholder="john@example.com"
                              data-testid="input-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone (Optional)</Label>
                            <Input
                              id="phone"
                              value={residentForm.phone}
                              onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })}
                              placeholder="704-555-0100"
                              data-testid="input-phone"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingResident(false)} data-testid="button-cancel-resident">
                              Cancel
                            </Button>
                            <Button onClick={handleSaveResident} data-testid="button-save-resident">
                              Add Resident
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingResidents ? (
                    <div className="text-center py-8 text-gray-500">Loading residents...</div>
                  ) : residents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No residents found. Add your first resident to enable auto-fill.</div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Apartment</TableHead>
                            <TableHead>Resident Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {residents.map((resident) => (
                            <TableRow key={resident.id}>
                              <TableCell className="font-medium">{resident.apartmentNumber}</TableCell>
                              <TableCell>{resident.residentName}</TableCell>
                              <TableCell>{resident.email || "-"}</TableCell>
                              <TableCell>{resident.phone || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog open={editingResident?.id === resident.id} onOpenChange={(open) => !open && setEditingResident(null)}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditResident(resident)}
                                        data-testid={`button-edit-resident-${resident.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Resident</DialogTitle>
                                        <DialogDescription>Update resident information</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 pt-4">
                                        <div>
                                          <Label htmlFor="edit-apartmentNumber">Apartment / Unit Number *</Label>
                                          <Input
                                            id="edit-apartmentNumber"
                                            value={residentForm.apartmentNumber}
                                            onChange={(e) => setResidentForm({ ...residentForm, apartmentNumber: e.target.value })}
                                            placeholder="304"
                                            data-testid="input-edit-apartment"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-residentName">Resident Name *</Label>
                                          <Input
                                            id="edit-residentName"
                                            value={residentForm.residentName}
                                            onChange={(e) => setResidentForm({ ...residentForm, residentName: e.target.value })}
                                            placeholder="John Smith"
                                            data-testid="input-edit-resident-name"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-email">Email (Optional)</Label>
                                          <Input
                                            id="edit-email"
                                            type="email"
                                            value={residentForm.email}
                                            onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                                            placeholder="john@example.com"
                                            data-testid="input-edit-email"
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-phone">Phone (Optional)</Label>
                                          <Input
                                            id="edit-phone"
                                            value={residentForm.phone}
                                            onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })}
                                            placeholder="704-555-0100"
                                            data-testid="input-edit-phone"
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                          <Button variant="outline" onClick={() => setEditingResident(null)} data-testid="button-cancel-edit-resident">
                                            Cancel
                                          </Button>
                                          <Button onClick={handleSaveResident} data-testid="button-update-resident">
                                            Update Resident
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteResidentMutation.mutate(resident.id)}
                                    data-testid={`button-delete-resident-${resident.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import">
              <ResidentImporter
                propertyId={selectedProperty}
                propertyName={properties.find(p => p.id === selectedProperty)?.name || ""}
              />
            </TabsContent>

            <TabsContent value="agents">
              <AgentShiftManager
                propertyId={selectedProperty}
                propertyName={properties.find(p => p.id === selectedProperty)?.name || ""}
              />
            </TabsContent>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Daily Task Templates</CardTitle>
                      <CardDescription>Pre-configured tasks that agents can load for their shift</CardDescription>
                    </div>
                    <Dialog open={isAddingTemplate} onOpenChange={setIsAddingTemplate}>
                      <DialogTrigger asChild>
                        <Button onClick={() => resetTemplateForm()} data-testid="button-add-template">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Task Template</DialogTitle>
                          <DialogDescription>Create a recurring daily task for this property</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="task">Task Description *</Label>
                            <Input
                              id="task"
                              value={templateForm.task}
                              onChange={(e) => setTemplateForm({ ...templateForm, task: e.target.value })}
                              placeholder="Check lobby cleanliness"
                              data-testid="input-task-description"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingTemplate(false)} data-testid="button-cancel-template">
                              Cancel
                            </Button>
                            <Button onClick={handleSaveTemplate} data-testid="button-save-template">
                              Add Task
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingTemplates ? (
                    <div className="text-center py-8 text-gray-500">Loading task templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No task templates found. Add recurring tasks for agents to load.</div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {templates.map((template) => (
                            <TableRow key={template.id}>
                              <TableCell>{template.task}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog open={editingTemplate?.id === template.id} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditTemplate(template)}
                                        data-testid={`button-edit-template-${template.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Edit Task Template</DialogTitle>
                                        <DialogDescription>Update task description</DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 pt-4">
                                        <div>
                                          <Label htmlFor="edit-task">Task Description *</Label>
                                          <Input
                                            id="edit-task"
                                            value={templateForm.task}
                                            onChange={(e) => setTemplateForm({ ...templateForm, task: e.target.value })}
                                            placeholder="Check lobby cleanliness"
                                            data-testid="input-edit-task-description"
                                          />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                          <Button variant="outline" onClick={() => setEditingTemplate(null)} data-testid="button-cancel-edit-template">
                                            Cancel
                                          </Button>
                                          <Button onClick={handleSaveTemplate} data-testid="button-update-template">
                                            Update Task
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {user.requiresPasswordChange ? "Change Required Password" : "Change Password"}
            </DialogTitle>
            <DialogDescription>
              {user.requiresPasswordChange 
                ? "You must change your password before continuing. Password must be at least 10 characters with uppercase, lowercase, and digit." 
                : "Update your password. Must be at least 10 characters with uppercase, lowercase, and digit."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="min-h-[44px]"
                required
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-h-[44px]"
                required
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-h-[44px]"
                required
                data-testid="input-confirm-password"
              />
            </div>
            <div className="flex gap-3">
              {!user.requiresPasswordChange && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 min-h-[44px] touch-manipulation"
                  data-testid="button-cancel-password-change"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="flex-1 min-h-[44px] touch-manipulation"
                data-testid="button-submit-password-change"
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
