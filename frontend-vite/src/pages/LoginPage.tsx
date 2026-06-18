/**
 * Purpose:    "/login" — primary sign-in screen (ported from legacy app/login/page.tsx).
 *             Email + password form; on success navigates to the post-login destination
 *             (?redirect or /chat). Uses @nself/auth-core useAuthStrategy().login (cookie
 *             web strategy) — replaces the legacy auth-context signIn. Already-authenticated
 *             visitors are bounced to their destination.
 * Inputs:     useAuth/useAuthStrategy (@nself/auth-core); ?redirect search param.
 * Outputs:    Sign-in card; redirect on success.
 * Constraints:Public route. No next/*; react-router only. Dev-user quick login is omitted —
 *             FauxAuthService is not part of the Vite/@nself/auth-core surface (noted in
 *             features_preserved/backend_pending).
 * SOT:        F-NCHAT-VITE-ROUTE — /login
 */
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input } from '@nself/ui'
import { useAuth, useAuthStrategy } from '@nself/auth-core'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError } from '@/components/auth/AuthFeedback'

export default function LoginPage() {
  const auth = useAuth()
  const strategy = useAuthStrategy()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect') || '/chat'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (auth.status === 'authenticated') {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const next = await strategy.login(email, password)
      if (next.status === 'authenticated') {
        navigate(redirectTo, { replace: true })
      } else if (next.status === 'error') {
        setError(next.error.message || 'Failed to sign in')
      } else {
        setError('Invalid email or password')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign in to ɳChat"
      description="Enter your email and password to access your workspace"
      footer={
        <span className="text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-indigo-600 underline-offset-4 hover:underline">
            Sign up
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <Input
          label="Email"
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          autoComplete="email"
        />
        <Input
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="current-password"
        />
        <div className="text-right text-sm">
          <Link to="/auth/forgot-password" className="text-indigo-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
