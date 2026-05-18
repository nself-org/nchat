"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "US" },
  { code: "es", name: "Spanish", nativeName: "Espanol", flag: "ES" },
  { code: "fr", name: "French", nativeName: "Francais", flag: "FR" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "DE" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "IT" },
  { code: "pt", name: "Portuguese", nativeName: "Portugues", flag: "PT" },
  { code: "ru", name: "Russian", nativeName: "Russkij", flag: "RU" },
  {
    code: "zh",
    name: "Chinese (Simplified)",
    nativeName: "Zhongwen",
    flag: "CN",
  },
  {
    code: "zh-TW",
    name: "Chinese (Traditional)",
    nativeName: "Zhongwen (Fantizi)",
    flag: "TW",
  },
  { code: "ja", name: "Japanese", nativeName: "Nihongo", flag: "JP" },
  { code: "ko", name: "Korean", nativeName: "Hangugeo", flag: "KR" },
  { code: "ar", name: "Arabic", nativeName: "Arabiyya", flag: "SA" },
  { code: "hi", name: "Hindi", nativeName: "Hindi", flag: "IN" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "NL" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "PL" },
  { code: "tr", name: "Turkish", nativeName: "Turkce", flag: "TR" },
  { code: "vi", name: "Vietnamese", nativeName: "Tieng Viet", flag: "VN" },
  { code: "th", name: "Thai", nativeName: "Phasa Thai", flag: "TH" },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    flag: "ID",
  },
  { code: "uk", name: "Ukrainian", nativeName: "Ukrainska", flag: "UA" },
];

interface LanguageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function LanguageSelector({
  value,
  onValueChange,
  className,
  disabled = false,
  placeholder = "Select language",
}: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="flex items-center gap-2">
              {languages.find((l) => l.code === value)?.name || value}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <div className="flex items-center gap-2">
              <span>{language.name}</span>
              <span className="text-xs text-muted-foreground">
                ({language.nativeName})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { languages };
export type { Language };
