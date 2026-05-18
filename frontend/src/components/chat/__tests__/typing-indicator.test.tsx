/**
 * TypingIndicator Component Tests
 *
 * Tests for typing indicator functionality
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { TypingIndicator, InlineTypingIndicator } from "../typing-indicator";
import type { TypingUser } from "@/types/message";

describe("TypingIndicator", () => {
  const createTypingUser = (id: string, name: string): TypingUser => ({
    id,
    username: name.toLowerCase(),
    displayName: name,
  });

  describe("InlineTypingIndicator", () => {
    it("should not render when no users are typing", () => {
      const { container } = render(<InlineTypingIndicator users={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("should show single user avatar", () => {
      const users = [createTypingUser("1", "Alice")];
      const { container } = render(<InlineTypingIndicator users={users} />);

      // Should render the avatar
      expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();
      // Should show animated dots in the bubble
      expect(
        container.querySelector(".rounded-2xl.bg-muted"),
      ).toBeInTheDocument();
    });

    it("should show two user avatars", () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
      ];
      const { container } = render(<InlineTypingIndicator users={users} />);

      // Should render two avatars
      const avatars = container.querySelectorAll(".h-8.w-8");
      expect(avatars.length).toBe(2);
    });

    it("should only show max 2 avatars", () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
        createTypingUser("3", "Charlie"),
      ];
      const { container } = render(<InlineTypingIndicator users={users} />);

      // Should only render 2 avatars (max for inline indicator)
      const avatars = container.querySelectorAll(".h-8.w-8");
      expect(avatars.length).toBe(2);
    });

    it("should render with custom className", () => {
      const users = [createTypingUser("1", "Alice")];
      const { container } = render(
        <InlineTypingIndicator users={users} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should show animated dots bubble", () => {
      const users = [createTypingUser("1", "Alice")];
      const { container } = render(<InlineTypingIndicator users={users} />);

      // Should render the typing bubble with dots
      const bubble = container.querySelector(".rounded-2xl.bg-muted");
      expect(bubble).toBeInTheDocument();

      // Should have 3 animated dots
      const dots = container.querySelectorAll(".h-2.w-2.rounded-full");
      expect(dots.length).toBe(3);
    });
  });

  describe("TypingIndicator", () => {
    it("should not render when no users are typing", () => {
      const { container } = render(<TypingIndicator users={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("should show single user typing", () => {
      const users = [createTypingUser("1", "Alice")];
      render(<TypingIndicator users={users} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText(/is typing/i)).toBeInTheDocument();
    });

    it("should show two users typing", () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
      ];
      render(<TypingIndicator users={users} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText(/are typing/i)).toBeInTheDocument();
    });

    it("should show three users typing", () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
        createTypingUser("3", "Charlie"),
      ];
      render(<TypingIndicator users={users} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Charlie")).toBeInTheDocument();
      expect(screen.getByText(/are typing/i)).toBeInTheDocument();
    });

    it('should show "X others" when more than 3 users', () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
        createTypingUser("3", "Charlie"),
        createTypingUser("4", "Dave"),
      ];
      render(<TypingIndicator users={users} />);

      expect(screen.getByText(/2 others/i)).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      const users = [createTypingUser("1", "Alice")];
      const { container } = render(
        <TypingIndicator users={users} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("should show user avatars", () => {
      const users = [
        createTypingUser("1", "Alice"),
        createTypingUser("2", "Bob"),
      ];
      const { container } = render(<TypingIndicator users={users} />);

      const avatars = container.querySelectorAll(".h-5.w-5");
      expect(avatars.length).toBeGreaterThan(0);
    });
  });
});
