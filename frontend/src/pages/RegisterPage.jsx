import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Zap } from 'lucide-react'

const CATEGORIES = ['ride-hailing', 'food-delivery', 'freelancer', 'other']
const ROLES = [
  { value: 'worker',   label: 'Worker',   desc: 'Log earnings, get verified income reports' },
  { value: 'verifier', label: 'Verifier', desc: 'Review and verify earnings screenshots' },
  { value: 'advocate', label: 'Advocate', desc: 'Monitor trends and support workers at scale' },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    role: 'worker', city: '', category: 'ride-hailing',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500 mb-4">
            <Zap size={22} className="text-surface" fill="currentColor" />
          </div>
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="text-ink-muted text-sm mt-1">Join FairGig — it's free</p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="section-label block mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value} type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.role === r.value
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-surface-border text-ink-muted hover:border-surface-hover'
                    }`}
                  >
                    <p className="text-xs font-semibold">{r.label}</p>
                    <p className="text-xs mt-0.5 leading-tight opacity-70">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="section-label block mb-1.5">Full Name</label>
                <input name="full_name" value={form.full_name} onChange={handle}
                  placeholder="Ali Hassan" required />
              </div>
              <div className="col-span-2">
                <label className="section-label block mb-1.5">Email</label>
                <input name="email" type="email" value={form.email} onChange={handle}
                  placeholder="ali@email.com" required />
              </div>
              <div className="col-span-2">
                <label className="section-label block mb-1.5">Password</label>
                <input name="password" type="password" value={form.password} onChange={handle}
                  placeholder="Min 8 characters" required />
              </div>
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
              <p className="text-red text-sm bg-red/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading
                ? <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
                : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
