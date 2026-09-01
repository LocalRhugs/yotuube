import { useState } from "react";
import { Languages } from "lucide-react";
import { getTranslateProvider, setTranslateProvider, TRANSLATE_MODELS } from "@/lib/smart-link-api";

/**
 * Global translation-model selector. The choice is saved per-browser (localStorage) and used by
 * every translateText() call across the app — Upload, Bulk Upload, My Videos, per-channel passes.
 * All models run server-side through the `translate` edge function (OpenRouter / Pollinations / Groq);
 * API keys live in Supabase secrets, never the browser.
 */
export function TranslationModelSelect({
  className = "",
  showLabel = true,
}: { className?: string; showLabel?: boolean }) {
  const [value, setValue] = useState<string>(getTranslateProvider());

  // Preserve declaration order while grouping.
  const groups: string[] = [];
  for (const m of TRANSLATE_MODELS) if (!groups.includes(m.group)) groups.push(m.group);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {showLabel && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Languages className="w-3.5 h-3.5" /> Model
        </span>
      )}
      <select
        value={value}
        onChange={(e) => { setValue(e.target.value); setTranslateProvider(e.target.value); }}
        title="Translation model — applies to all translations"
        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground max-w-[240px]"
      >
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {TRANSLATE_MODELS.filter((m) => m.group === g).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
