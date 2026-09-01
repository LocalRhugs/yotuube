import { useState } from "react";
import { Languages } from "lucide-react";
import { getTranslateProvider, setTranslateProvider, type TranslateProvider } from "@/lib/smart-link-api";

/**
 * Global translation-model selector. The choice is saved per-browser (localStorage) and used by
 * every translateText() call across the app — Upload, Bulk Upload, My Videos, per-channel passes.
 * `puter:*` models run client-side via Puter.js (no API key; premium models bill the user's Puter
 * account and prompt a one-time sign-in). Server options need a secret configured on the function.
 */
export function TranslationModelSelect({
  className = "",
  showLabel = true,
}: { className?: string; showLabel?: boolean }) {
  const [value, setValue] = useState<TranslateProvider>(getTranslateProvider());

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {showLabel && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Languages className="w-3.5 h-3.5" /> Model
        </span>
      )}
      <select
        value={value}
        onChange={(e) => {
          const p = e.target.value as TranslateProvider;
          setValue(p);
          setTranslateProvider(p);
        }}
        title="Translation model — applies to all translations"
        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground max-w-[220px]"
      >
        <optgroup label="Free — no key (Puter.js)">
          <option value="puter:gpt-5.4-mini">GPT-5.4 Mini · free</option>
          <option value="puter:gpt-5.4">GPT-5.4 · free</option>
          <option value="puter:gpt-5.4-nano">GPT-5.4 Nano · free/fast</option>
          <option value="puter:gpt-5.3-chat">GPT-5.3 Chat · free</option>
          <option value="puter:gpt-5.2">GPT-5.2 · free</option>
        </optgroup>
        <optgroup label="Premium — Puter account (no key)">
          <option value="puter:claude-sonnet-4-20250514">Claude Sonnet 4</option>
          <option value="puter:claude-opus-4-20250514">Claude Opus 4</option>
          <option value="puter:claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
          <option value="puter:gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="puter:gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="puter:grok-4">Grok 4</option>
          <option value="puter:deepseek-chat">DeepSeek Chat</option>
        </optgroup>
        <optgroup label="Server — needs secret">
          <option value="pollinations">Pollinations (token)</option>
          <option value="claude">Claude API (key)</option>
          <option value="lovable">Lovable (Gemini)</option>
        </optgroup>
      </select>
    </div>
  );
}
