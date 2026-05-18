/**
 * Camera Adapter Tests
 */

import {
  WebCameraAdapter,
  CapacitorCameraAdapter,
  NoopCameraAdapter,
  createCameraAdapter,
  detectCameraBackend,
  getCameraAdapter,
  resetCameraAdapter,
  checkCameraPermission,
  requestCameraPermission,
  takePicture,
  pickFromGallery,
  Camera,
} from "../camera-adapter";

// ============================================================================
// Mock Setup
// ============================================================================

jest.mock("../platform-detector", () => ({
  Platform: {
    WEB: "web",
    IOS: "ios",
    ANDROID: "android",
    ELECTRON: "electron",
    TAURI: "tauri",
  },
  detectPlatform: jest.fn(() => "web"),
  hasMediaDevicesAPI: jest.fn(() => true),
  isBrowser: jest.fn(() => true),
}));

import { detectPlatform, hasMediaDevicesAPI } from "../platform-detector";

const mockDetectPlatform = detectPlatform as jest.Mock;
const mockHasMediaDevicesAPI = hasMediaDevicesAPI as jest.Mock;

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
const mockPermissionsQuery = jest.fn();

Object.defineProperty(navigator, "mediaDevices", {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
});

Object.defineProperty(navigator, "permissions", {
  value: { query: mockPermissionsQuery },
  writable: true,
  configurable: true,
});

// ============================================================================
// Tests
// ============================================================================

