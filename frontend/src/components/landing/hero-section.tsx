import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/contexts/app-config-context";

export function HeroSection() {
  const { config } = useAppConfig();
  const { branding, authPermissions } = config;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-24 sm:py-32">
        <div className="text-center">
          {/* Logo */}
          {branding.logo && (
            <div className="mb-8">
              <img
                src={branding.logo}
                alt={branding.appName}
                className="mx-auto h-16 w-auto"
              />
            </div>
          )}

          {/* Main Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            {branding.appName}
          </h1>

          {branding.tagline && (
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-700 dark:text-gray-200">
              {branding.tagline}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {authPermissions.mode !== "admin-only" ? (
              <Button asChild size="lg">
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}

            <Button variant="outline" size="lg" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          {branding.companyName && (
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
              Trusted by teams at {branding.companyName}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
