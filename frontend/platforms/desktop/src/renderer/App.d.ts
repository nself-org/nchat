/**
 * Main Desktop App Component for nself-chat
 *
 * Integrates shared packages (@nself-chat/core, api, state, ui)
 * with desktop-specific features and electron integration
 */
/**
 * Main App Component
 *
 * Sets up:
 * - Electron desktop integration (from window.desktop API)
 * - State management (from @nself-chat/state)
 * - Desktop platform adapters
 * - Window controls and native menus
 *
 * @example
 * ```typescript
 * import { App } from './App'
 * import { createRoot } from 'react-dom/client'
 *
 * createRoot(document.getElementById('root')!).render(<App />)
 * ```
 */
export declare function App(): import("react/jsx-runtime").JSX.Element;
export default App;
//# sourceMappingURL=App.d.ts.map