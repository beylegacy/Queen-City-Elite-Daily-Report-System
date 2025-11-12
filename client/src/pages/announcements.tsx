import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, formatDistanceToNow, isAfter, subDays } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Briefcase,
  Award,
  FileText,
  Calendar,
  PartyPopper,
  Info,
  Search,
  CheckCircle2,
  ArrowLeft,
  Megaphone,
} from "lucide-react";
import type { Announcement } from "@shared/schema";

type AnnouncementWithReadStatus = Announcement & { isRead?: boolean };

const CATEGORY_ICONS = {
  "Company Update": Briefcase,
  Recognition: Award,
  "Policy Change": FileText,
  Event: Calendar,
  Celebration: PartyPopper,
  General: Info,
};

const CATEGORY_COLORS = {
  "Company Update": "bg-blue-100 text-blue-700 border-blue-300",
  Recognition: "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Policy Change": "bg-purple-100 text-purple-700 border-purple-300",
  Event: "bg-green-100 text-green-700 border-green-300",
  Celebration: "bg-pink-100 text-pink-700 border-pink-300",
  General: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const { data: announcements = [], isLoading } = useQuery<AnnouncementWithReadStatus[]>({
    queryKey: ['/api/announcements'],
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/announcements/unread-count'],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const response = await apiRequest("POST", `/api/announcements/${announcementId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements/unread-count'] });
      toast({
        title: "Marked as read",
        description: "Announcement has been marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark announcement as read",
        variant: "destructive",
      });
    },
  });

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements.filter((a) => a.isPublished && !a.archivedAt);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.content.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== "All") {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [announcements, searchQuery, categoryFilter]);

  const formatPublishDate = (date: Date | string | null) => {
    if (!date) return "Unknown";
    const publishDate = new Date(date);
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    if (isAfter(publishDate, sevenDaysAgo)) {
      return formatDistanceToNow(publishDate, { addSuffix: true });
    }
    return format(publishDate, "MMM d, yyyy");
  };

  const isNewAnnouncement = (date: Date | string | null) => {
    if (!date) return false;
    const publishDate = new Date(date);
    const sevenDaysAgo = subDays(new Date(), 7);
    return isAfter(publishDate, sevenDaysAgo);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-t-2xl text-white p-6 lg:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Megaphone className="w-8 h-8" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Company News & Announcements
                </h1>
                <p className="text-orange-100 text-sm lg:text-base mt-1">
                  Stay up to date with Queen City Elite
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 min-h-[44px] touch-manipulation"
                  data-testid="button-back-home"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              {user && (user.role === 'admin' || user.role === 'manager') && (
                <Link href="/admin/announcements">
                  <Button
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 min-h-[44px] touch-manipulation"
                    data-testid="button-admin-announcements"
                  >
                    Manage Announcements
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[44px]"
                data-testid="input-search-announcements"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="md:w-64 min-h-[44px]" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Company Update">Company Update</SelectItem>
                <SelectItem value="Recognition">Recognition</SelectItem>
                <SelectItem value="Policy Change">Policy Change</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
                <SelectItem value="Celebration">Celebration</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No announcements found
              </h3>
              <p className="text-gray-500">
                {searchQuery || categoryFilter !== "All"
                  ? "Try adjusting your filters"
                  : "Check back later for updates"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((announcement) => {
                const CategoryIcon = CATEGORY_ICONS[announcement.category];
                const categoryColor = CATEGORY_COLORS[announcement.category];

                return (
                  <Card
                    key={announcement.id}
                    className={`overflow-hidden transition-all hover:shadow-lg ${
                      !announcement.isRead && user ? "border-l-4 border-l-orange-500" : ""
                    }`}
                    data-testid={`card-announcement-${announcement.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <h2 className="text-xl font-bold text-gray-900 flex-1">
                              {announcement.title}
                            </h2>
                            {announcement.isPinned && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                Pinned
                              </Badge>
                            )}
                            {isNewAnnouncement(announcement.publishedAt) && (
                              <Badge className="bg-orange-500 text-white animate-pulse">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                            <Badge variant="outline" className={categoryColor}>
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {announcement.category}
                            </Badge>
                            <span>By {announcement.author}</span>
                            <span>•</span>
                            <span>{formatPublishDate(announcement.publishedAt)}</span>
                          </div>
                        </div>
                        {user && !announcement.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(announcement.id)}
                            disabled={markAsReadMutation.isPending}
                            className="min-h-[44px] md:min-h-0"
                            data-testid={`button-mark-read-${announcement.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {announcement.imageUrl && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          <img
                            src={announcement.imageUrl}
                            alt={announcement.title}
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      )}
                      <div
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: announcement.content }}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
