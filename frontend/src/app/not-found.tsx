import { ErrorPage } from "@/components/error/error-page";

/**
 * Next.js 404 page.
 * This is shown when a route is not found.
 */
export default function NotFound() {
  return (
    <ErrorPage
      statusCode={404}
      title="Page Not Found"
      description="The page you are looking for does not exist or has been moved."
      showHomeButton={true}
      showBackButton={true}
      showRetryButton={false}
    />
  );
}
