import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { auth, createUserWithEmailAndPassword, signInAsBlankUser, signInWithEmailAndPassword } from '../localAuth'
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

  const handleBlankProfile = async () => {
    setError('')
    setIsLoading(true)
    try {
      await signInAsBlankUser(auth)
      navigate('/dashboard')
    } catch (err: unknown) {
      const nextError = err as { message?: string }
      setError(nextError.message || 'Could not start the blank profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const setMode = (signUp: boolean) => {
    setIsSignUp(signUp)
    setError('')
  }

  return (
    <main className="signin-page">
      <header className="signin-top">
        <button className="signin-brand" onClick={() => navigate('/')}>
          <span>SH</span>
          StudentHub
        </button>
        <button className="signin-back" onClick={() => navigate('/')}>
          <ArrowLeft size={14} />
          Home
        </button>
      </header>

      <div className="signin-layout">
        <section className="signin-form-side">
          <div className="signin-form-card">
            <span className="eyebrow">Private browser profile</span>
            <h1>
              {isSignUp ? 'Create your ' : 'Open your '}
              <em>planner.</em>
            </h1>
            <p className="signin-lede">
              A local account for this browser, or jump into a blank local profile to test syllabus
              parsing and term planning without starter data.
            </p>

            <div className="signin-tabs" role="tablist" aria-label="Sign in mode">
              <button
                className={!isSignUp ? 'active' : ''}
                onClick={() => setMode(false)}
                role="tab"
                aria-selected={!isSignUp}
                type="button"
              >
                Sign in
              </button>
              <button
                className={isSignUp ? 'active' : ''}
                onClick={() => setMode(true)}
                role="tab"
                aria-selected={isSignUp}
                type="button"
              >
                Create
              </button>
            </div>

            <form className="signin-form" onSubmit={handleSubmit}>
              {error && <div className="signin-error">{error}</div>}

              <label className="signin-field-group">
                <span className="signin-label">Email</span>
                <span className="field">
                  <Mail className="ico" size={16} />
                  <input
                    type="email"
                    placeholder="you@school.edu"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isLoading}
                  />
                </span>
              </label>

              <label className="signin-field-group">
                <span className="signin-label">Password</span>
                <span className="field">
                  <Lock className="ico" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    className="signin-reveal"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>

              <div className="signin-row-actions">
                <button className="btn btn-accent signin-btn-full" type="submit" disabled={isLoading}>
                  {isLoading ? 'Working...' : isSignUp ? 'Create account' : 'Sign in'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>

            <div className="signin-divider">or</div>

            <div className="signin-blank">
              <div>
                <b>Blank profile</b>
                <span>No starter courses · ready for your syllabi</span>
              </div>
              <button className="btn btn-soft" onClick={handleBlankProfile} disabled={isLoading}>
                Open <ArrowRight size={14} />
              </button>
            </div>

            <p className="signin-foot-note">
              {isSignUp ? 'Already have a local account?' : 'Need a local account?'}
              <button type="button" onClick={() => setMode(!isSignUp)}>
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        </section>

        <aside className="signin-aside">
          <div>
            <span className="eyebrow">Why an account at all?</span>
            <p className="signin-quote">
              "Sync your courses to whatever device is in your hand at 2am the night before."
            </p>
          </div>
          <div className="signin-aside-foot">
            <div className="signin-who">
              <div className="signin-avatar">SH</div>
              <div>
                <div className="signin-who-title">Optional, always</div>
                <div className="signin-terms">Bring-your-own Firebase · zero lock-in</div>
              </div>
            </div>
            <div className="signin-mini" aria-hidden="true">
              <div>MO</div><div>TU</div><div>WE</div>
              <div>TH</div><div className="dot">●</div><div>SA</div>
              <div>SU</div><div>MO</div><div>TU</div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default Login
