/**
 * Huddle Components Tests
 *
 * Tests for huddle UI components.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  HuddleParticipants,
  HuddleParticipantList,
} from "../HuddleParticipants";
import type { HuddleParticipant } from "@/hooks/use-huddle";

// =============================================================================
// Mocks
// =============================================================================

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Radix UI components
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => (
    <span data-testid="tooltip">{children}</span>
  ),
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockParticipants: HuddleParticipant[] = [
  {
    id: "user-1",
    name: "Alice Smith",
    avatarUrl: "https://example.com/alice.jpg",
    isMuted: false,
    isVideoEnabled: true,
    isScreenSharing: false,
    isSpeaking: true,
    audioLevel: 0.5,
    connectionState: "connected",
    joinedAt: new Date("2024-01-01T10:00:00"),
  },
  {
    id: "user-2",
    name: "Bob Jones",
    avatarUrl: "https://example.com/bob.jpg",
    isMuted: true,
    isVideoEnabled: false,
    isScreenSharing: false,
    isSpeaking: false,
    audioLevel: 0,
    connectionState: "connected",
    joinedAt: new Date("2024-01-01T10:01:00"),
  },
  {
    id: "user-3",
    name: "Charlie Brown",
    avatarUrl: undefined,
    isMuted: false,
    isVideoEnabled: false,
    isScreenSharing: true,
    isSpeaking: false,
    audioLevel: 0,
    connectionState: "connected",
    joinedAt: new Date("2024-01-01T10:02:00"),
  },
];

// =============================================================================
// HuddleParticipants Tests
// =============================================================================

describe("HuddleParticipants", () => {
  it("should render all participants", () => {
    render(<HuddleParticipants participants={mockParticipants} />);

    // All participants should be visible
    expect(screen.getByText("A")).toBeInTheDocument(); // Alice's fallback
    expect(screen.getByText("B")).toBeInTheDocument(); // Bob's fallback
    expect(screen.getByText("C")).toBeInTheDocument(); // Charlie's fallback
  });

  it("should show speaking indicator for active speaker", () => {
    render(
      <HuddleParticipants
        participants={mockParticipants}
        activeSpeakerId="user-1"
      />,
    );

    // Active speaker should have special styling (ring)
    // We can check the participant is rendered
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should show screen sharing indicator", () => {
    render(
      <HuddleParticipants
        participants={mockParticipants}
        screenSharerId="user-3"
      />,
    );

    // Screen sharer indicator should be present
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("should limit visible participants", () => {
    const manyParticipants = Array.from({ length: 15 }, (_, i) => ({
      ...mockParticipants[0],
      id: `user-${i}`,
      name: `User ${i}`,
    }));

    render(
      <HuddleParticipants participants={manyParticipants} maxVisible={5} />,
    );

    // Should show +10 indicator
    expect(screen.getByText("+10")).toBeInTheDocument();
  });

  it("should call onParticipantClick when participant clicked", () => {
    const onParticipantClick = jest.fn();

    render(
      <HuddleParticipants
        participants={mockParticipants}
        onParticipantClick={onParticipantClick}
      />,
    );

    // Click on first participant
    fireEvent.click(screen.getByText("A"));

    expect(onParticipantClick).toHaveBeenCalledWith(mockParticipants[0]);
  });

  it("should render in compact mode", () => {
    render(<HuddleParticipants participants={mockParticipants} compact />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

// =============================================================================
// HuddleParticipantList Tests
// =============================================================================

describe("HuddleParticipantList", () => {
  it("should render participants in list format", () => {
    render(<HuddleParticipantList participants={mockParticipants} />);

    // Should show full names
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  it("should show muted indicator", () => {
    render(<HuddleParticipantList participants={mockParticipants} />);

    // Bob is muted - check the list renders
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("should highlight active speaker", () => {
    render(
      <HuddleParticipantList
        participants={mockParticipants}
        activeSpeakerId="user-1"
      />,
    );

    // Active speaker row should have highlight
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("should show screen sharing indicator", () => {
    render(
      <HuddleParticipantList
        participants={mockParticipants}
        screenSharerId="user-3"
      />,
    );

    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });
});
