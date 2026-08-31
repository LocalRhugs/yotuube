import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Facebook, Loader2, CalendarClock, Trash2, Play, Pause, Sparkles, Hash, Clock, Video, FileText, RefreshCw, Database, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getFacebookPages } from "@/lib/facebook-api";
import { improveFacebookPost, suggestFacebookHashtags, suggestBestTimes } from "@/lib/ai-suggest";
import { supabase } from "@/integrations/supabase/client";
import { fetchScripts, type Script } from "@/lib/scripts-api";

interface FbPage {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
}

const FacebookAutoPostPage = () => {
  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FbPage | null>(null);
  const [loadingPages, setLoadingPages] = useState(true);

  // Auto-post form
  const [postType, setPostType] = useState<"video" | "text">("text");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [interval, setInterval] = useState(10);
  const [postsPerInterval, setPostsPerInterval] = useState(1);
  const [maxPosts, setMaxPosts] = useState(5);
  const [creating, setCreating] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [bestTimes, setBestTimes] = useState<any[]>([]);

  // Existing auto-posts
  const [autoPosts, setAutoPosts] = useState<any[]>([]);

  // Scripts
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  useEffect(() => {
    loadPages();
    loadAutoPosts();
  }, []);

  const loadPages = async () => {
    setLoadingPages(true);
    const res = await getFacebookPages();
    if (res.success && res.data?.data) {
      const fetchedPages = res.data.data;
      setPages(fetchedPages);
      if (fetchedPages.length > 0) setSelectedPage(fetchedPages[0]);
    }
    setLoadingPages(false);
  };

  const loadAutoPosts = async () => {
    const { data } = await supabase
      .from('facebook_auto_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setAutoPosts(data || []);
  };

  const handleCreate = async () => {
    if (pages.length === 0) { toast.error("No pages available"); return; }
    if (!description.trim()) { toast.error("Enter a description/post text"); return; }
    if (postType === "video" && !videoUrl.trim()) { toast.error("Enter a video URL"); return; }
    setCreating(true);

    const nextPostAt = new Date(Date.now() + interval * 60 * 60 * 1000);
    const pagesToPost = pages.filter(p => p.access_token);
    
    if (pagesToPost.length === 0) { toast.error("No pages with valid tokens"); setCreating(false); return; }

    const rows = pagesToPost.map(p => ({
      page_id: p.id,
      page_name: p.name,
      page_access_token: p.access_token!,
      post_type: postType,
      video_url: postType === "video" ? videoUrl : null,
      title: title || null,
      description,
      hashtags: hashtags || null,
      interval_hours: interval,
      posts_per_interval: postsPerInterval,
      max_posts: maxPosts,
      next_post_at: nextPostAt.toISOString(),
    }));

    const { error } = await supabase.from('facebook_auto_posts').insert(rows);

    if (error) toast.error(error.message);
    else {
      toast.success(`Auto-post scheduled for ${pagesToPost.length} page(s)!`);
      setDescription(""); setTitle(""); setVideoUrl(""); setHashtags("");
      setAlternatives([]); setSuggestedHashtags([]);
      loadAutoPosts();
    }
    setCreating(false);
  };

  const toggleAutoPost = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('facebook_auto_posts').update({ status: newStatus }).eq('id', id);
    toast.success(newStatus === 'active' ? 'Resumed' : 'Paused');
    loadAutoPosts();
  };

  const deleteAutoPost = async (id: string) => {
    await supabase.from('facebook_auto_posts').delete().eq('id', id);
    toast.success("Auto-post deleted");
    loadAutoPosts();
  };

  // AI handlers
  const handleAiImprove = async () => {
    if (!description.trim()) { toast.error("Enter some text first"); return; }
    setAiLoading('improve');
    const res = await improveFacebookPost(description);
    if (res.success && res.data) {
      if (res.data.description) setDescription(res.data.description);
      if (res.data.hashtags) setHashtags(res.data.hashtags.join(' '));
      if (res.data.alternatives) setAlternatives(res.data.alternatives);
      toast.success("AI improved your post!");
    } else toast.error(res.error || "AI suggestion failed");
    setAiLoading(null);
  };

  const handleSuggestHashtags = async () => {
    if (!description.trim()) { toast.error("Enter some text first"); return; }
    setAiLoading('hashtags');
    const res = await suggestFacebookHashtags(description);
    if (res.success && res.data?.hashtags) {
      setSuggestedHashtags(res.data.hashtags);
    } else toast.error(res.error || "Failed to suggest hashtags");
    setAiLoading(null);
  };

  const handleBestTimes = async () => {
    setAiLoading('times');
    const res = await suggestBestTimes(description || 'facebook content', 'facebook');
    if (res.success && res.data?.times) setBestTimes(res.data.times);
    else toast.error(res.error || "Failed to get times");
    setAiLoading(null);
  };

  const applyHashtags = (tags: string[]) => {
    setHashtags(tags.join(' '));
    setSuggestedHashtags([]);
    toast.success("Hashtags applied!");
  };

  const loadScripts = async () => {
    setLoadingScripts(true);
    try {
      const res = await fetchScripts({ limit: 20 });
      setScripts(res.data);
    } catch (err: any) {
      toast.error("Failed to load scripts: " + err.message);
    }
    setLoadingScripts(false);
  };

  const useScript = (script: Script) => {
    setDescription(`🎮 ${script.title}\n\n${script.description}\n\nGame: ${script.game_name}`);
    if (script.github_video_url) {
      setVideoUrl(script.github_video_url);
      setPostType("video");
    }
    setHashtags(`#${script.game_name.replace(/\s+/g, '')} #roblox #gaming #scripts`);
    setShowScripts(false);
    toast.success(`Loaded script: ${script.title}`);
  };

  if (loadingPages) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[hsl(220,46%,48%)] flex items-center justify-center">
            <Facebook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Facebook Auto-Post</h1>
            <p className="text-sm text-muted-foreground">Schedule automated posts to grow your Facebook page</p>
          </div>
        </div>
      </motion.div>

      {/* Page selector */}
      {pages.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <Facebook className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-medium text-foreground">No pages found</p>
          <p className="text-sm text-muted-foreground">Connect your Facebook in Settings first.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {pages.map((p) => (
              <button key={p.id} onClick={() => setSelectedPage(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedPage?.id === p.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                }`}>
                {p.picture?.data?.url && <img src={p.picture.data.url} alt="" className="w-5 h-5 rounded-full" />}
                {p.name}
              </button>
            ))}
          </div>

          {/* Create auto-post */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarClock className="w-5 h-5" /> New Auto-Post
            </h2>

            <div className="space-y-3">
              {/* Load from Scripts API */}
              <div>
                <Button variant="outline" size="sm" onClick={() => { setShowScripts(!showScripts); if (!showScripts && scripts.length === 0) loadScripts(); }}>
                  <Database className="w-4 h-4 mr-1" />
                  Load from Scripts
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showScripts ? 'rotate-180' : ''}`} />
                </Button>
                {showScripts && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-lg bg-background">
                    {loadingScripts ? (
                      <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                    ) : scripts.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground text-center">No scripts found</p>
                    ) : (
                      scripts.map(s => (
                        <button key={s.id} onClick={() => useScript(s)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border last:border-0 transition-colors">
                          <p className="text-sm font-medium text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.game_name} · {s.likes_count} likes · {s.downloads_count} downloads</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Post type */}
              <div className="flex gap-2">
                <Button variant={postType === "text" ? "default" : "outline"} size="sm" onClick={() => setPostType("text")}>
                  <FileText className="w-4 h-4 mr-1" /> Text Post
                </Button>
                <Button variant={postType === "video" ? "default" : "outline"} size="sm" onClick={() => setPostType("video")}>
                  <Video className="w-4 h-4 mr-1" /> Video
                </Button>
              </div>

              {postType === "video" && (
                <>
                  <Input placeholder="Video URL (publicly accessible)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                  <Input placeholder="Video title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
                </>
              )}

              <Textarea placeholder="Post description / text — AI will generate unique variations for each interval!" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
              
              <Input placeholder="Hashtags (2-5 recommended, e.g. #gaming #viral)" value={hashtags} onChange={e => setHashtags(e.target.value)} />

              {/* AI Tools */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">AI Tools (Facebook Growth Optimized)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleAiImprove} disabled={!!aiLoading}>
                    {aiLoading === 'improve' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    AI Improve
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSuggestHashtags} disabled={!!aiLoading}>
                    {aiLoading === 'hashtags' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Hash className="w-3 h-3 mr-1" />}
                    Suggest Hashtags
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBestTimes} disabled={!!aiLoading}>
                    {aiLoading === 'times' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
                    Best Post Times
                  </Button>
                </div>

                {/* Suggested hashtags */}
                {suggestedHashtags.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-medium text-foreground">Suggested Hashtags (2-5 recommended for Facebook)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedHashtags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{tag}</span>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => applyHashtags(suggestedHashtags)}>
                      Apply All
                    </Button>
                  </div>
                )}

                {/* Alternatives */}
                {alternatives.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-medium text-foreground">Alternative Versions</span>
                    <div className="space-y-2">
                      {alternatives.map((alt, i) => (
                        <button key={i} onClick={() => { setDescription(alt); setAlternatives([]); toast.success("Applied!"); }}
                          className="w-full text-left text-xs p-2 rounded bg-background hover:bg-muted/50 border border-border transition-colors">
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best times */}
                {bestTimes.length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-medium text-foreground">Best Posting Times for Facebook</span>
                    <div className="space-y-1">
                      {bestTimes.map((t, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{t.day} {t.time}</span> — {t.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scheduling options */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Interval (hours)</label>
                  <Input type="number" min={1} value={interval} onChange={e => setInterval(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Posts per interval</label>
                  <Input type="number" min={1} value={postsPerInterval} onChange={e => setPostsPerInterval(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Max intervals</label>
                  <Input type="number" min={1} value={maxPosts} onChange={e => setMaxPosts(Number(e.target.value))} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Will post {postsPerInterval} time(s) every {interval}h, up to {maxPosts} intervals. Each interval counts as 1/{maxPosts}. <span className="text-primary font-medium">✨ AI generates unique text for every post!</span>
              </p>

              <Button onClick={handleCreate} disabled={creating || !description.trim()}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
                Create Auto-Post
              </Button>
            </div>
          </motion.div>

          {/* Active auto-posts */}
          {autoPosts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-foreground">Scheduled Auto-Posts</h2>
                <Button variant="ghost" size="sm" onClick={loadAutoPosts}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {autoPosts.map(ap => (
                  <div key={ap.id} className="p-3 rounded-lg border border-border bg-background flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ap.post_type === 'video' ? <Video className="w-3 h-3 text-muted-foreground" /> : <FileText className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-xs text-muted-foreground">{ap.page_name || 'Page'}</span>
                      </div>
                      <p className="text-sm text-foreground truncate">{ap.title || ap.description}</p>
                      {ap.hashtags && <p className="text-xs text-primary mt-0.5">{ap.hashtags}</p>}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          ap.status === 'active' ? 'bg-green-500/10 text-green-600' :
                          ap.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-yellow-500/10 text-yellow-600'
                        }`}>{ap.status}</span>
                        <span>{ap.current_count}/{ap.max_posts} intervals</span>
                        <span>•</span>
                        <span>{ap.posts_per_interval} post(s) every {ap.interval_hours}h</span>
                      </div>
                      {ap.last_result?.error && (
                        <p className="text-xs text-destructive mt-1">Last error: {ap.last_result.error}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {ap.status !== 'completed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAutoPost(ap.id, ap.status)}>
                          {ap.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAutoPost(ap.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default FacebookAutoPostPage;
