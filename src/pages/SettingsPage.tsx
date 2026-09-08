import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Facebook, Instagram, Key, User, Upload, Settings as SettingsIcon, Loader2, CheckCircle2, XCircle, ExternalLink, Unplug, Plus, Trash2, Globe, Lock, Eye, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { getYouTubeAuthUrl, getYouTubeChannels, disconnectYouTube, validateYouTubeConfig, getStoredClientIds, saveClientIds, getActiveClientId, setActiveClientId } from "@/lib/youtube-api";
import { LANG_OPTIONS, getChannelLangMap, setChannelLang, seedChannelLangPlan } from "@/lib/channel-langs";
import { getUploadDefaults, saveUploadDefaults, type UploadDefaults } from "@/lib/youtube-direct";
import { getSmartLinkPage, setSmartLinkPage, getSmartLinkFormat, setSmartLinkFormat, type SmartLinkPage, type SmartLinkFormat } from "@/lib/smart-link-api";
import SmartLinkAnalytics from "@/components/SmartLinkAnalytics";


interface ConnectedAccount {
  id: string;
  name: string;
  platform: "Facebook" | "Instagram" | "YouTube";
  detail: string;
  picture?: string;
  channelTokenId?: string;
}

interface YtChannel {
  id: string;
  channelId: string;
  channelTitle: string;
  clientId?: string | null;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);


const CATEGORIES = [
  { id: "1", name: "Film & Animation" }, { id: "2", name: "Autos & Vehicles" },
  { id: "10", name: "Music" }, { id: "15", name: "Pets & Animals" },
  { id: "17", name: "Sports" }, { id: "19", name: "Travel & Events" },
  { id: "20", name: "Gaming" }, { id: "22", name: "People & Blogs" },
  { id: "23", name: "Comedy" }, { id: "24", name: "Entertainment" },
  { id: "25", name: "News & Politics" }, { id: "26", name: "Howto & Style" },
  { id: "27", name: "Education" }, { id: "28", name: "Science & Technology" },
];

