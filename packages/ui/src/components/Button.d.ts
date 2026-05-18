import React from 'react';
/** Props for the Button component. */
interface ButtonProps {
    /** Content to render inside the button. */
    children?: React.ReactNode;
    /** Click handler. */
    onClick?: () => void;
    /** Visual style variant. */
    variant?: 'primary' | 'secondary';
    /** Additional CSS class names. */
    className?: string;
}
/**
 * Stub button component — stub only until S05 port.
 * Full implementation with CVA variants lands in S05.
 */
export declare const Button: React.FC<ButtonProps>;
export {};
//# sourceMappingURL=Button.d.ts.map