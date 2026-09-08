import { Button } from "@/components/ui/button";
import { Trash2, X, Globe, Users, Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Privacy = "public" | "unlisted" | "private";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchDelete: () => Promise<void>;
  onBatchPrivacy?: (status: Privacy) => Promise<void>;
}

export function BatchActionsBar({ selectedCount, onClearSelection, onBatchDelete, onBatchPrivacy }: BatchActionsBarProps) {
  const [busy, setBusy] = useState<null | "delete" | Privacy>(null);

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedCount} video(s)? This cannot be undone.`)) return;
    setBusy("delete");
    try { await onBatchDelete(); }
    catch (err: any) { toast.error(err.message || "Failed to delete videos"); }
    finally { setBusy(null); }
  };

  const handlePrivacy = async (status: Privacy) => {
    if (!onBatchPrivacy) return;
    setBusy(status);
    try { await onBatchPrivacy(status); }
    catch (err: any) { toast.error(err.message || "Failed to change privacy"); }
    finally { setBusy(null); }
  };

  if (selectedCount === 0) return null;
  const anyBusy = busy !== null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground rounded-full shadow-2xl border-2 border-primary-foreground/20 px-5 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold">{selectedCount}</span>
          </div>
          <span className="font-semibold">selected</span>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        {/* Privacy actions */}
        {onBatchPrivacy && (
          <div className="flex items-center gap-1.5">
            <Button onClick={() => handlePrivacy("public")} disabled={anyBusy} variant="secondary" size="sm" className="gap-1.5 h-8">
              {busy === "public" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Public
            </Button>
            <Button onClick={() => handlePrivacy("unlisted")} disabled={anyBusy} variant="secondary" size="sm" className="gap-1.5 h-8">
              {busy === "unlisted" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />} Unlisted
            </Button>
            <Button onClick={() => handlePrivacy("private")} disabled={anyBusy} variant="secondary" size="sm" className="gap-1.5 h-8">
              {busy === "private" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Private
            </Button>
          </div>
        )}

        <div className="h-6 w-px bg-primary-foreground/20" />

        <div className="flex items-center gap-2">
          <Button onClick={handleDelete} disabled={anyBusy} variant="destructive" size="sm" className="gap-2 h-8">
            {busy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {busy === "delete" ? "Deleting…" : "Delete"}
          </Button>
          <Button onClick={onClearSelection} disabled={anyBusy} variant="ghost" size="sm"
            className="h-8 w-8 p-0 hover:bg-primary-foreground/20 text-primary-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
