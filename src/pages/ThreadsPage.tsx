import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Send, Loader2, RefreshCw, Image, Video, ExternalLink, Sparkles, Hash, Clock, CalendarClock, Trash2, Play, Pause, CheckCircle2, Database, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getThreadsProfile, getThreads, postThreadText, postThreadImage, postThreadVideo } from "@/lib/threads-api";
import { improveThread, suggestTopic, suggestBestTimes } from "@/lib/ai-suggest";
import { supabase } from "@/integrations/supabase/client";
import { fetchScripts, type Script } from "@/lib/scripts-api";

const ThreadsIcon = (props: any) => (
  <svg viewBox="0 0 192 192" className={props.className || "w-5 h-5"} fill="currentColor">
    <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C82.2364 44.745 69.7731 51.1409 62.102 62.7728L75.763 72.1024C81.3498 63.6975 89.7754 59.3803 97.2826 59.3803C97.3546 59.3803 97.4266 59.3803 97.4992 59.3816C106.308 59.4374 112.971 62.1687 117.332 67.5072C120.542 71.4452 122.684 76.9304 123.713 83.8672C117.099 82.6517 109.975 82.1872 102.39 82.4727C79.1036 83.3388 63.666 96.0342 64.8628 113.143C65.4707 121.82 69.8238 129.416 77.1418 134.495C83.3888 138.841 91.3843 141.046 99.7088 140.655C110.792 140.14 119.461 135.901 125.503 128.025C130.091 122.069 133.015 114.424 134.379 104.82C139.216 107.66 142.862 111.336 145.078 115.897C148.852 123.573 149.088 136.724 138.207 147.583C128.668 157.104 117.239 161.461 97.5005 161.615C75.6187 161.445 59.0538 154.822 48.1452 142.088C37.8499 130.049 32.4571 113.059 32.2766 91.3753C32.4571 69.6913 37.8499 52.7014 48.1452 40.6627C59.0538 27.9283 75.6187 21.3053 97.5005 21.1353C119.54 21.3067 136.345 28.0067 147.512 40.8826C153.003 47.2133 157.089 55.0755 159.692 64.1123L173.664 60.4479C170.519 49.4842 165.476 39.9095 158.675 32.0037C145.088 16.2802 125.546 8.10176 97.5608 7.89551H97.4399C69.5927 8.10176 50.2508 16.201 36.8837 31.7844C24.4176 46.1935 17.9842 66.0499 17.779 91.3153L17.7777 91.5003L17.779 91.6854C17.9842 116.951 24.4176 136.807 36.8837 151.216C50.2508 166.8 69.5927 174.898 97.4399 175.105H97.5608C120.858 174.928 135.349 169.242 147.788 156.834C164.554 140.102 163.913 118.608 158.398 107.545C154.508 99.7523 148.104 93.5483 141.537 88.9883ZM99.2031 126.081C88.5521 126.576 78.7652 121.439 78.3262 113.645C77.9916 107.846 82.2018 96.8453 102.699 96.0747C105.278 95.9773 107.814 95.929 110.306 95.929C115.963 95.929 121.326 96.3972 126.292 97.3027C124.388 118.891 112.417 125.467 99.2031 126.081Z" />
  </svg>
);

