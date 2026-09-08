import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Video, Eye, ThumbsUp, MessageCircle, Pencil, Trash2, ExternalLink,
  RefreshCw, Globe, Lock, Users, Search, CheckSquare, Loader2, Save, Languages,
  Film, Smartphone, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getYouTubeChannels } from "@/lib/youtube-api";
import { supabase } from "@/integrations/supabase/client";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { translateText } from "@/lib/smart-link-api";
import { TranslationModelSelect } from "@/components/TranslationModelSelect";

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  privacyStatus: string;
  duration?: string;  // ISO-8601 (e.g. PT47S, PT3M12S)
  isShort?: boolean;  // authoritative flag from the backend's /shorts/ probe
}

// Parse an ISO-8601 duration ("PT1H2M3S") into total seconds.
const durationToSeconds = (iso?: string): number => {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
};

// Prefer the backend's authoritative flag (a real youtube.com/shorts/<id> check, which is how
// YouTube itself splits /shorts vs /videos). Fall back to the duration/#shorts heuristic only
// for responses that predate the flag.
const isShortVideo = (v: VideoData): boolean => {
  if (typeof v.isShort === "boolean") return v.isShort;
  const s = durationToSeconds(v.duration);
  if (s > 0 && s <= 60) return true;
  return /#shorts?\b/i.test(`${v.title} ${v.description}`);
};

interface YtChannel {
  id: string;
  channelId: string;
  channelTitle: string;
}

const PrivacyIcon = ({ status }: { status: string }) => {
  if (status === "public") return <Globe className="w-3 h-3 text-success" />;
  if (status === "private") return <Lock className="w-3 h-3 text-destructive" />;
  return <Users className="w-3 h-3 text-warning" />;
};

