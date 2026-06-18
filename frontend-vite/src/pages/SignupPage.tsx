/**
 * Purpose:    "/signup" — account creation (ported from legacy app/signup/page.tsx).
 *             Email, username, optional display name, password + confirm. Client validation
 *             (passwords match, password length, username pattern) preserved. Calls the
 *             signUp auth Action via @/components/auth/authActions; on success routes to
 *             /onboarding. ?redirect is preserved through the flow.
 * Inputs:     authActions.signUp; useAuth (@nself/auth-core).
 * Outputs:    Sign-up card; navigates to /onboarding on success.
 * Constraints:Public route. Backend signup Action is backend_pending (N-2-S3a) — failures
 *             surface as a typed AppError message. No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /signup
 */
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Input } from '@nself/ui'
import { useAuth } from '@nself/auth-core'
import { signUp } from '@/components/auth/authActions'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError } from '@/components/auth/AuthFeedback'

export default function SignupPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirectTo = params.get('redirect')

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (auth.status === 'authenticated') {
    return <Navigate to={redirectTo || '/chat'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens')
      return
    }

    setLoading(true)
    const result = await signUp({
      email,
      password,
      username,
      displayName: displayName || username,
    })
    if (result._tag === 'Ok') {
      navigate(redirectTo ? `/onboarding?redirect=${encodeURIComponent(redirectTo)}` : '/onboarding')
    } else {
      setError(result.error.message || 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create an account"
      description="Enter your details to create your ɳChat account"
      footer={
        <span className="text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 underline-offset-4 hover:underline">
            Sign in
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
          label="Username"
          id="username"
          type="text"
          placeholder="johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          autoComplete="username"
          pattern="[a-zA-Z0-9_-]+"
        />
        <Input
          label="Display name (optional)"
          id="displayName"
          type="text"
          placeholder="John Doe"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
          autoComplete="name"
        />
        <Input
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          minLength={8}
          hint="Must be at least 8 characters"
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
    </AuthShell>
  )
}
