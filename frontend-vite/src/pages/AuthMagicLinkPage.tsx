/**
 * Purpose:    "/auth/magic-link" — request a passwordless sign-in link (ported from legacy
 *             app/auth/magic-link/page.tsx). On submit calls the sendMagicLink auth Action;
 *             success state offers "send another" + back-to-login; errors shown inline.
 * Inputs:     authActions.sendMagicLink.
 * Outputs:    Email form → success/error state.
 * Constraints:Public route. Backend magic-link Action is backend_pending (N-2-S3a). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/magic-link
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Input } from '@nself/ui'
import { sendMagicLink } from '@/components/auth/authActions'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError, AuthSuccess } from '@/components/auth/AuthFeedback'

export default function AuthMagicLinkPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setMessage('')
    const result = await sendMagicLink(email)
    if (result._tag === 'Ok') {
      setStatus('success')
      setMessage('Magic link sent! Check your email to sign in.')
    } else {
      setStatus('error')
      setMessage(result.error.message || 'Failed to send magic link. Please try again.')
    }
    setLoading(false)
  }

  const icon = <Mail className="h-12 w-12 text-indigo-600" aria-hidden="true" />

  if (status === 'success') {
    return (
      <AuthShell
        icon={icon}
        title="Sign In with Magic Link"
        description="Enter your email address and we'll send you a magic link to sign in"
      >
        <div className="space-y-4">
          <AuthSuccess message={message} icon={<CheckCircle2 className="h-4 w-4 shrink-0" />} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Check your email for a magic link. Click the link to sign in instantly. The link
            expires in 15 minutes.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setStatus('idle')
                setEmail('')
              }}
            >
              Send Another
            </Button>
            <Link
              to="/login"
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon={icon}
      title="Sign In with Magic Link"
      description="Enter your email address and we'll send you a magic link to sign in"
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {status === 'error' && (
          <AuthError message={message} icon={<AlertCircle className="h-4 w-4 shrink-0" />} />
        )}
        <Input
          label="Email Address"
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          hint="We'll send a magic link to this email address"
          autoComplete="email"
        />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Sending Magic Link...' : 'Send Magic Link'}
        </Button>
      </form>
    </AuthShell>
  )
}
