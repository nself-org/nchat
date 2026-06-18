/**
 * Purpose:    "/auth/callback-complete" — finish an OAuth round-trip (ported from legacy
 *             app/auth/callback-complete/page.tsx). Reads the tokens returned on the OAuth
 *             redirect and exchanges the refresh token for a cookie session via the completeOAuth
 *             auth Action (the Vite web strategy is cookie-based — tokens are never persisted in
 *             JS storage, unlike the legacy sessionStorage approach). On success redirects to /chat.
 * Inputs:     ?accessToken/?refreshToken/?expiresIn search params; authActions.completeOAuth.
 * Outputs:    Status card (loading/success/error) via StatusCard.
 * Constraints:Public route. Backend token exchange is backend_pending (N-2-S5 BFF). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/callback-complete
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { completeOAuth } from '@/components/auth/authActions'
import { StatusCard, type VerifyStatus } from '@/components/auth/StatusCard'

export default function AuthCallbackCompletePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [status, setStatus] = useState<VerifyStatus>('loading')
  const [message, setMessage] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const refreshToken = params.get('refreshToken')
    const accessToken = params.get('accessToken')
    if (!refreshToken || !accessToken) {
      setStatus('error')
      setMessage('Missing authentication tokens. Please try again.')
      return
    }

    void completeOAuth(refreshToken).then((result) => {
      if (result._tag === 'Ok') {
        setStatus('success')
        setMessage('Authentication successful! Redirecting...')
      } else {
        setStatus('error')
        setMessage(result.error.message || 'Failed to complete authentication. Please try again.')
      }
    })
  }, [params])

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate('/chat', { replace: true }), 1000)
    return () => clearTimeout(timer)
  }, [status, navigate])

  if (status === 'loading') {
    return (
      <StatusCard
        status="loading"
        title="Completing Sign In"
        description="Please wait while we complete your authentication..."
      />
    )
  }

  if (status === 'success') {
    return <StatusCard status="success" title="Success!" description={message} />
  }

  return (
    <StatusCard
      status="error"
      title="Authentication Failed"
      description={message}
      actions={
        <Link
          to="/login"
          className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to Login
        </Link>
      }
    />
  )
}
