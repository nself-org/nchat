import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Stub avatar component — stub only until S05 port.
 * Full implementation with size variants and fallback initials lands in S05.
 */
export const Avatar = ({ src, alt, size = 32 }) => (_jsx("img", { src: src, alt: alt ?? '', width: size, height: size }));
