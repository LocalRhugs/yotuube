import { useState, useRef, useEffect } from "react";
import { Scissors, RotateCcw, Download, Loader2, Play, Pause, Volume2, VolumeX, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

interface VideoEditorProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

type AspectRatio = "original" | "9:16" | "16:9" | "1:1";

const VideoEditor = ({ file, onSave, onCancel }: VideoEditorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("original");
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Preload FFmpeg on mount
  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";

    // Multi-threaded sources (require SharedArrayBuffer)
    const MT_SOURCES = [
      { name: "jsdelivr", url: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd" },
      { name: "unpkg", url: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd" },
    ];

    // Single-threaded sources (no SharedArrayBuffer needed - works in iframes)
    // @ffmpeg/core@0.12.10/dist/esm works without SharedArrayBuffer
    // @ffmpeg/core-st@0.11.1 is the last published single-thread package
    const ST_SOURCES = [
      { name: "jsdelivr-esm", url: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm" },
      { name: "unpkg-esm", url: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm" },
      { name: "jsdelivr-st-011", url: "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.11.1/dist/umd" },
      { name: "unpkg-st-011", url: "https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/umd" },
    ];

    // Try multi-threaded first if supported, then fall back to single-threaded
    const sources = hasSharedArrayBuffer
      ? [...MT_SOURCES, ...ST_SOURCES]
      : ST_SOURCES;

    const errors: string[] = [];

    for (const cdn of sources) {
      try {
        console.log(`FFmpeg: trying ${cdn.name}...`);
        const ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => console.log("FFmpeg:", message));

        const [coreURL, wasmURL] = await Promise.all([
          toBlobURL(`${cdn.url}/ffmpeg-core.js`, "text/javascript"),
          toBlobURL(`${cdn.url}/ffmpeg-core.wasm`, "application/wasm"),
        ]);

        await ffmpeg.load({ coreURL, wasmURL });

        ffmpegRef.current = ffmpeg;
        setFfmpegLoaded(true);
        setLoadError("");
        console.log(`FFmpeg loaded from ${cdn.name}`);
        return;
      } catch (error: any) {
        const msg = error?.message || String(error);
        errors.push(`${cdn.name}: ${msg}`);
        console.warn(`FFmpeg ${cdn.name} failed:`, msg);
      }
    }

    setLoadError(
      `FFmpeg failed to load from all sources. Click Retry to try again.\n${errors.join(" | ")}`
    );
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
      setVideoWidth(videoRef.current.videoWidth);
      setVideoHeight(videoRef.current.videoHeight);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.currentTime >= trimEnd) {
        videoRef.current.pause();
        setPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleTrimChange = (values: number[]) => {
    setTrimStart(values[0]);
    setTrimEnd(values[1]);
    if (videoRef.current && !playing) {
      videoRef.current.currentTime = values[0];
    }
  };

  const handleReset = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setPlaying(false);
      setTrimStart(0);
      setTrimEnd(duration);
      setCurrentTime(0);
      setAspectRatio("original");
    }
  };

  const handleProcess = async () => {
    if (!ffmpegRef.current || !ffmpegLoaded) {
      toast.error("FFmpeg is not loaded yet. Please wait a moment.");
      return;
    }

    setProcessing(true);
    setProcessMessage("Processing video...");

    try {
      const ffmpeg = ffmpegRef.current;

      await ffmpeg.writeFile("input.mp4", new Uint8Array(await file.arrayBuffer()));

      const filterCommands: string[] = [];

      if (aspectRatio !== "original") {
        let targetWidth: number, targetHeight: number;
        if (aspectRatio === "9:16") { targetWidth = 1080; targetHeight = 1920; }
        else if (aspectRatio === "16:9") { targetWidth = 1920; targetHeight = 1080; }
        else { targetWidth = 1080; targetHeight = 1080; }

        filterCommands.push(
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2`
        );
      }

      const args = ["-i", "input.mp4", "-ss", trimStart.toFixed(2), "-t", (trimEnd - trimStart).toFixed(2)];

      if (filterCommands.length > 0) {
        args.push("-vf", filterCommands.join(","));
        args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "128k");
      } else {
        args.push("-c", "copy", "-avoid_negative_ts", "make_zero");
      }

      args.push("output.mp4");
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile("output.mp4");
      const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
      const blob = new Blob([new Uint8Array(uint8)], { type: "video/mp4" });
      const editedFile = new File([blob], `edited_${file.name}`, { type: "video/mp4" });

      toast.success(`Video processed! ${formatTime(trimStart)} → ${formatTime(trimEnd)}${aspectRatio !== "original" ? ` (${aspectRatio})` : ""}`);
      onSave(editedFile);
    } catch (err: any) {
      console.error("FFmpeg error:", err);
      toast.error(`Video processing failed: ${err.message || "Unknown error"}`);
    } finally {
      setProcessing(false);
      setProcessMessage("");
    }
  };

  const trimmedDuration = trimEnd - trimStart;
  const isShortQualified =
    trimmedDuration <= 60 && (aspectRatio === "9:16" || (aspectRatio === "original" && videoWidth < videoHeight));

  const aspectOptions: { value: AspectRatio; label: string; sub: string }[] = [
    { value: "original", label: "Original", sub: videoWidth ? `${videoWidth}×${videoHeight}` : "Auto" },
    { value: "9:16", label: "9:16", sub: "Vertical / Shorts" },
    { value: "16:9", label: "16:9", sub: "Widescreen" },
    { value: "1:1", label: "1:1", sub: "Square" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" />
          Video Editor
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Duration: {formatTime(trimmedDuration)}</span>
          {isShortQualified && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
              ✨ Shorts Eligible
            </span>
          )}
        </div>
      </div>

      {/* FFmpeg loading state */}
      {!ffmpegLoaded && !loadError && (
        <div className="p-4 bg-muted/50 text-center">
          <p className="text-sm font-medium text-foreground mb-2">Loading Video Editor...</p>
          <div className="w-full bg-secondary rounded-full h-2 max-w-xs mx-auto">
            <div className="bg-primary h-2 rounded-full animate-pulse w-3/4" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Initializing FFmpeg in your browser</p>
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
          <p className="text-sm font-medium text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoadError(""); loadFFmpeg(); }}>
            <RotateCcw className="w-3 h-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Video player */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          muted={muted}
        />
        {processing && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{processMessage}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={togglePlay} disabled={processing}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Trim slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Scissors className="w-3 h-3" /> Trim Range</span>
            <span>{formatTime(trimStart)} → {formatTime(trimEnd)}</span>
          </div>
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[trimStart, trimEnd]}
            onValueChange={handleTrimChange}
            disabled={processing}
            className="w-full"
          />
        </div>

        {/* Aspect ratio selector */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Crop className="w-3 h-3" /> Aspect Ratio
          </p>
          <div className="grid grid-cols-4 gap-2">
            {aspectOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAspectRatio(opt.value)}
                disabled={processing}
                className={`p-2.5 rounded-lg border-2 transition-all text-center ${
                  aspectRatio === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } disabled:opacity-50`}
              >
                <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleProcess}
            disabled={processing || trimmedDuration < 0.5 || !ffmpegLoaded}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {processing ? "Processing..." : !ffmpegLoaded ? "Loading..." : "Apply & Save"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={processing}>
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Video processing uses FFmpeg in your browser. First use may take a moment to load.
        </p>
      </div>
    </Card>
  );
};

export default VideoEditor;
