/**
 * Type declarations for lottie-web package
 * Minimal stub to avoid TypeScript errors for dynamic imports
 */
declare module "lottie-web" {
  export interface AnimationItem {
    play(): void;
    stop(): void;
    pause(): void;
    setSpeed(speed: number): void;
    goToAndStop(value: number, isFrame?: boolean): void;
    goToAndPlay(value: number, isFrame?: boolean): void;
    setDirection(direction: 1 | -1): void;
    playSegments(
      segments: [number, number] | [number, number][],
      forceFlag?: boolean,
    ): void;
    setSubframe(useSubFrames: boolean): void;
    destroy(): void;
    getDuration(inFrames?: boolean): number;
    addEventListener(name: string, callback: () => void): void;
    removeEventListener(name: string, callback?: () => void): void;
  }

  export interface AnimationConfig {
    container: Element;
    renderer?: "svg" | "canvas" | "html";
    loop?: boolean | number;
    autoplay?: boolean;
    name?: string;
    animationData?: unknown;
    path?: string;
    rendererSettings?: {
      preserveAspectRatio?: string;
      progressiveLoad?: boolean;
      hideOnTransparent?: boolean;
      className?: string;
    };
  }

  export interface LottiePlayer {
    loadAnimation(params: AnimationConfig): AnimationItem;
    destroy(name?: string): void;
    registerAnimation(element: Element, animationData?: unknown): void;
    setSpeed(speed: number, name?: string): void;
    setDirection(direction: 1 | -1, name?: string): void;
    play(name?: string): void;
    pause(name?: string): void;
    stop(name?: string): void;
    goToAndStop(value: number, isFrame?: boolean, name?: string): void;
    goToAndPlay(value: number, isFrame?: boolean, name?: string): void;
  }

  const lottie: LottiePlayer;
  export default lottie;
}
