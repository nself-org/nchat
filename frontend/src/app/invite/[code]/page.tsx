/**
 * Invite Accept Page - /invite/[code]
 *
 * Dynamic route for accepting invite links. Displays the invite preview
 * and allows users to join the channel or workspace.
 */

import { Metadata } from "next";
import { JoinPage } from "@/components/invite/join-page";

// ============================================================================
// Types
// ============================================================================

interface InvitePageProps {
  params: Promise<{
    code: string;
  }>;
}

// ============================================================================
// Metadata
// ============================================================================

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { code } = await params;

  return {
    title: "Join Channel - nchat",
    description: "You have been invited to join a channel on nchat.",
    openGraph: {
      title: "Join Channel",
      description: "You have been invited to join a channel on nchat.",
      type: "website",
      url: `/invite/${code}`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

// ============================================================================
// Page Component
// ============================================================================

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  return <JoinPage code={code} />;
}
