/**
 * Purpose:    "/auth/verify-magic-link" — complete passwordless sign-in from a token (ported
 *             from legacy app/auth/verify-magic-link/page.tsx). On mount reads ?token and calls
 *             the verifyMagicLink auth Action; success redirects to /chat after a moment; error
 *             offers request-new-link + back-to-login.
 * Inputs:     ?token search param; authActions.verifyMagicLink.
 * Outputs:    Status card (loading/success/error) via StatusCard.
 * Constraints:Public route. Backend verify Action is backend_pending (N-2-S3a). On success the
 *             session cookie is set server-side; we navigate client-side. No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/verify-magic-link
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { verifyMagicLink } from '@/components/auth/authActions'
import { StatusCard, type VerifyStatus } from '@/components/auth/StatusCard'

export default function AuthVerifyMagicLinkPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<VerifyStatus>('loading')
  const [message, setMessage] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token.')
      return
    }

    void verifyMagicLink(token).then((result) => {
      if (result._tag === 'Ok') {
        setStatus('success')
        setMessage('Magic link verified! Redirecting to your account...')
      } else {
        setStatus('error')
        setMessage(
          result.error.message ||
            'This magic link is invalid or has expired. Please request a new one.',
        )
      }
    })
  }, [token])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate('/chat', { replace: true }), 1200)
    return () => clearTimeout(timer)
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <StatusCard
        status="loading"
        title="Verifying Magic Link"
        description="Please wait while we verify your magic link..."
      />
    )
  }

  if (status === 'success') {
    return <StatusCard status="success" title="Verification Successful!" description={message} />
  }

  return (
    <StatusCard
      status="error"
      title="Verification Failed"
      description={message}
      actions={
        <>
          <Link
            to="/auth/magic-link"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Mail className="h-4 w-4" /> Request New Magic Link
          </Link>
          <Link
            to="/login"
            className="block w-full rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to Login
          </Link>
        </>
      }
    />
  )
}
