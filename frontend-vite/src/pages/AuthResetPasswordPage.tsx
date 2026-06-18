/**
 * Purpose:    "/auth/reset-password" — set a new password from an emailed token (ported from
 *             legacy app/auth/reset-password/page.tsx). Reads ?token; validates match + length;
 *             calls the resetPassword auth Action; on success redirects to /login after 2s.
 *             Missing token shows the invalid-link state with a "request new link" CTA.
 * Inputs:     ?token search param; authActions.resetPassword.
 * Outputs:    Password form / invalid-link / success states.
 * Constraints:Public route. Backend reset Action is backend_pending (N-2-S3a). No next/*.
 * SOT:        F-NCHAT-VITE-ROUTE — /auth/reset-password
 */
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@nself/ui'
import { resetPassword } from '@/components/auth/authActions'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthError, AuthSuccess } from '@/components/auth/AuthFeedback'

export default function AuthResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status !== 'success') return
    const timer = setTimeout(() => navigate('/login?reset=success'), 2000)
    return () => clearTimeout(timer)
  }, [status, navigate])

  if (!token) {
    return (
      <AuthShell
        icon={<AlertCircle className="h-12 w-12 text-red-600" aria-hidden="true" />}
        title="Invalid Reset Link"
        description="This password reset link is invalid or has expired"
      >
        <Link
          to="/auth/forgot-password"
          className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
        >
          Request New Link
        </Link>
      </AuthShell>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('idle')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const result = await resetPassword(token, newPassword)
    if (result._tag === 'Ok') {
      setStatus('success')
      setMessage('Password reset successfully!')
    } else {
      setStatus('error')
      setMessage(result.error.message || 'Failed to reset password')
    }
    setLoading(false)
  }

  const icon = <Lock className="h-12 w-12 text-indigo-600" aria-hidden="true" />

  if (status === 'success') {
    return (
      <AuthShell icon={icon} title="Reset Your Password" description="Enter your new password below">
        <div className="space-y-4">
          <AuthSuccess message={message} icon={<CheckCircle2 className="h-4 w-4 shrink-0" />} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Redirecting you to the login page...
          </p>
          <Link
            to="/login"
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
          >
            Continue to Login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      icon={icon}
      title="Reset Your Password"
      description="Enter your new password below"
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
        <div className="relative">
          <Input
            label="New Password"
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
            hint="Must be at least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={loading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute end-2 top-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Input
          label="Confirm Password"
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          minLength={8}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </form>
    </AuthShell>
  )
}
