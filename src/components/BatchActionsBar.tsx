import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchDelete: () => Promise<void>;
}

export function BatchActionsBar({ selectedCount, onClearSelection, onBatchDelete }: BatchActionsBarProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedCount} video(s)? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await onBatchDelete();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete videos");
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground rounded-full shadow-2xl border-2 border-primary-foreground/20 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <span className="text-sm font-bold">{selectedCount}</span>
          </div>
          <span className="font-semibold">selected</span>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <div className="flex items-center gap-2">
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="secondary"
            size="sm"
            className="gap-2 h-8"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>

          <Button
            onClick={onClearSelection}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary-foreground/20 text-primary-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
