/**
 * Purpose:    "/auth/signin" — sign-in screen (ported from legacy app/auth/signin/page.tsx).
 *             Email + password; on success routes to ?redirect or /chat (legacy pushed /chat).
 *             Uses @nself/auth-core useAuthStrategy().login (cookie web strategy).
 * Inputs:     useAuth/useAuthStrategy (@nself/auth-core); ?redirect search param.
 * Outputs:    Sign-in card; redirect on success.
 * Constraints:Public route. RequireAuth redirects unauthenticated users here. No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/signin
 */
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input } from '@nself/ui'
import { useAuth, useAuthStrategy } from '@nself/auth-core'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError } from '@/components/auth/AuthFeedback'

export default function AuthSigninPage() {
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
      } else {
        setError(next.status === 'error' ? next.error.message : 'Invalid email or password')
      }
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign In"
      description="Enter your credentials to access your account"
      footer={
        <span className="text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/auth/signup" className="font-medium text-indigo-600 hover:underline">
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
        <div className="flex items-center justify-between text-sm">
          <Link to="/auth/magic-link" className="text-indigo-600 hover:underline">
            Use magic link
          </Link>
          <Link to="/auth/forgot-password" className="text-indigo-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  )
}
