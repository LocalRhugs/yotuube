import { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRESET_TAGS = [
  // Gaming
  "gaming", "roblox", "minecraft", "fortnite", "gameplay", "walkthrough", "letsplay",
  "tutorial", "tips", "tricks", "glitch", "hack", "script", "exploit",
  // Content type
  "shorts", "reel", "vlog", "montage", "compilation", "highlights", "meme",
  "funny", "viral", "trending", "livestream", "unboxing", "review",
  // Growth
  "subscribe", "fyp", "foryou", "foryoupage", "explore",
  // Tech
  "tech", "coding", "webdev", "ai", "software",
  // Misc
  "entertainment", "music", "art", "animation", "satisfying",
];

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const TagSelector = ({ selectedTags, onChange, disabled }: TagSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customTag, setCustomTag] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = PRESET_TAGS.filter(
    (t) => !selectedTags.includes(t) && t.toLowerCase().includes(search.toLowerCase())
  );

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleaned && !selectedTags.includes(cleaned)) {
      onChange([...selectedTags, cleaned]);
    }
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag);
      setCustomTag("");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer flex items-center flex-wrap gap-1.5 ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-muted-foreground/30"
        }`}
      >
        {selectedTags.length === 0 && (
          <span className="text-muted-foreground">Select tags...</span>
        )}
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs gap-1 pr-1"
          >
            #{tag}
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border space-y-2">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <div className="flex gap-1.5">
              <Input
                placeholder="Add custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={addCustomTag}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-40 p-2">
            {filteredTags.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No tags found</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filteredTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSelector;
