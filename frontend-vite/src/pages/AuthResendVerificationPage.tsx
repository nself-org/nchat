/**
 * Purpose:    "/auth/resend-verification" — request a new email-verification message (ported
 *             from legacy app/auth/resend-verification/page.tsx). Calls the resendVerification
 *             auth Action; shows success/error inline. Back-to-login links.
 * Inputs:     authActions.resendVerification.
 * Outputs:    Email form → success/error state.
 * Constraints:Public route. Backend verification Action is backend_pending (N-2-S3a). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/resend-verification
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button, Input } from '@nself/ui'
import { resendVerification } from '@/components/auth/authActions'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError, AuthSuccess } from '@/components/auth/AuthFeedback'

export default function AuthResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setMessage('')
    const result = await resendVerification(email)
    if (result._tag === 'Ok') {
      setStatus('success')
      setMessage('Verification email sent!')
    } else {
      setStatus('error')
      setMessage(result.error.message || 'Failed to send verification email')
    }
    setLoading(false)
  }

  const icon = <Mail className="h-12 w-12 text-indigo-600" aria-hidden="true" />

  if (status === 'success') {
    return (
      <AuthShell
        icon={icon}
        title="Resend Verification Email"
        description="Enter your email address and we'll send you a new verification link"
      >
        <div className="space-y-4">
          <AuthSuccess message={message} icon={<CheckCircle2 className="h-4 w-4 shrink-0" />} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Check your email inbox and spam folder for the verification link.
          </p>
          <Link
            to="/login"
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to Login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon={icon}
      title="Resend Verification Email"
      description="Enter your email address and we'll send you a new verification link"
      footer={
        <Link to="/login" className="text-indigo-600 hover:underline">
          Back to Login
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
          autoComplete="email"
        />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Sending...' : 'Send Verification Email'}
        </Button>
      </form>
    </AuthShell>
  )
}
