import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface VideoCommentManagerProps {
  videoId: string;
  accessToken: string;
  videoTitle: string;
}

const VideoCommentManager = ({ videoId, accessToken, videoTitle }: VideoCommentManagerProps) => {
  const [comment, setComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handlePostComment = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment before posting.");
      return;
    }

    setIsPosting(true);
    setStatus("idle");

    try {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snippet: {
              videoId,
              topLevelComment: {
                snippet: {
                  textOriginal: comment,
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to post comment");
      }

      setStatus("success");
      setStatusMessage("Comment posted successfully!");
      setComment("");
      toast.success("Comment posted to the video!");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to post comment");
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground">Post a Comment</h3>
          <p className="text-sm text-muted-foreground truncate">{videoTitle}</p>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write your comment here..."
        className="w-full p-3 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        rows={3}
        disabled={isPosting}
      />

      {status === "success" && (
        <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <p className="text-sm text-success">{statusMessage}</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{statusMessage}</p>
        </div>
      )}

      <Button
        onClick={handlePostComment}
        disabled={isPosting || !comment.trim()}
        className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90"
      >
        {isPosting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Posting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Post Comment
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Pinning comments is only available through YouTube Studio
      </p>
    </Card>
  );
};

export default VideoCommentManager;
