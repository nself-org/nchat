"use client";

// ===============================================================================
// Template Gallery Component
// ===============================================================================
//
// A gallery view showing all available templates with visual previews
// and feature highlights.
//
// ===============================================================================

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/templates/types";
import { templates } from "@/templates";
import { templateBranding } from "@/lib/demo/sample-data";

// -------------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------------

export interface TemplateGalleryProps {
  onTemplateSelect?: (templateId: TemplateId) => void;
  selectedTemplate?: TemplateId;
  layout?: "grid" | "carousel" | "list";
  showFeatures?: boolean;
  className?: string;
}

interface GalleryItem {
  id: TemplateId;
  name: string;
  tagline: string;
  primaryColor: string;
  features: string[];
  highlights: string[];
}

// -------------------------------------------------------------------------------
// Gallery Items
// -------------------------------------------------------------------------------

const galleryItems: GalleryItem[] = [
  {
    id: "default",
    name: "nself",
    tagline: "Modern team communication platform",
    primaryColor: "#00D4FF",
    features: [
      "Clean modern design",
      "Flexible theming",
      "Best of Slack, Discord & Telegram",
      "Full customization support",
    ],
    highlights: ["Protocol-inspired", "Glowing accents", "Dark mode optimized"],
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Where work happens",
    primaryColor: "#4A154B",
    features: [
      "Classic aubergine sidebar",
      "Thread-first conversations",
      "Familiar Slack-style UI",
      "Workspace organization",
    ],
    highlights: ["Professional", "Channel-focused", "Enterprise-ready"],
  },
  {
    id: "discord",
    name: "Discord",
    tagline: "Your place to talk and hang out",
    primaryColor: "#5865F2",
    features: [
      "Blurple accent theme",
      "Server-based organization",
      "Voice channel indicators",
      "Rich presence support",
    ],
    highlights: ["Community-focused", "Fun & engaging", "Dark mode default"],
  },
  {
    id: "telegram",
    name: "Telegram",
    tagline: "Fast, secure messaging",
    primaryColor: "#2AABEE",
    features: [
      "Clean blue theme",
      "Bubble-style messages",
      "Voice messages",
      "Read receipts with checkmarks",
    ],
    highlights: ["Speed-optimized", "Privacy-focused", "Clean aesthetics"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    tagline: "Simple, secure, reliable messaging",
    primaryColor: "#25D366",
    features: [
      "Green accent theme",
      "Chat bubble style",
      "Status/Stories feature",
      "End-to-end encryption visuals",
    ],
    highlights: [
      "Instant messaging",
      "Universal familiarity",
      "Simple interface",
    ],
  },
];

// -------------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------------

export function TemplateGallery({
  onTemplateSelect,
  selectedTemplate,
  layout = "grid",
  showFeatures = true,
  className,
}: TemplateGalleryProps) {
  const [hoveredItem, setHoveredItem] = useState<TemplateId | null>(null);

  if (layout === "carousel") {
    return (
      <CarouselLayout
        items={galleryItems}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={onTemplateSelect}
        className={className}
      />
    );
  }

  if (layout === "list") {
    return (
      <ListLayout
        items={galleryItems}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={onTemplateSelect}
        showFeatures={showFeatures}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {galleryItems.map((item) => (
        <GalleryCard
          key={item.id}
          item={item}
          isSelected={selectedTemplate === item.id}
          isHovered={hoveredItem === item.id}
          onSelect={() => onTemplateSelect?.(item.id)}
          onHover={(hovered) => setHoveredItem(hovered ? item.id : null)}
          showFeatures={showFeatures}
        />
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Gallery Card
// -------------------------------------------------------------------------------

function GalleryCard({
  item,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  showFeatures,
}: {
  item: GalleryItem;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
  showFeatures: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl text-left",
        "border-2 transition-all duration-300",
        "bg-white dark:bg-gray-800",
        isSelected
          ? "scale-[1.02] border-current shadow-xl"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
        isHovered && !isSelected && "shadow-lg",
      )}
      style={{
        borderColor: isSelected ? item.primaryColor : undefined,
      }}
    >
      {/* Preview Area */}
      <div
        className="relative flex h-40 items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${item.primaryColor}15` }}
      >
        {/* Decorative elements */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${item.primaryColor} 0%, transparent 60%)`,
          }}
        />

        {/* Logo */}
        <div
          className="z-10 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-bold text-white shadow-lg"
          style={{ backgroundColor: item.primaryColor }}
        >
          {item.name[0]}
        </div>

        {/* Selected Badge */}
        {isSelected && (
          <div
            className="absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: item.primaryColor }}
          >
            Selected
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
          {item.name}
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          {item.tagline}
        </p>

        {/* Highlights */}
        <div className="mb-4 flex flex-wrap gap-2">
          {item.highlights.map((highlight, index) => (
            <span
              key={index}
              className="rounded-full px-2 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${item.primaryColor}20`,
                color: item.primaryColor,
              }}
            >
              {highlight}
            </span>
          ))}
        </div>

        {/* Features */}
        {showFeatures && (
          <ul className="space-y-1.5">
            {item.features.slice(0, 3).map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: item.primaryColor }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  );
}

// -------------------------------------------------------------------------------
// Carousel Layout
// -------------------------------------------------------------------------------

function CarouselLayout({
  items,
  selectedTemplate,
  onTemplateSelect,
  className,
}: {
  items: GalleryItem[];
  selectedTemplate?: TemplateId;
  onTemplateSelect?: (templateId: TemplateId) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-x-auto pb-4", className)}>
      <div className="flex gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTemplateSelect?.(item.id)}
            className={cn(
              "w-64 flex-shrink-0 rounded-xl border-2 p-4 transition-all",
              selectedTemplate === item.id
                ? "scale-105 border-current"
                : "border-gray-200 hover:border-gray-300 dark:border-gray-700",
            )}
            style={{
              borderColor:
                selectedTemplate === item.id ? item.primaryColor : undefined,
            }}
          >
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: item.primaryColor }}
            >
              {item.name[0]}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              {item.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.tagline}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// List Layout
// -------------------------------------------------------------------------------

function ListLayout({
  items,
  selectedTemplate,
  onTemplateSelect,
  showFeatures,
  className,
}: {
  items: GalleryItem[];
  selectedTemplate?: TemplateId;
  onTemplateSelect?: (templateId: TemplateId) => void;
  showFeatures: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onTemplateSelect?.(item.id)}
          className={cn(
            "flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
            selectedTemplate === item.id
              ? "border-current bg-gray-50 dark:bg-gray-800"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
          )}
          style={{
            borderColor:
              selectedTemplate === item.id ? item.primaryColor : undefined,
          }}
        >
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white"
            style={{ backgroundColor: item.primaryColor }}
          >
            {item.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {item.name}
            </h3>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {item.tagline}
            </p>
            {showFeatures && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.highlights.map((highlight, index) => (
                  <span
                    key={index}
                    className="rounded px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: `${item.primaryColor}20`,
                      color: item.primaryColor,
                    }}
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
          {selectedTemplate === item.id && (
            <svg
              className="h-6 w-6 flex-shrink-0"
              style={{ color: item.primaryColor }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}

export default TemplateGallery;
