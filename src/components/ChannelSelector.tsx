import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertCircle } from "lucide-react";
import { getStoredChannels, type StoredYouTubeChannel } from "@/lib/youtube-direct";

interface ChannelSelectorProps {
  selectedChannels: string[]; // array of youtube_tokens.id
  onChannelsChange: (ids: string[]) => void;
  disabled?: boolean;
}

const YtIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 text-youtube" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export function ChannelSelector({ selectedChannels, onChannelsChange, disabled }: ChannelSelectorProps) {
  const [channels, setChannels] = useState<StoredYouTubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const ch = await getStoredChannels();
      if (ch.length === 0) {
        setError("No YouTube channels connected. Connect one in Settings.");
      } else {
        setChannels(ch);
        if (selectedChannels.length === 0) {
          onChannelsChange([ch[0].id]);
        }
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const toggle = (id: string) => {
    if (disabled) return;
    const next = selectedChannels.includes(id)
      ? selectedChannels.filter((c) => c !== id)
      : [...selectedChannels, id];
    onChannelsChange(next);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading channels…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {channels.map((ch) => (
        <label
          key={ch.id}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedChannels.includes(ch.id)
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/30"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Checkbox
            checked={selectedChannels.includes(ch.id)}
            onCheckedChange={() => toggle(ch.id)}
            disabled={disabled}
          />
          <YtIcon />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {ch.channelTitle || "Unnamed Channel"}
            </p>
            {ch.channelId && (
              <p className="text-xs text-muted-foreground truncate">{ch.channelId}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