const ThreadsPage = () => {
  const [profile, setProfile] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postText, setPostText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [recommendedTopic, setRecommendedTopic] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [bestTimes, setBestTimes] = useState<any[]>([]);

  // Auto-post states
  const [autoPosts, setAutoPosts] = useState<any[]>([]);
  const [autoText, setAutoText] = useState("");
  const [autoTopic, setAutoTopic] = useState("");
  const [autoMediaUrl, setAutoMediaUrl] = useState("");
  const [autoMediaType, setAutoMediaType] = useState<"TEXT" | "IMAGE" | "VIDEO">("TEXT");
  const [autoInterval, setAutoInterval] = useState(10);
  const [autoPostsPerInterval, setAutoPostsPerInterval] = useState(1);
  const [autoMaxPosts, setAutoMaxPosts] = useState(5);
  const [creatingAuto, setCreatingAuto] = useState(false);

  // Scripts
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  useEffect(() => {
    loadProfile();
    loadThreads();
    loadAutoPosts();
  }, []);

  const loadProfile = async () => {
    const res = await getThreadsProfile();
    if (res.success && res.data) setProfile(res.data);
  };

  const loadThreads = async () => {
    setLoading(true);
    const res = await getThreads();
    if (res.success && res.data?.data) setThreads(res.data.data);
    else if (res.error) toast.error(res.error);
    setLoading(false);
  };

  const loadAutoPosts = async () => {
    const { data } = await supabase
      .from('threads_auto_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setAutoPosts(data || []);
  };

  const handlePost = async () => {
    if (!postText.trim() && mediaType === "text") { toast.error("Enter some text"); return; }
    setPosting(true);
    try {
      let res;
      if (mediaType === "image" && mediaUrl) res = await postThreadImage(postText, mediaUrl);
      else if (mediaType === "video" && mediaUrl) res = await postThreadVideo(postText, mediaUrl);
      else res = await postThreadText(postText);

      if (res.success) {
        toast.success("Posted to Threads!");
        setPostText(""); setMediaUrl(""); setAlternatives([]); setSuggestedTopics([]);
        loadThreads();
      } else toast.error(res.error || "Failed to post");
    } catch (err: any) { toast.error(err.message); }
    setPosting(false);
  };

  const handleAiImprove = async () => {
    if (!postText.trim()) { toast.error("Enter some text first"); return; }
    setAiLoading('improve');
    const res = await improveThread(postText);
    if (res.success && res.data) {
      if (res.data.text) setPostText(res.data.text);
      if (res.data.topic) setRecommendedTopic(res.data.topic);
      if (res.data.alternatives) setAlternatives(res.data.alternatives);
      toast.success("AI improved your thread!");
    } else toast.error(res.error || "AI suggestion failed");
    setAiLoading(null);
  };

  const handleSuggestTopics = async () => {
    if (!postText.trim()) { toast.error("Enter some text first"); return; }
    setAiLoading('topics');
    const res = await suggestTopic(postText);
    if (res.success && res.data) {
      setSuggestedTopics(res.data.topics || []);
      if (res.data.recommended) setRecommendedTopic(res.data.recommended);
    } else toast.error(res.error || "Failed to suggest topics");
    setAiLoading(null);
  };

  const handleBestTimes = async () => {
    setAiLoading('times');
    const res = await suggestBestTimes(postText || 'social media content', 'threads');
    if (res.success && res.data?.times) setBestTimes(res.data.times);
    else toast.error(res.error || "Failed to get times");
    setAiLoading(null);
  };

  const appendTopic = (topic: string) => {
    const cleaned = postText.replace(/#\w+\s*$/g, '').trim();
    setPostText(cleaned + (cleaned ? '\n\n' : '') + topic);
    setSuggestedTopics([]); setRecommendedTopic("");
    toast.success("Topic added!");
  };

  const handleCreateAutoPost = async () => {
    if (!autoText.trim()) { toast.error("Enter post text"); return; }
    setCreatingAuto(true);
    const nextPostAt = new Date(Date.now() + autoInterval * 60 * 60 * 1000);
    const { error } = await supabase.from('threads_auto_posts').insert({
      text: autoText,
      topic: autoTopic || null,
      media_url: autoMediaUrl || null,
      media_type: autoMediaType,
      interval_hours: autoInterval,
      posts_per_interval: autoPostsPerInterval,
      max_posts: autoMaxPosts,
      next_post_at: nextPostAt.toISOString(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Auto-post scheduled!");
      setAutoText(""); setAutoTopic(""); setAutoMediaUrl("");
      loadAutoPosts();
    }
    setCreatingAuto(false);
  };

  const toggleAutoPost = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('threads_auto_posts').update({ status: newStatus }).eq('id', id);
    toast.success(newStatus === 'active' ? 'Resumed' : 'Paused');
    loadAutoPosts();
  };

  const deleteAutoPost = async (id: string) => {
    await supabase.from('threads_auto_posts').delete().eq('id', id);
    toast.success("Auto-post deleted");
    loadAutoPosts();
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
    setAutoText(`🎮 ${script.title}\n\n${script.description}\n\nGame: ${script.game_name}`);
    setAutoTopic(`#${script.game_name.replace(/\s+/g, '')}`);
    if (script.github_video_url) {
      setAutoMediaUrl(script.github_video_url);
      setAutoMediaType("VIDEO");
    }
    setShowScripts(false);
    toast.success(`Loaded script: ${script.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
            <ThreadsIcon className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Threads</h1>
            <p className="text-sm text-muted-foreground">
              {profile ? `@${profile.username}` : "Post and manage your Threads content"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Compose */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">New Thread</h2>

        <div className="flex gap-2 mb-3">
          {(["text", "image", "video"] as const).map(t => (
            <Button key={t} variant={mediaType === t ? "default" : "outline"} size="sm" onClick={() => setMediaType(t)}>
              {t === "text" && "Text"}
              {t === "image" && <><Image className="w-4 h-4 mr-1" /> Image</>}
              {t === "video" && <><Video className="w-4 h-4 mr-1" /> Video</>}
            </Button>
          ))}
        </div>

        <Textarea placeholder="What's on your mind?" value={postText} onChange={e => setPostText(e.target.value)} rows={4} className="mb-2" maxLength={500} />
        <p className="text-xs text-muted-foreground mb-3">{postText.length}/500</p>

        {mediaType !== "text" && (
          <Input placeholder={`${mediaType === "image" ? "Image" : "Video"} URL (publicly accessible)`} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="mb-3" />
        )}

        {/* AI Tools */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Tools</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleAiImprove} disabled={!!aiLoading}>
              {aiLoading === 'improve' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              AI Improve
            </Button>
            <Button variant="outline" size="sm" onClick={handleSuggestTopics} disabled={!!aiLoading}>
              {aiLoading === 'topics' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Hash className="w-3 h-3 mr-1" />}
              Suggest Topics
            </Button>
            <Button variant="outline" size="sm" onClick={handleBestTimes} disabled={!!aiLoading}>
              {aiLoading === 'times' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Clock className="w-3 h-3 mr-1" />}
              Best Post Times
            </Button>
          </div>

          {/* Topic suggestions */}
          {suggestedTopics.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <span className="text-xs font-medium text-foreground">Suggested Topics (pick one per post)</span>
              {recommendedTopic && <p className="text-xs text-primary">⭐ Recommended: {recommendedTopic}</p>}
              <div className="flex flex-wrap gap-1.5">
                {suggestedTopics.map((topic, i) => (
                  <button key={i} onClick={() => appendTopic(topic)}
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${topic === recommendedTopic ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
              <span className="text-xs font-medium text-foreground">Alternative Versions</span>
              <div className="space-y-2">
                {alternatives.map((alt, i) => (
                  <button key={i} onClick={() => { setPostText(alt); setAlternatives([]); toast.success("Applied!"); }}
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
              <span className="text-xs font-medium text-foreground">Best Posting Times for Threads</span>
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

        <div className="flex gap-2">
          <Button onClick={handlePost} disabled={posting || (!postText.trim() && !mediaUrl)}>
            {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Post
          </Button>
        </div>
      </motion.div>

      {/* Auto-Post Scheduler */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <CalendarClock className="w-5 h-5" /> Auto-Posting
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

          <Textarea placeholder="Base text — AI will generate unique variations for each interval!" value={autoText} onChange={e => setAutoText(e.target.value)} rows={3} maxLength={500} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Topic Tag (optional)</label>
              <Input placeholder="#YourTopic" value={autoTopic} onChange={e => setAutoTopic(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Media URL (optional)</label>
              <Input placeholder="https://..." value={autoMediaUrl} onChange={e => setAutoMediaUrl(e.target.value)} />
            </div>
          </div>

          {autoMediaUrl && (
            <div className="flex gap-2">
              {(["TEXT", "IMAGE", "VIDEO"] as const).map(t => (
                <Button key={t} variant={autoMediaType === t ? "default" : "outline"} size="sm" onClick={() => setAutoMediaType(t)}>
                  {t}
                </Button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Interval (hours)</label>
              <Input type="number" min={1} value={autoInterval} onChange={e => setAutoInterval(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Posts per interval</label>
              <Input type="number" min={1} value={autoPostsPerInterval} onChange={e => setAutoPostsPerInterval(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Max intervals</label>
              <Input type="number" min={1} value={autoMaxPosts} onChange={e => setAutoMaxPosts(Number(e.target.value))} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Will post {autoPostsPerInterval} thread(s) every {autoInterval}h, up to {autoMaxPosts} intervals. Each interval counts as 1/{autoMaxPosts}. <span className="text-primary font-medium">✨ AI generates unique text for every post!</span>
          </p>

          <Button onClick={handleCreateAutoPost} disabled={creatingAuto || !autoText.trim()}>
            {creatingAuto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-2" />}
            Create Auto-Post
          </Button>
        </div>

        {/* Active auto-posts */}
        {autoPosts.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-foreground">Scheduled Auto-Posts</h3>
            {autoPosts.map(ap => (
              <div key={ap.id} className="p-3 rounded-lg border border-border bg-background flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{ap.text}</p>
                  {ap.topic && <span className="text-xs text-primary">{ap.topic}</span>}
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
                </div>
                <div className="flex gap-1">
                  {ap.status !== 'completed' && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleAutoPost(ap.id, ap.status)}>
                      {ap.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteAutoPost(ap.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Threads */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Recent Threads</h2>
          <Button variant="ghost" size="sm" onClick={loadThreads} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No threads found. Post your first thread above!</p>
        ) : (
          <div className="space-y-3">
            {threads.map(thread => (
              <div key={thread.id} className="p-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                <p className="text-sm text-foreground whitespace-pre-wrap">{thread.text}</p>
                {thread.media_url && thread.media_type === "IMAGE" && (
                  <img src={thread.media_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                )}
                {thread.media_url && thread.media_type === "VIDEO" && (
                  <video src={thread.media_url} controls className="mt-2 rounded-lg max-h-48" />
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{new Date(thread.timestamp).toLocaleDateString()}</span>
                  <span className="capitalize">{thread.media_type?.toLowerCase()}</span>
                  {thread.permalink && (
                    <a href={thread.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                      <ExternalLink className="w-3 h-3" /> View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ThreadsPage;
