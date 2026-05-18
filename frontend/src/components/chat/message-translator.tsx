"use client";

/**
 * Message Translator Component
 *
 * Inline translation dropdown for translating messages to user's preferred language.
 */

import { useState } from "react";
import { Languages, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface MessageTranslatorProps {
  messageId: string;
  originalText: string;
  translation?: TranslationResult;
  isTranslating?: boolean;
  onTranslate: (messageId: string, targetLanguage: string) => Promise<void>;
  onDismissTranslation?: (messageId: string) => void;
  className?: string;
}

export function MessageTranslator({
  messageId,
  originalText,
  translation,
  isTranslating = false,
  onTranslate,
  onDismissTranslation,
  className,
}: MessageTranslatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  const handleTranslate = async () => {
    await onTranslate(messageId, selectedLanguage);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    onDismissTranslation?.(messageId);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Translation Result */}
      {translation && !isTranslating && (
        <div className="bg-primary/5 relative rounded-r border-l-2 border-primary py-1.5 pl-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Languages className="h-3 w-3" />
                <span>
                  Translated from{" "}
                  {LANGUAGES.find((l) => l.code === translation.sourceLanguage)
                    ?.name || translation.sourceLanguage}
                </span>
              </div>
              <p className="text-sm">{translation.translatedText}</p>
            </div>
            {onDismissTranslation && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-6 w-6 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="mt-1 text-xs text-primary hover:underline"
          >
            Show original
          </button>
        </div>
      )}

      {/* Loading State */}
      {isTranslating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Translating...</span>
        </div>
      )}

      {/* Translate Button/Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 text-xs", translation && "hidden")}
          >
            <Languages className="mr-1.5 h-3 w-3" />
            Translate
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="space-y-3 p-3">
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                Translate to
              </div>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {translation && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Original message
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {originalText}
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3 w-3" />
                    Translate
                  </>
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
