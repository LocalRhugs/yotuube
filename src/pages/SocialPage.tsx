import { motion } from "framer-motion";
import { Facebook, Instagram, Eye, ThumbsUp, Share2, Heart, MessageCircle, Video, RefreshCw, AlertCircle, Loader2, ShieldAlert, ExternalLink, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import StatCard from "@/components/StatCard";
import CommentDialog from "@/components/CommentDialog";
import { useEffect, useState } from "react";
import { getFacebookPages, getPageVideos, getPageInsights, getInstagramAccount, getInstagramMedia, deleteInstagramMedia } from "@/lib/facebook-api";
import { toast } from "sonner";

interface FbPage {
  id: string;
  name: string;
  access_token?: string;
  fan_count?: number;
  category?: string;
  picture?: { data?: { url?: string } };
}

interface FbVideo {
  id: string;
  title?: string;
  description?: string;
  created_time: string;
  views?: number;
  length?: number;
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  thumbnails?: { data?: Array<{ uri?: string; is_preferred?: boolean }> };
}

interface IgAccount {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

const SocialPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [fbVideos, setFbVideos] = useState<FbVideo[]>([]);
  const [igAccount, setIgAccount] = useState<IgAccount | null>(null);
  const [igMedia, setIgMedia] = useState<IgMedia[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingIg, setLoadingIg] = useState(false);
  const [pageInsights, setPageInsights] = useState<any>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("facebook");
  const [deleteMediaId, setDeleteMediaId] = useState<string | null>(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    const res = await getFacebookPages();
    if (!res.success) {
      setError(res.error || 'Failed to fetch pages');
      setLoading(false);
      return;
    }
    const fetchedPages = res.data?.data || [];
    setPages(fetchedPages);
    if (fetchedPages.length > 0) {
      setSelectedPageId(fetchedPages[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const getSelectedPageToken = (): string | undefined => {
    return pages.find((p) => p.id === selectedPageId)?.access_token;
  };

  useEffect(() => {
    if (!selectedPageId) return;

    const loadPageData = async () => {
      setLoadingVideos(true);
      setLoadingIg(true);
      setVideoError(null);

      const pageToken = getSelectedPageToken();

      const [videosRes, igRes, insightsRes] = await Promise.all([
        getPageVideos(selectedPageId, pageToken),
        getInstagramAccount(selectedPageId, pageToken),
        getPageInsights(selectedPageId, pageToken),
      ]);

      if (videosRes.success) {
        setFbVideos(videosRes.data?.data || []);
      } else if (
        videosRes.error?.includes('Missing Permissions') || 
        videosRes.error?.includes('(#200)') ||
        videosRes.error?.includes('non-2xx')
      ) {
        setVideoError('Your token needs the pages_read_content permission to fetch videos.');
        setFbVideos([]);
      } else {
        setVideoError(videosRes.error || 'Failed to load videos');
        setFbVideos([]);
      }
      setLoadingVideos(false);

      if (insightsRes.success) {
        setPageInsights(insightsRes.data);
      }

      if (igRes.success && igRes.data?.instagram_business_account) {
        const igAcc = igRes.data.instagram_business_account;
        setIgAccount(igAcc);
        const mediaRes = await getInstagramMedia(igAcc.id, pageToken);
        if (mediaRes.success) {
          setIgMedia(mediaRes.data?.data || []);
        }
      } else {
        setIgAccount(null);
        setIgMedia([]);
      }
      setLoadingIg(false);
    };

    loadPageData();
  }, [selectedPageId]);

  const handleDeleteIgMedia = async () => {
    if (!deleteMediaId) return;
    setIsDeletingMedia(true);
    try {
      const res = await deleteInstagramMedia(deleteMediaId, getSelectedPageToken());
      if (res.success) {
        toast.success("Post deleted from Instagram!");
        setDeleteMediaId(null);
        if (igAccount) {
          const mediaRes = await getInstagramMedia(igAccount.id, getSelectedPageToken());
          if (mediaRes.success) setIgMedia(mediaRes.data?.data || []);
        }
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const getVideoThumbnail = (v: FbVideo): string | undefined => {
    if (!v.thumbnails?.data?.length) return undefined;
    const preferred = v.thumbnails.data.find(t => t.is_preferred);
    return (preferred || v.thumbnails.data[0])?.uri;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <div>
            <p className="font-medium text-foreground">Failed to connect</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={fetchPages}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
        </div>
        <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4">
          <Facebook className="w-12 h-12 text-facebook mx-auto" />
          <div>
            <p className="font-medium text-foreground">No pages found</p>
            <p className="text-sm text-muted-foreground mt-1">Connect your Facebook in Settings first.</p>
          </div>
        </div>
      </div>
    );
  }

  const totalFbViews = fbVideos.reduce((s, v) => s + (v.views || 0), 0);
  const totalFbLikes = fbVideos.reduce((s, v) => s + (v.likes?.summary?.total_count || 0), 0);
  const totalFbComments = fbVideos.reduce((s, v) => s + (v.comments?.summary?.total_count || 0), 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Facebook & Instagram</h1>
          <p className="text-muted-foreground">Manage content across your connected pages</p>
        </div>
        <Button variant="outline" onClick={fetchPages}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </motion.div>

      {/* Page selector - always show */}
      <div className="flex gap-2 flex-wrap">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPageId(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              selectedPageId === p.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-muted-foreground/30"
            }`}
          >
            {p.picture?.data?.url && (
              <img src={p.picture.data.url} alt="" className="w-5 h-5 rounded-full" />
            )}
            {p.name}
          </button>
        ))}
      </div>

      {/* Page info bar */}
      {selectedPage && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border/50">
          {selectedPage.picture?.data?.url && (
            <img src={selectedPage.picture.data.url} alt="" className="w-12 h-12 rounded-lg" />
          )}
          <div className="flex-1">
            <p className="font-display font-semibold text-foreground text-lg">{selectedPage.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedPage.category} · {selectedPage.fan_count?.toLocaleString() || 0} followers
            </p>
          </div>
          {igAccount && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              <Instagram className="w-4 h-4 text-instagram" />
              <span className="text-foreground font-medium">@{igAccount.username}</span>
              <span className="text-muted-foreground">· {igAccount.followers_count?.toLocaleString()} followers</span>
            </div>
          )}
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="facebook" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Facebook className="w-4 h-4 mr-2" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </TabsTrigger>
        </TabsList>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Page Followers" value={pageInsights?.fan_count?.toLocaleString() || "0"} icon={Eye} platform="facebook" />
            <StatCard title="Videos" value={fbVideos.length.toString()} icon={Video} platform="facebook" />
            <StatCard title="Total Views" value={totalFbViews.toLocaleString()} icon={Eye} platform="facebook" />
            <StatCard title="Total Comments" value={totalFbComments.toLocaleString()} icon={MessageCircle} platform="facebook" />
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground text-lg">Videos</h2>
            </div>
            {loadingVideos ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : videoError ? (
              <div className="p-8 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-warning mx-auto" />
                <p className="text-sm font-medium text-foreground">Permission Required</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">{videoError}</p>
              </div>
            ) : fbVideos.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm">No videos found on this page</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {fbVideos.map((v) => {
                  const thumb = getVideoThumbnail(v);
                  return (
                    <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-muted-foreground/30 transition-colors">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-muted">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                            <Play className="w-5 h-5 text-foreground ml-0.5" />
                          </div>
                        </div>
                        {v.length && (
                          <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-xs px-1.5 py-0.5 rounded font-mono">
                            {formatDuration(v.length)}
                          </span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">
                          {v.title || v.description || 'Untitled Video'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_time).toLocaleDateString()}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(v.views || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {(v.likes?.summary?.total_count || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {(v.comments?.summary?.total_count || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <CommentDialog
                            objectId={v.id}
                            platform="facebook"
                            pageAccessToken={getSelectedPageToken()}
                            objectTitle={v.title || v.description}
                          />
                          <a
                            href={`https://www.facebook.com/${v.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6">
          {loadingIg ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : !igAccount ? (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-3">
              <Instagram className="w-10 h-10 text-instagram mx-auto" />
              <p className="font-medium text-foreground">No Instagram account linked</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                This Facebook page doesn't have a linked Instagram Business/Creator account.
                Make sure your Instagram is connected to this Facebook page in Meta Business Suite.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Followers" value={igAccount.followers_count?.toLocaleString() || "0"} icon={Eye} platform="instagram" />
                <StatCard title="Total Posts" value={igAccount.media_count?.toLocaleString() || "0"} icon={Video} platform="instagram" />
                <StatCard
                  title="Total Likes"
                  value={igMedia.reduce((s, m) => s + (m.like_count || 0), 0).toLocaleString()}
                  icon={Heart}
                  platform="instagram"
                />
              </div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
                <div className="p-5 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground text-lg">Recent Media</h2>
                </div>
                {igMedia.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">No media found</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {igMedia.map((m) => (
                      <div key={m.id} className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-muted-foreground/30 transition-colors">
                        {/* Thumbnail */}
                        <div className="relative aspect-square bg-muted">
                          {(m.thumbnail_url || m.media_url) ? (
                            <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Instagram className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          {m.media_type && (
                            <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase">
                              {m.media_type === 'VIDEO' ? 'Reel' : m.media_type?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-3 space-y-2">
                          <p className="text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
                            {m.caption || 'No caption'}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {(m.like_count || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {(m.comments_count || 0).toLocaleString()}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(m.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <CommentDialog
                              objectId={m.id}
                              platform="instagram"
                              pageAccessToken={getSelectedPageToken()}
                              objectTitle={m.caption}
                            />
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleteMediaId(m.id)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                            {m.permalink && (
                              <a
                                href={m.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                              >
                                <ExternalLink className="w-3 h-3" /> View on IG
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete IG Media Dialog */}
      <AlertDialog open={!!deleteMediaId} onOpenChange={v => !v && setDeleteMediaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instagram Post?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this post from Instagram. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIgMedia} disabled={isDeletingMedia} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingMedia ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialPage;
