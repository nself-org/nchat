import type { AppConfig } from './app-config.js'

export function hasVideoCall(config: AppConfig): boolean {
  return config.enableVideoCall === true
}

export function hasAI(config: AppConfig): boolean {
  return config.enableAI === true
}
