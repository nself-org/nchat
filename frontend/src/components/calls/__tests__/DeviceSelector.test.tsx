/**
 * @fileoverview Tests for DeviceSelector components
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DeviceSelector,
  CombinedDeviceSelector,
  AudioLevelIndicator,
  AudioTest,
  DeviceSettings,
  type MediaDevice,
} from "../DeviceSelector";

// =============================================================================
// Test Data
// =============================================================================

const mockAudioInputDevices: MediaDevice[] = [
  { deviceId: "mic-1", label: "Built-in Microphone", kind: "audioinput" },
  { deviceId: "mic-2", label: "External Microphone", kind: "audioinput" },
];

const mockAudioOutputDevices: MediaDevice[] = [
  { deviceId: "speaker-1", label: "Built-in Speakers", kind: "audiooutput" },
  { deviceId: "speaker-2", label: "External Speakers", kind: "audiooutput" },
];

const mockVideoInputDevices: MediaDevice[] = [
  { deviceId: "cam-1", label: "Built-in Camera", kind: "videoinput" },
  { deviceId: "cam-2", label: "External Webcam", kind: "videoinput" },
];

// =============================================================================
// DeviceSelector Tests
// =============================================================================

describe("DeviceSelector", () => {
  it("should render with devices", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should show selected device label", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        selectedDeviceId="mic-1"
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("Built-in Microphone")).toBeInTheDocument();
  });

  it('should show "No device found" when no devices', () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={[]}
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByText(/no microphone found/i)).toBeInTheDocument();
  });

  it("should be disabled when only one device", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={[mockAudioInputDevices[0]]}
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        onDeviceSelect={jest.fn()}
        disabled
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should call onDeviceSelect when device is selected", async () => {
    const onDeviceSelect = jest.fn();
    const user = userEvent.setup();

    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        selectedDeviceId="mic-1"
        onDeviceSelect={onDeviceSelect}
      />,
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("External Microphone"));

    expect(onDeviceSelect).toHaveBeenCalledWith("mic-2");
  });

  it("should render microphone icon for audioinput", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        onDeviceSelect={jest.fn()}
      />,
    );

    // The icon should be rendered (SVG element with specific path)
    expect(screen.getByRole("button").querySelector("svg")).toBeInTheDocument();
  });

  it("should render speaker icon for audiooutput", () => {
    render(
      <DeviceSelector
        type="audiooutput"
        devices={mockAudioOutputDevices}
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole("button").querySelector("svg")).toBeInTheDocument();
  });

  it("should render camera icon for videoinput", () => {
    render(
      <DeviceSelector
        type="videoinput"
        devices={mockVideoInputDevices}
        onDeviceSelect={jest.fn()}
      />,
    );

    expect(screen.getByRole("button").querySelector("svg")).toBeInTheDocument();
  });

  it("should render in compact mode", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        onDeviceSelect={jest.fn()}
        compact
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should hide label when showLabel is false", () => {
    render(
      <DeviceSelector
        type="audioinput"
        devices={mockAudioInputDevices}
        selectedDeviceId="mic-1"
        onDeviceSelect={jest.fn()}
        showLabel={false}
      />,
    );

    expect(screen.queryByText("Built-in Microphone")).not.toBeInTheDocument();
  });
});

// =============================================================================
// CombinedDeviceSelector Tests
// =============================================================================

describe("CombinedDeviceSelector", () => {
  it("should render audio input and output selectors", () => {
    render(
      <CombinedDeviceSelector
        audioInputDevices={mockAudioInputDevices}
        audioOutputDevices={mockAudioOutputDevices}
        onAudioInputSelect={jest.fn()}
        onAudioOutputSelect={jest.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("should render video selector when showVideo is true", () => {
    render(
      <CombinedDeviceSelector
        audioInputDevices={mockAudioInputDevices}
        audioOutputDevices={mockAudioOutputDevices}
        videoInputDevices={mockVideoInputDevices}
        onAudioInputSelect={jest.fn()}
        onAudioOutputSelect={jest.fn()}
        onVideoInputSelect={jest.fn()}
        showVideo
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("should not render video selector when showVideo is false", () => {
    render(
      <CombinedDeviceSelector
        audioInputDevices={mockAudioInputDevices}
        audioOutputDevices={mockAudioOutputDevices}
        videoInputDevices={mockVideoInputDevices}
        onAudioInputSelect={jest.fn()}
        onAudioOutputSelect={jest.fn()}
        onVideoInputSelect={jest.fn()}
        showVideo={false}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("should render in vertical layout", () => {
    const { container } = render(
      <CombinedDeviceSelector
        audioInputDevices={mockAudioInputDevices}
        audioOutputDevices={mockAudioOutputDevices}
        onAudioInputSelect={jest.fn()}
        onAudioOutputSelect={jest.fn()}
        layout="vertical"
      />,
    );

    expect(container.firstChild).toHaveClass("flex-col");
  });

  it("should disable all selectors when disabled", () => {
    render(
      <CombinedDeviceSelector
        audioInputDevices={mockAudioInputDevices}
        audioOutputDevices={mockAudioOutputDevices}
        onAudioInputSelect={jest.fn()}
        onAudioOutputSelect={jest.fn()}
        disabled
      />,
    );

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});

// =============================================================================
// AudioLevelIndicator Tests
// =============================================================================

describe("AudioLevelIndicator", () => {
  it("should render bar variant by default", () => {
    const { container } = render(<AudioLevelIndicator level={0.5} />);
    expect(container.querySelector(".rounded-full")).toBeInTheDocument();
  });

  it("should render dots variant", () => {
    render(<AudioLevelIndicator level={0.5} variant="dots" />);
    // 5 dots should be rendered
    expect(document.querySelectorAll(".rounded-full")).toHaveLength(5);
  });

  it("should render meter variant", () => {
    const { container } = render(
      <AudioLevelIndicator level={0.5} variant="meter" />,
    );
    expect(container.firstChild).toHaveClass("rounded");
  });

  it("should clamp level between 0 and 1", () => {
    const { container } = render(<AudioLevelIndicator level={1.5} />);
    const levelBar = container.querySelector("[style]");
    expect(levelBar).toHaveStyle({ width: "100%" });
  });

  it("should show green for low levels", () => {
    const { container } = render(<AudioLevelIndicator level={0.3} />);
    expect(container.querySelector(".bg-green-500")).toBeInTheDocument();
  });

  it("should show yellow for medium levels", () => {
    const { container } = render(<AudioLevelIndicator level={0.6} />);
    expect(container.querySelector(".bg-yellow-500")).toBeInTheDocument();
  });

  it("should show red for high levels", () => {
    const { container } = render(<AudioLevelIndicator level={0.9} />);
    expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
  });

  it("should apply size classes", () => {
    const { container, rerender } = render(
      <AudioLevelIndicator level={0.5} size="sm" />,
    );
    expect(container.querySelector(".h-1")).toBeInTheDocument();

    rerender(<AudioLevelIndicator level={0.5} size="lg" />);
    expect(container.querySelector(".h-3")).toBeInTheDocument();
  });

  it("should activate correct number of dots based on level", () => {
    render(<AudioLevelIndicator level={0.4} variant="dots" />);
    // 40% of 5 dots = 2 active dots
    expect(document.querySelectorAll(".bg-green-500")).toHaveLength(2);
  });
});

// =============================================================================
// AudioTest Tests
// =============================================================================

describe("AudioTest", () => {
  it("should render microphone section", () => {
    render(<AudioTest audioLevel={0.5} />);
    expect(screen.getByText("Microphone")).toBeInTheDocument();
  });

  it("should show audio level indicator", () => {
    const { container } = render(<AudioTest audioLevel={0.5} />);
    expect(container.querySelector('[style*="width"]')).toBeInTheDocument();
  });

  it('should show "Detecting audio" when level > 0', () => {
    render(<AudioTest audioLevel={0.5} />);
    expect(screen.getByText("Detecting audio")).toBeInTheDocument();
  });

  it('should show "No audio detected" when level is 0', () => {
    render(<AudioTest audioLevel={0} />);
    expect(screen.getByText("No audio detected")).toBeInTheDocument();
  });

  it("should render test microphone button when callback provided", () => {
    render(<AudioTest audioLevel={0.5} onTestMicrophone={jest.fn()} />);
    expect(screen.getByRole("button", { name: /test/i })).toBeInTheDocument();
  });

  it("should call onTestMicrophone when test button clicked", async () => {
    const onTestMicrophone = jest.fn();
    const user = userEvent.setup();

    render(<AudioTest audioLevel={0.5} onTestMicrophone={onTestMicrophone} />);

    await user.click(screen.getByRole("button", { name: /test/i }));

    expect(onTestMicrophone).toHaveBeenCalled();
  });

  it("should disable test button when testing", () => {
    render(
      <AudioTest audioLevel={0.5} onTestMicrophone={jest.fn()} isTesting />,
    );
    expect(screen.getByRole("button", { name: /testing/i })).toBeDisabled();
  });

  it("should render speaker test section when callback provided", () => {
    render(<AudioTest audioLevel={0.5} onTestSpeaker={jest.fn()} />);
    expect(screen.getByText("Speakers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play test sound/i }),
    ).toBeInTheDocument();
  });

  it("should call onTestSpeaker when play button clicked", async () => {
    const onTestSpeaker = jest.fn();
    const user = userEvent.setup();

    render(<AudioTest audioLevel={0.5} onTestSpeaker={onTestSpeaker} />);

    await user.click(screen.getByRole("button", { name: /play test sound/i }));

    expect(onTestSpeaker).toHaveBeenCalled();
  });
});

// =============================================================================
// DeviceSettings Tests
// =============================================================================

describe("DeviceSettings", () => {
  const defaultProps = {
    audioInputDevices: mockAudioInputDevices,
    audioOutputDevices: mockAudioOutputDevices,
    videoInputDevices: mockVideoInputDevices,
    onAudioInputSelect: jest.fn(),
    onAudioOutputSelect: jest.fn(),
    onVideoInputSelect: jest.fn(),
    audioLevel: 0.5,
  };

  it("should render all device sections", () => {
    render(<DeviceSettings {...defaultProps} />);

    expect(screen.getByText("Microphone")).toBeInTheDocument();
    expect(screen.getByText("Speakers")).toBeInTheDocument();
    expect(screen.getByText("Camera")).toBeInTheDocument();
  });

  it("should render audio level indicator", () => {
    const { container } = render(<DeviceSettings {...defaultProps} />);
    expect(container.querySelector('[style*="width"]')).toBeInTheDocument();
  });

  it("should render test speaker button when callback provided", () => {
    render(<DeviceSettings {...defaultProps} onTestSpeaker={jest.fn()} />);
    expect(
      screen.getByRole("button", { name: /play test sound/i }),
    ).toBeInTheDocument();
  });

  it("should call onTestSpeaker when button clicked", async () => {
    const onTestSpeaker = jest.fn();
    const user = userEvent.setup();

    render(<DeviceSettings {...defaultProps} onTestSpeaker={onTestSpeaker} />);

    await user.click(screen.getByRole("button", { name: /play test sound/i }));

    expect(onTestSpeaker).toHaveBeenCalled();
  });

  it("should not render camera section when no video devices", () => {
    render(<DeviceSettings {...defaultProps} videoInputDevices={[]} />);

    expect(screen.queryByText("Camera")).not.toBeInTheDocument();
  });

  it("should show selected devices", () => {
    render(
      <DeviceSettings
        {...defaultProps}
        selectedAudioInput="mic-1"
        selectedAudioOutput="speaker-1"
        selectedVideoInput="cam-1"
      />,
    );

    expect(screen.getByText("Built-in Microphone")).toBeInTheDocument();
    expect(screen.getByText("Built-in Speakers")).toBeInTheDocument();
    expect(screen.getByText("Built-in Camera")).toBeInTheDocument();
  });
});