describe("Camera Adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCameraAdapter();
    mockDetectPlatform.mockReturnValue("web");
    mockHasMediaDevicesAPI.mockReturnValue(true);
  });

  describe("WebCameraAdapter", () => {
    let adapter: WebCameraAdapter;

    beforeEach(() => {
      adapter = new WebCameraAdapter();
    });

    describe("isAvailable", () => {
      it("returns true when MediaDevices API available", () => {
        mockHasMediaDevicesAPI.mockReturnValue(true);
        expect(adapter.isAvailable()).toBe(true);
      });

      it("returns false when MediaDevices API not available", () => {
        mockHasMediaDevicesAPI.mockReturnValue(false);
        expect(adapter.isAvailable()).toBe(false);
      });
    });

    describe("checkPermission", () => {
      it("returns granted when permission granted", async () => {
        mockPermissionsQuery.mockResolvedValue({ state: "granted" });
        expect(await adapter.checkPermission()).toBe("granted");
      });

      it("returns denied when permission denied", async () => {
        mockPermissionsQuery.mockResolvedValue({ state: "denied" });
        expect(await adapter.checkPermission()).toBe("denied");
      });

      it("returns prompt when permission prompt", async () => {
        mockPermissionsQuery.mockResolvedValue({ state: "prompt" });
        expect(await adapter.checkPermission()).toBe("prompt");
      });

      it("returns prompt on error (Firefox)", async () => {
        mockPermissionsQuery.mockRejectedValue(new Error("Not supported"));
        expect(await adapter.checkPermission()).toBe("prompt");
      });

      it("returns denied when API not available", async () => {
        mockHasMediaDevicesAPI.mockReturnValue(false);
        expect(await adapter.checkPermission()).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns granted when user allows", async () => {
        const mockStream = {
          getTracks: () => [{ stop: jest.fn() }],
        };
        mockGetUserMedia.mockResolvedValue(mockStream);

        expect(await adapter.requestPermission()).toBe("granted");
      });

      it("returns denied when user denies", async () => {
        const error = new Error("Not allowed");
        error.name = "NotAllowedError";
        mockGetUserMedia.mockRejectedValue(error);

        expect(await adapter.requestPermission()).toBe("denied");
      });

      it("returns prompt on other errors", async () => {
        mockGetUserMedia.mockRejectedValue(new Error("Other error"));
        expect(await adapter.requestPermission()).toBe("prompt");
      });

      it("returns denied when API not available", async () => {
        mockHasMediaDevicesAPI.mockReturnValue(false);
        expect(await adapter.requestPermission()).toBe("denied");
      });
    });

    describe("takePicture", () => {
      it("returns error when API not available", async () => {
        mockHasMediaDevicesAPI.mockReturnValue(false);
        const result = await adapter.takePicture();
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not available");
      });

      it("returns cancelled on NotAllowedError", async () => {
        const error = new Error("Not allowed");
        error.name = "NotAllowedError";
        mockGetUserMedia.mockRejectedValue(error);

        const result = await adapter.takePicture();
        expect(result.success).toBe(false);
        expect(result.cancelled).toBe(true);
      });
    });

    describe("pickFromGallery", () => {
      // Skipped: Requires real file input interaction that times out in Jest
      it.skip("handles file selection", async () => {
        // Mock file input - limited testing in Jest
        const result = await adapter.pickFromGallery();
        // Will timeout waiting for input click in test environment
      });
    });
  });

  describe("CapacitorCameraAdapter", () => {
    let adapter: CapacitorCameraAdapter;
    let mockCamera: {
      checkPermissions: jest.Mock;
      requestPermissions: jest.Mock;
      getPhoto: jest.Mock;
    };

    beforeEach(() => {
      mockCamera = {
        checkPermissions: jest
          .fn()
          .mockResolvedValue({ camera: "granted", photos: "granted" }),
        requestPermissions: jest
          .fn()
          .mockResolvedValue({ camera: "granted", photos: "granted" }),
        getPhoto: jest.fn().mockResolvedValue({
          dataUrl: "data:image/jpeg;base64,test",
          format: "jpeg",
        }),
      };
      (window as unknown as { Capacitor: unknown }).Capacitor = {
        Plugins: { Camera: mockCamera },
      };

      adapter = new CapacitorCameraAdapter();
    });

    afterEach(() => {
      delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    });

    describe("isAvailable", () => {
      it("returns true when Camera plugin available", () => {
        expect(adapter.isAvailable()).toBe(true);
      });

      it("returns false when Camera plugin not available", () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        expect(adapter.isAvailable()).toBe(false);
      });
    });

    describe("checkPermission", () => {
      it("returns granted", async () => {
        mockCamera.checkPermissions.mockResolvedValue({ camera: "granted" });
        expect(await adapter.checkPermission()).toBe("granted");
      });

      it("returns denied", async () => {
        mockCamera.checkPermissions.mockResolvedValue({ camera: "denied" });
        expect(await adapter.checkPermission()).toBe("denied");
      });

      it("returns prompt", async () => {
        mockCamera.checkPermissions.mockResolvedValue({ camera: "prompt" });
        expect(await adapter.checkPermission()).toBe("prompt");
      });

      it("returns denied when Camera not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        expect(await adapter.checkPermission()).toBe("denied");
      });

      it("returns denied on error", async () => {
        mockCamera.checkPermissions.mockRejectedValue(new Error("Failed"));
        expect(await adapter.checkPermission()).toBe("denied");
      });
    });

    describe("requestPermission", () => {
      it("returns granted", async () => {
        mockCamera.requestPermissions.mockResolvedValue({ camera: "granted" });
        expect(await adapter.requestPermission()).toBe("granted");
      });

      it("returns denied when Camera not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        expect(await adapter.requestPermission()).toBe("denied");
      });
    });

    describe("takePicture", () => {
      it("takes picture successfully", async () => {
        const result = await adapter.takePicture();

        expect(result.success).toBe(true);
        expect(result.data).toBe("data:image/jpeg;base64,test");
        expect(mockCamera.getPhoto).toHaveBeenCalledWith(
          expect.objectContaining({ source: "CAMERA" }),
        );
      });

      it("returns error when Camera not available", async () => {
        delete (window as unknown as { Capacitor?: unknown }).Capacitor;
        const result = await adapter.takePicture();
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("not available");
      });

      it("returns cancelled when user cancels", async () => {
        mockCamera.getPhoto.mockRejectedValue(new Error("User cancelled"));
        const result = await adapter.takePicture();
        expect(result.success).toBe(false);
        expect(result.cancelled).toBe(true);
      });

      it("uses options", async () => {
        await adapter.takePicture({
          quality: 80,
          direction: "front",
          allowEditing: true,
        });

        expect(mockCamera.getPhoto).toHaveBeenCalledWith(
          expect.objectContaining({
            quality: 80,
            direction: "FRONT",
            allowEditing: true,
          }),
        );
      });
    });

    describe("pickFromGallery", () => {
      it("picks from gallery successfully", async () => {
        const result = await adapter.pickFromGallery();

        expect(result.success).toBe(true);
        expect(mockCamera.getPhoto).toHaveBeenCalledWith(
          expect.objectContaining({ source: "PHOTOS" }),
        );
      });

      it("returns cancelled when user cancels", async () => {
        mockCamera.getPhoto.mockRejectedValue(new Error("User canceled"));
        const result = await adapter.pickFromGallery();
        expect(result.success).toBe(false);
        expect(result.cancelled).toBe(true);
      });
    });
  });

  describe("NoopCameraAdapter", () => {
    let adapter: NoopCameraAdapter;

    beforeEach(() => {
      adapter = new NoopCameraAdapter();
    });

    it("isAvailable returns false", () => {
      expect(adapter.isAvailable()).toBe(false);
    });

    it("checkPermission returns denied", async () => {
      expect(await adapter.checkPermission()).toBe("denied");
    });

    it("requestPermission returns denied", async () => {
      expect(await adapter.requestPermission()).toBe("denied");
    });

    it("takePicture returns error", async () => {
      const result = await adapter.takePicture();
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("not available");
    });

    it("pickFromGallery returns error", async () => {
      const result = await adapter.pickFromGallery();
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("not available");
    });
  });

  describe("detectCameraBackend", () => {
    it("returns capacitor for iOS with Camera", () => {
      mockDetectPlatform.mockReturnValue("ios");
      (window as unknown as { Capacitor: unknown }).Capacitor = {
        Plugins: { Camera: {} },
      };

      expect(detectCameraBackend()).toBe("capacitor");

      delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    });

    it("returns web for iOS without Camera", () => {
      mockDetectPlatform.mockReturnValue("ios");
      mockHasMediaDevicesAPI.mockReturnValue(true);

      expect(detectCameraBackend()).toBe("web");
    });

    it("returns web for web platform", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasMediaDevicesAPI.mockReturnValue(true);

      expect(detectCameraBackend()).toBe("web");
    });

    it("returns none when no camera available", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasMediaDevicesAPI.mockReturnValue(false);

      expect(detectCameraBackend()).toBe("none");
    });
  });

  describe("createCameraAdapter", () => {
    it("creates WebCameraAdapter for web", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasMediaDevicesAPI.mockReturnValue(true);

      expect(createCameraAdapter()).toBeInstanceOf(WebCameraAdapter);
    });

    it("creates NoopCameraAdapter when unavailable", () => {
      mockDetectPlatform.mockReturnValue("web");
      mockHasMediaDevicesAPI.mockReturnValue(false);

      expect(createCameraAdapter()).toBeInstanceOf(NoopCameraAdapter);
    });
  });

  describe("Singleton and convenience functions", () => {
    it("getCameraAdapter returns singleton", () => {
      const a1 = getCameraAdapter();
      const a2 = getCameraAdapter();
      expect(a1).toBe(a2);
    });

    it("resetCameraAdapter resets singleton", () => {
      const a1 = getCameraAdapter();
      resetCameraAdapter();
      const a2 = getCameraAdapter();
      expect(a1).not.toBe(a2);
    });

    it("convenience functions work", async () => {
      mockHasMediaDevicesAPI.mockReturnValue(true);
      mockPermissionsQuery.mockResolvedValue({ state: "granted" });

      expect(await checkCameraPermission()).toBe("granted");
    });
  });

  describe("Camera namespace", () => {
    it("exports all components", () => {
      expect(Camera.WebCameraAdapter).toBe(WebCameraAdapter);
      expect(Camera.CapacitorCameraAdapter).toBe(CapacitorCameraAdapter);
      expect(Camera.NoopCameraAdapter).toBe(NoopCameraAdapter);
      expect(Camera.createCameraAdapter).toBe(createCameraAdapter);
      expect(Camera.detectCameraBackend).toBe(detectCameraBackend);
      expect(Camera.getCameraAdapter).toBe(getCameraAdapter);
      expect(Camera.resetCameraAdapter).toBe(resetCameraAdapter);
      expect(Camera.checkPermission).toBe(checkCameraPermission);
      expect(Camera.requestPermission).toBe(requestCameraPermission);
      expect(Camera.takePicture).toBe(takePicture);
      expect(Camera.pickFromGallery).toBe(pickFromGallery);
    });
  });
});
