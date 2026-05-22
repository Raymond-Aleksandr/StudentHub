import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Eye,
  EyeOff,
  FileUp,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { auth, createUserWithEmailAndPassword, signInAsDemoUser, signInWithEmailAndPassword } from '../localAuth'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in both fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password)
      else await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const nextError = err as { message?: string }
      setError(nextError.message || 'Could not sign in on this browser.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemo = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signInAsDemoUser(auth)
      navigate('/dashboard')
    } catch (err: unknown) {
      const nextError = err as { message?: string }
      setError(nextError.message || 'Could not start the demo profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setIsSignUp((current) => !current)
    setError('')
  }

  return (
    <main className="login-page">
      <button className="login-back" onClick={() => navigate('/')} aria-label="Back to home">
        <ArrowLeft size={18} />
        Home
      </button>

      <section className="login-panel" aria-label="StudentHub sign in">
        <div className="login-card">
          <div className="login-brand">
            <span>SH</span>
            <strong>StudentHub</strong>
          </div>
          <div className="login-copy">
            <span className="login-eyebrow">Private browser profile</span>
            <h1>{isSignUp ? 'Create your planner.' : 'Open your planner.'}</h1>
            <p>
              Use a local account for this browser, or jump into the demo profile to test syllabus imports and task planning.
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="login-error">{error}</div>}

            <label className="login-field">
              <span>Email</span>
              <div>
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                />
              </div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div>
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isLoading}
                />
                <button type="button" className="login-eye" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button className="login-primary" type="submit" disabled={isLoading}>
              {isLoading ? 'Working...' : isSignUp ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-divider"><span>or</span></div>

          <button className="login-demo" onClick={handleDemo} disabled={isLoading}>
            <CalendarCheck size={18} />
            Demo profile
          </button>

          <p className="login-switch">
            {isSignUp ? 'Already have a local account?' : 'Need a local account?'}
            <button type="button" onClick={switchMode}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>

        <aside className="login-preview" aria-label="Planner preview">
          <div className="login-preview-phone">
            <div className="login-preview-top">
              <span>Import</span>
              <FileUp size={18} />
            </div>
            <div className="login-preview-drop">
              <FileUp size={24} />
              <strong>Syllabus parsed</strong>
              <small>8 dates added</small>
            </div>
            <div className="login-preview-item">
              <span>BIO210</span>
              <strong>Assignment</strong>
              <small>Tomorrow</small>
            </div>
            <div className="login-preview-item">
              <span>HIST330</span>
              <strong>Team formation</strong>
              <small>Next week</small>
            </div>
            <div className="login-preview-safe">
              <ShieldCheck size={17} />
              <span>No frontend secrets</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default Login
