import { motion } from "framer-motion";
import { Eye, ThumbsUp, MessageCircle, Users, Loader2, RefreshCw, Film, Heart, ExternalLink, Play, Video } from "lucide-react";
import { Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/StatCard";
import CommentDialog from "@/components/CommentDialog";
import { useEffect, useState } from "react";
import { getYouTubeChannels, getYouTubeChannelAnalytics } from "@/lib/youtube-api";
import { getFacebookPages, getPageVideos, getPageInsights, getInstagramAccount, getInstagramMedia } from "@/lib/facebook-api";

interface YtChannel {
  id: string;
  channelId: string;
  channelTitle: string;
}

interface YtVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

interface YtChannelStats {
  title: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface FbVideoItem {
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

const AnalyticsPage = () => {
  const [ytChannels, setYtChannels] = useState<YtChannel[]>([]);
  const [selectedYtChannel, setSelectedYtChannel] = useState<string | null>(null);
  const [ytStats, setYtStats] = useState<YtChannelStats | null>(null);
  const [ytVideos, setYtVideos] = useState<YtVideo[]>([]);
  const [loadingYt, setLoadingYt] = useState(true);
  const [loadingYtData, setLoadingYtData] = useState(false);

  // FB/IG state
  const [fbPages, setFbPages] = useState<any[]>([]);
  const [fbTotalFollowers, setFbTotalFollowers] = useState(0);
  const [igTotalFollowers, setIgTotalFollowers] = useState(0);
  const [igTotalPosts, setIgTotalPosts] = useState(0);
  const [loadingFb, setLoadingFb] = useState(true);

  // Per-page FB video data
  const [selectedFbPageId, setSelectedFbPageId] = useState<string | null>(null);
  const [fbVideos, setFbVideos] = useState<FbVideoItem[]>([]);
  const [loadingFbVideos, setLoadingFbVideos] = useState(false);

  // All IG accounts across pages
  const [allIgAccounts, setAllIgAccounts] = useState<Array<{ igAccount: any; pageId: string; pageAccessToken: string; pageName: string }>>([]);
  const [selectedIgAccountId, setSelectedIgAccountId] = useState<string | null>(null);
  const [igMedia, setIgMedia] = useState<any[]>([]);
  const [igAccount, setIgAccount] = useState<any>(null);
  const [loadingIgMedia, setLoadingIgMedia] = useState(false);

  useEffect(() => {
    loadYtChannels();
    loadFbData();
  }, []);

  const loadYtChannels = async () => {
    setLoadingYt(true);
    const res = await getYouTubeChannels();
    if (res.success && res.data?.channels) {
      setYtChannels(res.data.channels);
      if (res.data.channels.length > 0) {
        setSelectedYtChannel(res.data.channels[0].id);
      }
    }
    setLoadingYt(false);
  };

  const loadFbData = async () => {
    setLoadingFb(true);
    const res = await getFacebookPages();
    if (res.success && res.data?.data) {
      const pages = res.data.data;
      setFbPages(pages);
      let fbFollowers = 0;
      let igFollowers = 0;
      let igPosts = 0;

      const igAccounts: Array<{ igAccount: any; pageId: string; pageAccessToken: string; pageName: string }> = [];
      for (const page of pages) {
        fbFollowers += page.fan_count || 0;
        const igRes = await getInstagramAccount(page.id, page.access_token);
        if (igRes.success && igRes.data?.instagram_business_account) {
          const igAcc = igRes.data.instagram_business_account;
          igFollowers += igAcc.followers_count || 0;
          igPosts += igAcc.media_count || 0;
          igAccounts.push({ igAccount: igAcc, pageId: page.id, pageAccessToken: page.access_token, pageName: page.name });
        }
      }
      setFbTotalFollowers(fbFollowers);
      setIgTotalFollowers(igFollowers);
      setIgTotalPosts(igPosts);
      setAllIgAccounts(igAccounts);
      if (igAccounts.length > 0) {
        setSelectedIgAccountId(igAccounts[0].igAccount.id);
      }

      if (pages.length > 0) {
        setSelectedFbPageId(pages[0].id);
      }
    }
    setLoadingFb(false);
  };

  // Load FB videos for selected page
  useEffect(() => {
    if (!selectedFbPageId || fbPages.length === 0) return;
    const page = fbPages.find((p: any) => p.id === selectedFbPageId);
    if (!page) return;

    const loadPageContent = async () => {
      setLoadingFbVideos(true);
      const videosRes = await getPageVideos(selectedFbPageId, page.access_token);
      if (videosRes.success) {
        setFbVideos(videosRes.data?.data || []);
      } else {
        setFbVideos([]);
      }
      setLoadingFbVideos(false);
    };

    loadPageContent();
  }, [selectedFbPageId, fbPages]);

  // Load IG media for selected IG account
  useEffect(() => {
    if (!selectedIgAccountId || allIgAccounts.length === 0) return;
    const entry = allIgAccounts.find(e => e.igAccount.id === selectedIgAccountId);
    if (!entry) return;

    const loadIgContent = async () => {
      setLoadingIgMedia(true);
      setIgAccount(entry.igAccount);
      const mediaRes = await getInstagramMedia(entry.igAccount.id, entry.pageAccessToken);
      if (mediaRes.success) {
        setIgMedia(mediaRes.data?.data || []);
      } else {
        setIgMedia([]);
      }
      setLoadingIgMedia(false);
    };

    loadIgContent();
  }, [selectedIgAccountId, allIgAccounts]);

  useEffect(() => {
    if (!selectedYtChannel) return;
    const loadChannelData = async () => {
      setLoadingYtData(true);
      const res = await getYouTubeChannelAnalytics(selectedYtChannel);
      if (res.success && res.data) {
        setYtStats(res.data.channel);
        setYtVideos(res.data.videos || []);
      }
      setLoadingYtData(false);
    };
    loadChannelData();
  }, [selectedYtChannel]);

  const totalYtViews = ytVideos.reduce((s, v) => s + v.viewCount, 0);
  const totalYtLikes = ytVideos.reduce((s, v) => s + v.likeCount, 0);

  const getVideoThumbnail = (v: FbVideoItem): string | undefined => {
    if (!v.thumbnails?.data?.length) return undefined;
    const preferred = v.thumbnails.data.find(t => t.is_preferred);
    return (preferred || v.thumbnails.data[0])?.uri;
  };

  const selectedFbPage = fbPages.find((p: any) => p.id === selectedFbPageId);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics across all platforms</p>
        </div>
        <Button variant="outline" onClick={() => { loadYtChannels(); loadFbData(); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </motion.div>

      {/* Cross-platform overview */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="YT Subscribers" value={ytStats?.subscriberCount?.toLocaleString() || '—'} icon={Users} platform="youtube" />
        <StatCard title="FB Followers" value={loadingFb ? '...' : fbTotalFollowers.toLocaleString()} icon={Users} platform="facebook" />
        <StatCard title="IG Followers" value={loadingFb ? '...' : igTotalFollowers.toLocaleString()} icon={Users} platform="instagram" />
        <StatCard title="Total YT Views" value={ytStats?.viewCount?.toLocaleString() || '—'} icon={Eye} platform="youtube" />
      </motion.div>

      <Tabs defaultValue="youtube" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="youtube" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <YtIcon /> <span className="ml-2">YouTube</span>
          </TabsTrigger>
          <TabsTrigger value="facebook" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Facebook className="w-4 h-4 mr-2" /> Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Instagram className="w-4 h-4 mr-2" /> Instagram
          </TabsTrigger>
        </TabsList>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-6">
          {loadingYt ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : ytChannels.length === 0 ? (
            <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-3">
              <YtIcon />
              <p className="font-medium text-foreground">No YouTube channels connected</p>
              <p className="text-sm text-muted-foreground">Connect your YouTube channels in Settings.</p>
            </div>
          ) : (
            <>
              {ytChannels.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {ytChannels.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedYtChannel(ch.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedYtChannel === ch.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      <YtIcon />
                      {ch.channelTitle || 'Channel'}
                    </button>
                  ))}
                </div>
              )}

              {loadingYtData ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard title="Subscribers" value={ytStats?.subscriberCount?.toLocaleString() || '0'} icon={Users} platform="youtube" />
                    <StatCard title="Total Views" value={ytStats?.viewCount?.toLocaleString() || '0'} icon={Eye} platform="youtube" />
                    <StatCard title="Videos" value={ytStats?.videoCount?.toLocaleString() || '0'} icon={Film} platform="youtube" />
                    <StatCard title="Recent Likes" value={totalYtLikes.toLocaleString()} icon={ThumbsUp} platform="youtube" />
                  </div>

                  <div className="bg-card rounded-xl shadow-card border border-border/50">
                    <div className="p-5 border-b border-border">
                      <h2 className="font-display font-semibold text-foreground text-lg">Recent Videos</h2>
                    </div>
                    {ytVideos.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground text-sm">No videos found</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {ytVideos.map(v => (
                          <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-muted-foreground/30 transition-colors">
                            <div className="relative aspect-video bg-muted">
                              {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                                  <Play className="w-5 h-5 text-foreground ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="p-3 space-y-2">
                              <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">{v.title}</p>
                              <p className="text-xs text-muted-foreground">{new Date(v.publishedAt).toLocaleDateString()}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.viewCount.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {v.likeCount.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {v.commentCount.toLocaleString()}</span>
                              </div>
                              <div className="pt-1">
                                <a
                                  href={`https://youtube.com/watch?v=${v.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="w-3 h-3" /> Watch on YT
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Facebook Tab */}
        <TabsContent value="facebook" className="space-y-6">
          {loadingFb ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Pages" value={fbPages.length.toString()} icon={Facebook} platform="facebook" />
                <StatCard title="Total Followers" value={fbTotalFollowers.toLocaleString()} icon={Users} platform="facebook" />
                <StatCard title="Videos" value={fbVideos.length.toString()} icon={Film} platform="facebook" />
              </div>

              {/* FB page selector */}
              {fbPages.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {fbPages.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedFbPageId(p.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selectedFbPageId === p.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      {p.picture?.data?.url && <img src={p.picture.data.url} alt="" className="w-4 h-4 rounded-full" />}
                      {p.name}
                    </button>
                  ))}
                </div>
              )}

              {/* FB Videos grid */}
              <div className="bg-card rounded-xl shadow-card border border-border/50">
                <div className="p-5 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground text-lg">
                    {selectedFbPage?.name || 'Page'} Videos
                  </h2>
                </div>
                {loadingFbVideos ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : fbVideos.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">No videos found</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {fbVideos.map(v => {
                      const thumb = getVideoThumbnail(v);
                      return (
                        <div key={v.id} className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-muted-foreground/30 transition-colors">
                          <div className="relative aspect-video bg-muted">
                            {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : (
                              <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-muted-foreground" /></div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center">
                                <Play className="w-5 h-5 text-foreground ml-0.5" />
                              </div>
                            </div>
                          </div>
                          <div className="p-3 space-y-2">
                            <p className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">{v.title || v.description || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground">{new Date(v.created_time).toLocaleDateString()}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {(v.views || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {(v.likes?.summary?.total_count || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {(v.comments?.summary?.total_count || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <CommentDialog
                                objectId={v.id}
                                platform="facebook"
                                pageAccessToken={selectedFbPage?.access_token}
                                objectTitle={v.title || v.description}
                              />
                              <a href={`https://www.facebook.com/${v.id}`} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6">
          {loadingFb ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="IG Followers" value={igTotalFollowers.toLocaleString()} icon={Users} platform="instagram" />
                <StatCard title="Total Posts" value={igTotalPosts.toLocaleString()} icon={Film} platform="instagram" />
                <StatCard title="Total Likes" value={igMedia.reduce((s: number, m: any) => s + (m.like_count || 0), 0).toLocaleString()} icon={Heart} platform="instagram" />
              </div>

              {/* IG account selector */}
              {allIgAccounts.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {allIgAccounts.map((entry) => (
                    <button
                      key={entry.igAccount.id}
                      onClick={() => setSelectedIgAccountId(entry.igAccount.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        selectedIgAccountId === entry.igAccount.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      <Instagram className="w-4 h-4 text-instagram" />
                      {entry.igAccount.username ? `@${entry.igAccount.username}` : entry.pageName}
                    </button>
                  ))}
                </div>
              )}

              {/* IG Media grid */}
              <div className="bg-card rounded-xl shadow-card border border-border/50">
                <div className="p-5 border-b border-border">
                  <h2 className="font-display font-semibold text-foreground text-lg">
                    {igAccount ? `@${igAccount.username}` : selectedFbPage?.name || 'Page'} Media
                  </h2>
                </div>
                {loadingIgMedia ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : !igAccount ? (
                  <div className="p-8 text-center space-y-2">
                    <Instagram className="w-8 h-8 text-instagram mx-auto" />
                    <p className="text-sm text-muted-foreground">No Instagram account linked to this page</p>
                  </div>
                ) : igMedia.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm">No media found</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {igMedia.map((m: any) => (
                      <div key={m.id} className="rounded-lg border border-border overflow-hidden bg-muted/30 hover:border-muted-foreground/30 transition-colors">
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
                        <div className="p-3 space-y-2">
                          <p className="text-sm text-foreground line-clamp-2 min-h-[2.5rem]">{m.caption || 'No caption'}</p>
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
                              pageAccessToken={allIgAccounts.find(e => e.igAccount.id === selectedIgAccountId)?.pageAccessToken}
                              objectTitle={m.caption}
                            />
                            {m.permalink && (
                              <a href={m.permalink} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1">
                                <ExternalLink className="w-3 h-3" /> View on IG
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
