/**
 * Purpose:    "/dev" — developer-docs home. Faithful port of the legacy app/dev/page.tsx hero +
 *             stats + quick links + features + component categories + getting-started, wrapped in
 *             the DevShell (legacy app/dev/layout.tsx).
 * Inputs:     none — static landing content.
 * Outputs:    Dev documentation landing page inside the DevShell.
 * Constraints:Client-only, presentational. next/link -> react-router <Link>. Slate theme.
 *             Logical Tailwind props for RTL readiness (canonical §10).
 * SOT:        F-NCHAT-VITE-ROUTE — /dev
 */
import { Link } from 'react-router-dom'
import {
  Layers,
  MessageSquare,
  Hash,
  User,
  Palette,
  Flag,
  ArrowRight,
  Sparkles,
  Code2,
  Zap,
  Shield,
  Paintbrush,
  type LucideIcon,
} from 'lucide-react'
import { DevShell } from '@/components/devtools/DevShell'

interface QuickLink {
  title: string
  description: string
  href: string
  icon: LucideIcon
  color: string
  bg: string
  badge?: string
}

const QUICK_LINKS: ReadonlyArray<QuickLink> = [
  { title: 'Component Library', description: 'Browse all UI components with interactive examples', href: '/dev/components', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { title: 'Message Components', description: 'MessageList, MessageItem, MessageInput, and more', href: '/dev/components/messages', icon: MessageSquare, color: 'text-green-400', bg: 'bg-green-500/10' },
  { title: 'Channel Components', description: 'ChannelList, ChannelHeader, and channel management', href: '/dev/components/channels', icon: Hash, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { title: 'User Components', description: 'Avatars, profile cards, and presence indicators', href: '/dev/components/users', icon: User, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { title: 'Templates', description: '5 landing page templates for different use cases', href: '/dev/templates', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/10', badge: '5 templates' },
  { title: 'Feature Flags', description: 'Configure and toggle application features', href: '/dev/features', icon: Flag, color: 'text-amber-400', bg: 'bg-amber-500/10' },
]

const FEATURES: ReadonlyArray<{ title: string; description: string; icon: LucideIcon }> = [
  { title: 'Fully Typed', description: 'Complete TypeScript support with comprehensive prop definitions', icon: Code2 },
  { title: 'Performance First', description: 'Virtualized lists, memoization, and optimized rendering', icon: Zap },
  { title: 'Accessible', description: 'ARIA labels, keyboard navigation, and screen reader support', icon: Shield },
  { title: 'Themeable', description: '25+ theme presets with full customization options', icon: Paintbrush },
]

const STATS = [
  { value: '50+', label: 'Components' },
  { value: '25+', label: 'Theme Presets' },
  { value: '5', label: 'Landing Templates' },
  { value: '100%', label: 'TypeScript' },
]

const CATEGORIES = [
  { name: 'Chat', count: 17, items: ['MessageList', 'MessageItem', 'MessageInput', 'TypingIndicator', 'MessageReactions'] },
  { name: 'Channel', count: 8, items: ['ChannelList', 'ChannelHeader', 'ChannelItem', 'ChannelCategory'] },
  { name: 'User', count: 6, items: ['UserAvatar', 'UserProfileCard', 'UserPresenceDot', 'RoleBadge'] },
  { name: 'UI', count: 20, items: ['Button', 'Input', 'Dialog', 'Dropdown', 'Tabs', 'Card'] },
]

export default function DevPage() {
  return (
    <DevShell>
      <div className="space-y-12">
        <section className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">Developer Documentation</span>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">ɳChat Component Library</h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-400">
            Build beautiful, real-time team communication apps with our component library.
            White-label ready with full customization.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/dev/components" className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700">
              Browse Components
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/dev/templates" className="rounded-md border border-slate-700 px-5 py-2.5 font-medium text-slate-200 hover:bg-slate-800">
              View Templates
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900/40 pt-6 pb-6 text-center">
              <div className="text-3xl font-bold text-sky-400">{s.value}</div>
              <div className="text-sm text-slate-400">{s.label}</div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold">Quick Links</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} to={link.href} className="group rounded-lg border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-sky-500/50">
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${link.bg}`}>
                      <Icon className={`h-5 w-5 ${link.color}`} />
                    </div>
                    {link.badge && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{link.badge}</span>
                    )}
                  </div>
                  <h3 className="flex items-center gap-2 font-semibold text-slate-100 group-hover:text-sky-300">
                    {link.title}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">{link.description}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold">Key Features</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
                    <Icon className="h-5 w-5 text-sky-400" />
                  </div>
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-sm text-slate-400">{f.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold">Component Categories</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{c.name}</h3>
                  <span className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                    {c.count} components
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.items.map((item) => (
                    <code key={item} className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">
                      {item}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-lg font-semibold">Getting Started</h2>
            <p className="mt-1 text-sm text-slate-400">
              Quick start guide for using ɳChat components in your project
            </p>
            <div className="mt-4 rounded-lg bg-slate-950 p-4 font-mono text-sm text-slate-100">
              <div className="text-slate-500"># Install dependencies</div>
              <div>pnpm install</div>
              <div className="mt-4 text-slate-500"># Start development server</div>
              <div>pnpm dev</div>
              <div className="mt-4 text-slate-500"># Start backend (first time)</div>
              <div>cd .backend &amp;&amp; nself init &amp;&amp; nself build &amp;&amp; nself start</div>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Components live in <code className="rounded bg-slate-800 px-1">src/components/</code>. Each
              component is self-contained with its own types, styles, and tests.
            </p>
          </div>
        </section>
      </div>
    </DevShell>
  )
}
