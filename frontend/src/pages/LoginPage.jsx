import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow]     = useState(false)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (user.role === 'verifier') navigate('/verify')
      else if (user.role === 'advocate') navigate('/advocate')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Background orbs */}
      <div className="orb w-96 h-96" style={{ background: '#22c55e', opacity: 0.05, top: '-5%', left: '10%', animationDelay: '0s' }} />
      <div className="orb w-72 h-72" style={{ background: '#8b5cf6', opacity: 0.05, bottom: '10%', right: '5%', animationDelay: '3s' }} />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8 fade-up">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--ink)' }}>FairGig</span>
          </Link>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--ink-muted)' }}>Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card fade-up-1" style={{ padding: '1.75rem' }}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="section-label block mb-1.5">Email address</label>
              <input name="email" type="email" value={form.email} onChange={handle}
                placeholder="you@email.com" required autoComplete="email" />
            </div>

            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={show ? 'text' : 'password'}
                  value={form.password} onChange={handle}
                  placeholder="••••••••" required autoComplete="current-password" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--ink-faint)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-muted)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="scale-in flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5 fade-up-2" style={{ color: 'var(--ink-muted)' }}>
          No account?{' '}
          <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}