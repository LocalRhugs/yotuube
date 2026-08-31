import { motion } from "framer-motion";
import {
  Upload as UploadIcon, Facebook, Instagram, X, Loader2, CheckCircle2, XCircle, AlertCircle,
  Scissors, Film, Sparkles, ImageIcon, Trash2, Globe, Lock, Eye, ExternalLink, Tag, Languages, Settings2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getYouTubeChannels } from "@/lib/youtube-api";
import { publishToFacebook, publishToInstagram, uploadToYouTube } from "@/lib/publish-api";
import { supabase } from "@/integrations/supabase/client";
import VideoPreview from "@/components/VideoPreview";
import VideoEditor from "@/components/VideoEditor";
import VideoCommentManager from "@/components/VideoCommentManager";
import TagSelector from "@/components/TagSelector";
import { getStoredChannels, uploadVideoToYouTube, uploadThumbnail, getUploadDefaults, getFreshAccessToken } from "@/lib/youtube-direct";
import { generateYouTubeSmartLink, generateFacebookSmartLink, translateText } from "@/lib/smart-link-api";
import { suggestHashtags, improveDescription } from "@/lib/ai-suggest";

interface UploadDestination {
  id: string;
  name: string;
  platform: "facebook" | "instagram" | "youtube";
  picture?: string;
  pageId?: string;
  pageAccessToken?: string;
  igAccountId?: string;
  channelTokenId?: string;
  channelId?: string; // actual YouTube channel ID (UCxxx...)
  accessToken?: string;
}

interface PublishResult {
  destinationId?: string;
  destinationName: string;
  platform: string;
  success: boolean;
  error?: string;
  videoId?: string;
}

