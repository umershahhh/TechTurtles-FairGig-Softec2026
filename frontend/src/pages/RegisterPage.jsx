import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap, ArrowRight, Eye, EyeOff } from 'lucide-react'

const CATEGORIES = ['ride-hailing', 'food-delivery', 'freelancer', 'other']
const ROLES = [
  { value: 'worker',   label: 'Worker',   desc: 'Log earnings & get verified reports' },
  { value: 'verifier', label: 'Verifier', desc: 'Review & verify earnings screenshots' },
  { value: 'advocate', label: 'Advocate', desc: 'Monitor trends & support workers' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'worker', city: '', category: 'ride-hailing' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(''); setLoading(true)
    try {
      const user = await register(form)
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>
      <div className="orb w-96 h-96" style={{ background: '#22c55e', opacity: 0.05, top: '-10%', right: '10%' }} />
      <div className="orb w-72 h-72" style={{ background: '#8b5cf6', opacity: 0.04, bottom: '5%', left: '5%', animationDelay: '3s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 fade-up">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-xl" style={{ color: 'var(--ink)' }}>FairGig</span>
          </Link>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Create your account
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--ink-muted)' }}>Join FairGig — it's free</p>
        </div>

        <div className="card fade-up-1" style={{ padding: '1.75rem' }}>
          <form onSubmit={submit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="section-label block mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.value} type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    className="p-2.5 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: form.role === r.value ? '#22c55e' : 'var(--border)',
                      background: form.role === r.value ? 'rgba(34,197,94,0.08)' : 'transparent',
                      color: form.role === r.value ? '#4ade80' : 'var(--ink-muted)',
                    }}>
                    <p className="text-xs font-semibold">{r.label}</p>
                    <p className="text-xs mt-0.5 leading-tight opacity-70">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-label block mb-1.5">Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handle} placeholder="Ali Hassan" required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Email</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="ali@email.com" required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handle} placeholder="Min 8 characters" required />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--ink-faint)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1.5">City</label>
                <input name="city" value={form.city} onChange={handle} placeholder="Lahore" />
              </div>
              {form.role === 'worker' && (
                <div>
                  <label className="section-label block mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {error && (
              <div className="scale-in flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>Create Account <ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4 fade-up-2" style={{ color: 'var(--ink-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}