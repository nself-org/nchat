"use client";

import { useState, useEffect, useRef } from "react";
import { type AppConfig } from "@/config/app-config";
import { EnhancedInput } from "@/components/ui/enhanced-input";
import { Button } from "@/components/ui/button";
import { IconGeneratorModal } from "@/components/setup/icon-generator-modal";
import { LogoGeneratorModal } from "@/components/setup/logo-generator-modal";
import {
  Type,
  Image,
  Globe,
  Building,
  Lightbulb,
  Upload,
  X,
  Sparkles,
  Wand2,
  RotateCcw,
} from "lucide-react";
import { defaultAppConfig } from "@/config/app-config";

import { logger } from "@/lib/logger";

interface BrandingStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function BrandingStep({
  config,
  onUpdate,
  onValidate,
}: BrandingStepProps) {
  const [formData, setFormData] = useState({
    appName: config.branding.appName || "",
    tagline: config.branding.tagline || "",
    logo: config.branding.logo || "",
    favicon: config.branding.favicon || "",
    companyName: config.branding.companyName || config.owner.company || "",
    websiteUrl: config.branding.websiteUrl || "",
    logoScale: config.branding.logoScale || 1.0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);
  const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
  const [iconSvg, setIconSvg] = useState<string | null>(null);
  const [logoSvg, setLogoSvg] = useState<string | null>(null);
  const [showIconGenerator, setShowIconGenerator] = useState(false);
  const [showLogoGenerator, setShowLogoGenerator] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.appName.trim()) {
      newErrors.appName = "App name is required";
    } else if (formData.appName.length < 2) {
      newErrors.appName = "App name must be at least 2 characters";
    }

    if (!uploadedIcon && !formData.favicon) {
      newErrors.icon = "Icon is required";
    }

    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = "Website URL must start with http:// or https://";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidate(isValid);
    return isValid;
  };

  useEffect(() => {
    validateForm();
  }, [formData, uploadedIcon, uploadedLogo]);

  const handleChange = (
    field: keyof typeof formData,
    value: string | number,
  ) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    onUpdate({
      branding: updated,
    });
  };

  const handleResetToDefaults = () => {
    const defaults = {
      appName: defaultAppConfig.branding.appName,
      tagline: defaultAppConfig.branding.tagline || "",
      logo: defaultAppConfig.branding.logo || "",
      favicon: defaultAppConfig.branding.favicon || "",
      companyName: defaultAppConfig.branding.companyName || "",
      websiteUrl: defaultAppConfig.branding.websiteUrl || "",
      logoScale: defaultAppConfig.branding.logoScale || 1.0,
    };
    setFormData(defaults);
    setUploadedLogo(null);
    setUploadedIcon(null);
    setIconSvg(null);
    setLogoSvg(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (iconInputRef.current) iconInputRef.current.value = "";

    onUpdate({
      branding: defaults,
    });
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "icon",
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === "logo") {
          setUploadedLogo(result);
          handleChange("logo", result);
        } else {
          setUploadedIcon(result);
          handleChange("favicon", result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (type: "logo" | "icon") => {
    if (type === "logo") {
      setUploadedLogo(null);
      setLogoSvg(null);
      handleChange("logo", "");
      if (logoInputRef.current) logoInputRef.current.value = "";
    } else {
      setUploadedIcon(null);
      setIconSvg(null);
      handleChange("favicon", "");
      if (iconInputRef.current) iconInputRef.current.value = "";
      // Reset favicon to default
      updateFavicon("/favicon.ico");
    }
  };

  const updateFavicon = (url: string) => {
    let faviconLink = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = url;
  };

  const handleGeneratedIcon = (
    dataUrl: string,
    svgString?: string,
    variants?: any,
  ) => {
    setUploadedIcon(dataUrl);
    setIconSvg(svgString || null);
    handleChange("favicon", dataUrl);

    // Save SVG to public directory
    if (svgString) {
      fetch("/api/save-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          svg: svgString,
          filename: "icon.svg",
        }),
      }).catch(console.error);
    }

    // Save variants if provided
    if (variants) {
      if (variants.lightSvg) {
        fetch("/api/save-svg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            svg: variants.lightSvg,
            filename: "icon-light.svg",
          }),
        }).catch(console.error);
      }
      if (variants.darkSvg) {
        fetch("/api/save-svg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            svg: variants.darkSvg,
            filename: "icon-dark.svg",
          }),
        }).catch(console.error);
      }
    }

    // Update favicon immediately
    updateFavicon(dataUrl);
  };

  const handleGeneratedLogo = (dataUrl: string, svgString?: string) => {
    setUploadedLogo(dataUrl);
    setLogoSvg(svgString || null);
    handleChange("logo", dataUrl);

    // Save SVG to public directory
    if (svgString) {
      fetch("/api/save-svg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          svg: svgString,
          filename: "logo.svg",
        }),
      }).catch(console.error);
    }
  };

  // Initialize uploaded images from config if they exist
  useEffect(() => {
    if (config.branding.logo) {
      setUploadedLogo(config.branding.logo);
    }
    if (config.branding.favicon) {
      setUploadedIcon(config.branding.favicon);
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="shadow-glow mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
          <Type className="h-6 w-6 text-zinc-900" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
          App Branding
        </h2>
        <p className="mx-auto max-w-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Define your app's identity. This is how your platform will appear to
          users.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <EnhancedInput
            id="appName"
            label="App Name *"
            icon={<Type className="h-4 w-4" />}
            value={formData.appName}
            onChange={(e) => handleChange("appName", e.target.value)}
            error={errors.appName}
          />
        </div>

        <div>
          <EnhancedInput
            id="tagline"
            label="Tagline/Description"
            icon={<Lightbulb className="h-4 w-4" />}
            value={formData.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
          />
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            A short description that appears under your app name
          </p>
        </div>

        <div className="space-y-6">
          {/* Icon/Favicon Upload - Required */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Icon *{" "}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (Required)
              </span>
            </label>
            {errors.icon && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">
                {errors.icon}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                {uploadedIcon ? (
                  <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                    <img
                      src={uploadedIcon}
                      alt="Icon preview"
                      className="mx-auto max-h-20 object-contain"
                    />
                    <button
                      onClick={() => removeImage("icon")}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => iconInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          iconInputRef.current?.click();
                        }
                      }}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-sky-300 p-6 text-center transition-colors hover:border-sky-400 dark:border-sky-600 dark:hover:border-sky-500"
                    >
                      <Upload className="mx-auto mb-2 h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Click to upload icon
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        Square image recommended
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-300 dark:border-zinc-600" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                          or
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowIconGenerator(true)}
                      className="w-full"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Icon
                    </Button>
                  </div>
                )}
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "icon")}
                  className="hidden"
                />
              </div>
              <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>Your app's icon will be used:</p>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  <li>As the favicon in browser tabs</li>
                  <li>Next to your app name in headers</li>
                  <li>As the app icon on mobile devices</li>
                </ul>
                <p className="text-xs">
                  Upload a square image for best results. We'll automatically
                  generate different sizes.
                </p>
              </div>
            </div>
          </div>

          {/* Logo Upload - Optional */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Logo{" "}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (Optional)
              </span>
            </label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-1">
                {uploadedLogo ? (
                  <div className="relative rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                    <img
                      src={uploadedLogo}
                      alt="Logo preview"
                      className="mx-auto max-h-20 object-contain"
                    />
                    <button
                      onClick={() => removeImage("logo")}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => logoInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          logoInputRef.current?.click();
                        }
                      }}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center transition-colors hover:border-sky-400 dark:border-zinc-600 dark:hover:border-sky-500"
                    >
                      <Upload className="mx-auto mb-2 h-8 w-8 text-zinc-400 dark:text-zinc-500" />
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Click to upload logo
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        PNG, JPG, SVG up to 5MB
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-300 dark:border-zinc-600" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900">
                          or
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowLogoGenerator(true)}
                      className="w-full"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Logo
                    </Button>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "logo")}
                  className="hidden"
                />
              </div>
              <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>A logo is your brand name as an image:</p>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  <li>Replaces text app name in headers</li>
                  <li>Should include your brand name visually</li>
                  <li>Used where more space is available</li>
                </ul>
                <p className="text-xs font-medium">
                  If no logo is provided, we'll display: [Icon] + App Name text
                </p>
              </div>
            </div>

            {/* Logo Size Slider - Only show if logo is uploaded */}
            {uploadedLogo && (
              <div className="mt-4">
                <label
                  htmlFor="logo-scale-slider"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Logo Display Size
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-zinc-500">50%</span>
                  <input
                    id="logo-scale-slider"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={formData.logoScale}
                    onChange={(e) =>
                      handleChange("logoScale", parseFloat(e.target.value))
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-xl bg-zinc-200 dark:bg-zinc-700 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-500"
                  />
                  <span className="text-xs text-zinc-500">200%</span>
                  <span className="min-w-[3rem] text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {Math.round(formData.logoScale * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Adjust how large the logo appears in navigation areas
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <EnhancedInput
              id="companyName"
              label="Company Name"
              icon={<Building className="h-4 w-4" />}
              value={formData.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
            />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Used in footer and legal pages
            </p>
          </div>

          <div>
            <EnhancedInput
              id="websiteUrl"
              label="Website URL"
              icon={<Globe className="h-4 w-4" />}
              value={formData.websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value)}
              error={errors.websiteUrl}
            />
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Link to your main website
            </p>
          </div>
        </div>

        <div className="dark:to-sky-900/30 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-5 dark:border-sky-800 dark:from-sky-950/30">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-sky-600 dark:bg-sky-500">
              <Type className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-sky-900 dark:text-sky-100">
                Live Preview
              </h3>
              <div className="rounded-xl border border-sky-200 bg-white p-4 dark:border-sky-700 dark:bg-zinc-800">
                <div className="flex items-center gap-3">
                  {uploadedLogo ? (
                    // If logo exists, show logo only (it should contain the brand name)
                    <img
                      src={uploadedLogo}
                      alt="Logo"
                      className="w-auto object-contain"
                      style={{ height: `${32 * formData.logoScale}px` }}
                    />
                  ) : (
                    // If no logo, show icon + text name
                    <>
                      {uploadedIcon && (
                        <img
                          src={uploadedIcon}
                          alt="Icon"
                          className="h-6 w-6 object-contain"
                        />
                      )}
                      <div className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {formData.appName || "Your App Name"}
                      </div>
                    </>
                  )}
                </div>
                {formData.tagline && (
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {formData.tagline}
                  </div>
                )}
                {formData.companyName && (
                  <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                    © {new Date().getFullYear()} {formData.companyName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset to Defaults - Only show if we have modified values */}
      {(formData.appName !== defaultAppConfig.branding.appName ||
        formData.tagline !== defaultAppConfig.branding.tagline ||
        uploadedIcon ||
        uploadedLogo) && (
        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefaults}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      )}

      {/* Icon Generator Modal */}
      <IconGeneratorModal
        isOpen={showIconGenerator}
        onClose={() => setShowIconGenerator(false)}
        onGenerate={handleGeneratedIcon}
      />

      {/* Logo Generator Modal */}
      <LogoGeneratorModal
        isOpen={showLogoGenerator}
        onClose={() => setShowLogoGenerator(false)}
        onGenerate={handleGeneratedLogo}
        appName={formData.appName}
        iconDataUrl={uploadedIcon || formData.favicon}
        iconSvg={iconSvg}
      />
    </div>
  );
}
