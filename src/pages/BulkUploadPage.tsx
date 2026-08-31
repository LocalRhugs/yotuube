import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Upload, Trash2, ChevronDown, ChevronUp, Sparkles, Film, Tag,
  FolderOpen, Shield, Scissors, ImageIcon, Globe, Eye, Lock,
  CheckCircle2, AlertCircle, Loader2, Settings2, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ChannelSelector } from "@/components/ChannelSelector";
import VideoEditor from "@/components/VideoEditor";
import {
  getStoredChannels,
  getUploadDefaults,
  uploadVideoToYouTube,
  uploadThumbnail,
  type StoredYouTubeChannel,
} from "@/lib/youtube-direct";
import { generateYouTubeSmartLink, translateText } from "@/lib/smart-link-api";

type PrivacyStatus = "public" | "private" | "unlisted";
type UploadMode = "same" | "different";

interface VideoUploadItem {
  id: string;
  file: File | null;
  title: string;
  description: string;
  channels: string[];
  tags: string;
  category: string;
  privacy: PrivacyStatus;
  allowComments: boolean;
  allowRatings: boolean;
  thumbnail: File | null;
  thumbnailPreview: string | null;
  scheduled: boolean;
  scheduleTime: string;
  expandedSettings: boolean;
  previewUrl: string | null;
  duration: number | null;
  isShort: boolean;
  showEditor: boolean;
  dualUpload: boolean;
  customShortsDuration: number;
  repeatCount: number;
  multiLangTargets: string[];
}

type UploadStatusMap = Record<string, "pending" | "uploading" | "success" | "error">;

const CATEGORIES = [
  { id: "1", name: "Film & Animation" }, { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" }, { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" }, { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" }, { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" }, { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" }, { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" }, { id: "28", name: "Science & Technology" },
];

const PRIVACY_OPTIONS = [
  { value: "public" as PrivacyStatus, label: "Public", icon: <Globe className="w-4 h-4" />, description: "Everyone can find and watch" },
  { value: "unlisted" as PrivacyStatus, label: "Unlisted", icon: <Eye className="w-4 h-4" />, description: "Only with the link" },
  { value: "private" as PrivacyStatus, label: "Private", icon: <Lock className="w-4 h-4" />, description: "Only you" },
];

