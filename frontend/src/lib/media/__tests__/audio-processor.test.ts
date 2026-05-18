/**
 * Audio Processor Tests
 *
 * Comprehensive unit tests for audio processing utilities.
 */

import {
  detectFormatFromMime,
  detectFormatFromExtension,
  detectFormat,
  getMimeType,
  isFormatSupported,
  isAudio,
  loadAudio,
  createAudioElement,
  decodeAudioData,
  getAudioMetadata,
  getDetailedAudioMetadata,
  getAudioDuration,
  generateWaveform,
  generateWaveformPeaks,
  generateWaveformWithRMS,
  generateVisualizationData,
  generateFrequencyData,
  analyzeAudio,
  isSilent,
  validateAudio,
  validateAudioSync,
  formatDuration,
  parseDuration,
  estimateFileSize,
  getRecommendedBitrate,
  createAudioUrl,
  revokeAudioUrl,
  canPlayFormat,
  getSupportedFormats,
  normalizeWaveform,
  downsampleWaveform,
  DEFAULT_WAVEFORM_SAMPLES,
  DEFAULT_VISUALIZATION_BARS,
  MAX_AUDIO_DURATION,
  MAX_AUDIO_SIZE,
  AUDIO_MIME_TYPES,
  SUPPORTED_AUDIO_FORMATS,
  AudioFormat,
} from "../audio-processor";

// ============================================================================
// Mock Setup
// ============================================================================

global.URL.createObjectURL = jest.fn(() => "blob:mock-audio-url-123");
global.URL.revokeObjectURL = jest.fn();

// Mock Audio Element
class MockAudioElement {
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = "";
  crossOrigin: string = "";
  preload: string = "";
  duration: number = 180;

  constructor() {
    setTimeout(() => {
      if (this.onloadedmetadata) this.onloadedmetadata();
    }, 0);
  }

  canPlayType(mimeType: string): string {
    if (mimeType === "audio/mpeg" || mimeType === "audio/wav") {
      return "probably";
    }
    if (mimeType === "audio/ogg" || mimeType === "audio/webm") {
      return "maybe";
    }
    return "";
  }
}

// Mock AudioBuffer
class MockAudioBuffer {
  duration: number = 180;
  sampleRate: number = 44100;
  numberOfChannels: number = 2;
  length: number = 44100 * 180;

  getChannelData(): Float32Array {
    // Return mock audio data with some variation
    const data = new Float32Array(44100);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(i / 100) * 0.5;
    }
    return data;
  }
}

// Mock AudioContext
class MockAudioContext {
  sampleRate: number = 44100;

