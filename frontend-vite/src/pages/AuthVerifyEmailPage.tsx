/**
 * Purpose:    "/auth/verify-email" — confirm an email address from a token (ported from legacy
 *             app/auth/verify-email/page.tsx). On mount reads ?token and calls the verifyEmail
 *             auth Action; success (incl. already-verified) auto-redirects to /login after 3s;
 *             error offers request-new-link + back-to-login.
 * Inputs:     ?token search param; authActions.verifyEmail.
 * Outputs:    Status card (loading/success/error) via StatusCard.
 * Constraints:Public route. Backend verify Action is backend_pending (N-2-S3a). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/verify-email
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { verifyEmail } from '@/components/auth/authActions'
import { StatusCard, type VerifyStatus } from '@/components/auth/StatusCard'

export default function AuthVerifyEmailPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<VerifyStatus>('loading')
  const [message, setMessage] = useState('')
  const [alreadyVerified, setAlreadyVerified] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    void verifyEmail(token).then((result) => {
      if (result._tag === 'Ok') {
        setStatus('success')
        setAlreadyVerified(result.value.alreadyVerified ?? false)
        setMessage(
          result.value.alreadyVerified
            ? 'Your email has already been verified'
            : 'Your email has been successfully verified',
        )
      } else {
        setStatus('error')
        setMessage(result.error.message || 'Failed to verify email')
      }
    })
  }, [token])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate('/login?verified=true'), 3000)
    return () => clearTimeout(timer)
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <StatusCard
        status="loading"
        title="Verifying Email..."
        description="Please wait while we verify your email address"
      />
    )
  }

  if (status === 'success') {
    return (
      <StatusCard
        status="success"
        title={alreadyVerified ? 'Already Verified' : 'Email Verified!'}
        description={`${message}. Redirecting you to the login page...`}
        actions={
          <Link
            to="/login"
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Continue to Login
          </Link>
        }
      />
    )
  }

  return (
    <StatusCard
      status="error"
      title="Verification Failed"
      description={message || 'We could not verify your email address'}
      actions={
        <>
          <Link
            to="/auth/resend-verification"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Mail className="h-4 w-4" /> Request New Link
          </Link>
          <Link to="/login" className="block py-1 text-center text-sm text-indigo-600 hover:underline">
            Back to Login
          </Link>
        </>
      }
    />
  )
}