const MyVideosPage = () => {
  const [channels, setChannels] = useState<YtChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "long" | "short">("all");

  // Edit dialog
  const [editingVideo, setEditingVideo] = useState<VideoData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [isSaving, setIsSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState("es");

  const LANGUAGES = [
    { code: "es", name: "Spanish" }, { code: "pt", name: "Portuguese" },
    { code: "fr", name: "French" }, { code: "de", name: "German" },
    { code: "it", name: "Italian" }, { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" }, { code: "ru", name: "Russian" },
    { code: "hi", name: "Hindi" }, { code: "tr", name: "Turkish" },
    { code: "nl", name: "Dutch" }, { code: "pl", name: "Polish" },
  ];

  const handleTranslateDescription = async () => {
    if (!editDescription) { toast.error("No description to translate"); return; }
    setTranslating(true);
    const langName = LANGUAGES.find(l => l.code === translateLang)?.name || translateLang;
    const res = await translateText(editDescription, langName);
    if (res.success && res.translatedText) {
      setEditDescription(res.translatedText);
      toast.success(`Translated to ${langName}!`);
    } else {
      toast.error(`Translation failed: ${res.error}`);
    }
    setTranslating(false);
  };

  // Delete dialog
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingChannels(true);
      const res = await getYouTubeChannels();
      if (res.success && res.data?.channels?.length > 0) {
        setChannels(res.data.channels);
        setSelectedChannel(res.data.channels[0].id);
      }
      setLoadingChannels(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedChannel) fetchVideos();
  }, [selectedChannel]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredVideos(videos);
    } else {
      setFilteredVideos(
        videos.filter(v =>
          v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [videos, searchQuery]);

  const fetchVideos = async () => {
    if (!selectedChannel) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'list_videos', channelTokenId: selectedChannel },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        setVideos(data.videos || []);
      } else {
        toast.error(data?.error || 'Failed to load videos');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (video: VideoData) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description);
    setEditPrivacy(video.privacyStatus || "public");
  };

  const handleSaveEdit = async () => {
    if (!editingVideo || !selectedChannel) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: {
          action: 'update_video',
          channelTokenId: selectedChannel,
          videoId: editingVideo.id,
          title: editTitle,
          description: editDescription,
          privacyStatus: editPrivacy,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        toast.success("Video updated successfully!");
        setEditingVideo(null);
        fetchVideos();
      } else {
        toast.error(data?.error || 'Failed to update video');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!deleteVideoId || !selectedChannel) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'delete_video', channelTokenId: selectedChannel, videoId: deleteVideoId },
      });
      if (error) throw new Error(error.message);
      if (data?.success) {
        toast.success("Video deleted!");
        setDeleteVideoId(null);
        fetchVideos();
      } else {
        toast.error(data?.error || 'Failed to delete');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedChannel) return;
    setIsDeleting(true);
    let success = 0;
    let fail = 0;
    for (const videoId of Array.from(selectedVideos)) {
      const { data } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'delete_video', channelTokenId: selectedChannel, videoId },
      });
      if (data?.success) success++;
      else fail++;
    }
    toast.success(`Deleted ${success} video(s)${fail > 0 ? `, failed ${fail}` : ''}`);
    setSelectedVideos(new Set());
    setIsMultiSelectMode(false);
    setIsBatchDeleteOpen(false);
    setIsDeleting(false);
    fetchVideos();
  };

  const handleBatchPrivacy = async (status: "public" | "unlisted" | "private") => {
    if (!selectedChannel || selectedVideos.size === 0) return;
    let success = 0, fail = 0;
    for (const videoId of Array.from(selectedVideos)) {
      const { data } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'set_privacy', channelTokenId: selectedChannel, videoId, privacyStatus: status },
      });
      if (data?.success) success++; else fail++;
    }
    // Reflect the change locally without a full refetch.
    setVideos(prev => prev.map(v => selectedVideos.has(v.id) ? { ...v, privacyStatus: status } : v));
    toast.success(`Set ${success} video(s) to ${status}${fail > 0 ? `, failed ${fail}` : ''}`);
    setSelectedVideos(new Set());
    setIsMultiSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedVideos);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedVideos(next);
  };

  const formatNum = (n: string | number) => {
    const x = typeof n === "number" ? n : parseInt(n);
    if (isNaN(x)) return '0';
    if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
    if (x >= 1000) return `${(x / 1000).toFixed(1)}K`;
    return x.toString();
  };

  // Split the selected channel's videos by format for the comparison dashboard.
  const shortsList = videos.filter(isShortVideo);
  const longList = videos.filter(v => !isShortVideo(v));
  const agg = (arr: VideoData[]) => {
    const views = arr.reduce((a, v) => a + (parseInt(v.viewCount) || 0), 0);
    const likes = arr.reduce((a, v) => a + (parseInt(v.likeCount) || 0), 0);
    const comments = arr.reduce((a, v) => a + (parseInt(v.commentCount) || 0), 0);
    return { count: arr.length, views, likes, comments, avgViews: arr.length ? Math.round(views / arr.length) : 0 };
  };
  const shortStats = agg(shortsList);
  const longStats = agg(longList);
  // Compare by average views per video — fair when the two counts differ.
  const winner: "short" | "long" | "tie" =
    shortStats.count === 0 || longStats.count === 0 ? "tie"
      : shortStats.avgViews > longStats.avgViews ? "short"
        : longStats.avgViews > shortStats.avgViews ? "long" : "tie";
  const winnerPct = (() => {
    const hi = Math.max(shortStats.avgViews, longStats.avgViews);
    const lo = Math.min(shortStats.avgViews, longStats.avgViews);
    if (lo === 0) return hi === 0 ? 0 : 100;
    return Math.round(((hi - lo) / lo) * 100);
  })();

  // The grid respects BOTH the search filter and the format toggle.
  const displayVideos =
    viewMode === "short" ? filteredVideos.filter(isShortVideo)
      : viewMode === "long" ? filteredVideos.filter(v => !isShortVideo(v))
        : filteredVideos;

  const YtIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );

  return (
    <div className="space-y-8 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">My Videos</h1>
        <p className="text-muted-foreground">Manage, edit, and delete your YouTube videos</p>
      </motion.div>

      {loadingChannels ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : channels.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center space-y-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto text-youtube">
            <YtIcon />
          </div>
          <p className="font-medium text-foreground">No YouTube channels connected</p>
          <p className="text-sm text-muted-foreground">Connect your YouTube channel in Settings first.</p>
        </div>
      ) : (
        <>
          {/* Channel selector + toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedChannel === ch.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                <span className="text-youtube"><YtIcon /></span>
                {ch.channelTitle}
              </button>
            ))}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => fetchVideos()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Format comparison dashboard — Shorts vs Long-form for THIS channel */}
          {videos.length > 0 && (shortStats.count > 0 || longStats.count > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormatCard
                label="Shorts" icon={<Smartphone className="w-4 h-4" />}
                accent="text-red-400" ring="ring-red-500/30" bg="bg-red-500/5"
                stats={shortStats} formatNum={formatNum}
                winning={winner === "short"} winnerPct={winnerPct}
              />
              <FormatCard
                label="Long-form" icon={<Film className="w-4 h-4" />}
                accent="text-blue-400" ring="ring-blue-500/30" bg="bg-blue-500/5"
                stats={longStats} formatNum={formatNum}
                winning={winner === "long"} winnerPct={winnerPct}
              />
            </div>
          )}

          {/* Format toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
            {([
              { key: "all", label: `All (${videos.length})`, icon: <Video className="w-3.5 h-3.5" /> },
              { key: "long", label: `Long-form (${longStats.count})`, icon: <Film className="w-3.5 h-3.5" /> },
              { key: "short", label: `Shorts (${shortStats.count})`, icon: <Smartphone className="w-3.5 h-3.5" /> },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setViewMode(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Search + multi-select toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search videos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button variant={isMultiSelectMode ? "default" : "outline"} size="sm"
              onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedVideos(new Set()); }}
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              {isMultiSelectMode ? `${selectedVideos.size} selected` : "Multi-select"}
            </Button>
            {isMultiSelectMode && selectedVideos.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setIsBatchDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete {selectedVideos.size}
              </Button>
            )}
          </div>

          {/* Videos grid */}
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : displayVideos.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center border border-border/50">
              <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No videos match your search"
                  : viewMode === "short" ? "No Shorts on this channel"
                    : viewMode === "long" ? "No long-form videos on this channel"
                      : "No videos found"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayVideos.map(video => (
                <motion.div key={video.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border overflow-hidden bg-card transition-colors ${
                    isMultiSelectMode && selectedVideos.has(video.id) ? "border-primary" : "border-border/50 hover:border-muted-foreground/30"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted cursor-pointer"
                    onClick={() => isMultiSelectMode && toggleSelect(video.id)}
                  >
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {isMultiSelectMode && (
                      <div className="absolute top-2 left-2">
                        <Checkbox checked={selectedVideos.has(video.id)} onCheckedChange={() => toggleSelect(video.id)} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 px-1.5 py-0.5 rounded text-xs">
                      <PrivacyIcon status={video.privacyStatus} />
                      <span className="text-foreground capitalize">{video.privacyStatus}</span>
                    </div>
                    <div className={`absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      isShortVideo(video) ? "bg-red-600/90 text-white" : "bg-blue-600/90 text-white"
                    }`}>
                      {isShortVideo(video) ? <Smartphone className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                      {isShortVideo(video) ? "Short" : "Long"}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(video.publishedAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNum(video.viewCount)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{formatNum(video.likeCount)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNum(video.commentCount)}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEditDialog(video)}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteVideoId(video.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                      <a href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={v => !v && setEditingVideo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingVideo?.thumbnail && (
              <img src={editingVideo.thumbnail} alt="" className="w-full aspect-video object-cover rounded-lg" />
            )}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Title</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <div className="flex items-center gap-1.5">
                  <TranslationModelSelect showLabel={false} />
                  <Select value={translateLang} onValueChange={setTranslateLang}>
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleTranslateDescription} disabled={translating || !editDescription}>
                    {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                    <span className="ml-1">Translate</span>
                  </Button>
                </div>
              </div>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={5} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Privacy</label>
              <Select value={editPrivacy} onValueChange={setEditPrivacy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-success" /> Public</span></SelectItem>
                  <SelectItem value="unlisted"><span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-warning" /> Unlisted</span></SelectItem>
                  <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-destructive" /> Private</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVideo(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single */}
      <AlertDialog open={!!deleteVideoId} onOpenChange={v => !v && setDeleteVideoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The video will be permanently deleted from YouTube.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSingle} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch delete dialog */}
      <AlertDialog open={isBatchDeleteOpen} onOpenChange={setIsBatchDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVideos.size} Videos?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selectedVideos.size} selected video(s) from YouTube. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating batch actions bar */}
      <BatchActionsBar
        selectedCount={selectedVideos.size}
        onClearSelection={() => { setSelectedVideos(new Set()); setIsMultiSelectMode(false); }}
        onBatchDelete={handleBatchDelete}
        onBatchPrivacy={handleBatchPrivacy}
      />
    </div>
  );
};

interface FormatStats { count: number; views: number; likes: number; comments: number; avgViews: number; }

function FormatCard({ label, icon, accent, ring, bg, stats, formatNum, winning, winnerPct }: {
  label: string; icon: React.ReactNode; accent: string; ring: string; bg: string;
  stats: FormatStats; formatNum: (n: string | number) => string; winning: boolean; winnerPct: number;
}) {
  return (
    <div className={`relative rounded-xl border border-border/50 p-4 ${bg} ${winning ? `ring-1 ${ring}` : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 font-semibold ${accent}`}>
          {icon}{label}
          <span className="text-xs font-normal text-muted-foreground">· {stats.count} video{stats.count === 1 ? "" : "s"}</span>
        </div>
        {winning && stats.count > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            <Trophy className="w-3 h-3" /> Winning{winnerPct > 0 ? ` +${winnerPct}%` : ""}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Avg views / video" value={formatNum(stats.avgViews)} big accent={accent} />
        <Stat label="Total views" value={formatNum(stats.views)} />
        <Stat label="Total likes" value={formatNum(stats.likes)} />
        <Stat label="Total comments" value={formatNum(stats.comments)} />
      </div>
    </div>
  );
}

function Stat({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: string }) {
  return (
    <div>
      <p className={`font-bold ${big ? `text-2xl ${accent || "text-foreground"}` : "text-lg text-foreground"}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default MyVideosPage;
