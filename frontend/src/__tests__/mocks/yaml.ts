/**
 * Mock for yaml package (ESM module)
 * Jest cannot transform ESM modules by default, so we provide a CommonJS mock
 */

import yaml from "js-yaml";

export default {
  parse: (content: string) => yaml.load(content),
  stringify: (obj: any) => yaml.dump(obj),
};