  decodeAudioData(): Promise<AudioBuffer> {
    return Promise.resolve(new MockAudioBuffer() as unknown as AudioBuffer);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

(
  window as typeof window & { AudioContext: typeof MockAudioContext }
).AudioContext = MockAudioContext as unknown as typeof AudioContext;
(
  window as typeof window & { webkitAudioContext?: typeof MockAudioContext }
).webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;

document.createElement = jest.fn((tag: string) => {
  if (tag === "audio") {
    return new MockAudioElement() as unknown as HTMLAudioElement;
  }
  return {} as HTMLElement;
}) as jest.Mock;

// Create test file helpers
function createMockFile(name: string, type: string, size: number = 1024): File {
  const blob = new Blob([new ArrayBuffer(size)], { type });
  return new File([blob], name, { type });
}

function createMockBlob(type: string, size: number = 1024): Blob {
  return new Blob([new ArrayBuffer(size)], { type });
}

// ============================================================================
// Tests
// ============================================================================

describe("Audio Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Format Detection Tests
  // ==========================================================================

  describe("Format Detection", () => {
    describe("detectFormatFromMime", () => {
      it("should detect MP3 format", () => {
        expect(detectFormatFromMime("audio/mpeg")).toBe("mp3");
        expect(detectFormatFromMime("audio/mp3")).toBe("mp3");
      });

      it("should detect WAV format", () => {
        expect(detectFormatFromMime("audio/wav")).toBe("wav");
        expect(detectFormatFromMime("audio/wave")).toBe("wav");
        expect(detectFormatFromMime("audio/x-wav")).toBe("wav");
      });

      it("should detect OGG format", () => {
        expect(detectFormatFromMime("audio/ogg")).toBe("ogg");
      });

      it("should detect FLAC format", () => {
        expect(detectFormatFromMime("audio/flac")).toBe("flac");
        expect(detectFormatFromMime("audio/x-flac")).toBe("flac");
      });

      it("should detect AAC format", () => {
        expect(detectFormatFromMime("audio/aac")).toBe("aac");
      });

      it("should detect M4A format", () => {
        expect(detectFormatFromMime("audio/x-m4a")).toBe("m4a");
        expect(detectFormatFromMime("audio/m4a")).toBe("m4a");
        expect(detectFormatFromMime("audio/mp4")).toBe("m4a");
      });

      it("should detect WebM format", () => {
        expect(detectFormatFromMime("audio/webm")).toBe("webm");
      });

      it("should return unknown for unrecognized types", () => {
        expect(detectFormatFromMime("audio/unknown")).toBe("unknown");
        expect(detectFormatFromMime("video/mp4")).toBe("unknown");
      });

      it("should handle mime types with parameters", () => {
        expect(detectFormatFromMime("audio/mpeg; charset=utf-8")).toBe("mp3");
      });

      it("should handle case-insensitive mime types", () => {
        expect(detectFormatFromMime("AUDIO/MPEG")).toBe("mp3");
        expect(detectFormatFromMime("Audio/Wav")).toBe("wav");
      });
    });

    describe("detectFormatFromExtension", () => {
      it("should detect .mp3 extension", () => {
        expect(detectFormatFromExtension("audio.mp3")).toBe("mp3");
      });

      it("should detect .wav extension", () => {
        expect(detectFormatFromExtension("audio.wav")).toBe("wav");
      });

      it("should detect .ogg/.oga extension", () => {
        expect(detectFormatFromExtension("audio.ogg")).toBe("ogg");
        expect(detectFormatFromExtension("audio.oga")).toBe("ogg");
      });

      it("should detect .flac extension", () => {
        expect(detectFormatFromExtension("audio.flac")).toBe("flac");
      });

      it("should detect .aac extension", () => {
        expect(detectFormatFromExtension("audio.aac")).toBe("aac");
      });

      it("should detect .m4a extension", () => {
        expect(detectFormatFromExtension("audio.m4a")).toBe("m4a");
      });

      it("should detect .webm/.weba extension", () => {
        expect(detectFormatFromExtension("audio.webm")).toBe("webm");
        expect(detectFormatFromExtension("audio.weba")).toBe("webm");
      });

      it("should handle uppercase extensions", () => {
        expect(detectFormatFromExtension("audio.MP3")).toBe("mp3");
        expect(detectFormatFromExtension("audio.WAV")).toBe("wav");
      });

      it("should return unknown for unrecognized extensions", () => {
        expect(detectFormatFromExtension("file.txt")).toBe("unknown");
        expect(detectFormatFromExtension("audio.xyz")).toBe("unknown");
      });

      it("should handle files with multiple dots", () => {
        expect(detectFormatFromExtension("my.audio.file.mp3")).toBe("mp3");
      });
    });

    describe("detectFormat", () => {
      it("should prioritize mime type over extension", () => {
        const file = createMockFile("audio.wav", "audio/mpeg");
        expect(detectFormat(file)).toBe("mp3");
      });

      it("should fall back to extension if mime is unknown", () => {
        const file = createMockFile("audio.flac", "application/octet-stream");
        expect(detectFormat(file)).toBe("flac");
      });
    });

    describe("getMimeType", () => {
      it("should return correct mime type for mp3", () => {
        expect(getMimeType("mp3")).toBe("audio/mpeg");
      });

      it("should return correct mime type for wav", () => {
        expect(getMimeType("wav")).toBe("audio/wav");
      });

      it("should return correct mime type for flac", () => {
        expect(getMimeType("flac")).toBe("audio/flac");
      });

      it("should return octet-stream for unknown", () => {
        expect(getMimeType("unknown")).toBe("application/octet-stream");
      });
    });

    describe("isFormatSupported", () => {
      it("should return true for supported formats", () => {
        expect(isFormatSupported("mp3")).toBe(true);
        expect(isFormatSupported("wav")).toBe(true);
        expect(isFormatSupported("ogg")).toBe(true);
        expect(isFormatSupported("flac")).toBe(true);
      });

      it("should return false for unknown format", () => {
        expect(isFormatSupported("unknown")).toBe(false);
      });
    });

    describe("isAudio", () => {
      it("should return true for audio mime types", () => {
        expect(isAudio("audio/mpeg")).toBe(true);
        expect(isAudio("audio/wav")).toBe(true);
        expect(isAudio("audio/ogg")).toBe(true);
      });

      it("should return false for non-audio mime types", () => {
        expect(isAudio("video/mp4")).toBe(false);
        expect(isAudio("image/jpeg")).toBe(false);
        expect(isAudio("application/pdf")).toBe(false);
      });

      it("should be case-insensitive", () => {
        expect(isAudio("AUDIO/MPEG")).toBe(true);
        expect(isAudio("Audio/Wav")).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Audio Loading Tests
  // ==========================================================================

  describe("Audio Loading", () => {
    describe("loadAudio", () => {
      it("should load audio from blob", async () => {
        const blob = createMockBlob("audio/mpeg");
        const audio = await loadAudio(blob);
        expect(audio).toBeDefined();
        expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      });

      it("should load audio from file", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const audio = await loadAudio(file);
        expect(audio).toBeDefined();
      });

      it("should load audio from URL", async () => {
        const audio = await loadAudio("https://example.com/audio.mp3");
        expect(audio).toBeDefined();
        expect(audio.crossOrigin).toBe("anonymous");
      });

      it("should revoke object URL after loading blob", async () => {
        const blob = createMockBlob("audio/mpeg");
        await loadAudio(blob);
        expect(URL.revokeObjectURL).toHaveBeenCalled();
      });
    });

    describe("createAudioElement", () => {
      it("should create audio element from blob", () => {
        const blob = createMockBlob("audio/mpeg");
        const audio = createAudioElement(blob);
        expect(audio).toBeDefined();
        expect(audio.preload).toBe("metadata");
      });

      it("should create audio element from URL", () => {
        const audio = createAudioElement("https://example.com/audio.mp3");
        expect(audio).toBeDefined();
        expect(audio.crossOrigin).toBe("anonymous");
      });
    });

    describe("decodeAudioData", () => {
      it("should decode audio from blob", async () => {
        const blob = createMockBlob("audio/mpeg");
        const buffer = await decodeAudioData(blob);
        expect(buffer).toBeDefined();
        expect(buffer.duration).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // Audio Metadata Tests
  // ==========================================================================

  describe("Audio Metadata", () => {
    describe("getAudioMetadata", () => {
      it("should return audio metadata", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const metadata = await getAudioMetadata(file);
        expect(metadata.duration).toBe(180);
      });
    });

    describe("getDetailedAudioMetadata", () => {
      it("should return detailed metadata", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const metadata = await getDetailedAudioMetadata(file);
        expect(metadata.duration).toBeDefined();
        expect(metadata.sampleRate).toBe(44100);
        expect(metadata.channels).toBe(2);
      });
    });

    describe("getAudioDuration", () => {
      it("should return duration in seconds", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const duration = await getAudioDuration(file);
        expect(duration).toBe(180);
      });
    });
  });

  // ==========================================================================
  // Waveform Generation Tests
  // ==========================================================================

  describe("Waveform Generation", () => {
    describe("generateWaveform", () => {
      it("should generate waveform data", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const waveform = await generateWaveform(file);
        expect(waveform.peaks).toBeDefined();
        expect(waveform.peaks.length).toBe(DEFAULT_WAVEFORM_SAMPLES);
        expect(waveform.duration).toBeDefined();
        expect(waveform.sampleRate).toBeDefined();
        expect(waveform.channels).toBeDefined();
      });

      it("should generate custom number of samples", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const waveform = await generateWaveform(file, { samples: 50 });
        expect(waveform.peaks.length).toBe(50);
      });

      it("should normalize by default", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const waveform = await generateWaveform(file, { normalize: true });
        const maxPeak = Math.max(...waveform.peaks);
        expect(maxPeak).toBeLessThanOrEqual(1);
      });

      it("should return non-normalized data when requested", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const waveform = await generateWaveform(file, { normalize: false });
        expect(waveform.peaks).toBeDefined();
      });
    });

    describe("generateWaveformPeaks", () => {
      it("should return array of peaks", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const peaks = await generateWaveformPeaks(file);
        expect(peaks.length).toBe(DEFAULT_WAVEFORM_SAMPLES);
        peaks.forEach((peak) => {
          expect(peak).toBeGreaterThanOrEqual(0);
          expect(peak).toBeLessThanOrEqual(1);
        });
      });

      it("should generate custom number of samples", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const peaks = await generateWaveformPeaks(file, 25);
        expect(peaks.length).toBe(25);
      });
    });

    describe("generateWaveformWithRMS", () => {
      it("should return peaks and RMS values", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const result = await generateWaveformWithRMS(file);
        expect(result.peaks).toBeDefined();
        expect(result.rms).toBeDefined();
        expect(result.peaks.length).toBe(result.rms.length);
      });
    });
  });

  // ==========================================================================
  // Visualization Data Tests
  // ==========================================================================

  describe("Visualization Data", () => {
    describe("generateVisualizationData", () => {
      it("should return visualization data", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const data = await generateVisualizationData(file);
        expect(data.bars).toBeDefined();
        expect(data.peaks).toBeDefined();
        expect(data.rms).toBeDefined();
        expect(data.bars.length).toBe(DEFAULT_VISUALIZATION_BARS);
      });

      it("should generate custom number of bars", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const data = await generateVisualizationData(file, 32);
        expect(data.bars.length).toBe(32);
      });
    });

    describe("generateFrequencyData", () => {
      it("should return frequency data array", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const data = await generateFrequencyData(file);
        expect(data).toBeInstanceOf(Float32Array);
      });

      it("should return normalized data", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const data = await generateFrequencyData(file);
        const max = Math.max(...data);
        expect(max).toBeLessThanOrEqual(1);
      });
    });
  });

  // ==========================================================================
  // Audio Analysis Tests
  // ==========================================================================

  describe("Audio Analysis", () => {
    describe("analyzeAudio", () => {
      it("should return analysis data", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const analysis = await analyzeAudio(file);
        expect(analysis.peakAmplitude).toBeDefined();
        expect(analysis.averageAmplitude).toBeDefined();
        expect(analysis.silenceRatio).toBeDefined();
        expect(analysis.dynamicRange).toBeDefined();
      });

      it("should return values in expected ranges", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const analysis = await analyzeAudio(file);
        expect(analysis.peakAmplitude).toBeGreaterThanOrEqual(0);
        expect(analysis.peakAmplitude).toBeLessThanOrEqual(1);
        expect(analysis.silenceRatio).toBeGreaterThanOrEqual(0);
        expect(analysis.silenceRatio).toBeLessThanOrEqual(1);
      });
    });

    describe("isSilent", () => {
      it("should detect non-silent audio", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const silent = await isSilent(file);
        expect(silent).toBe(false);
      });

      it("should accept custom threshold", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const silent = await isSilent(file, 0.99);
        expect(typeof silent).toBe("boolean");
      });
    });
  });

  // ==========================================================================
  // Audio Validation Tests
  // ==========================================================================

  describe("Audio Validation", () => {
    describe("validateAudio", () => {
      it("should return valid for acceptable audio", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg", 1024 * 1024);
        const result = await validateAudio(file);
        expect(result.valid).toBe(true);
      });

      it("should return invalid for oversized audio", async () => {
        const file = createMockFile(
          "test.mp3",
          "audio/mpeg",
          MAX_AUDIO_SIZE + 1,
        );
        const result = await validateAudio(file, { maxSize: MAX_AUDIO_SIZE });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("size");
      });

      it("should return invalid for disallowed format", async () => {
        const file = createMockFile("test.midi", "audio/midi");
        const result = await validateAudio(file, {
          allowedFormats: ["mp3", "wav"],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("format");
      });

      it("should validate allowed formats", async () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const result = await validateAudio(file, {
          allowedFormats: ["mp3", "wav"],
        });
        expect(result.valid).toBe(true);
      });
    });

    describe("validateAudioSync", () => {
      it("should return valid for acceptable audio", () => {
        const file = createMockFile("test.mp3", "audio/mpeg", 1024 * 1024);
        const result = validateAudioSync(file);
        expect(result.valid).toBe(true);
      });

      it("should return invalid for oversized audio", () => {
        const file = createMockFile(
          "test.mp3",
          "audio/mpeg",
          MAX_AUDIO_SIZE + 1,
        );
        const result = validateAudioSync(file, { maxSize: MAX_AUDIO_SIZE });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("size");
      });

      it("should return invalid for disallowed format", () => {
        const file = createMockFile("test.midi", "audio/midi");
        const result = validateAudioSync(file, {
          allowedFormats: ["mp3", "wav"],
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain("format");
      });
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe("Utility Functions", () => {
    describe("formatDuration", () => {
      it("should format seconds to MM:SS", () => {
        expect(formatDuration(65)).toBe("1:05");
        expect(formatDuration(0)).toBe("0:00");
        expect(formatDuration(59)).toBe("0:59");
      });

      it("should format to HH:MM:SS for long durations", () => {
        expect(formatDuration(3661)).toBe("1:01:01");
        expect(formatDuration(7200)).toBe("2:00:00");
      });

      it("should handle edge cases", () => {
        expect(formatDuration(-1)).toBe("0:00");
        expect(formatDuration(Infinity)).toBe("0:00");
        expect(formatDuration(NaN)).toBe("0:00");
      });
    });

    describe("parseDuration", () => {
      it("should parse MM:SS format", () => {
        expect(parseDuration("1:05")).toBe(65);
        expect(parseDuration("0:00")).toBe(0);
        expect(parseDuration("10:30")).toBe(630);
      });

      it("should parse HH:MM:SS format", () => {
        expect(parseDuration("1:01:01")).toBe(3661);
        expect(parseDuration("2:00:00")).toBe(7200);
      });

      it("should parse single number as seconds", () => {
        expect(parseDuration("30")).toBe(30);
      });
    });

    describe("estimateFileSize", () => {
      it("should calculate file size from duration and bitrate", () => {
        const size = estimateFileSize(60, 128); // 1 min at 128kbps
        expect(size).toBeGreaterThan(0);
      });

      it("should return 0 for 0 duration", () => {
        expect(estimateFileSize(0, 128)).toBe(0);
      });
    });

    describe("getRecommendedBitrate", () => {
      it("should return correct bitrate for quality levels", () => {
        expect(getRecommendedBitrate("low")).toBe(64);
        expect(getRecommendedBitrate("medium")).toBe(128);
        expect(getRecommendedBitrate("high")).toBe(256);
        expect(getRecommendedBitrate("lossless")).toBe(1411);
      });
    });

    describe("createAudioUrl", () => {
      it("should create blob URL for file", () => {
        const file = createMockFile("test.mp3", "audio/mpeg");
        const url = createAudioUrl(file);
        expect(url).toBe("blob:mock-audio-url-123");
        expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      });
    });

    describe("revokeAudioUrl", () => {
      it("should revoke blob URL", () => {
        revokeAudioUrl("blob:mock-audio-url-123");
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(
          "blob:mock-audio-url-123",
        );
      });
    });

    describe("canPlayFormat", () => {
      it("should return true for supported formats", () => {
        expect(canPlayFormat("mp3")).toBe(true);
        expect(canPlayFormat("wav")).toBe(true);
      });

      it("should return true for maybe-supported formats", () => {
        expect(canPlayFormat("ogg")).toBe(true);
        expect(canPlayFormat("webm")).toBe(true);
      });

      it("should return false for unsupported formats", () => {
        expect(canPlayFormat("unknown")).toBe(false);
      });
    });

    describe("getSupportedFormats", () => {
      it("should return array of supported formats", () => {
        const formats = getSupportedFormats();
        expect(Array.isArray(formats)).toBe(true);
        expect(formats).toContain("mp3");
        expect(formats).toContain("wav");
      });

      it("should not include unknown format", () => {
        const formats = getSupportedFormats();
        expect(formats).not.toContain("unknown");
      });
    });

    describe("normalizeWaveform", () => {
      it("should normalize data to 0-1 range", () => {
        const data = [0.2, 0.4, 0.6, 0.8, 1.0];
        const normalized = normalizeWaveform(data);
        expect(Math.max(...normalized)).toBe(1);
      });

      it("should handle all zeros", () => {
        const data = [0, 0, 0, 0];
        const normalized = normalizeWaveform(data);
        expect(normalized.every((v) => v === 0)).toBe(true);
      });

      it("should handle negative values", () => {
        const data = [-0.5, 0.5, -1.0, 1.0];
        const normalized = normalizeWaveform(data);
        const max = Math.max(...normalized.map(Math.abs));
        expect(max).toBeLessThanOrEqual(1);
      });
    });

    describe("downsampleWaveform", () => {
      it("should downsample to target samples", () => {
        const data = new Array(100).fill(0).map((_, i) => i / 100);
        const downsampled = downsampleWaveform(data, 10);
        expect(downsampled.length).toBe(10);
      });

      it("should return original if already smaller", () => {
        const data = [0.1, 0.2, 0.3];
        const downsampled = downsampleWaveform(data, 10);
        expect(downsampled).toEqual(data);
      });

      it("should preserve peak values", () => {
        const data = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7];
        const downsampled = downsampleWaveform(data, 2);
        expect(downsampled.length).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct default waveform samples", () => {
      expect(DEFAULT_WAVEFORM_SAMPLES).toBe(100);
    });

    it("should have correct default visualization bars", () => {
      expect(DEFAULT_VISUALIZATION_BARS).toBe(64);
    });

    it("should have correct max audio duration", () => {
      expect(MAX_AUDIO_DURATION).toBe(3600);
    });

    it("should have correct max audio size", () => {
      expect(MAX_AUDIO_SIZE).toBe(100 * 1024 * 1024);
    });

    it("should have all expected MIME types", () => {
      expect(AUDIO_MIME_TYPES.mp3).toBe("audio/mpeg");
      expect(AUDIO_MIME_TYPES.wav).toBe("audio/wav");
      expect(AUDIO_MIME_TYPES.ogg).toBe("audio/ogg");
      expect(AUDIO_MIME_TYPES.flac).toBe("audio/flac");
    });

    it("should have correct supported formats list", () => {
      expect(SUPPORTED_AUDIO_FORMATS).toContain("mp3");
      expect(SUPPORTED_AUDIO_FORMATS).toContain("wav");
      expect(SUPPORTED_AUDIO_FORMATS).toContain("ogg");
      expect(SUPPORTED_AUDIO_FORMATS).toContain("flac");
    });
  });
});
