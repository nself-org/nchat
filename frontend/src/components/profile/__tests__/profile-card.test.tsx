/**
 * Profile Card Component Tests
 *
 * @module components/profile/__tests__/profile-card.test
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileCard } from "../profile-card";
import type { UserProfileFull } from "@/types/profile";

// Mock profile data
const mockProfile: UserProfileFull = {
  id: "user-1",
  username: "johndoe",
  displayName: "John Doe",
  email: "john@example.com",
  emailVerified: true,
  bio: "Software developer and tech enthusiast",
  location: "San Francisco, CA",
  website: "https://johndoe.dev",
  jobTitle: "Senior Developer",
  organization: "Tech Corp",
  timezone: "America/Los_Angeles",
  role: "member",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-02-01"),
  lastSeenAt: new Date(),
  privacySettings: {
    onlineStatus: "everyone",
    lastSeen: "everyone",
    profilePhoto: "everyone",
    bio: "everyone",
    phone: "contacts",
    addToGroups: "everyone",
    calls: "everyone",
    forwardedMessages: "everyone",
    readReceipts: true,
    typingIndicator: true,
    searchableByUsername: true,
    searchableByEmail: false,
    showEmail: true,
  },
  socialLinks: {
    twitter: "https://twitter.com/johndoe",
    github: "https://github.com/johndoe",
  },
};

describe("ProfileCard", () => {
  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe("basic rendering", () => {
    it("should render profile card", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-card")).toBeInTheDocument();
    });

    it("should display display name", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-display-name")).toHaveTextContent(
        "John Doe",
      );
    });

    it("should display username", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-username")).toHaveTextContent(
        "johndoe",
      );
    });

    it("should display bio", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-bio")).toHaveTextContent(
        "Software developer and tech enthusiast",
      );
    });

    it("should display role badge", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByText("Member")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Profile Details Tests
  // ============================================================================

  describe("profile details", () => {
    it("should display location", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-location")).toHaveTextContent(
        "San Francisco, CA",
      );
    });

    it("should display website as link", () => {
      render(<ProfileCard profile={mockProfile} />);
      const link = screen.getByTestId("profile-website");
      expect(link).toHaveAttribute("href", "https://johndoe.dev");
    });

    it("should display job title and organization", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-job")).toHaveTextContent(
        "Senior Developer at Tech Corp",
      );
    });

    it("should display timezone", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-timezone")).toHaveTextContent(
        "America/Los_Angeles",
      );
    });

    it("should display join date", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-joined")).toBeInTheDocument();
    });

    it("should display email when showEmail is true", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("profile-email")).toHaveTextContent(
        "john@example.com",
      );
    });
  });

  // ============================================================================
  // Status Tests
  // ============================================================================

  describe("status display", () => {
    it("should display status text and emoji", () => {
      const profileWithStatus = {
        ...mockProfile,
        status: "Working from home",
        statusEmoji: "🏠",
      };
      render(<ProfileCard profile={profileWithStatus} />);
      expect(screen.getByTestId("profile-status")).toBeInTheDocument();
    });

    it("should not show status section when no status", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.queryByTestId("profile-status")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Badge Tests
  // ============================================================================

  describe("badges", () => {
    it("should show verified badge when verified", () => {
      const verifiedProfile = { ...mockProfile, isVerified: true };
      render(<ProfileCard profile={verifiedProfile} />);
      expect(screen.getByTestId("verified-badge")).toBeInTheDocument();
    });

    it("should show bot badge when isBot", () => {
      const botProfile = { ...mockProfile, isBot: true };
      render(<ProfileCard profile={botProfile} />);
      expect(screen.getByText("BOT")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Social Links Tests
  // ============================================================================

  describe("social links", () => {
    it("should display social links", () => {
      render(<ProfileCard profile={mockProfile} />);
      expect(screen.getByTestId("social-link-twitter")).toBeInTheDocument();
      expect(screen.getByTestId("social-link-github")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Banner Tests
  // ============================================================================

  describe("banner", () => {
    it("should display banner when provided", () => {
      const profileWithBanner = {
        ...mockProfile,
        bannerUrl: "https://example.com/banner.jpg",
      };
      render(<ProfileCard profile={profileWithBanner} />);
      expect(screen.getByTestId("profile-banner")).toBeInTheDocument();
    });

    it("should not display banner in compact mode", () => {
      const profileWithBanner = {
        ...mockProfile,
        bannerUrl: "https://example.com/banner.jpg",
      };
      render(<ProfileCard profile={profileWithBanner} compact />);
      expect(screen.queryByTestId("profile-banner")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Action Buttons Tests
  // ============================================================================

  describe("action buttons", () => {
    it("should show message button for other users", () => {
      render(
        <ProfileCard
          profile={mockProfile}
          isCurrentUser={false}
          onMessage={() => {}}
        />,
      );
      expect(screen.getByTestId("message-button")).toBeInTheDocument();
    });

    it("should call onMessage when clicked", () => {
      const onMessage = jest.fn();
      render(
        <ProfileCard
          profile={mockProfile}
          isCurrentUser={false}
          onMessage={onMessage}
        />,
      );
      fireEvent.click(screen.getByTestId("message-button"));
      expect(onMessage).toHaveBeenCalled();
    });

    it("should not show message button for current user", () => {
      render(
        <ProfileCard
          profile={mockProfile}
          isCurrentUser={true}
          onMessage={() => {}}
        />,
      );
      expect(screen.queryByTestId("message-button")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Compact Mode Tests
  // ============================================================================

  describe("compact mode", () => {
    it("should show view profile button in compact mode", () => {
      render(
        <ProfileCard profile={mockProfile} compact onViewProfile={() => {}} />,
      );
      expect(screen.getByTestId("view-profile-button")).toBeInTheDocument();
    });

    it("should call onViewProfile when clicked", () => {
      const onViewProfile = jest.fn();
      render(
        <ProfileCard
          profile={mockProfile}
          compact
          onViewProfile={onViewProfile}
        />,
      );
      fireEvent.click(screen.getByTestId("view-profile-button"));
      expect(onViewProfile).toHaveBeenCalled();
    });

    it("should hide detailed info in compact mode", () => {
      render(<ProfileCard profile={mockProfile} compact />);
      expect(screen.queryByTestId("profile-location")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Role Display Tests
  // ============================================================================

  describe("role display", () => {
    it("should show owner role correctly", () => {
      const ownerProfile = { ...mockProfile, role: "owner" as const };
      render(<ProfileCard profile={ownerProfile} />);
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("should show admin role correctly", () => {
      const adminProfile = { ...mockProfile, role: "admin" as const };
      render(<ProfileCard profile={adminProfile} />);
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should show moderator role correctly", () => {
      const modProfile = { ...mockProfile, role: "moderator" as const };
      render(<ProfileCard profile={modProfile} />);
      expect(screen.getByText("Moderator")).toBeInTheDocument();
    });
  });
});
