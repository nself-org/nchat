import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/contexts/app-config-context";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navigation() {
  const { config } = useAppConfig();
  const [isOpen, setIsOpen] = useState(false);
  const { branding, homepage, authPermissions } = config;

  const navLinks = [];

  // Add navigation links based on enabled landing pages
  if (homepage.landingPages?.features)
    navLinks.push({ href: "#features", label: "Features" });
  if (homepage.landingPages?.pricing)
    navLinks.push({ href: "#pricing", label: "Pricing" });
  if (homepage.landingPages?.about)
    navLinks.push({ href: "#about", label: "About" });
  if (homepage.landingPages?.contact)
    navLinks.push({ href: "#contact", label: "Contact" });
  if (homepage.landingPages?.blog)
    navLinks.push({ href: "/blog", label: "Blog" });
  if (homepage.landingPages?.docs)
    navLinks.push({ href: "/docs", label: "Docs" });

  return (
    <nav className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            {branding.logo && (
              <img
                src={branding.logo}
                alt={branding.appName}
                className="h-8 w-auto"
              />
            )}
            <Link href="/" className="text-xl font-bold text-foreground">
              {branding.appName}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden items-center space-x-4 md:flex">
            <ThemeToggle />

            <Button variant="ghost" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>

            {authPermissions.mode !== "admin-only" && (
              <Button asChild>
                <Link href="/auth/signup">Get Started</Link>
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md p-2 text-foreground hover:bg-accent"
            >
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t py-4 md:hidden">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground/70 px-2 py-1 transition-colors hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex flex-col space-y-2 border-t pt-3">
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>

                {authPermissions.mode !== "admin-only" && (
                  <Button asChild className="justify-start">
                    <Link href="/auth/signup">Get Started</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
