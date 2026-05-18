/**
 * @fileoverview Tests for typed Socket.io client
 */

import {
  createTypedSocket,
  getTypedSocket,
  disconnectTypedSocket,
} from "../typed-socket";

// Mock socket.io-client
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({
    connected: false,
    disconnect: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
  })),
}));

import { io } from "socket.io-client";

const mockIo = io as jest.MockedFunction<typeof io>;

describe("typed-socket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset socket state between tests
    disconnectTypedSocket();
  });

  describe("createTypedSocket", () => {
    it("should create a new socket connection", () => {
      const socket = createTypedSocket();
      expect(socket).toBeDefined();
      expect(mockIo).toHaveBeenCalled();
    });

    it("should pass auth token when provided", () => {
      const token = "test-token-123";
      createTypedSocket(token);
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token },
        }),
      );
    });

    it("should not include auth when no token provided", () => {
      createTypedSocket();
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: undefined,
        }),
      );
    });

    it("should use SOCKET_CONFIG options", () => {
      createTypedSocket();
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        }),
      );
    });

    it("should return existing socket if already connected", () => {
      // Create a mock connected socket
      const connectedSocket = {
        connected: true,
        disconnect: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn(),
      };
      mockIo.mockReturnValueOnce(connectedSocket as any);

      const socket1 = createTypedSocket();
      const socket2 = createTypedSocket();

      expect(socket1).toBe(socket2);
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it("should create new socket if not connected", () => {
      const disconnectedSocket = {
        connected: false,
        disconnect: jest.fn(),
      };
      mockIo.mockReturnValue(disconnectedSocket as any);

      createTypedSocket();

      // Reset and try again
      disconnectTypedSocket();
      createTypedSocket();

      expect(mockIo).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTypedSocket", () => {
    it("should return null when no socket exists", () => {
      disconnectTypedSocket();
      const socket = getTypedSocket();
      expect(socket).toBeNull();
    });

    it("should return existing socket after creation", () => {
      const mockSocket = {
        connected: false,
        disconnect: jest.fn(),
      };
      mockIo.mockReturnValueOnce(mockSocket as any);

      createTypedSocket();
      const socket = getTypedSocket();

      expect(socket).toBe(mockSocket);
    });

    it("should not create a new socket", () => {
      disconnectTypedSocket();
      getTypedSocket();
      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  describe("disconnectTypedSocket", () => {
    it("should disconnect existing socket", () => {
      const mockSocket = {
        connected: false,
        disconnect: jest.fn(),
      };
      mockIo.mockReturnValueOnce(mockSocket as any);

      createTypedSocket();
      disconnectTypedSocket();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("should set socket to null", () => {
      createTypedSocket();
      disconnectTypedSocket();

      expect(getTypedSocket()).toBeNull();
    });

    it("should handle disconnect when no socket exists", () => {
      disconnectTypedSocket();
      // Should not throw
      expect(() => disconnectTypedSocket()).not.toThrow();
    });

    it("should allow creating new socket after disconnect", () => {
      const mockSocket1 = { connected: false, disconnect: jest.fn() };
      const mockSocket2 = { connected: false, disconnect: jest.fn() };
      mockIo
        .mockReturnValueOnce(mockSocket1 as any)
        .mockReturnValueOnce(mockSocket2 as any);

      const socket1 = createTypedSocket();
      disconnectTypedSocket();
      const socket2 = createTypedSocket();

      expect(socket1).toBe(mockSocket1);
      expect(socket2).toBe(mockSocket2);
      expect(socket1).not.toBe(socket2);
    });
  });

  describe("socket configuration", () => {
    it("should use correct URL from config", () => {
      createTypedSocket();
      expect(mockIo).toHaveBeenCalledWith(
        expect.stringContaining("localhost"),
        expect.any(Object),
      );
    });

    it("should have reconnection enabled", () => {
      createTypedSocket();
      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reconnection: true,
        }),
      );
    });
  });

  describe("TypedSocket type", () => {
    it("should return a typed socket interface", () => {
      const mockSocket = {
        connected: false,
        disconnect: jest.fn(),
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn(),
      };
      mockIo.mockReturnValueOnce(mockSocket as any);

      const socket = createTypedSocket();

      // TypeScript will enforce these exist
      expect(typeof socket.on).toBe("function");
      expect(typeof socket.emit).toBe("function");
      expect(typeof socket.disconnect).toBe("function");
    });
  });
});

describe("Socket connection lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    disconnectTypedSocket();
  });

  it("should handle full lifecycle: create -> use -> disconnect", () => {
    const mockSocket = {
      connected: false,
      disconnect: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
    };
    mockIo.mockReturnValueOnce(mockSocket as any);

    // Create
    const socket = createTypedSocket("token");
    expect(socket).toBeDefined();

    // Use
    const existingSocket = getTypedSocket();
    expect(existingSocket).toBe(mockSocket);

    // Disconnect
    disconnectTypedSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(getTypedSocket()).toBeNull();
  });

  it("should handle multiple connect/disconnect cycles", () => {
    const sockets = [
      { connected: false, disconnect: jest.fn() },
      { connected: false, disconnect: jest.fn() },
      { connected: false, disconnect: jest.fn() },
    ];

    sockets.forEach((s) => mockIo.mockReturnValueOnce(s as any));

    for (let i = 0; i < 3; i++) {
      const socket = createTypedSocket();
      expect(socket).toBe(sockets[i]);
      disconnectTypedSocket();
      expect(sockets[i].disconnect).toHaveBeenCalled();
      expect(getTypedSocket()).toBeNull();
    }
  });
});