const CATEGORIES = [
  { id: "1", name: "Film & Animation" }, { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" }, { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" }, { id: "18", name: "Short Movies" },
  { id: "19", name: "Travel & Events" }, { id: "20", name: "Gaming" },
  { id: "22", name: "People & Blogs" }, { id: "23", name: "Comedy" },
  { id: "24", name: "Entertainment" }, { id: "25", name: "News & Politics" },
  { id: "26", name: "Howto & Style" }, { id: "27", name: "Education" },
  { id: "28", name: "Science & Technology" },
];

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const UploadPage = () => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [destinations, setDestinations] = useState<UploadDestination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState('public');
  const [category, setCategory] = useState('22');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [results, setResults] = useState<PublishResult[]>([]);

  // New features
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isShort, setIsShort] = useState(false);
  const [dualUpload, setDualUpload] = useState(false);
  const [customShortsDuration, setCustomShortsDuration] = useState(60);
  const [allowComments, setAllowComments] = useState(true);
  const [allowRatings, setAllowRatings] = useState(true);
  const [repeatCount, setRepeatCount] = useState(1);
  // How many YouTube channels to upload to in parallel (distributes load across Google API clients/quota)
  const [ytConcurrency, setYtConcurrency] = useState<number>(() => {
    const v = parseInt(localStorage.getItem("yt_upload_concurrency") || "3", 10);
    return Math.max(1, Math.min(5, isNaN(v) ? 3 : v));
  });
  useEffect(() => { localStorage.setItem("yt_upload_concurrency", String(ytConcurrency)); }, [ytConcurrency]);

  // New YouTube metadata fields
  const [defaultLanguage, setDefaultLanguage] = useState('');
  const [license, setLicense] = useState<'youtube' | 'creativeCommon'>('youtube');
  const [publicStats, setPublicStats] = useState(true);
  const [madeForKids, setMadeForKids] = useState(false);
  const [containsSyntheticMedia, setContainsSyntheticMedia] = useState(false);
  const [paidPromotion, setPaidPromotion] = useState(false);
  const [recordingDate, setRecordingDate] = useState('');
  const [notifySubscribers, setNotifySubscribers] = useState(true);

  const [translating, setTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');

  // Per-channel language assignment. Key = destination id, value = lang code ('' or absent = original/English).
  // One upload per channel, in its assigned language.
  const [channelLangs, setChannelLangs] = useState<Record<string, string>>({});

  // AI states
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);

  const handleTranslateDescription = async () => {
    if (!description) { return; }
    setTranslating(true);
    const res = await translateText(description, translateLang, 'en');
    if (res.success && res.translatedText) {
      setDescription(res.translatedText);
    } else {
      toast.error(`Translation failed: ${res.error}`);
    }
    setTranslating(false);
  };

  const handleAiImproveDesc = async () => {
    if (!description) { toast.error("Enter a description first"); return; }
    setAiLoading('description');
    const res = await improveDescription(description, 'youtube');
    if (res.success && (res.data?.description || res.data?.improved)) {
      setDescription(res.data.description || res.data.improved);
      toast.success("Description improved!");
    } else {
      toast.error(res.error || "Failed to improve description");
    }
    setAiLoading(null);
  };

  const handleAiSuggestTags = async () => {
    const context = `${title} ${description}`.trim();
    if (!context) { toast.error("Enter a title or description first"); return; }
    setAiLoading('tags');
    const res = await suggestHashtags(context, 'youtube');
    if (res.success && res.data?.hashtags) {
      const tags = res.data.hashtags.map((t: string) => t.replace(/^#/, ''));
      setAiSuggestedTags(tags);
    } else {
      toast.error(res.error || "Failed to suggest tags");
    }
    setAiLoading(null);
  };

  const videoPreviewUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [videoPreviewUrl, thumbnailPreview]);

  // Load saved upload defaults on mount
  useEffect(() => {
    const saved = getUploadDefaults();
    if (saved) {
      if (saved.description) setDescription(saved.description);
      if (saved.tags) setSelectedTags(saved.tags.split(',').map(t => t.trim()).filter(Boolean));
      if (saved.privacy) setPrivacy(saved.privacy);
      if (saved.category) setCategory(saved.category);
      if (typeof saved.allowComments === 'boolean') setAllowComments(saved.allowComments);
      if (typeof saved.allowRatings === 'boolean') setAllowRatings(saved.allowRatings);
    }
  }, []);

  // Warn before navigating away mid-upload
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Upload in progress. Leaving will cancel it.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  useEffect(() => {
    const loadDestinations = async () => {
      setLoadingDestinations(true);
      const dests: UploadDestination[] = [];

      const res = await getFacebookPages();
      if (res.success) {
        const pages = res.data?.data || [];
        for (const page of pages) {
          dests.push({
            id: `fb-${page.id}`, name: page.name, platform: "facebook",
            picture: page.picture?.data?.url, pageId: page.id, pageAccessToken: page.access_token,
          });

          const igRes = await getInstagramAccount(page.id, page.access_token);
          if (igRes.success && igRes.data?.instagram_business_account) {
            const ig = igRes.data.instagram_business_account;
            dests.push({
              id: `ig-${ig.id}`, name: ig.name || ig.username || page.name, platform: "instagram",
              picture: ig.profile_picture_url, pageId: page.id, pageAccessToken: page.access_token, igAccountId: ig.id,
            });
          }
        }
      }

      // Load stored channels with access tokens (single source of truth)
      const storedChannels = await getStoredChannels();
      for (const ch of storedChannels) {
        dests.push({
          id: `ytd-${ch.id}`, name: ch.channelTitle || 'YouTube Channel',
          platform: "youtube", channelTokenId: ch.id,
          channelId: ch.channelId || undefined,
          accessToken: ch.accessToken,
        });
      }

      setDestinations(dests);
      setLoadingDestinations(false);
    };
    loadDestinations();
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload MP4, MOV, AVI, or WebM.");
      return;
    }
    // YouTube resumable upload supports up to 256 GB. Cap at 128 GB for safety.
    if (file.size > 128 * 1024 * 1024 * 1024) {
      toast.error("File size must be less than 128 GB.");
      return;
    }
    setSelectedFile(file);
    setShowEditor(false);
    setResults([]);
    toast.success(`Selected: ${file.name}`);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Thumbnail must be less than 2 MB.");
      return;
    }
    setThumbnail(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAccounts.length === destinations.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(destinations.map(d => d.id));
    }
  };

  const handleUpload = async (overrideAccountIds?: string[]) => {
    const activeAccountIds = overrideAccountIds && overrideAccountIds.length > 0 ? overrideAccountIds : selectedAccounts;
    if (!selectedFile) { toast.error("Please select a video file."); return; }
    if (activeAccountIds.length === 0) { toast.error("Please select at least one destination."); return; }
    if (!title.trim()) { toast.error("Please enter a video title."); return; }

    // Duplicate-upload guard
    try {
      const { fileHash } = await import("@/lib/image-compressor");
      const { findDuplicate } = await import("@/lib/upload-history");
      const hash = await fileHash(selectedFile);
      const dup = findDuplicate(hash);
      if (dup) {
        const ok = window.confirm(
          `⚠️ This exact file was already uploaded as "${dup.title}" to ${dup.channelTitle} on ${new Date(dup.uploadedAt).toLocaleString()}.\n\nUpload again anyway?`
        );
        if (!ok) return;
      }
      (selectedFile as any).__hash = hash;
    } catch {}

    setUploading(true);
    setResults([]);
    const publishResults: PublishResult[] = [];

    try {
      setUploadProgress('Uploading video to storage...');
      const ext = selectedFile.name.split('.').pop() || 'mp4';
      const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('videos').upload(storagePath, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        toast.error(`Storage upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(storagePath);
      toast.success('Video uploaded to storage!');

      const selected = destinations.filter(d => activeAccountIds.includes(d.id));
      const tags = selectedTags.join(',');

      // Per-channel language: translate title/description per destination's assigned language.
      // Cache translations to avoid repeating for the same target language.
      const originalLangCode = defaultLanguage || 'en';
      const translationCache: Record<string, { title: string; description: string }> = {
        [originalLangCode]: { title, description },
      };

      const getTranslated = async (targetLang: string) => {
        if (!targetLang || targetLang === originalLangCode) return translationCache[originalLangCode];
        if (translationCache[targetLang]) return translationCache[targetLang];
        setUploadProgress(`Translating to ${targetLang.toUpperCase()}...`);
        const [tRes, dRes] = await Promise.all([
          translateText(title, targetLang, originalLangCode),
          description ? translateText(description, targetLang, originalLangCode) : Promise.resolve({ success: true, translatedText: '' } as any),
        ]);
        if (!tRes.success) toast.warning(`Title translation to ${targetLang} failed: ${tRes.error}. Using original.`);
        const result = {
          title: tRes.success && tRes.translatedText ? tRes.translatedText : title,
          description: dRes.success && dRes.translatedText !== undefined ? dRes.translatedText : description,
        };
        translationCache[targetLang] = result;
        return result;
      };

      // Translate smart-link header/body text per language (cached).
      const smartLinkCache: Record<string, { header: string; body: string }> = {};
      const getTranslatedSmartLink = async (targetLang: string, header: string, body: string) => {
        if (!targetLang || targetLang === originalLangCode) return { header, body };
        const cacheKey = `${targetLang}|${header}|${body}`;
        if (smartLinkCache[cacheKey]) return smartLinkCache[cacheKey];
        const [hRes, bRes] = await Promise.all([
          header ? translateText(header, targetLang, originalLangCode) : Promise.resolve({ success: true, translatedText: '' } as any),
          body ? translateText(body, targetLang, originalLangCode) : Promise.resolve({ success: true, translatedText: '' } as any),
        ]);
        const out = {
          header: hRes.success && hRes.translatedText ? hRes.translatedText : header,
          body: bRes.success && bRes.translatedText ? bRes.translatedText : body,
        };
        smartLinkCache[cacheKey] = out;
        return out;
      };

      for (let repeatIdx = 0; repeatIdx < repeatCount; repeatIdx++) {
        const repeatLabel = repeatCount > 1 ? ` (copy ${repeatIdx + 1}/${repeatCount})` : '';

      const runDest = async (dest: UploadDestination) => {
        // Resolve this destination's language (only meaningful for YouTube; others get original).
        const destLang = (dest.platform === 'youtube' ? channelLangs[dest.id] : '') || originalLangCode;
        const translated = await getTranslated(destLang);
        const title = translated.title;
        const description = translated.description;
        const defaultLanguage = destLang;
        const langSuffix = destLang !== originalLangCode ? ` [${destLang.toUpperCase()}]` : '';
        setUploadProgress(`Publishing to ${dest.name} (${dest.platform})${repeatLabel}${langSuffix}...`);


        if (dest.platform === 'facebook' && dest.pageId && dest.pageAccessToken) {
          const res = await publishToFacebook(dest.pageId, dest.pageAccessToken, publicUrl, title, description);
          publishResults.push({ destinationId: dest.id, destinationName: dest.name, platform: 'Facebook', success: res.success, error: res.error });
        } else if (dest.platform === 'instagram' && dest.igAccountId && dest.pageAccessToken) {
          const caption = `${title}\n\n${description}${selectedTags.length ? '\n\n' + selectedTags.map(t => `#${t}`).join(' ') : ''}`;
          const res = await publishToInstagram(dest.igAccountId, dest.pageAccessToken, publicUrl, caption);
          publishResults.push({ destinationId: dest.id, destinationName: dest.name, platform: 'Instagram', success: res.success, error: res.error, videoId: res.data?.id });

          // Smart link auto-comment for Instagram
          if (res.success && res.data?.id) {
            const defaults = getUploadDefaults();
            if (defaults?.socialUnlockEnabled && defaults.socialUnlockTargetUrl) {
              try {
                setUploadProgress(`Generating smart link for ${dest.name}...`);
                const slRes = await generateFacebookSmartLink({
                  postId: res.data.id,
                  pageId: dest.pageId || '',
                  platform: 'instagram',
                  targetUrl: defaults.socialUnlockTargetUrl,
                  pageName: dest.name,
                  postUrl: '',
                  actions: { follow: true, like: true, comment: false },
                }, true);

                if (slRes.success && slRes.smartLink) {
                  const rawBody = defaults.socialUnlockBody ?? "🎁 Unlock exclusive content!\n\nComplete the required actions to access:";
                  const { body: bodyText } = await getTranslatedSmartLink(destLang, '', rawBody);
                  const commentText = `${bodyText}\n${slRes.smartLink}`;
                  setUploadProgress(`Posting smart link comment on ${dest.name}...`);
                  const { postInstagramComment } = await import("@/lib/facebook-api");
                  const commentRes = await postInstagramComment(res.data.id, commentText, dest.pageAccessToken);
                  if (commentRes.success) {
                    toast.success(`Smart link comment posted on ${dest.name}!`);
                  } else {
                    console.warn("IG smart link comment failed:", commentRes.error);
                    toast.warning(`Smart link generated but comment failed: ${commentRes.error}`);
                  }
                }
              } catch (err: any) {
                console.warn("IG smart link error:", err);
              }
            }
          }
        } else if (dest.platform === 'youtube') {
          // Refresh OAuth token via edge function — fixes "Failed to fetch" when the stored
          // browser token has gone stale (long idle session). Mutates dest.accessToken in place.
          if (dest.channelTokenId) {
            const fresh = await getFreshAccessToken(dest.channelTokenId);
            if (fresh) dest.accessToken = fresh;
          }
          // Use direct upload if we have an access token
          if (dest.accessToken) {
            const finalTitle = (isShort && videoDuration && videoDuration <= 60) ? `${title} #Shorts` : title;
            const finalDesc = (isShort && videoDuration && videoDuration <= 60) ? `${description}\n\n#Shorts` : description;
            const ytUploadOnce = () => uploadVideoToYouTube(dest.accessToken!, selectedFile, {
              title: finalTitle, description: finalDesc,
              tags: selectedTags, categoryId: category, privacyStatus: privacy,
              allowComments, allowRatings,
              defaultLanguage: defaultLanguage || undefined,
              license, publicStatsViewable: publicStats,
              madeForKids, containsSyntheticMedia, paidPromotion,
              recordingDate: recordingDate || undefined,
              notifySubscribers,
            });
            let res = await ytUploadOnce();
            if (!res.success) {
              setUploadProgress(`Retrying ${dest.name} in 5s...`);
              await new Promise(r => setTimeout(r, 5000));
              setUploadProgress(`Retrying ${dest.name} (attempt 2)...`);
              res = await ytUploadOnce();
            }
            if (res.success && res.videoId && thumbnail) {
              await uploadThumbnail(dest.accessToken, res.videoId, thumbnail);
            }
            // Generate smart link if social unlock is enabled
            if (res.success && res.videoId) {
              const defaults = getUploadDefaults();
              if (defaults?.socialUnlockEnabled && defaults.socialUnlockTargetUrl) {
                // Use the actual YouTube channel ID (UCxxx), NOT the Supabase token UUID
                const actualChannelId = dest.channelId;
                if (actualChannelId) {
                  const slRes = await generateYouTubeSmartLink({
                    videoId: res.videoId,
                    channelId: actualChannelId,
                    targetUrl: defaults.socialUnlockTargetUrl,
                    actions: defaults.socialUnlockActions || { subscribe: true, like: true, comment: false },
                  }, true);
                  if (slRes.success && slRes.smartLink) {
                    console.log("Smart link generated:", slRes.smartLink);
                    const rawHeader = defaults.socialUnlockHeader ?? "🎁 UNLOCK EXCLUSIVE CONTENT";
                    const rawBody = defaults.socialUnlockBody ?? "🎁 Unlock exclusive content!\n\nComplete the required actions to access:";
                    const { header: headerText, body: bodyText } = await getTranslatedSmartLink(destLang, rawHeader, rawBody);

                    // 1. Update video description with smart link
                    try {
                      setUploadProgress(`Adding smart link to description on ${dest.name}...`);
                      const smartLinkText = `\n\n━━━━━━━━━━━━━━━━━━━━\n${headerText}\n${slRes.smartLink}\n━━━━━━━━━━━━━━━━━━━━`;
                      const finalTitle2 = (isShort && videoDuration && videoDuration <= 60) ? `${title} #Shorts` : title;
                      const finalDesc2 = (isShort && videoDuration && videoDuration <= 60) ? `${description}\n\n#Shorts` : description;
                      const updatedDescription = (finalDesc2 + smartLinkText).substring(0, 5000);
                      
                      const updateRes = await fetch(
                        `https://www.googleapis.com/youtube/v3/videos?part=snippet`,
                        {
                          method: "PUT",
                          headers: {
                            Authorization: `Bearer ${dest.accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            id: res.videoId,
                            snippet: {
                              title: finalTitle2.substring(0, 100),
                              description: updatedDescription,
                              categoryId: category,
                              // CRITICAL: YouTube PUT replaces the entire snippet — must resend tags
                              // and defaultLanguage or they get wiped from the video.
                              tags: selectedTags.length > 0 ? selectedTags.slice(0, 30) : undefined,
                              ...(defaultLanguage ? { defaultLanguage } : {}),
                            },
                          }),
                        }
                      );
                      if (updateRes.ok) {
                        toast.success(`Smart link added to video description on ${dest.name}!`);
                      } else {
                        console.warn("Failed to update description:", await updateRes.text());
                        toast.warning(`Smart link generated but description update failed`);
                      }
                    } catch (descErr: any) {
                      console.warn("Description update error:", descErr);
                    }

                    // 2. Auto-post smart link as a comment
                    try {
                      setUploadProgress(`Posting smart link comment on ${dest.name}...`);
                      const commentText = `${bodyText}\n${slRes.smartLink}`;
                      const commentRes = await fetch(
                        "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${dest.accessToken}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            snippet: {
                              videoId: res.videoId,
                              topLevelComment: {
                                snippet: { textOriginal: commentText },
                              },
                            },
                          }),
                        }
                      );
                      if (commentRes.ok) {
                        toast.success(`Smart link comment posted on ${dest.name}!`);
                      } else {
                        const errData = await commentRes.json().catch(() => ({}));
                        console.warn("Smart link comment failed:", errData);
                        toast.warning(`Smart link in description but comment failed: ${errData.error?.message || 'Unknown error'}`);
                      }
                    } catch (commentErr: any) {
                      console.warn("Smart link comment error:", commentErr);
                    }
                  }
                } else {
                  // channelId not available — smart link still works but without channel-specific encoding
                  console.warn("Smart link: actual YouTube channel ID not available, skipping smart link generation");
                  toast.warning("Smart link skipped: reconnect your YouTube channel to enable smart links");
                }
              }
            }
            publishResults.push({
              destinationId: dest.id, destinationName: dest.name, platform: 'YouTube',
              success: res.success, error: res.error, videoId: res.videoId,
            });
            if (res.success && res.videoId) {
              try {
                const { recordUpload } = await import("@/lib/upload-history");
                recordUpload({
                  hash: (selectedFile as any).__hash || '',
                  title: finalTitle,
                  channelTitle: dest.name,
                  videoId: res.videoId,
                  uploadedAt: new Date().toISOString(),
                });
              } catch {}
            }

            // Dual upload as Shorts
            if (dualUpload && res.success && videoDuration && videoDuration > 60) {
              setUploadProgress(`Creating Shorts version for ${dest.name}...`);
              try {
                const { FFmpeg } = await import("@ffmpeg/ffmpeg");
                const { toBlobURL } = await import("@ffmpeg/util");
                const ffmpeg = new FFmpeg();
                const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
                const mtSources = [
                  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd",
                  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd",
                ];
                const stSources = [
                  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm",
                  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm",
                  "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/umd",
                  "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/umd",
                ];
                const cdnSources = hasSharedArrayBuffer ? [...mtSources, ...stSources] : stSources;
                let loaded = false;
                for (const baseURL of cdnSources) {
                  try {
                    await ffmpeg.load({
                      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
                      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
                    });
                    loaded = true;
                    break;
                  } catch { continue; }
                }
                if (!loaded) throw new Error("FFmpeg failed to load");
                await ffmpeg.writeFile("input.mp4", new Uint8Array(await selectedFile.arrayBuffer()));
                await ffmpeg.exec([
                  "-i", "input.mp4", "-ss", "0", "-to", customShortsDuration.toString(),
                  "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
                  "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "128k", "output.mp4"
                ]);
                const shortsData = await ffmpeg.readFile("output.mp4");
                const uint8 = shortsData instanceof Uint8Array ? shortsData : new TextEncoder().encode(shortsData as string);
                const shortsBlob = new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
                const shortsFile = new File([shortsBlob], `shorts_${selectedFile.name}`, { type: "video/mp4" });

                setUploadProgress(`Uploading Shorts version to ${dest.name}...`);
                const shortsTitle = `${title} #Shorts`;
                const shortsDesc = `${description}\n\n#Shorts`;
                const shortsRes = await uploadVideoToYouTube(dest.accessToken, shortsFile, {
                  title: shortsTitle, description: shortsDesc,
                  tags: [...selectedTags, "Shorts", "Short"],
                  categoryId: category, privacyStatus: privacy,
                  allowComments, allowRatings,
                  defaultLanguage: defaultLanguage || undefined,
                  license, publicStatsViewable: publicStats,
                  madeForKids, containsSyntheticMedia, paidPromotion,
                  notifySubscribers,
                });

                // Smart link for Shorts version
                if (shortsRes.success && shortsRes.videoId) {
                  const defaults = getUploadDefaults();
                  if (defaults?.socialUnlockEnabled && defaults.socialUnlockTargetUrl && dest.channelId) {
                    try {
                      const slRes = await generateYouTubeSmartLink({
                        videoId: shortsRes.videoId,
                        channelId: dest.channelId,
                        targetUrl: defaults.socialUnlockTargetUrl,
                        actions: defaults.socialUnlockActions || { subscribe: true, like: true, comment: false },
                      }, true);

                      if (slRes.success && slRes.smartLink) {
                        const rawHeader = defaults.socialUnlockHeader ?? "🎁 UNLOCK EXCLUSIVE CONTENT";
                        const rawBody = defaults.socialUnlockBody ?? "🎁 Unlock exclusive content!\n\nComplete the required actions to access:";
                        const { header: headerText, body: bodyText } = await getTranslatedSmartLink(destLang, rawHeader, rawBody);

                        // Update Shorts description with smart link
                        try {
                          const smartLinkText = `\n\n━━━━━━━━━━━━━━━━━━━━\n${headerText}\n${slRes.smartLink}\n━━━━━━━━━━━━━━━━━━━━`;
                          const updatedDesc = (shortsDesc + smartLinkText).substring(0, 5000);
                          await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${dest.accessToken}`, "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: shortsRes.videoId,
                              snippet: {
                                title: shortsTitle.substring(0, 100),
                                description: updatedDesc,
                                categoryId: category,
                                // Resend tags + language so YouTube doesn't wipe them on PUT
                                tags: ([...selectedTags, "Shorts", "Short"]).slice(0, 30),
                                ...(defaultLanguage ? { defaultLanguage } : {}),
                              },
                            }),
                          });
                        } catch (e) { console.warn("Shorts desc update error:", e); }

                        // Post smart link comment on Shorts
                        try {
                          const commentText = `${bodyText}\n${slRes.smartLink}`;
                          await fetch("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${dest.accessToken}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ snippet: { videoId: shortsRes.videoId, topLevelComment: { snippet: { textOriginal: commentText } } } }),
                          });
                        } catch (e) { console.warn("Shorts comment error:", e); }
                      }
                    } catch (e) { console.warn("Shorts smart link error:", e); }
                  }
                }

                publishResults.push({
                  destinationId: dest.id, destinationName: `${dest.name} (Short)`, platform: 'YouTube',
                  success: shortsRes.success, error: shortsRes.error, videoId: shortsRes.videoId,
                });
              } catch (err: any) {
                publishResults.push({
                  destinationId: dest.id, destinationName: `${dest.name} (Short)`, platform: 'YouTube',
                  success: false, error: `Shorts creation failed: ${err.message}`,
                });
              }
            }
          } else {
            const res = await uploadToYouTube(storagePath, title, description, selectedTags, privacy);
            publishResults.push({ destinationId: dest.id, destinationName: dest.name, platform: 'YouTube', success: res.success, error: res.error });
          }
        }
      };

      // Dispatch: non-YouTube destinations run sequentially; YouTube destinations run
      // in parallel chunks of `ytConcurrency` to distribute load across Google API clients
      // and dramatically speed up mass uploads to many channels.
      const ytDests = selected.filter(d => d.platform === 'youtube');
      const otherDests = selected.filter(d => d.platform !== 'youtube');
      for (const d of otherDests) {
        await runDest(d);
      }
      for (let i = 0; i < ytDests.length; i += ytConcurrency) {
        const chunk = ytDests.slice(i, i + ytConcurrency);
        setUploadProgress(`Uploading batch ${Math.floor(i / ytConcurrency) + 1} of ${Math.ceil(ytDests.length / ytConcurrency)} (${chunk.length} channels in parallel)...`);
        await Promise.all(chunk.map(d => runDest(d)));
      }
      } // end repeatCount loop

      // Merge results when retrying so previous successes stay visible
      setResults(prev => {
        if (!overrideAccountIds) return publishResults;
        const retriedIds = new Set(overrideAccountIds);
        const kept = prev.filter(r => !r.destinationId || !retriedIds.has(r.destinationId) || r.success);
        return [...kept, ...publishResults];
      });
      const successCount = publishResults.filter(r => r.success).length;
      if (successCount === publishResults.length) {
        toast.success(`Published to all ${successCount} destinations!`);
      } else {
        toast.warning(`Published to ${successCount}/${publishResults.length} destinations. Use "Retry Failed" below.`);
      }
      // Browser notification when tab is hidden so user can switch back
      try {
        if (typeof Notification !== 'undefined' && document.hidden) {
          if (Notification.permission === 'granted') {
            new Notification('Upload finished', { body: `${successCount}/${publishResults.length} succeeded` });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      } catch {}

      await supabase.storage.from('videos').remove([storagePath]);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const ytResults = results.filter(r => r.platform === 'YouTube' && r.success && r.videoId);
  const firstYtAccessToken = destinations.find(d => d.accessToken && selectedAccounts.includes(d.id))?.accessToken;

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Upload Video</h1>
        <p className="text-muted-foreground">Upload to Facebook, Instagram, and YouTube simultaneously</p>
      </motion.div>

      {/* Drop zone / preview / editor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-4">
        {selectedFile && showEditor ? (
          <VideoEditor
            file={selectedFile}
            onSave={(edited) => { setSelectedFile(edited); setShowEditor(false); }}
            onCancel={() => setShowEditor(false)}
          />
        ) : selectedFile ? (
          <div className="space-y-3">
            {/* Enhanced video preview with thumbnail overlay */}
            <div className="rounded-xl overflow-hidden border border-border bg-card">
              <div className="relative bg-black aspect-video">
                <video
                  src={videoPreviewUrl || undefined}
                  controls
                  className="w-full h-full object-contain"
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    setVideoDuration(vid.duration);
                    if (vid.duration <= 60 && vid.videoWidth / vid.videoHeight < 1) {
                      setIsShort(true);
                    }
                  }}
                />

                {/* Thumbnail overlay */}
                {thumbnailPreview && (
                  <div className="absolute top-3 right-3 w-24 h-16 rounded-lg overflow-hidden border-2 border-border shadow-lg">
                    <img src={thumbnailPreview} alt="Selected video thumbnail preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setThumbnail(null); if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview); setThumbnailPreview(null); }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Film className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-xs">({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                </div>
                <div className="flex items-center gap-2">
                  {videoDuration && videoDuration <= 60 && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Shorts Eligible
                    </span>
                  )}
                  {videoDuration && (
                    <span className="text-xs text-muted-foreground">{Math.round(videoDuration)}s</span>
                  )}
                </div>
              </div>
            </div>

            {!uploading && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setShowEditor(true)}>
                  <Scissors className="w-4 h-4 mr-2" /> Edit Video
                </Button>
                <Button variant="outline" size="sm" onClick={() => document.getElementById("thumb-input")?.click()}>
                  <ImageIcon className="w-4 h-4 mr-2" /> {thumbnail ? "Change Thumbnail" : "Add Thumbnail"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedFile(null); setThumbnail(null); setThumbnailPreview(null); setVideoDuration(null); }}>
                  <X className="w-4 h-4 mr-2" /> Remove
                </Button>
                <input id="thumb-input" type="file" accept="image/jpeg,image/png" onChange={handleThumbnailChange} className="hidden" />
              </div>
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileSelect(file); }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo,video/webm" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                <UploadIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Drop your video here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, WebM · Up to 128 GB</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Shorts / Dual Upload Options */}
      {selectedFile && videoDuration && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
          {videoDuration <= 60 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={isShort} onChange={(e) => setIsShort(e.target.checked)}
                  disabled={uploading} className="rounded w-4 h-4 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Upload as YouTube Short</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This video is {Math.round(videoDuration)}s and can be uploaded as a Short for extra discovery.
                  </p>
                </div>
              </label>
            </div>
          )}
          {videoDuration > 60 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={dualUpload} onChange={(e) => setDualUpload(e.target.checked)}
                  disabled={uploading} className="rounded w-4 h-4 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Upload to Both Video & Shorts</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload the full {Math.round(videoDuration)}s video AND auto-create a vertical Shorts version.
                  </p>
                </div>
              </label>
              {dualUpload && (
                <div className="pl-7 p-3 bg-card rounded-lg border border-border">
                  <label className="text-xs font-semibold mb-2 block text-foreground">Shorts Duration (seconds)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="15" max="60" step="1" value={customShortsDuration}
                      onChange={(e) => setCustomShortsDuration(Number(e.target.value))}
                      disabled={uploading} className="flex-1" />
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{customShortsDuration}s</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Metadata */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
        <h2 className="font-display font-semibold text-foreground text-lg">Video Details</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
            <Input placeholder="Enter video title" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={handleAiImproveDesc} disabled={!!aiLoading || !description || uploading}>
                  {aiLoading === 'description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Improve
                </Button>
                <select value={translateLang} onChange={e => setTranslateLang(e.target.value)}
                  className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground">
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                  <option value="ru">Russian</option>
                  <option value="hi">Hindi</option>
                </select>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={handleTranslateDescription} disabled={translating || !description || uploading}>
                  {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  Translate
                </Button>
              </div>
            </div>
            <Textarea placeholder="Enter video description" rows={4} value={description} onChange={e => setDescription(e.target.value)} disabled={uploading} />
          </div>

          {/* Per-channel language assignment is now controlled in the Upload Destinations section below.
              Each channel uploads exactly once, in its assigned language. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Tags</label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={handleAiSuggestTags} disabled={!!aiLoading || uploading}>
                  {aiLoading === 'tags' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Suggest
                </Button>
              </div>
              <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} disabled={uploading} />
              {aiSuggestedTags.length > 0 && (
                <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">Suggested Tags</span>
                    <button className="text-xs text-primary hover:underline" onClick={() => {
                      setSelectedTags(prev => [...new Set([...prev, ...aiSuggestedTags])]);
                      setAiSuggestedTags([]);
                      toast.success("Tags added!");
                    }}>Add All</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {aiSuggestedTags.map((tag, i) => (
                      <button key={i} onClick={() => {
                        setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
                        setAiSuggestedTags(prev => prev.filter(t => t !== tag));
                      }} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Privacy (YouTube)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "public", icon: <Globe className="w-3.5 h-3.5" />, label: "Public" },
                  { value: "unlisted", icon: <Eye className="w-3.5 h-3.5" />, label: "Unlisted" },
                  { value: "private", icon: <Lock className="w-3.5 h-3.5" />, label: "Private" },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setPrivacy(opt.value)} disabled={uploading}
                    className={`p-2 rounded-lg border-2 text-center text-xs transition-all ${
                      privacy === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    } disabled:opacity-50`}>
                    <div className="flex justify-center mb-0.5">{opt.icon}</div>
                    <p className="font-semibold">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Viewer Permissions</label>
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)}
                    disabled={uploading} className="rounded w-4 h-4" />
                  <span className="text-xs">Allow comments</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allowRatings} onChange={(e) => setAllowRatings(e.target.checked)}
                    disabled={uploading} className="rounded w-4 h-4" />
                  <span className="text-xs">Show likes/dislikes</span>
                </label>
              </div>
            </div>
          </div>

          {/* Advanced YouTube Settings */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              <Settings2 className="w-4 h-4" />
              Advanced YouTube Settings
              <ChevronDown className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-4 pt-3 pb-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Video Language</label>
                  <select value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)}
                    disabled={uploading}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                    <option value="it">Italian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                    <option value="ar">Arabic</option>
                    <option value="ru">Russian</option>
                    <option value="hi">Hindi</option>
                    <option value="id">Indonesian</option>
                    <option value="tr">Turkish</option>
                    <option value="vi">Vietnamese</option>
                    <option value="th">Thai</option>
                    <option value="tl">Filipino</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Recording Date</label>
                  <Input type="date" value={recordingDate} onChange={e => setRecordingDate(e.target.value)}
                    disabled={uploading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">License</label>
                  <select value={license} onChange={e => setLicense(e.target.value as any)}
                    disabled={uploading}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="youtube">Standard YouTube License</option>
                    <option value="creativeCommon">Creative Commons - Attribution</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Declarations</label>
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={notifySubscribers} onChange={e => setNotifySubscribers(e.target.checked)}
                        disabled={uploading} className="rounded w-4 h-4" />
                      <span className="text-xs">Notify subscribers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={publicStats} onChange={e => setPublicStats(e.target.checked)}
                        disabled={uploading} className="rounded w-4 h-4" />
                      <span className="text-xs">Show public stats</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={madeForKids} onChange={e => setMadeForKids(e.target.checked)}
                        disabled={uploading} className="rounded w-4 h-4" />
                      <span className="text-xs">Made for Kids (COPPA)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={containsSyntheticMedia} onChange={e => setContainsSyntheticMedia(e.target.checked)}
                        disabled={uploading} className="rounded w-4 h-4" />
                      <span className="text-xs">Contains AI-generated content</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={paidPromotion} onChange={e => setPaidPromotion(e.target.checked)}
                        disabled={uploading} className="rounded w-4 h-4" />
                      <span className="text-xs">Paid promotion / sponsorship</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </motion.div>

      {/* Destinations */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-foreground text-lg">Upload Destinations</h2>
            <p className="text-sm text-muted-foreground">Select where to publish this video</p>
          </div>
          {destinations.length > 1 && (
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedAccounts.length === destinations.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {loadingDestinations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <div className="py-4 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No destinations available. Check your connections in Settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {destinations.map((dest) => (
              <div key={dest.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedAccounts.includes(dest.id) ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}>
                <Checkbox checked={selectedAccounts.includes(dest.id)} onCheckedChange={() => toggleAccount(dest.id)} disabled={uploading} />
                {dest.picture ? (
                  <img src={dest.picture} alt="" className="w-5 h-5 rounded-full" />
                ) : dest.platform === "instagram" ? (
                  <Instagram className="w-4 h-4 text-instagram" />
                ) : dest.platform === "youtube" ? (
                  <YtIcon />
                ) : (
                  <Facebook className="w-4 h-4 text-facebook" />
                )}
                <div className="flex flex-col min-w-0 flex-1 cursor-pointer" onClick={() => !uploading && toggleAccount(dest.id)}>
                  <span className="text-sm font-medium text-foreground truncate">{dest.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{dest.platform}</span>
                </div>
                {dest.platform === 'youtube' && selectedAccounts.includes(dest.id) && (
                  <select
                    value={channelLangs[dest.id] || ''}
                    onChange={e => setChannelLangs(prev => ({ ...prev, [dest.id]: e.target.value }))}
                    disabled={uploading}
                    title="Upload language for this channel"
                    className="text-xs border border-border rounded px-1.5 py-1 bg-background text-foreground"
                  >
                    <option value="">English (original)</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                    <option value="it">Italian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                    <option value="ar">Arabic</option>
                    <option value="ru">Russian</option>
                    <option value="hi">Hindi</option>
                    <option value="id">Indonesian</option>
                    <option value="tr">Turkish</option>
                    <option value="vi">Vietnamese</option>
                    <option value="th">Thai</option>
                    <option value="tl">Filipino</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Upload button */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        {uploading ? (
          <div className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90"
              onClick={() => handleUpload()} disabled={!selectedFile || selectedAccounts.length === 0 || !title.trim()}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload to {selectedAccounts.length} Destination{selectedAccounts.length !== 1 ? "s" : ""}
              {repeatCount > 1 ? ` × ${repeatCount}` : ""}
              {dualUpload ? " + Shorts" : ""}
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">Repeat:</label>
              <Input
                type="number" min={1} max={10} value={repeatCount}
                onChange={e => setRepeatCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-16 h-10" disabled={uploading}
              />
            </div>
            <div className="flex items-center gap-2" title="How many YouTube channels to upload to in parallel. Higher = faster mass uploads, but uses more bandwidth.">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">YT Parallel:</label>
              <Input
                type="number" min={1} max={5} value={ytConcurrency}
                onChange={e => setYtConcurrency(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                className="w-16 h-10" disabled={uploading}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-card rounded-xl p-5 shadow-card border border-border/50 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-display font-semibold text-foreground">Upload Results</h3>
              {(() => {
                const failedIds = Array.from(new Set(
                  results.filter(r => !r.success && r.destinationId).map(r => r.destinationId!)
                ));
                if (failedIds.length === 0 || !selectedFile || uploading) return null;
                return (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUpload(failedIds)}
                    className="gap-2"
                  >
                    <UploadIcon className="w-3.5 h-3.5" />
                    Retry Failed ({failedIds.length})
                  </Button>
                );
              })()}
            </div>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                {r.success ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{r.destinationName} ({r.platform})</p>
                  {r.error && <p className="text-xs text-destructive mt-0.5 truncate">{r.error}</p>}
                  {r.success && <p className="text-xs text-success mt-0.5">Published successfully!</p>}
                </div>
                {r.videoId && (
                  <a href={`https://www.youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Post-upload comment manager */}
        {ytResults.length > 0 && firstYtAccessToken && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Post a Comment on Your Videos</h3>
            {ytResults.map((r) => (
              <VideoCommentManager
                key={r.videoId}
                videoId={r.videoId!}
                accessToken={firstYtAccessToken}
                videoTitle={`${r.destinationName}: ${title}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default UploadPage;
