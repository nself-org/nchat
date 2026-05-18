/**
 * Type declarations for css-tree package
 * css-tree v3 does not ship its own .d.ts files
 */
declare module "css-tree" {
  export interface CssNode {
    type: string;
    [key: string]: unknown;
  }

  export interface ParseOptions {
    parseValue?: boolean;
    onParseError?: (err: Error) => void;
  }

  export function parse(css: string, options?: ParseOptions): CssNode;
  export function walk(ast: CssNode, visitor: (node: CssNode) => void): void;
  export function generate(ast: CssNode): string;
  export function clone(ast: CssNode): CssNode;
}