const SettingsPage = () => {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [ytChannels, setYtChannels] = useState<YtChannel[]>([]);
  const [connectingYt, setConnectingYt] = useState(false);

  // Google Client ID switcher
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [activeClientId, setActiveClientIdState] = useState<string | null>(null);
  const [newClientId, setNewClientId] = useState("");
  // Upload defaults state
  const [defaults, setDefaults] = useState<UploadDefaults>({
    privacy: "private",
    category: "22",
    allowComments: true,
    allowRatings: true,
    description: "",
    tags: "",
    socialUnlockEnabled: false,
    socialUnlockTargetUrl: "",
    socialUnlockActions: { subscribe: true, like: true, comment: false },
  });
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    const accs: ConnectedAccount[] = [];

    // Load FB/IG
    const res = await getFacebookPages();
    if (res.success) {
      const pages = res.data?.data || [];
      for (const page of pages) {
        accs.push({
          id: `fb-${page.id}`,
          name: page.name,
          platform: "Facebook",
          detail: `${page.category || 'Page'} · ${page.fan_count?.toLocaleString() || 0} followers`,
          picture: page.picture?.data?.url,
        });

        const igRes = await getInstagramAccount(page.id, page.access_token);
        if (igRes.success && igRes.data?.instagram_business_account) {
          const ig = igRes.data.instagram_business_account;
          accs.push({
            id: `ig-${ig.id}`,
            name: ig.name || ig.username || page.name,
            platform: "Instagram",
            detail: `@${ig.username} · ${ig.followers_count?.toLocaleString() || 0} followers`,
            picture: ig.profile_picture_url,
          });
        }
      }
    }

    // Load YouTube channels
    const ytRes = await getYouTubeChannels();
    if (ytRes.success && ytRes.data?.channels) {
      setYtChannels(ytRes.data.channels);
      for (const ch of ytRes.data.channels) {
        accs.push({
          id: `yt-${ch.id}`,
          name: ch.channelTitle || 'YouTube Channel',
          platform: "YouTube",
          detail: `Channel ID: ${ch.channelId || 'Unknown'}`,
          channelTokenId: ch.id,
        });
      }
    } else {
      setYtChannels([]);
    }

    setAccounts(accs);
    setLoadingAccounts(false);
  };

  useEffect(() => {
    loadAccounts();
    const saved = getUploadDefaults();
    if (saved) setDefaults(saved);
    // Load client IDs
    setClientIds(getStoredClientIds());
    setActiveClientIdState(getActiveClientId());
  }, []);

  const handleConnectYouTube = async () => {
    setConnectingYt(true);
    const redirectUri = `${window.location.origin}/youtube-callback`;

    const validation = await validateYouTubeConfig(redirectUri);
    if (!validation.success || !validation.data?.valid) {
      const issues = validation.data?.issues || [validation.error || 'Unknown validation error'];
      toast.error('OAuth Configuration Issue', { description: issues.join('. '), duration: 10000 });
      setConnectingYt(false);
      return;
    }

    const res = await getYouTubeAuthUrl(redirectUri);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error(res.error || 'Failed to get auth URL');
      setConnectingYt(false);
    }
  };

  const handleDisconnectYouTube = async (channelTokenId?: string) => {
    const res = await disconnectYouTube(channelTokenId);
    if (res.success) {
      toast.success('YouTube channel disconnected');
      loadAccounts();
    } else {
      toast.error(res.error || 'Failed to disconnect');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your accounts and configuration</p>
      </motion.div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4 mr-2" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Key className="w-4 h-4 mr-2" /> Connections
          </TabsTrigger>
          <TabsTrigger value="defaults" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Upload className="w-4 h-4 mr-2" /> Defaults
          </TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <SettingsIcon className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl shadow-card border border-border/50">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Connected Accounts</h2>
              <p className="text-sm text-muted-foreground mt-1">All pages and channels linked to your API credentials</p>
            </div>
            {loadingAccounts ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No accounts found. Configure connections in the Connections tab.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {accounts.map((acc) => (
                  <div key={acc.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {acc.picture ? (
                        <img src={acc.picture} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                          {acc.platform === "Instagram" ? <Instagram className="w-4 h-4 text-instagram" /> :
                           acc.platform === "YouTube" ? <YtIcon /> :
                           <Facebook className="w-4 h-4 text-facebook" />}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.platform} · {acc.detail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                      </span>
                      {acc.platform === "YouTube" && acc.channelTokenId && (
                        <Button variant="ghost" size="sm" onClick={() => handleDisconnectYouTube(acc.channelTokenId)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Facebook/Instagram */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Facebook className="w-6 h-6 text-facebook" />
                  <div>
                    <p className="font-medium text-foreground">Facebook & Instagram</p>
                    <p className="text-xs text-muted-foreground">Connected via Facebook Graph API access token</p>
                  </div>
                </div>
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your Facebook API key is configured as a secure backend secret. To update permissions, generate a new token with <code className="bg-muted px-1 rounded">pages_manage_posts</code>, <code className="bg-muted px-1 rounded">pages_read_engagement</code>, and <code className="bg-muted px-1 rounded">instagram_content_publish</code> permissions.
              </p>
            </div>

            {/* YouTube */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <YtIcon />
                  <div>
                    <p className="font-medium text-foreground">YouTube</p>
                    <p className="text-xs text-muted-foreground">
                      {ytChannels.length > 0 ? `${ytChannels.length} channel${ytChannels.length > 1 ? 's' : ''} connected` : 'Connect via Google OAuth to upload videos'}
                    </p>
                  </div>
                </div>
                {ytChannels.length > 0 ? (
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Not connected
                  </span>
                )}
              </div>

              {/* List connected channels */}
              {ytChannels.length > 0 && (
                <div className="mt-3 space-y-2">
                  {ytChannels.map(ch => (
                    <div key={ch.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <YtIcon />
                        <span className="text-sm font-medium text-foreground">{ch.channelTitle}</span>
                        <span className="text-xs text-muted-foreground">({ch.channelId})</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDisconnectYouTube(ch.id)}>
                        <Unplug className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={handleConnectYouTube} disabled={connectingYt}>
                  {connectingYt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {ytChannels.length > 0 ? 'Add Another Channel' : 'Connect YouTube'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Note: Your Google Cloud project must have the <strong>YouTube Data API v3</strong> enabled and the redirect URI <code className="bg-muted px-1 rounded">{window.location.origin}/youtube-callback</code> registered.
              </p>
            </div>
            {/* Google Client ID Switcher */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Google API Client Switcher</p>
                  <p className="text-xs text-muted-foreground">Manage multiple Google OAuth Client IDs</p>
                </div>
              </div>

              {clientIds.length > 0 && (
                <div className="space-y-2 mb-4">
                  {clientIds.map((cid, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2.5 rounded-lg ${
                      activeClientId === cid ? "bg-primary/10 border border-primary" : "bg-muted"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Key className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-foreground font-mono truncate">{cid}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant={activeClientId === cid ? "default" : "outline"} size="sm" className="h-7 text-xs"
                          onClick={() => {
                            setActiveClientId(cid);
                            setActiveClientIdState(cid);
                            toast.success("Active Client ID updated!");
                          }}
                        >
                          {activeClientId === cid ? "Active" : "Use"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            const updated = clientIds.filter((_, i) => i !== idx);
                            setClientIds(updated);
                            saveClientIds(updated);
                            if (activeClientId === cid) {
                              setActiveClientId(updated[0] || null);
                              setActiveClientIdState(updated[0] || null);
                            }
                            toast.success("Client ID removed");
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newClientId}
                  onChange={e => setNewClientId(e.target.value)}
                  placeholder="Paste Client ID (xxx.apps.googleusercontent.com)"
                  className="text-xs font-mono"
                />
                <Button size="sm" onClick={() => {
                  if (!newClientId.trim()) return;
                  if (clientIds.includes(newClientId.trim())) {
                    toast.error("Client ID already exists");
                    return;
                  }
                  const updated = [...clientIds, newClientId.trim()];
                  setClientIds(updated);
                  saveClientIds(updated);
                  if (!activeClientId) {
                    setActiveClientId(newClientId.trim());
                    setActiveClientIdState(newClientId.trim());
                  }
                  setNewClientId("");
                  toast.success("Client ID added!");
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {!activeClientId && clientIds.length === 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  No custom Client IDs configured. The default backend Client ID will be used.
                  Add one here if you have multiple Google Cloud projects.
                </p>
              )}
              {activeClientId && (
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                    setActiveClientId(null);
                    setActiveClientIdState(null);
                    toast.success("Switched to default backend Client ID");
                  }}>
                    Reset to Default
                  </Button>
                  <span className="text-xs text-muted-foreground">Currently using custom Client ID</span>
                </div>
              )}
              <ChannelClientMap channels={ytChannels} clientIds={clientIds} />
              <ChannelLangDefaults channels={ytChannels} />
            </div>
          </motion.div>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <div>
              <h2 className="font-display font-semibold text-foreground">Default Upload Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">These apply automatically to all new bulk uploads</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Description</label>
                <Textarea
                  placeholder="Your channel description, links, social handles…"
                  rows={5}
                  value={defaults.description}
                  onChange={e => setDefaults(d => ({ ...d, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Default Tags (comma separated)</label>
                <Input
                  placeholder="gaming, tutorial, vlog"
                  value={defaults.tags}
                  onChange={e => setDefaults(d => ({ ...d, tags: e.target.value }))}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Default Privacy</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "public", icon: <Globe className="w-3.5 h-3.5" />, label: "Public" },
                      { value: "unlisted", icon: <Eye className="w-3.5 h-3.5" />, label: "Unlisted" },
                      { value: "private", icon: <Lock className="w-3.5 h-3.5" />, label: "Private" },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setDefaults(d => ({ ...d, privacy: opt.value as any }))}
                        className={`p-2.5 rounded-lg border-2 text-center text-xs transition-all ${
                          defaults.privacy === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}>
                        <div className="flex justify-center mb-1">{opt.icon}</div>
                        <p className="font-semibold">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Default Category</label>
                  <select value={defaults.category}
                    onChange={e => setDefaults(d => ({ ...d, category: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
                  >
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-6 p-3 bg-muted rounded-lg">
                {[
                  { label: "Allow comments", key: "allowComments" as keyof UploadDefaults },
                  { label: "Show likes/dislikes", key: "allowRatings" as keyof UploadDefaults },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={defaults[item.key] as boolean}
                      onChange={e => setDefaults(d => ({ ...d, [item.key]: e.target.checked }))}
                      className="rounded w-4 h-4"
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Social Unlock / Smart Links */}
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-foreground">Smart Links (Social Unlock)</h3>
                      <p className="text-xs text-muted-foreground">Auto-add unlock links to video descriptions</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={defaults.socialUnlockEnabled || false}
                      onChange={e => setDefaults(d => ({ ...d, socialUnlockEnabled: e.target.checked }))}
                      className="rounded w-5 h-5" />
                    <span className="text-sm font-semibold">Enable</span>
                  </label>
                </div>

                {defaults.socialUnlockEnabled && (
                  <div className="space-y-4 pt-3 border-t border-primary/20">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5" /> Target URL
                      </label>
                      <Input
                        value={defaults.socialUnlockTargetUrl || ""}
                        onChange={e => setDefaults(d => ({ ...d, socialUnlockTargetUrl: e.target.value }))}
                        placeholder="https://example.com/download"
                      />
                      <p className="text-xs text-muted-foreground mt-1">URL users unlock after completing actions</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Description Header Text</label>
                      <Input
                        value={defaults.socialUnlockHeader ?? "🎁 UNLOCK EXCLUSIVE CONTENT"}
                        onChange={e => setDefaults(d => ({ ...d, socialUnlockHeader: e.target.value }))}
                        placeholder="🎁 UNLOCK EXCLUSIVE CONTENT"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Appears above the link in the video description</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Comment Message Text</label>
                      <Textarea
                        value={defaults.socialUnlockBody ?? "🎁 Unlock exclusive content!\n\nComplete the required actions to access:"}
                        onChange={e => setDefaults(d => ({ ...d, socialUnlockBody: e.target.value }))}
                        placeholder="🎁 Unlock exclusive content!&#10;&#10;Complete the required actions to access:"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Posted as a comment under the video (link appended)</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Required Actions</label>
                      <div className="space-y-2">
                        {[
                          { key: "subscribe" as const, label: "Require Subscribe" },
                          { key: "like" as const, label: "Require Like" },
                          { key: "comment" as const, label: "Require Comment" },
                          { key: "discord" as const, label: "Require Join Discord" },
                          { key: "watch" as const, label: "Require Watch Video" },
                        ].map(action => (
                          <label key={action.key} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 transition-colors">
                            <input type="checkbox"
                              checked={defaults.socialUnlockActions?.[action.key] || false}
                              onChange={e => setDefaults(d => ({
                                ...d,
                                socialUnlockActions: {
                                  ...(d.socialUnlockActions || { subscribe: true, like: true, comment: false }),
                                  [action.key]: e.target.checked,
                                },
                              }))}
                              className="rounded w-4 h-4" />
                            <span className="text-sm">{action.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {defaults.socialUnlockActions?.discord && (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Discord Invite URL</label>
                        <Input
                          value={defaults.socialUnlockDiscordUrl || ""}
                          onChange={e => setDefaults(d => ({ ...d, socialUnlockDiscordUrl: e.target.value }))}
                          placeholder="https://discord.gg/yourserver"
                        />
                        <p className="text-xs text-muted-foreground mt-1">The invite viewers must join to unlock (used by the Join Discord step).</p>
                      </div>
                    )}
                    {defaults.socialUnlockActions?.watch && (
                      <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Watch Video URL</label>
                          <Input
                            value={defaults.socialUnlockWatchVideoUrl || ""}
                            onChange={e => setDefaults(d => ({ ...d, socialUnlockWatchVideoUrl: e.target.value }))}
                            placeholder="Leave blank to use the uploaded video, or paste a YouTube link"
                          />
                          <p className="text-xs text-muted-foreground mt-1">The video viewers must watch. Blank = they watch the video you're uploading.</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Required Watch Time (seconds)</label>
                          <Input
                            type="number" min={1} max={600}
                            value={defaults.socialUnlockWatchSeconds ?? 30}
                            onChange={e => setDefaults(d => ({ ...d, socialUnlockWatchSeconds: Math.max(1, Math.min(600, Number(e.target.value) || 30)) }))}
                            placeholder="30"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Countdown pauses if the viewer pauses the video, and resumes when they play it again.</p>
                        </div>
                      </div>
                    )}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>How it works:</strong> A smart link is auto-added to video descriptions. Viewers must complete required actions to unlock your target URL.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                onClick={() => {
                  saveUploadDefaults(null, defaults);
                  setDefaultsSaved(true);
                  toast.success("Upload defaults saved!");
                  setTimeout(() => setDefaultsSaved(false), 2000);
                }}
              >
                {defaultsSaved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
                Save Defaults
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-6 shadow-card border border-border/50 space-y-5">
            <h2 className="font-display font-semibold text-foreground">General Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-medium text-foreground">Email notifications</p>
                  <p className="text-xs text-muted-foreground">Get notified when uploads complete</p>
                </div>
                <Switch />
              </div>
              <SmartLinkStyleSelect />
              <Button className="bg-gradient-brand text-primary-foreground hover:opacity-90" onClick={() => toast.success("Settings saved!")}>Save Settings</Button>
            </div>

            <SmartLinkAnalytics />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;

// Shows which connected channel is bound to which Google client, and flags clients
// carrying more than one channel (a broadcast to all of them drains that client fast).
// Per-channel default upload language. Saved locally; uploads auto-translate to each
// channel's language so you never set it by hand. First view seeds the recommended plan.
function ChannelLangDefaults({ channels }: { channels: YtChannel[] }) {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (channels && channels.length > 0) {
      seedChannelLangPlan(channels.map(c => ({ id: c.id, title: c.channelTitle })));
    }
    setMap(getChannelLangMap());
  }, [channels]);
  if (!channels || channels.length === 0) return null;

  const change = (id: string, code: string) => {
    setChannelLang(id, code);
    setMap(m => ({ ...m, [id]: code }));
  };

  return (
    <div className="mt-6 pt-6 border-t border-border/50">
      <h3 className="text-sm font-semibold text-foreground mb-1">Per-Channel Default Language</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Each channel's uploads auto-translate to this language — set it once, no manual picking per upload.
      </p>
      <div className="space-y-2">
        {channels.map(ch => (
          <div key={ch.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
            <span className="text-youtube"><YtIcon /></span>
            <span className="flex-1 min-w-0 truncate text-sm text-foreground">{ch.channelTitle}</span>
            <select
              value={map[ch.id] ?? ""}
              onChange={e => change(ch.id, e.target.value)}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground min-w-[150px]"
            >
              {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelClientMap({ channels, clientIds }: { channels: YtChannel[]; clientIds: string[] }) {
  if (!channels || channels.length === 0) return null;
  const UPLOAD_UNITS = 1600, DAILY = 10000;
  const groups = new Map<string, YtChannel[]>();
  for (const ch of channels) {
    const key = ch.clientId || "__default__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ch);
  }
  const label = (cid: string) => {
    if (cid === "__default__") return "Default backend client";
    const idx = clientIds.indexOf(cid);
    return idx >= 0 ? `Client ${idx + 1}` : `Client (${cid.slice(0, 14)}…)`;
  };
  return (
    <div className="mt-6 pt-4 border-t border-border/50">
      <p className="text-sm font-semibold text-foreground mb-1">Channel ↔ Client map</p>
      <p className="text-xs text-muted-foreground mb-3">
        Each client = one Google project ≈ {Math.floor(DAILY / UPLOAD_UNITS)} uploads/day. Spread channels across clients so a broadcast doesn't drain one.
      </p>
      <div className="space-y-2">
        {[...groups.entries()].map(([cid, chs]) => {
          const perBroadcast = chs.length * UPLOAD_UNITS;
          const broadcasts = Math.floor(DAILY / perBroadcast);
          const overloaded = chs.length > 1;
          return (
            <div key={cid} className={`rounded-lg border p-3 ${overloaded ? "border-amber-500/40 bg-amber-500/5" : "border-border/50 bg-muted/40"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{label(cid)}</span>
                <span className="text-[11px] text-muted-foreground">{chs.length} channel{chs.length > 1 ? "s" : ""}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{chs.map((c) => c.channelTitle).join(", ")}</div>
              {overloaded && (
                <div className="text-[11px] text-amber-500 mt-1.5">
                  ⚠ A broadcast to all {chs.length} here costs {perBroadcast.toLocaleString()} units → only ~{broadcasts} full broadcast{broadcasts === 1 ? "" : "s"}/day before this client is drained. Move some to another client.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SmartLinkStyleSelect() {
  const [page, setPage] = useState<SmartLinkPage>(getSmartLinkPage());
  const [format, setFormat] = useState<SmartLinkFormat>(getSmartLinkFormat());

  const pageOpts: { v: SmartLinkPage; label: string; hint: string }[] = [
    { v: "gate", label: "Gate page (direct steps)", hint: "yourdomain/u/… — clean like/comment/subscribe page (old style)" },
    { v: "article", label: "Article page (AdSense)", hint: "yourdomain/article/… — steps inside an editorial page" },
  ];
  const fmtOpts: { v: SmartLinkFormat; label: string; hint: string }[] = [
    { v: "full", label: "Full link", hint: "post the page URL as-is" },
    { v: "external", label: "Short — spoo.me", hint: "hides your domain; tracked in your spoo.me dashboard" },
    { v: "self", label: "Short — your /s/", hint: "self-hosted short link with click analytics" },
  ];
  const curPage = pageOpts.find((o) => o.v === page)!;
  const curFmt = fmtOpts.find((o) => o.v === format)!;
  const sel = "w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

  return (
    <div className="p-3 rounded-lg bg-muted space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Unlock page style</p>
        <select value={page} onChange={(e) => { const v = e.target.value as SmartLinkPage; setPage(v); setSmartLinkPage(v); toast.success("Saved"); }} className={sel}>
          {pageOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">{curPage.hint}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Link format</p>
        <select value={format} onChange={(e) => { const v = e.target.value as SmartLinkFormat; setFormat(v); setSmartLinkFormat(v); toast.success("Saved"); }} className={sel}>
          {fmtOpts.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <p className="text-[11px] text-muted-foreground mt-1">{curFmt.hint}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">All combinations unlock to your Target URL. Comments &amp; descriptions use whatever you pick here.</p>
    </div>
  );
}