const cleanFilename = (name: string) =>
  name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
    .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const BulkUploadPage = () => {
  const [uploadMode, setUploadMode] = useState<UploadMode>("same");
  const [globalChannels, setGlobalChannels] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatusMap>({});
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({});

  const [globalPrivacy, setGlobalPrivacy] = useState<PrivacyStatus>("private");
  const [globalCategory, setGlobalCategory] = useState("22");
  const [globalAllowComments, setGlobalAllowComments] = useState(true);
  const [globalAllowRatings, setGlobalAllowRatings] = useState(true);

  const [channelTokenMap, setChannelTokenMap] = useState<Record<string, StoredYouTubeChannel>>({});

  // Load channel token map for direct API calls
  useEffect(() => {
    const load = async () => {
      const channels = await getStoredChannels();
      const map: Record<string, StoredYouTubeChannel> = {};
      channels.forEach(ch => { map[ch.id] = ch; });
      setChannelTokenMap(map);
    };
    load();
  }, []);

  // Load global defaults from first channel
  useEffect(() => {
    if (globalChannels.length > 0) {
      const defaults = getUploadDefaults(channelTokenMap[globalChannels[0]]?.channelId || undefined);
      if (defaults) {
        setGlobalPrivacy(defaults.privacy);
        setGlobalCategory(defaults.category);
        setGlobalAllowComments(defaults.allowComments);
        setGlobalAllowRatings(defaults.allowRatings);
      }
    }
  }, [globalChannels, channelTokenMap]);

  const addVideo = () => {
    const channelId = globalChannels[0] ? channelTokenMap[globalChannels[0]]?.channelId : undefined;
    const defaults = getUploadDefaults(channelId || undefined);
    const newVideo: VideoUploadItem = {
      id: `video-${Date.now()}`,
      file: null, title: "", description: defaults?.description || "",
      channels: uploadMode === "same" ? globalChannels : [],
      tags: defaults?.tags || "",
      category: defaults?.category || globalCategory,
      privacy: defaults?.privacy || globalPrivacy,
      allowComments: defaults?.allowComments ?? globalAllowComments,
      allowRatings: defaults?.allowRatings ?? globalAllowRatings,
      thumbnail: null, thumbnailPreview: null,
      scheduled: false, scheduleTime: "",
      expandedSettings: false, previewUrl: null, duration: null,
      isShort: false, showEditor: false, dualUpload: false, customShortsDuration: 59,
      repeatCount: 1,
      multiLangTargets: [],
    };
    setVideos(prev => [...prev, newVideo]);
  };

  const removeVideo = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));

  const updateVideo = (id: string, updates: Partial<VideoUploadItem>) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));

  const applyGlobalSettings = () =>
    setVideos(prev => prev.map(v => ({
      ...v, privacy: globalPrivacy, category: globalCategory,
      allowComments: globalAllowComments, allowRatings: globalAllowRatings,
    })));

  const handleFileChange = (id: string, file: File | null) => {
    if (file && file.size > 128 * 1024 * 1024 * 1024) {
      toast.error("File must be under 128 GB");
      return;
    }
    const current = videos.find(v => v.id === id);
    const updates: Partial<VideoUploadItem> = { file, showEditor: false };
    if (file && !current?.title) updates.title = cleanFilename(file.name);
    updates.previewUrl = file ? URL.createObjectURL(file) : null;
    updateVideo(id, updates);
  };

  const handleThumbnailChange = (id: string, file: File | null) => {
    if (file && file.size > 2 * 1024 * 1024) { toast.error("Thumbnail must be under 2 MB"); return; }
    updateVideo(id, { thumbnail: file, thumbnailPreview: file ? URL.createObjectURL(file) : null });
  };

  const uploadSingleVideo = async (video: VideoUploadItem): Promise<boolean> => {
    if (!video.file || !video.title) return false;
    const targetChannelIds = uploadMode === "same" ? globalChannels : video.channels;
    if (targetChannelIds.length === 0) return false;
    const totalRepeats = video.repeatCount || 1;

    try {
      setUploadStatus(p => ({ ...p, [video.id]: "uploading" }));
      const parsedTags = video.tags.split(",").map(t => t.trim()).filter(Boolean).slice(0, 30);

      // Build language passes: original first, then 1 translated copy per selected language.
      const langPasses: Array<{ lang: string; title: string; description: string; langCode: string }> = [
        { lang: 'Original', title: video.title, description: video.description, langCode: 'en' },
      ];
      for (const targetLang of (video.multiLangTargets || [])) {
        if (targetLang === 'en') continue;
        setStatusMessages(p => ({ ...p, [video.id]: `Translating to ${targetLang.toUpperCase()}...` }));
        const [tRes, dRes] = await Promise.all([
          translateText(video.title, targetLang, 'en'),
          video.description ? translateText(video.description, targetLang, 'en') : Promise.resolve({ success: true, translatedText: '' } as any),
        ]);
        langPasses.push({
          lang: targetLang.toUpperCase(),
          title: tRes.success && tRes.translatedText ? tRes.translatedText : video.title,
          description: dRes.success && dRes.translatedText !== undefined ? dRes.translatedText : video.description,
          langCode: targetLang,
        });
      }

      const totalUnits = totalRepeats * langPasses.length * targetChannelIds.length;
      let unitIdx = 0;

      for (let repeatIdx = 0; repeatIdx < totalRepeats; repeatIdx++) {
        const repeatLabel = totalRepeats > 1 ? ` (copy ${repeatIdx + 1}/${totalRepeats})` : '';

      for (const langPass of langPasses) {
        const langSuffix = langPasses.length > 1 ? ` [${langPass.lang}]` : '';

      for (let i = 0; i < targetChannelIds.length; i++) {
        const chId = targetChannelIds[i];
        const channelData = channelTokenMap[chId];
        if (!channelData) continue;

        setStatusMessages(p => ({ ...p, [video.id]: `Uploading to ${channelData.channelTitle || "channel"}${langSuffix}${repeatLabel} (${unitIdx + 1}/${totalUnits})…` }));

        const isShort = video.isShort && (video.duration || 0) <= 60;
        const baseTitle = langPass.title;
        const baseDesc = langPass.description;
        const title = isShort && !baseTitle.includes("#Shorts") ? `${baseTitle} #Shorts` : baseTitle;
        const description = isShort && !baseDesc.includes("#Shorts") ? `${baseDesc}\n\n#Shorts` : baseDesc;
        const tags = isShort ? [...parsedTags, "Shorts", "Short"].filter((t, i, s) => s.indexOf(t) === i) : parsedTags;

        const result = await uploadVideoToYouTube(
          channelData.accessToken,
          video.file,
          {
            title, description, tags,
            categoryId: video.category,
            privacyStatus: video.privacy,
            allowComments: video.allowComments,
            allowRatings: video.allowRatings,
            scheduled: video.scheduled && video.scheduleTime ? video.scheduleTime : undefined,
            defaultLanguage: langPass.langCode,
          },
          (pct) => setUploadProgress(p => ({ ...p, [video.id]: Math.round((unitIdx / totalUnits) * 100 + pct / totalUnits) }))
        );

        if (!result.success) throw new Error(result.error || "Upload failed");

        if (video.thumbnail && result.videoId) {
          await uploadThumbnail(channelData.accessToken, result.videoId, video.thumbnail);
        }

        // Generate smart link if enabled
        if (result.videoId && channelData.channelId) {
          const defaults = getUploadDefaults();
          if (defaults?.socialUnlockEnabled && defaults.socialUnlockTargetUrl) {
            const slRes = await generateYouTubeSmartLink({
              videoId: result.videoId,
              channelId: channelData.channelId,
              targetUrl: defaults.socialUnlockTargetUrl,
              actions: defaults.socialUnlockActions || { subscribe: true, like: true, comment: false },
            }, true);
            if (slRes.success && slRes.smartLink) {
              toast.success(`Smart link: ${slRes.smartLink}`);
            }
          }
        }

        unitIdx++;
        setUploadProgress(p => ({ ...p, [video.id]: Math.round((unitIdx / totalUnits) * 100) }));
      }
      } // end langPass loop
      } // end repeatCount loop

      setUploadStatus(p => ({ ...p, [video.id]: "success" }));
      setStatusMessages(p => ({ ...p, [video.id]: `Uploaded ${totalUnits} time(s) across ${targetChannelIds.length} channel(s)` }));
      return true;
    } catch (err: any) {
      setUploadStatus(p => ({ ...p, [video.id]: "error" }));
      setStatusMessages(p => ({ ...p, [video.id]: err.message || "Upload failed" }));
      return false;
    }
  };

  const handleBulkUpload = async () => {
    const uploadable = videos.filter(v => v.file && v.title);
    if (uploadable.length === 0) { toast.error("Add at least one video with a title."); return; }
    if (uploadMode === "same" && globalChannels.length === 0) { toast.error("Select at least one channel."); return; }

    setIsUploading(true);
    let success = 0;
    for (const video of uploadable) {
      const ok = await uploadSingleVideo(video);
      if (ok) success++;
      await new Promise(r => setTimeout(r, 300));
    }
    setIsUploading(false);
    if (success === uploadable.length) toast.success(`All ${success} video(s) uploaded!`);
    else toast.warning(`Uploaded ${success}/${uploadable.length} videos.`);
  };

  // Show editor full-screen if any video is in edit mode
  const videoInEditor = videos.find(v => v.showEditor && v.file);
  if (videoInEditor) {
    return (
      <VideoEditor
        file={videoInEditor.file!}
        onSave={(edited) => updateVideo(videoInEditor.id, { file: edited, showEditor: false, previewUrl: URL.createObjectURL(edited) })}
        onCancel={() => updateVideo(videoInEditor.id, { showEditor: false })}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Bulk Upload</h1>
        <p className="text-muted-foreground">Upload multiple videos to multiple YouTube channels at once</p>
      </motion.div>

      {/* Upload Mode */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Upload Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: "same" as UploadMode, label: "Same Video, Multiple Channels", desc: "Upload one video to multiple channels" },
              { value: "different" as UploadMode, label: "Different Videos per Channel", desc: "Assign each video to specific channels" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setUploadMode(opt.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  uploadMode === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Channel Selector (Same mode) */}
      {uploadMode === "same" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Target Channels</h3>
            <ChannelSelector
              selectedChannels={globalChannels}
              onChannelsChange={setGlobalChannels}
              disabled={isUploading}
            />
          </Card>
        </motion.div>
      )}

      {/* Global Defaults */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card className="p-5 bg-muted/30 border-dashed">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Default Settings
            </h3>
            <Button onClick={applyGlobalSettings} variant="outline" size="sm" disabled={isUploading}>
              Apply to All
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Default Privacy</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIVACY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGlobalPrivacy(opt.value)}
                    className={`p-2 rounded-lg border-2 text-center text-xs transition-all ${
                      globalPrivacy === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex justify-center mb-1">{opt.icon}</div>
                    <p className="font-semibold">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Default Category</label>
              <select
                value={globalCategory}
                onChange={e => setGlobalCategory(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-border">
            {[
              { label: "Allow comments", key: "globalAllowComments", val: globalAllowComments, set: setGlobalAllowComments },
              { label: "Show likes/dislikes", key: "globalAllowRatings", val: globalAllowRatings, set: setGlobalAllowRatings },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} className="rounded w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Video List */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Videos to Upload ({videos.length})</h3>
          <Button onClick={addVideo} variant="outline" size="sm" disabled={isUploading}>
            <Plus className="w-4 h-4 mr-1" /> Add Video
          </Button>
        </div>

        {videos.length === 0 ? (
          <Card className="p-10 text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No videos added yet. Click "Add Video" to get started.</p>
          </Card>
        ) : (
          videos.map(video => (
            <Card key={video.id} className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{video.title || "Untitled Video"}</p>
                  <p className="text-xs text-muted-foreground">{video.file?.name || "No file selected"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm"
                    onClick={() => updateVideo(video.id, { expandedSettings: !video.expandedSettings })}
                    className="text-muted-foreground h-8 w-8 p-0"
                  >
                    {video.expandedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={isUploading}
                    onClick={() => removeVideo(video.id)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* File + Thumbnail */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Video File</label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById(`file-${video.id}`)?.click()}
                  >
                    <p className="text-sm">{video.file?.name || "Click to select video"}</p>
                    <input id={`file-${video.id}`} type="file" accept="video/*" className="hidden"
                      disabled={isUploading}
                      onChange={e => handleFileChange(video.id, e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Thumbnail (Optional)</label>
                  {video.thumbnailPreview ? (
                    <div className="space-y-2">
                      <div className="relative border-2 border-border rounded-lg overflow-hidden aspect-video">
                        <img src={video.thumbnailPreview} alt="Custom video thumbnail preview" className="w-full h-full object-cover" />
                        <Button variant="destructive" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0"
                          onClick={() => updateVideo(video.id, { thumbnail: null, thumbnailPreview: null })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer aspect-video flex items-center justify-center"
                      onClick={() => document.getElementById(`thumb-${video.id}`)?.click()}
                    >
                      <div>
                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Click for thumbnail</p>
                      </div>
                    </div>
                  )}
                  <input id={`thumb-${video.id}`} type="file" accept="image/*" className="hidden"
                    onChange={e => handleThumbnailChange(video.id, e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {/* Video preview + metadata */}
              {video.file && video.previewUrl && (
                <Card className="overflow-hidden border-2">
                  <div className="bg-muted/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Preview</span>
                        {video.duration !== null && video.duration <= 60 && (
                           <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            <Sparkles className="w-3 h-3" /> Shorts Eligible
                          </span>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"
                        onClick={() => updateVideo(video.id, { showEditor: true })} disabled={isUploading}>
                        <Scissors className="w-3.5 h-3.5" /> Edit
                      </Button>
                    </div>
                    <video src={video.previewUrl} controls className="w-full aspect-video bg-black rounded-lg"
                      onLoadedMetadata={e => {
                        const d = e.currentTarget.duration;
                        const ar = e.currentTarget.videoWidth / e.currentTarget.videoHeight;
                        updateVideo(video.id, { duration: d, isShort: d <= 60 && ar < 1 });
                      }}
                    />
                  </div>
                </Card>
              )}

              {/* Title + Description + Tags */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Title *</label>
                  <Input value={video.title} onChange={e => updateVideo(video.id, { title: e.target.value })}
                    placeholder="Video title" disabled={isUploading} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Description</label>
                  <textarea value={video.description} onChange={e => updateVideo(video.id, { description: e.target.value })}
                    placeholder="Video description"
                    className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm disabled:opacity-50 resize-none"
                    rows={2} disabled={isUploading} />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Tags</label>
                  <Input value={video.tags} onChange={e => updateVideo(video.id, { tags: e.target.value })}
                    placeholder="gaming, tutorial, vlog (comma separated)" disabled={isUploading} />
                </div>

                {/* Multi-language uploads per video */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Multi-Language Uploads</span>
                    {video.multiLangTargets.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        +{video.multiLangTargets.length} translated copy{video.multiLangTargets.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' },
                      { code: 'de', label: 'DE' }, { code: 'pt', label: 'PT' },
                      { code: 'it', label: 'IT' }, { code: 'ja', label: 'JA' },
                      { code: 'ko', label: 'KO' }, { code: 'zh', label: 'ZH' },
                      { code: 'ar', label: 'AR' }, { code: 'ru', label: 'RU' },
                      { code: 'hi', label: 'HI' }, { code: 'id', label: 'ID' },
                      { code: 'tr', label: 'TR' }, { code: 'vi', label: 'VI' },
                      { code: 'th', label: 'TH' }, { code: 'tl', label: 'TL' },
                    ].map(l => {
                      const active = video.multiLangTargets.includes(l.code);
                      return (
                        <button
                          key={l.code}
                          type="button"
                          disabled={isUploading}
                          onClick={() => updateVideo(video.id, {
                            multiLangTargets: active
                              ? video.multiLangTargets.filter(c => c !== l.code)
                              : [...video.multiLangTargets, l.code],
                          })}
                          className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          } disabled:opacity-50`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Channel selector (different mode) */}
              {uploadMode === "different" && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Target Channels</label>
                  <ChannelSelector selectedChannels={video.channels}
                    onChannelsChange={channels => updateVideo(video.id, { channels })} disabled={isUploading} />
                </div>
              )}

              {/* Expanded settings */}
              {video.expandedSettings && (
                <div className="space-y-4 pt-4 border-t border-border">
                  {/* Privacy */}
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Privacy</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIVACY_OPTIONS.map(opt => (
                        <button key={opt.value} disabled={isUploading}
                          onClick={() => updateVideo(video.id, { privacy: opt.value })}
                          className={`p-2.5 rounded-lg border-2 transition-all text-xs ${
                            video.privacy === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                          } disabled:opacity-50`}
                        >
                          <div className="flex justify-center mb-1">{opt.icon}</div>
                          <p className="font-semibold">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Category</label>
                    <select value={video.category} onChange={e => updateVideo(video.id, { category: e.target.value })}
                      disabled={isUploading}
                      className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm disabled:opacity-50"
                    >
                      {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>

                  {/* Permissions */}
                  <div className="flex gap-6 p-3 bg-muted/30 rounded-lg">
                    {[
                      { label: "Allow comments", key: "allowComments" as keyof VideoUploadItem, val: video.allowComments },
                      { label: "Show likes", key: "allowRatings" as keyof VideoUploadItem, val: video.allowRatings },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={item.val as boolean}
                          onChange={e => updateVideo(video.id, { [item.key]: e.target.checked })}
                          disabled={isUploading} className="rounded w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Schedule */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input type="checkbox" checked={video.scheduled}
                        onChange={e => updateVideo(video.id, { scheduled: e.target.checked })}
                        disabled={isUploading} className="rounded w-4 h-4" />
                      <span className="text-sm font-semibold">Schedule for later</span>
                    </label>
                    {video.scheduled && (
                      <Input type="datetime-local" value={video.scheduleTime}
                        onChange={e => updateVideo(video.id, { scheduleTime: e.target.value })}
                        disabled={isUploading} />
                    )}
                  </div>
                </div>
              )}

              {/* Repeat Count */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Upload Count:</label>
                <Input type="number" min={1} max={10}
                  value={video.repeatCount}
                  onChange={e => updateVideo(video.id, { repeatCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                  className="w-20" disabled={isUploading} />
                {video.repeatCount > 1 && (
                  <span className="text-xs text-muted-foreground">Will upload {video.repeatCount} copies</span>
                )}
              </div>

              {/* Shorts toggle */}
              {video.duration !== null && video.duration <= 60 && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={video.isShort}
                      onChange={e => updateVideo(video.id, { isShort: e.target.checked })}
                      disabled={isUploading} className="rounded w-4 h-4 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Upload as YouTube Short</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(video.duration)}s · Adds #Shorts to title and tags for feed discovery.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Status */}
              {uploadStatus[video.id] === "uploading" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{statusMessages[video.id]}</span>
                    <span className="text-muted-foreground">{uploadProgress[video.id] || 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress[video.id] || 0}%` }} />
                  </div>
                </div>
              )}
              {uploadStatus[video.id] === "success" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <CheckCircle2 className="w-4 h-4 text-foreground flex-shrink-0" />
                  <p className="text-sm text-foreground">{statusMessages[video.id]}</p>
                </div>
              )}
              {uploadStatus[video.id] === "error" && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-foreground">{statusMessages[video.id]}</p>
                </div>
              )}
            </Card>
          ))
        )}
      </motion.div>

      {/* Upload button */}
      {videos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            onClick={handleBulkUpload}
            disabled={isUploading || videos.every(v => !v.file || !v.title)}
            size="lg"
            className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading {videos.filter(v => uploadStatus[v.id] === "success").length} of {videos.filter(v => v.file && v.title).length}…
              </>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Start Bulk Upload ({videos.filter(v => v.file && v.title).length} video{videos.filter(v => v.file && v.title).length !== 1 ? "s" : ""})</>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default BulkUploadPage;
