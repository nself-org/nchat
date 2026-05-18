import { AppLoader } from "@/components/loading";

/**
 * Root loading component
 * Shows during initial app load and route transitions
 */
export default function Loading() {
  return <AppLoader appName="nchat" message="Loading..." />;
}
