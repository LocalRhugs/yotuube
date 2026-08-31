import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Instagram, Plus, Trash2, Zap, Eye, Clock, Hash, MessageCircle,
  Send, Play, Pause, RefreshCw, Info, CheckCircle2, AlertCircle,
  Loader2, X, ToggleLeft, ToggleRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getFacebookPages, getInstagramAccount } from "@/lib/facebook-api";
import { supabase } from "@/integrations/supabase/client";

interface AutoReplyRule {
  id: string;
  keyword: string;
  replyMessage: string;
  enabled: boolean;
  matchCount: number;
  createdAt: number;
  lastMatchAt?: number;
}

interface RecentActivity {
  type: "match" | "reply" | "error";
  message: string;
  timestamp: number;
  rule?: string;
  username?: string;
}

const RULES_KEY = "ig_auto_reply_rules";

const loadRules = (): AutoReplyRule[] => {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || "[]"); } catch { return []; }
};
const saveRules = (rules: AutoReplyRule[]) => localStorage.setItem(RULES_KEY, JSON.stringify(rules));
const genId = () => `rule_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const repliedKey = (commentId: string) => `ig_replied_${commentId}`;
const hasReplied = (commentId: string) => !!localStorage.getItem(repliedKey(commentId));
const markReplied = (commentId: string) => localStorage.setItem(repliedKey(commentId), "1");

const IgAutoReplyPage = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [igAccount, setIgAccount] = useState<any>(null);
  const [loadingPages, setLoadingPages] = useState(true);

  const [rules, setRules] = useState<AutoReplyRule[]>(loadRules());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [checkInterval, setCheckInterval] = useState(60);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New rule dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newReply, setNewReply] = useState("");

  // Delete dialog
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  useEffect(() => {
    const loadPages = async () => {
      setLoadingPages(true);
      const res = await getFacebookPages();
      if (res.success && res.data?.data?.length > 0) {
        setPages(res.data.data);
        setSelectedPageId(res.data.data[0].id);
      }
      setLoadingPages(false);
    };
    loadPages();
  }, []);

  useEffect(() => {
    if (!selectedPageId) return;
    const page = pages.find((p: any) => p.id === selectedPageId);
    if (!page) return;
    const loadIg = async () => {
      const res = await getInstagramAccount(selectedPageId, page.access_token);
      if (res.success && res.data?.instagram_business_account) {
        setIgAccount(res.data.instagram_business_account);
      } else {
        setIgAccount(null);
      }
    };
    loadIg();
  }, [selectedPageId, pages]);

  const addActivity = useCallback((a: Omit<RecentActivity, "timestamp">) => {
    setRecentActivity(prev => [{ ...a, timestamp: Date.now() }, ...prev.slice(0, 49)]);
  }, []);

  const checkForComments = useCallback(async () => {
    if (!igAccount) return;
    const enabledRules = rules.filter(r => r.enabled);
    if (enabledRules.length === 0) return;

    const page = pages.find((p: any) => p.id === selectedPageId);
    const token = page?.access_token;
    setLastCheck(new Date());

    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'get_ig_comments', igAccountId: igAccount.id, pageAccessToken: token },
      });
      if (error || !data?.success) {
        addActivity({ type: "error", message: `Failed to fetch comments: ${error?.message || data?.error}` });
        return;
      }

      const comments: any[] = data.comments || [];
      for (const comment of comments) {
        if (hasReplied(comment.id)) continue;
        const text = (comment.text || "").toLowerCase();

        for (const rule of enabledRules) {
          if (text.includes(rule.keyword.toLowerCase())) {
            addActivity({ type: "match", message: `Keyword "${rule.keyword}" found in @${comment.username}'s comment`, rule: rule.keyword, username: comment.username });

            const { data: replyData, error: replyErr } = await supabase.functions.invoke('youtube-auth', {
              body: { action: 'post_ig_comment_reply', commentId: comment.id, message: rule.replyMessage, pageAccessToken: token },
            });

            if (replyErr || !replyData?.success) {
              addActivity({ type: "error", message: `Failed to reply to @${comment.username}: ${replyErr?.message || replyData?.error}`, rule: rule.keyword });
            } else {
              markReplied(comment.id);
              const updatedRules = rules.map(r => r.id === rule.id ? { ...r, matchCount: r.matchCount + 1, lastMatchAt: Date.now() } : r);
              setRules(updatedRules);
              saveRules(updatedRules);
              addActivity({ type: "reply", message: `Replied to @${comment.username} with rule "${rule.keyword}"`, rule: rule.keyword, username: comment.username });
              toast.success(`Auto-replied to @${comment.username}`);
            }
            break;
          }
        }
      }
    } catch (e: any) {
      addActivity({ type: "error", message: `Check error: ${e.message}` });
    }
  }, [igAccount, rules, pages, selectedPageId, addActivity]);

  useEffect(() => {
    if (isMonitoring) {
      checkForComments();
      monitorRef.current = setInterval(checkForComments, checkInterval * 1000);
    } else {
      if (monitorRef.current) { clearInterval(monitorRef.current); monitorRef.current = null; }
    }
    return () => { if (monitorRef.current) clearInterval(monitorRef.current); };
  }, [isMonitoring, checkInterval, checkForComments]);

  const handleCreateRule = () => {
    if (!newKeyword.trim() || !newReply.trim()) {
      toast.error("Please fill in both keyword and reply message");
      return;
    }
    const rule: AutoReplyRule = { id: genId(), keyword: newKeyword.trim(), replyMessage: newReply.trim(), enabled: true, matchCount: 0, createdAt: Date.now() };
    const updated = [...rules, rule];
    setRules(updated);
    saveRules(updated);
    setNewKeyword(""); setNewReply(""); setIsCreateOpen(false);
    toast.success(`Rule for "${rule.keyword}" created!`);
  };

  const handleDeleteRule = () => {
    if (!deleteRuleId) return;
    const updated = rules.filter(r => r.id !== deleteRuleId);
    setRules(updated); saveRules(updated); setDeleteRuleId(null);
    toast.success("Rule deleted");
  };

  const toggleRule = (id: string, enabled: boolean) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled } : r);
    setRules(updated); saveRules(updated);
  };

  const formatTimeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); return `${h}h ago`;
  };

  const activityColors = { match: "text-warning", reply: "text-success", error: "text-destructive" };
  const activityIcons = { match: Hash, reply: CheckCircle2, error: AlertCircle };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-foreground">IG Auto-Reply</h1>
        <p className="text-muted-foreground">Automatically reply to Instagram comments matching keywords</p>
      </motion.div>

      {/* Info Banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          When someone comments a trigger keyword on your Instagram posts, this tool will automatically reply with your pre-configured message.
          Monitoring checks for new comments every {checkInterval} seconds.
        </p>
      </motion.div>

      {/* Page & IG Account selector */}
      {loadingPages ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : pages.length === 0 ? (
        <div className="bg-card rounded-xl p-8 border border-border/50 text-center space-y-3">
          <Instagram className="w-10 h-10 text-instagram mx-auto" />
          <p className="font-medium text-foreground">No Facebook pages found</p>
          <p className="text-sm text-muted-foreground">Connect your Facebook account in Settings first.</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 border border-border/50 shadow-card space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {igAccount?.profile_picture_url && (
                  <img src={igAccount.profile_picture_url} alt="" className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-instagram" />
                    {igAccount ? `@${igAccount.username || igAccount.id}` : "No Instagram linked"}
                  </p>
                  {igAccount && <p className="text-xs text-muted-foreground">{igAccount.followers_count?.toLocaleString()} followers</p>}
                </div>
              </div>

              {pages.length > 1 && (
                <Select value={selectedPageId || ""} onValueChange={setSelectedPageId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select page" /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {!igAccount && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                <p className="text-sm text-muted-foreground">This Facebook page has no linked Instagram Business account. Link it in Meta Business Suite.</p>
              </div>
            )}
          </motion.div>

          {/* Monitoring controls */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 border border-border/50 shadow-card">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h2 className="font-display font-semibold text-foreground">Monitoring</h2>
                <p className="text-sm text-muted-foreground">
                  {isMonitoring ? (
                    <span className="text-success flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block animate-pulse" /> Live — checking every {checkInterval}s</span>
                  ) : "Paused"}
                  {lastCheck && <span className="ml-2 text-muted-foreground">· Last check {formatTimeAgo(lastCheck.getTime())}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Select value={checkInterval.toString()} onValueChange={v => setCheckInterval(parseInt(v))}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30s</SelectItem>
                      <SelectItem value="60">60s</SelectItem>
                      <SelectItem value="120">2m</SelectItem>
                      <SelectItem value="300">5m</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  disabled={!igAccount || rules.filter(r => r.enabled).length === 0}
                  className={isMonitoring ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-gradient-brand text-primary-foreground hover:opacity-90"}
                >
                  {isMonitoring ? <><Pause className="w-4 h-4 mr-2" /> Stop</> : <><Play className="w-4 h-4 mr-2" /> Start Monitoring</>}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Rules */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border/50 shadow-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground">Auto-Reply Rules</h2>
                <p className="text-sm text-muted-foreground">{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</p>
              </div>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                <Plus className="w-4 h-4 mr-1" /> Add Rule
              </Button>
            </div>

            {rules.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Hash className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="font-medium text-foreground">No rules yet</p>
                <p className="text-sm text-muted-foreground">Create your first keyword rule to start auto-replying.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rules.map(rule => (
                  <div key={rule.id} className="p-4 flex items-start gap-4">
                    <Switch checked={rule.enabled} onCheckedChange={v => toggleRule(rule.id, v)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-primary" />
                          {rule.keyword}
                        </span>
                        <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                          {rule.enabled ? "Active" : "Paused"}
                        </Badge>
                        {rule.matchCount > 0 && (
                          <Badge variant="outline" className="text-xs text-success border-success/30">
                            {rule.matchCount} match{rule.matchCount !== 1 ? "es" : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">→ {rule.replyMessage}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(rule.createdAt).toLocaleDateString()}
                        {rule.lastMatchAt && ` · Last match ${formatTimeAgo(rule.lastMatchAt)}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteRuleId(rule.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Log */}
          {recentActivity.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border/50 shadow-card">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="font-display font-semibold text-foreground">Activity Log</h2>
                <Button variant="ghost" size="sm" onClick={() => setRecentActivity([])}>
                  <X className="w-4 h-4" /> Clear
                </Button>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {recentActivity.map((a, i) => {
                  const Icon = activityIcons[a.type];
                  return (
                    <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${activityColors[a.type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{a.message}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeAgo(a.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={v => !v && setIsCreateOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">New Auto-Reply Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Trigger Keyword</label>
              <Input placeholder="e.g. link, price, info" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">When a comment contains this word, the auto-reply is triggered.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Reply Message</label>
              <Textarea placeholder="Your automatic reply message..." value={newReply} onChange={e => setNewReply(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRule} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Dialog */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={v => !v && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this auto-reply rule.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IgAutoReplyPage;
