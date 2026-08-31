import { useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { postFacebookComment, postInstagramComment } from "@/lib/facebook-api";

interface CommentDialogProps {
  objectId: string;
  platform: "facebook" | "instagram";
  pageAccessToken?: string;
  objectTitle?: string;
}

const CommentDialog = ({ objectId, platform, pageAccessToken, objectTitle }: CommentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!message.trim()) return;
    setPosting(true);
    try {
      const res = platform === "facebook"
        ? await postFacebookComment(objectId, message, pageAccessToken)
        : await postInstagramComment(objectId, message, pageAccessToken);

      if (res.success) {
        toast.success("Comment posted!");
        setMessage("");
        setOpen(false);
      } else {
        toast.error(res.error || "Failed to post comment");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
          <MessageCircle className="w-3 h-3" />
          Comment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Post Comment
          </DialogTitle>
          {objectTitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">on: {objectTitle}</p>
          )}
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Write your comment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            disabled={posting}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={posting}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={!message.trim() || posting}
              className="bg-gradient-brand text-primary-foreground hover:opacity-90"
            >
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentDialog;
