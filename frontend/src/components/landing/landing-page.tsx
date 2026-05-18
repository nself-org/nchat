import { useAppConfig } from "@/contexts/app-config-context";
import { HeroSection } from "./hero-section";
import { FeaturesSection } from "./features-section";
import { PricingSection } from "./pricing-section";
import { Footer } from "./footer";
import { Navigation } from "./navigation";

export function LandingPage() {
  const { config, isLoading } = useAppConfig();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { homepage } = config;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section - Always shown */}
      <HeroSection />

      {/* Conditional Sections based on homepage config */}
      {homepage.landingPages?.features && <FeaturesSection />}
      {homepage.landingPages?.pricing && <PricingSection />}
      {homepage.landingPages?.about && <AboutSection />}
      {homepage.landingPages?.contact && <ContactSection />}

      <Footer />
    </div>
  );
}

// Placeholder components for additional sections
function AboutSection() {
  const { config } = useAppConfig();

  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            About {config.branding.appName}
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Built for modern teams who need reliable, secure communication
            tools.
          </p>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const { config } = useAppConfig();

  return (
    <section
      id="contact"
      className="bg-gray-50 py-24 dark:bg-gray-900 sm:py-32"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Have questions? We'd love to hear from you.
          </p>
          {config.legal.supportEmail && (
            <div className="mt-8">
              <a
                href={`mailto:${config.legal.supportEmail}`}
                className="font-medium text-primary hover:underline"
              >
                {config.legal.supportEmail}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
