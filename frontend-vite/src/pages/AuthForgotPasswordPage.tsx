/**
 * Purpose:    "/auth/forgot-password" — request a password-reset email (ported from legacy
 *             app/auth/forgot-password/page.tsx). On submit calls the requestPasswordReset
 *             auth Action; shows the success confirmation (deliberately neutral wording so
 *             account existence is not leaked) or an inline error. Back-to-login links.
 * Inputs:     authActions.requestPasswordReset.
 * Outputs:    Email form → success/error state.
 * Constraints:Public route. Backend reset Action is backend_pending (N-2-S3a). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/forgot-password
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Input } from '@nself/ui'
import { requestPasswordReset } from '@/components/auth/authActions'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError, AuthSuccess } from '@/components/auth/AuthFeedback'

export default function AuthForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setMessage('')
    const result = await requestPasswordReset(email)
    if (result._tag === 'Ok') {
      setStatus('success')
      setMessage(
        'If an account with this email exists, you will receive a password reset link shortly.',
      )
    } else {
      setStatus('error')
      setMessage(result.error.message || 'Failed to send password reset email. Please try again.')
    }
    setLoading(false)
  }

  const icon = <Mail className="h-12 w-12 text-indigo-600" aria-hidden="true" />

  if (status === 'success') {
    return (
      <AuthShell
        icon={icon}
        title="Forgot Password"
        description="Enter your email address and we'll send you a link to reset your password"
      >
        <div className="space-y-4">
          <AuthSuccess message={message} icon={<CheckCircle2 className="h-4 w-4 shrink-0" />} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Check your email for a password reset link. It may take a few minutes to arrive.
          </p>
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon={icon}
      title="Forgot Password"
      description="Enter your email address and we'll send you a link to reset your password"
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
          hint="We'll send a password reset link to this email"
          autoComplete="email"
        />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthShell>
  )
}
