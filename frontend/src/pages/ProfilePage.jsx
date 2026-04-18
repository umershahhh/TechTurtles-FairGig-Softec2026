import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi, earningsApi } from '../lib/api'
import { User, Save, FileDown } from 'lucide-react'

export default function ProfilePage() {
  const { user, reloadUser } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    city: user?.city || '',
    category: user?.category || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      await authApi.updateProfile(form)
      await reloadUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const generateReport = async () => {
    try {
      const summary = await earningsApi.getSummary()
      const s = summary.summary
      const lines = [
        '═══════════════════════════════════════',
        '         FAIRGIG INCOME REPORT         ',
        '═══════════════════════════════════════',
        `Worker:   ${user.full_name}`,
        `City:     ${user.city || '—'}`,
        `Category: ${user.category || '—'}`,
        `Generated: ${new Date().toLocaleDateString()}`,
        '───────────────────────────────────────',
        'EARNINGS SUMMARY',
        '───────────────────────────────────────',
        `Total Shifts:        ${s.shift_count}`,
        `Total Gross:         PKR ${Number(s.total_gross).toLocaleString()}`,
        `Platform Deductions: PKR ${Number(s.total_deductions).toLocaleString()}`,
        `Total Net Received:  PKR ${Number(s.total_net).toLocaleString()}`,
        `Hours Worked:        ${s.total_hours}`,
        `Effective Hourly:    PKR ${s.effective_hourly_rate}/hr`,
        `Avg Commission Rate: ${s.overall_commission_rate}%`,
        '───────────────────────────────────────',
        'BY PLATFORM',
        '───────────────────────────────────────',
        ...Object.entries(summary.by_platform || {}).map(([p, d]) =>
          `${p.padEnd(15)} Net: PKR ${Number(d.net).toLocaleString().padStart(10)}   Commission: ${d.commission_rate}%`
        ),
        '═══════════════════════════════════════',
        'Verified by FairGig Platform',
        '═══════════════════════════════════════',
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `fairgig-income-report-${user.full_name.replace(/\s+/g,'-')}.txt`
      a.click()
    } catch (err) {
      alert('Could not generate report: ' + err.message)
    }
  }

  const roleBadge = { worker: 'badge-green', verifier: 'badge-blue', advocate: 'badge-violet' }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="page-title">Profile</h1>

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <span className="font-display text-xl font-bold text-brand-400">
              {user?.full_name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-base">{user?.full_name}</p>
            <p className="text-ink-muted text-sm">{user?.email}</p>
            <span className={`badge ${roleBadge[user?.role]} mt-1`}>{user?.role}</span>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="section-label block mb-1.5">Full Name</label>
            <input name="full_name" value={form.full_name} onChange={handle} />
          </div>
          <div>
            <label className="section-label block mb-1.5">City</label>
            <input name="city" value={form.city} onChange={handle} placeholder="Lahore" />
          </div>
          {user?.role === 'worker' && (
            <div>
              <label className="section-label block mb-1.5">Category</label>
              <select name="category" value={form.category} onChange={handle}>
                {['ride-hailing','food-delivery','freelancer','other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red text-sm bg-red/10 px-3 py-2 rounded-lg">{error}</p>}
          {saved  && <p className="text-brand-400 text-sm">✓ Profile updated</p>}

          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving
              ? <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
              : <><Save size={14} /> Save Changes</>}
          </button>
        </form>
      </div>

      {user?.role === 'worker' && (
        <div className="card">
          <p className="section-label mb-3">Income Report</p>
          <p className="text-ink-muted text-sm mb-4">
            Generate a shareable income summary report — useful for banks, landlords, and loan applications.
          </p>
          <button onClick={generateReport} className="btn-ghost w-full">
            <FileDown size={15} /> Download Income Report (.txt)
          </button>
        </div>
      )}

      <div className="card border-surface-border">
        <p className="section-label mb-2">Account Info</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-faint">Email</span>
            <span className="font-mono text-xs">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Member since</span>
            <span className="text-xs">{new Date(user?.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-faint">Role</span>
            <span className="capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
