import { useEffect, useRef, useState } from "react";
import { Film, Play, Pause } from "lucide-react";

interface VideoPreviewProps {
  file: File;
}

const VideoPreview = ({ file }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string>('');
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div className="relative group cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={url}
          className="w-full max-h-[360px] object-contain bg-black"
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onEnded={() => setPlaying(false)}
          preload="metadata"
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-foreground ml-1" />
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film className="w-4 h-4" />
          <span>{file.name}</span>
          <span className="text-xs">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
        </div>
        {duration > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
};

export default VideoPreview;
