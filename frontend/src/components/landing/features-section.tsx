import {
  MessageCircle,
  Users,
  Shield,
  Zap,
  Search,
  FileImage,
} from "lucide-react";
import { useAppConfig } from "@/contexts/app-config-context";

export function FeaturesSection() {
  const { config } = useAppConfig();
  const { features } = config;

  const availableFeatures = [
    {
      name: "Real-time Messaging",
      description: "Instant messaging with typing indicators and read receipts",
      icon: MessageCircle,
      enabled: true,
    },
    {
      name: "Public & Private Channels",
      description: "Organize conversations with public and private channels",
      icon: Users,
      enabled: features.publicChannels || features.privateChannels,
    },
    {
      name: "File Sharing",
      description: "Share documents, images, and files with your team",
      icon: FileImage,
      enabled: features.fileUploads,
    },
    {
      name: "Message Threads",
      description: "Keep discussions organized with threaded conversations",
      icon: MessageCircle,
      enabled: features.threads,
    },
    {
      name: "Powerful Search",
      description: "Find messages, files, and conversations instantly",
      icon: Search,
      enabled: features.search,
    },
    {
      name: "Secure & Private",
      description: "Enterprise-grade security with role-based permissions",
      icon: Shield,
      enabled: true,
    },
  ].filter((feature) => feature.enabled);

  if (availableFeatures.length === 0) {
    return null;
  }

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Everything you need to stay connected
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Powerful features designed to help teams communicate and collaborate
            effectively.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {availableFeatures.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <feature.icon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-lg font-semibold leading-8 tracking-tight text-gray-900 dark:text-white">
                  {feature.name}
                </h3>
                <p className="mt-2 text-base leading-7 text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
