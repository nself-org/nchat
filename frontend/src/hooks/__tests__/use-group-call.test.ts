/**
 * useGroupCall Hook Tests
 *
 * Test suite for the useGroupCall hook covering:
 * - Call lifecycle
 * - Participant management
 * - Host controls
 * - Layout controls
 * - Media controls
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { useGroupCall } from "../use-group-call";
import type { GroupCallService } from "@/services/calls/group-call.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock the auth context
const mockUser = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
};

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock GroupCallService
const mockServiceMethods = {
  initialize: jest.fn().mockResolvedValue(undefined),
  createGroupCall: jest.fn().mockResolvedValue("call-123"),
  joinGroupCall: jest.fn().mockResolvedValue(undefined),
  leaveCall: jest.fn(),
  endCallForEveryone: jest.fn().mockResolvedValue(undefined),
  muteAllParticipants: jest.fn().mockResolvedValue(undefined),
  unmuteAllParticipants: jest.fn().mockResolvedValue(undefined),
  muteParticipant: jest.fn().mockResolvedValue(undefined),
  removeParticipant: jest.fn().mockResolvedValue(undefined),
  lockRoom: jest.fn().mockResolvedValue(undefined),
  unlockRoom: jest.fn().mockResolvedValue(undefined),
  transferHost: jest.fn().mockResolvedValue(undefined),
  setParticipantRole: jest.fn().mockResolvedValue(undefined),
  promoteToCoHost: jest.fn().mockResolvedValue(undefined),
  demoteFromCoHost: jest.fn().mockResolvedValue(undefined),
  makeViewer: jest.fn().mockResolvedValue(undefined),
  getParticipantRole: jest.fn().mockReturnValue("participant"),
  admitFromLobby: jest.fn().mockResolvedValue(undefined),
  admitAllFromLobby: jest.fn().mockResolvedValue(undefined),
  denyFromLobby: jest.fn().mockResolvedValue(undefined),
  denyAllFromLobby: jest.fn().mockResolvedValue(undefined),
  setAutoAdmit: jest.fn(),
  setLayout: jest.fn(),
  pinParticipant: jest.fn(),
  unpinParticipant: jest.fn(),
  spotlightParticipant: jest.fn(),
  removeSpotlight: jest.fn(),
  hideNonVideoParticipants: jest.fn(),
  toggleMute: jest.fn(),
  setMuted: jest.fn(),
  toggleVideo: jest.fn(),
  setVideoEnabled: jest.fn(),
  startScreenShare: jest.fn().mockResolvedValue(undefined),
  stopScreenShare: jest.fn(),
  raiseHand: jest.fn(),
  lowerHand: jest.fn(),
  lowerParticipantHand: jest.fn(),
  startRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  callInfo: null,
  callMetrics: {
    duration: 0,
    participantCount: 0,
    peakParticipantCount: 0,
    totalJoins: 0,
    totalLeaves: 0,
    averageCallQuality: 100,
    networkIssues: 0,
  },
  isHost: false,
  isCoHost: false,
  canManageParticipants: false,
  isLargeRoom: false,
  participantCount: 0,
  lobbyCount: 0,
  activeSpeaker: null,
};

let mockCallInfo: any = null;
let mockIsHost = false;
let mockIsCoHost = false;
let mockParticipants = new Map();
let mockLobbyParticipants = new Map();

const mockService = {
  ...mockServiceMethods,
  get callInfo() {
    return mockCallInfo;
  },
  get isHost() {
    return mockIsHost;
  },
  get isCoHost() {
    return mockIsCoHost;
  },
  get canManageParticipants() {
    return mockIsHost || mockIsCoHost;
  },
  get participantCount() {
    return mockParticipants.size;
  },
  get lobbyCount() {
    return mockLobbyParticipants.size;
  },
};

jest.mock("@/services/calls/group-call.service", () => ({
  createGroupCallService: jest.fn(() => mockService),
  GroupCallService: jest.fn(),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe("useGroupCall", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallInfo = null;
    mockIsHost = false;
    mockIsCoHost = false;
    mockParticipants = new Map();
    mockLobbyParticipants = new Map();
  });

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe("Initialization", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(result.current.isInCall).toBe(false);
      expect(result.current.callInfo).toBeNull();
      expect(result.current.callStatus).toBe("idle");
      expect(result.current.participants).toEqual([]);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.isVideoEnabled).toBe(true);
    });

    it("should accept options", () => {
      const { result } = renderHook(() =>
        useGroupCall({
          maxParticipants: 50,
          enableLobby: true,
          muteOnEntry: true,
          videoOffOnEntry: true,
        }),
      );

      expect(result.current.isMuted).toBe(true);
      expect(result.current.isVideoEnabled).toBe(false);
    });

    it("should initialize the service", () => {
      renderHook(() => useGroupCall());

      expect(mockService.initialize).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Call Lifecycle Tests
  // ===========================================================================

  describe("Call Lifecycle", () => {
    it("should create a call", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        const callId = await result.current.createCall("video", {
          channelId: "channel-1",
          title: "Test Meeting",
        });
        expect(callId).toBe("call-123");
      });

      expect(mockService.createGroupCall).toHaveBeenCalledWith("video", {
        channelId: "channel-1",
        title: "Test Meeting",
      });
    });

    it("should join a call", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.joinCall("call-456", "video", {
          channelId: "channel-1",
        });
      });

      expect(mockService.joinGroupCall).toHaveBeenCalledWith(
        "call-456",
        "video",
        {
          channelId: "channel-1",
        },
      );
    });

    it("should leave a call", async () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.leaveCall();
      });

      expect(mockService.leaveCall).toHaveBeenCalled();
    });

    it("should end call for everyone", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.endCallForEveryone();
      });

      expect(mockService.endCallForEveryone).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Host Controls Tests
  // ===========================================================================

  describe("Host Controls", () => {
    it("should mute all participants", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.muteAllParticipants();
      });

      expect(mockService.muteAllParticipants).toHaveBeenCalled();
    });

    it("should mute all except specified", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.muteAllParticipants(["user-2", "user-3"]);
      });

      expect(mockService.muteAllParticipants).toHaveBeenCalledWith([
        "user-2",
        "user-3",
      ]);
    });

    it("should unmute all participants", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.unmuteAllParticipants();
      });

      expect(mockService.unmuteAllParticipants).toHaveBeenCalled();
    });

    it("should mute individual participant", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.muteParticipant("user-2");
      });

      expect(mockService.muteParticipant).toHaveBeenCalledWith("user-2");
    });

    it("should remove participant", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.removeParticipant("user-2", "kicked");
      });

      expect(mockService.removeParticipant).toHaveBeenCalledWith(
        "user-2",
        "kicked",
      );
    });

    it("should lock room", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.lockRoom();
      });

      expect(mockService.lockRoom).toHaveBeenCalled();
    });

    it("should unlock room", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.unlockRoom();
      });

      expect(mockService.unlockRoom).toHaveBeenCalled();
    });

    it("should transfer host", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.transferHost("user-2");
      });

      expect(mockService.transferHost).toHaveBeenCalledWith("user-2");
    });
  });

  // ===========================================================================
  // Role Controls Tests
  // ===========================================================================

  describe("Role Controls", () => {
    it("should set participant role", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.setParticipantRole("user-2", "co-host");
      });

      expect(mockService.setParticipantRole).toHaveBeenCalledWith(
        "user-2",
        "co-host",
      );
    });

    it("should promote to co-host", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.promoteToCoHost("user-2");
      });

      expect(mockService.promoteToCoHost).toHaveBeenCalledWith("user-2");
    });

    it("should demote from co-host", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.demoteFromCoHost("user-2");
      });

      expect(mockService.demoteFromCoHost).toHaveBeenCalledWith("user-2");
    });

    it("should make viewer", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.makeViewer("user-2");
      });

      expect(mockService.makeViewer).toHaveBeenCalledWith("user-2");
    });

    it("should get participant role", () => {
      const { result } = renderHook(() => useGroupCall());

      const role = result.current.getParticipantRole("user-2");

      expect(mockService.getParticipantRole).toHaveBeenCalledWith("user-2");
      expect(role).toBe("participant");
    });
  });

  // ===========================================================================
  // Lobby Controls Tests
  // ===========================================================================

  describe("Lobby Controls", () => {
    it("should admit from lobby", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.admitFromLobby("user-2");
      });

      expect(mockService.admitFromLobby).toHaveBeenCalledWith("user-2");
    });

    it("should admit all from lobby", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.admitAllFromLobby();
      });

      expect(mockService.admitAllFromLobby).toHaveBeenCalled();
    });

    it("should deny from lobby", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.denyFromLobby("user-2", "Not invited");
      });

      expect(mockService.denyFromLobby).toHaveBeenCalledWith(
        "user-2",
        "Not invited",
      );
    });

    it("should deny all from lobby", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.denyAllFromLobby("Meeting full");
      });

      expect(mockService.denyAllFromLobby).toHaveBeenCalledWith("Meeting full");
    });

    it("should set auto-admit", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.setAutoAdmit(true, ["company.com"]);
      });

      expect(mockService.setAutoAdmit).toHaveBeenCalledWith(true, [
        "company.com",
      ]);
    });
  });

  // ===========================================================================
  // Layout Controls Tests
  // ===========================================================================

  describe("Layout Controls", () => {
    it("should set layout", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.setLayout("speaker");
      });

      expect(mockService.setLayout).toHaveBeenCalledWith("speaker");
    });

    it("should pin participant", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.pinParticipant("user-2");
      });

      expect(mockService.pinParticipant).toHaveBeenCalledWith("user-2");
    });

    it("should unpin participant", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.unpinParticipant();
      });

      expect(mockService.unpinParticipant).toHaveBeenCalled();
    });

    it("should spotlight participant", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.spotlightParticipant("user-2");
      });

      expect(mockService.spotlightParticipant).toHaveBeenCalledWith("user-2");
    });

    it("should remove spotlight", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.removeSpotlight("user-2");
      });

      expect(mockService.removeSpotlight).toHaveBeenCalledWith("user-2");
    });

    it("should hide non-video participants", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.hideNonVideoParticipants(true);
      });

      expect(mockService.hideNonVideoParticipants).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // Media Controls Tests
  // ===========================================================================

  describe("Media Controls", () => {
    it("should toggle mute", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.toggleMute();
      });

      expect(mockService.toggleMute).toHaveBeenCalled();
    });

    it("should set muted", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.setMuted(true);
      });

      expect(mockService.setMuted).toHaveBeenCalledWith(true);
    });

    it("should toggle video", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.toggleVideo();
      });

      expect(mockService.toggleVideo).toHaveBeenCalled();
    });

    it("should set video enabled", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.setVideoEnabled(false);
      });

      expect(mockService.setVideoEnabled).toHaveBeenCalledWith(false);
    });

    it("should toggle screen share", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.toggleScreenShare();
      });

      expect(mockService.startScreenShare).toHaveBeenCalled();
    });

    it("should start screen share", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(mockService.startScreenShare).toHaveBeenCalled();
    });

    it("should stop screen share", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.stopScreenShare();
      });

      expect(mockService.stopScreenShare).toHaveBeenCalled();
    });

    it("should raise hand", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.raiseHand();
      });

      expect(mockService.raiseHand).toHaveBeenCalled();
    });

    it("should lower hand", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.lowerHand();
      });

      expect(mockService.lowerHand).toHaveBeenCalled();
    });

    it("should lower participant hand", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.lowerParticipantHand("user-2");
      });

      expect(mockService.lowerParticipantHand).toHaveBeenCalledWith("user-2");
    });
  });

  // ===========================================================================
  // Recording Tests
  // ===========================================================================

  describe("Recording", () => {
    it("should start recording", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockService.startRecording).toHaveBeenCalled();
    });

    it("should stop recording", async () => {
      const { result } = renderHook(() => useGroupCall());

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(mockService.stopRecording).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Pagination Tests
  // ===========================================================================

  describe("Pagination", () => {
    it("should start at page 0", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(result.current.currentPage).toBe(0);
    });

    it("should have goToPage function", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(typeof result.current.goToPage).toBe("function");
    });

    it("should have nextPage function", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(typeof result.current.nextPage).toBe("function");
    });

    it("should have previousPage function", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(typeof result.current.previousPage).toBe("function");
    });

    it("should not go to negative page when at 0", () => {
      const { result } = renderHook(() => useGroupCall());

      act(() => {
        result.current.previousPage();
      });

      // Should stay at 0, not go to -1
      expect(result.current.currentPage).toBe(0);
    });

    it("should have totalPages property", () => {
      const { result } = renderHook(() => useGroupCall());

      expect(typeof result.current.totalPages).toBe("number");
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe("Error Handling", () => {
    it("should handle create call error", async () => {
      mockService.createGroupCall.mockRejectedValueOnce(
        new Error("Create failed"),
      );

      const { result } = renderHook(() => useGroupCall());

      await expect(
        act(async () => {
          await result.current.createCall("video");
        }),
      ).rejects.toThrow("Create failed");

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Call Failed",
          variant: "destructive",
        }),
      );
    });

    it("should handle join call error", async () => {
      mockService.joinGroupCall.mockRejectedValueOnce(new Error("Join failed"));

      const { result } = renderHook(() => useGroupCall());

      await expect(
        act(async () => {
          await result.current.joinCall("call-123", "video");
        }),
      ).rejects.toThrow("Join failed");

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Join Failed",
          variant: "destructive",
        }),
      );
    });
  });

  // ===========================================================================
  // Remote Streams Tests
  // ===========================================================================

  describe("Remote Streams", () => {
    it("should get participant stream", () => {
      const { result } = renderHook(() => useGroupCall());

      const stream = result.current.getParticipantStream("user-2");

      // Initially no streams
      expect(stream).toBeUndefined();
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe("Cleanup", () => {
    it("should destroy service on unmount", () => {
      const { unmount } = renderHook(() => useGroupCall());

      unmount();

      expect(mockService.destroy).toHaveBeenCalled();
    });
  });
});
