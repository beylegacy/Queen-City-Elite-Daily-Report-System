import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertAnnouncementSchema, type Announcement, type InsertAnnouncement } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  Send,
  Megaphone,
} from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

const formSchema = insertAnnouncementSchema.extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  author: z.string().min(1, "Author is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminAnnouncements() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("list");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<Partial<Announcement> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'manager') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery<Announcement[]>({
    queryKey: ['/api/announcements', 'admin', { includeDrafts: true }],
    queryFn: async () => {
      const params = new URLSearchParams({ includeDrafts: 'true' });
      const res = await fetch(`/api/announcements?${params}`);
      if (!res.ok) throw new Error('Failed to fetch announcements');
      return res.json();
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'manager'),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "General",
      content: "",
      author: user?.fullName || "",
      imageUrl: "",
      isPinned: false,
      isPublished: false,
      publishedAt: null,
      archivedAt: null,
    },
  });

  useEffect(() => {
    if (user?.fullName) {
      form.setValue("author", user.fullName);
    }
  }, [user, form]);

  useEffect(() => {
    if (editingAnnouncement) {
      form.reset({
        title: editingAnnouncement.title,
        category: editingAnnouncement.category,
        content: editingAnnouncement.content,
        author: editingAnnouncement.author,
        imageUrl: editingAnnouncement.imageUrl || "",
        isPinned: editingAnnouncement.isPinned || false,
        isPublished: editingAnnouncement.isPublished || false,
        publishedAt: editingAnnouncement.publishedAt,
        archivedAt: editingAnnouncement.archivedAt,
      });
      setActiveTab("create");
    }
  }, [editingAnnouncement, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAnnouncement) => {
      const response = await apiRequest("POST", "/api/announcements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
      form.reset({
        title: "",
        category: "General",
        content: "",
        author: user?.fullName || "",
        imageUrl: "",
        isPinned: false,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      });
      setActiveTab("list");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAnnouncement> }) => {
      const response = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Success",
        description: "Announcement updated successfully",
      });
      setEditingAnnouncement(null);
      form.reset({
        title: "",
        category: "General",
        content: "",
        author: user?.fullName || "",
        imageUrl: "",
        isPinned: false,
        isPublished: false,
        publishedAt: null,
        archivedAt: null,
      });
      setActiveTab("list");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/announcements/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = (data: FormValues) => {
    const announcementData: InsertAnnouncement = {
      ...data,
      imageUrl: data.imageUrl || null,
      isPublished: false,
      publishedAt: null,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: announcementData });
    } else {
      createMutation.mutate(announcementData);
    }
  };

  const handlePublish = (data: FormValues) => {
    const announcementData: InsertAnnouncement = {
      ...data,
      imageUrl: data.imageUrl || null,
      isPublished: true,
      publishedAt: new Date(),
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: announcementData });
    } else {
      createMutation.mutate(announcementData);
    }
  };

  const handlePreview = () => {
    const values = form.getValues();
    setPreviewAnnouncement(values);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
  };

  const handleCancelEdit = () => {
    setEditingAnnouncement(null);
    form.reset({
      title: "",
      category: "General",
      content: "",
      author: user?.fullName || "",
      imageUrl: "",
      isPinned: false,
      isPublished: false,
      publishedAt: null,
      archivedAt: null,
    });
    setActiveTab("list");
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (announcement.archivedAt) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700">Archived</Badge>;
    }
    if (announcement.isPublished) {
      return <Badge variant="outline" className="bg-green-100 text-green-700">Published</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Draft</Badge>;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-700 to-blue-700 rounded-t-2xl text-white p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-8 h-8" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Manage Announcements
                </h1>
                <p className="text-purple-100 text-sm lg:text-base mt-1">
                  Create and manage company announcements
                </p>
              </div>
            </div>
            <Link href="/announcements">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 min-h-[44px] touch-manipulation"
                data-testid="button-view-announcements"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Announcements
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="list" data-testid="tab-all-announcements">
                All Announcements
              </TabsTrigger>
              <TabsTrigger value="create" data-testid="tab-create-new">
                <Plus className="w-4 h-4 mr-2" />
                {editingAnnouncement ? "Edit Announcement" : "Create New"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle>All Announcements</CardTitle>
                  <CardDescription>
                    Manage all announcements including drafts and published posts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnnouncements ? (
                    <div className="text-center py-8 text-gray-500">Loading announcements...</div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No announcements yet. Create your first announcement!
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Published Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {announcements.map((announcement) => (
                            <TableRow key={announcement.id}>
                              <TableCell className="font-medium">
                                {announcement.title}
                                {announcement.isPinned && (
                                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                                    Pinned
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{announcement.category}</TableCell>
                              <TableCell>{announcement.author}</TableCell>
                              <TableCell>
                                {announcement.publishedAt
                                  ? format(new Date(announcement.publishedAt), "MMM d, yyyy")
                                  : "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(announcement)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(announcement)}
                                    data-testid={`button-edit-announcement-${announcement.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog open={deleteId === announcement.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteId(announcement.id)}
                                        data-testid={`button-delete-announcement-${announcement.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteMutation.mutate(announcement.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
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

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
                  </CardTitle>
                  <CardDescription>
                    Fill in the details below to create or update an announcement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter announcement title"
                                className="min-h-[44px]"
                                data-testid="input-announcement-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="min-h-[44px]" data-testid="select-announcement-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Company Update">Company Update</SelectItem>
                                <SelectItem value="Recognition">Recognition</SelectItem>
                                <SelectItem value="Policy Change">Policy Change</SelectItem>
                                <SelectItem value="Event">Event</SelectItem>
                                <SelectItem value="Celebration">Celebration</SelectItem>
                                <SelectItem value="General">General</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="author"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Author *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter author name"
                                className="min-h-[44px]"
                                data-testid="input-announcement-author"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter announcement content (HTML supported)"
                                className="min-h-[200px]"
                                data-testid="textarea-announcement-content"
                              />
                            </FormControl>
                            <FormDescription>
                              You can use basic HTML tags for formatting
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="Enter image URL"
                                className="min-h-[44px]"
                                data-testid="input-announcement-image-url"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isPinned"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Pin to Top</FormLabel>
                              <FormDescription>
                                Pinned announcements appear at the top of the list
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="switch-announcement-pinned"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handlePreview}
                          className="min-h-[44px]"
                          data-testid="button-preview-announcement"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={form.handleSubmit(handleSaveDraft)}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="min-h-[44px]"
                          data-testid="button-save-announcement"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save as Draft
                        </Button>
                        <Button
                          type="button"
                          onClick={form.handleSubmit(handlePublish)}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="min-h-[44px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          data-testid="button-publish-announcement"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Publish
                        </Button>
                        {editingAnnouncement && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="min-h-[44px]"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!previewAnnouncement} onOpenChange={() => setPreviewAnnouncement(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Announcement Preview</DialogTitle>
          </DialogHeader>
          {previewAnnouncement && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {previewAnnouncement.title}
                </h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <Badge variant="outline">{previewAnnouncement.category}</Badge>
                  <span>By {previewAnnouncement.author}</span>
                </div>
              </div>
              {previewAnnouncement.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={previewAnnouncement.imageUrl}
                    alt={previewAnnouncement.title}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}
              <div
                className="prose prose-sm max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: previewAnnouncement.content || "" }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
