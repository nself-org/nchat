"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Timezone {
  value: string;
  label: string;
  offset: string;
  region: string;
}

const timezones: Timezone[] = [
  // Americas
  {
    value: "America/New_York",
    label: "Eastern Time",
    offset: "UTC-5",
    region: "Americas",
  },
  {
    value: "America/Chicago",
    label: "Central Time",
    offset: "UTC-6",
    region: "Americas",
  },
  {
    value: "America/Denver",
    label: "Mountain Time",
    offset: "UTC-7",
    region: "Americas",
  },
  {
    value: "America/Los_Angeles",
    label: "Pacific Time",
    offset: "UTC-8",
    region: "Americas",
  },
  {
    value: "America/Anchorage",
    label: "Alaska Time",
    offset: "UTC-9",
    region: "Americas",
  },
  {
    value: "Pacific/Honolulu",
    label: "Hawaii Time",
    offset: "UTC-10",
    region: "Americas",
  },
  {
    value: "America/Toronto",
    label: "Toronto",
    offset: "UTC-5",
    region: "Americas",
  },
  {
    value: "America/Vancouver",
    label: "Vancouver",
    offset: "UTC-8",
    region: "Americas",
  },
  {
    value: "America/Mexico_City",
    label: "Mexico City",
    offset: "UTC-6",
    region: "Americas",
  },
  {
    value: "America/Sao_Paulo",
    label: "Sao Paulo",
    offset: "UTC-3",
    region: "Americas",
  },
  {
    value: "America/Buenos_Aires",
    label: "Buenos Aires",
    offset: "UTC-3",
    region: "Americas",
  },

  // Europe
  {
    value: "Europe/London",
    label: "London",
    offset: "UTC+0",
    region: "Europe",
  },
  { value: "Europe/Paris", label: "Paris", offset: "UTC+1", region: "Europe" },
  {
    value: "Europe/Berlin",
    label: "Berlin",
    offset: "UTC+1",
    region: "Europe",
  },
  { value: "Europe/Rome", label: "Rome", offset: "UTC+1", region: "Europe" },
  {
    value: "Europe/Madrid",
    label: "Madrid",
    offset: "UTC+1",
    region: "Europe",
  },
  {
    value: "Europe/Amsterdam",
    label: "Amsterdam",
    offset: "UTC+1",
    region: "Europe",
  },
  {
    value: "Europe/Brussels",
    label: "Brussels",
    offset: "UTC+1",
    region: "Europe",
  },
  {
    value: "Europe/Stockholm",
    label: "Stockholm",
    offset: "UTC+1",
    region: "Europe",
  },
  { value: "Europe/Oslo", label: "Oslo", offset: "UTC+1", region: "Europe" },
  {
    value: "Europe/Helsinki",
    label: "Helsinki",
    offset: "UTC+2",
    region: "Europe",
  },
  {
    value: "Europe/Athens",
    label: "Athens",
    offset: "UTC+2",
    region: "Europe",
  },
  {
    value: "Europe/Moscow",
    label: "Moscow",
    offset: "UTC+3",
    region: "Europe",
  },
  {
    value: "Europe/Istanbul",
    label: "Istanbul",
    offset: "UTC+3",
    region: "Europe",
  },

  // Asia
  { value: "Asia/Dubai", label: "Dubai", offset: "UTC+4", region: "Asia" },
  { value: "Asia/Karachi", label: "Karachi", offset: "UTC+5", region: "Asia" },
  {
    value: "Asia/Kolkata",
    label: "Mumbai / New Delhi",
    offset: "UTC+5:30",
    region: "Asia",
  },
  { value: "Asia/Dhaka", label: "Dhaka", offset: "UTC+6", region: "Asia" },
  { value: "Asia/Bangkok", label: "Bangkok", offset: "UTC+7", region: "Asia" },
  { value: "Asia/Jakarta", label: "Jakarta", offset: "UTC+7", region: "Asia" },
  {
    value: "Asia/Singapore",
    label: "Singapore",
    offset: "UTC+8",
    region: "Asia",
  },
  {
    value: "Asia/Hong_Kong",
    label: "Hong Kong",
    offset: "UTC+8",
    region: "Asia",
  },
  {
    value: "Asia/Shanghai",
    label: "Beijing / Shanghai",
    offset: "UTC+8",
    region: "Asia",
  },
  { value: "Asia/Taipei", label: "Taipei", offset: "UTC+8", region: "Asia" },
  { value: "Asia/Seoul", label: "Seoul", offset: "UTC+9", region: "Asia" },
  { value: "Asia/Tokyo", label: "Tokyo", offset: "UTC+9", region: "Asia" },

  // Australia & Pacific
  {
    value: "Australia/Perth",
    label: "Perth",
    offset: "UTC+8",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Adelaide",
    label: "Adelaide",
    offset: "UTC+9:30",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Sydney",
    label: "Sydney",
    offset: "UTC+10",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Melbourne",
    label: "Melbourne",
    offset: "UTC+10",
    region: "Australia & Pacific",
  },
  {
    value: "Australia/Brisbane",
    label: "Brisbane",
    offset: "UTC+10",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Auckland",
    label: "Auckland",
    offset: "UTC+12",
    region: "Australia & Pacific",
  },
  {
    value: "Pacific/Fiji",
    label: "Fiji",
    offset: "UTC+12",
    region: "Australia & Pacific",
  },

  // Africa
  { value: "Africa/Cairo", label: "Cairo", offset: "UTC+2", region: "Africa" },
  {
    value: "Africa/Johannesburg",
    label: "Johannesburg",
    offset: "UTC+2",
    region: "Africa",
  },
  { value: "Africa/Lagos", label: "Lagos", offset: "UTC+1", region: "Africa" },
  {
    value: "Africa/Nairobi",
    label: "Nairobi",
    offset: "UTC+3",
    region: "Africa",
  },
  {
    value: "Africa/Casablanca",
    label: "Casablanca",
    offset: "UTC+0",
    region: "Africa",
  },

  // Special
  {
    value: "UTC",
    label: "UTC (Coordinated Universal Time)",
    offset: "UTC+0",
    region: "Other",
  },
];

interface TimezoneSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showOffset?: boolean;
}

export function TimezoneSelector({
  value,
  onValueChange,
  className,
  disabled = false,
  placeholder = "Select timezone",
  showOffset = true,
}: TimezoneSelectorProps) {
  const groupedTimezones = useMemo(() => {
    const groups: Record<string, Timezone[]> = {};
    timezones.forEach((tz) => {
      if (!groups[tz.region]) {
        groups[tz.region] = [];
      }
      groups[tz.region].push(tz);
    });
    return groups;
  }, []);

  const selectedTimezone = timezones.find((tz) => tz.value === value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder}>
          {selectedTimezone && (
            <span className="flex items-center gap-2">
              <span>{selectedTimezone.label}</span>
              {showOffset && (
                <span className="text-xs text-muted-foreground">
                  ({selectedTimezone.offset})
                </span>
              )}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {Object.entries(groupedTimezones).map(([region, tzList]) => (
          <SelectGroup key={region}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {region}
            </SelectLabel>
            {tzList.map((timezone) => (
              <SelectItem key={timezone.value} value={timezone.value}>
                <div className="flex items-center justify-between gap-4">
                  <span>{timezone.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {timezone.offset}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

export { timezones };
export type { Timezone };
