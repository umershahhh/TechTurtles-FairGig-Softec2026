import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi, earningsApi } from '../lib/api'
import { Save, FileDown, CheckCircle, Shield, AlertTriangle, XCircle } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

const VSTATUS = {
  verified:     { cls: 'badge-green',  Icon: CheckCircle,  label: 'Verified'      },
  flagged:      { cls: 'badge-red',    Icon: AlertTriangle, label: 'Flagged'      },
  unverifiable: { cls: 'badge-gray',   Icon: XCircle,       label: 'Unverifiable' },
  pending:      { cls: 'badge-amber',  Icon: Shield,        label: 'Pending'      },
}

function safeDate(val) {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function ProfilePage() {
  const { user, reloadUser } = useAuth()
  const [form,    setForm]   = useState({ full_name: user?.full_name || '', city: user?.city || '', category: user?.category || '' })
  const [saving,  setSaving] = useState(false)
  const [saved,   setSaved]  = useState(false)
  const [error,   setError]  = useState('')
  // verifier history
  const [verifiedShifts, setVerifiedShifts] = useState([])
  const [loadingV,       setLoadingV]       = useState(false)

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      await authApi.updateProfile(form)
      await reloadUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  // Load verifier's reviewed shifts
  useEffect(() => {
    if (user?.role !== 'verifier' && user?.role !== 'advocate') return
    setLoadingV(true)
    earningsApi.listShifts('?verification_status=neq.pending&order=verified_at.desc')
      .then(data => {
        // Filter to only shifts this verifier reviewed
        const mine = data.filter(s => s.verified_by === user.id)
        setVerifiedShifts(mine)
      })
      .catch(() => {})
      .finally(() => setLoadingV(false))
  }, [user?.id, user?.role])

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
        `Total Shifts:        ${s.shift_count}`,
        `Total Gross:         PKR ${Number(s.total_gross).toLocaleString()}`,
        `Platform Deductions: PKR ${Number(s.total_deductions).toLocaleString()}`,
        `Total Net Received:  PKR ${Number(s.total_net).toLocaleString()}`,
        `Hours Worked:        ${s.total_hours}`,
        `Effective Hourly:    PKR ${s.effective_hourly_rate}/hr`,
        `Avg Commission Rate: ${s.overall_commission_rate}%`,
        '───────────────────────────────────────',
        ...Object.entries(summary.by_platform || {}).map(([p, d]) =>
          `${p.padEnd(15)} Net: PKR ${Number(d.net).toLocaleString().padStart(10)}   Commission: ${d.commission_rate}%`
        ),
        '═══════════════════════════════════════',
        'Verified by FairGig Platform',
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `fairgig-report-${user.full_name.replace(/\s+/g, '-')}.txt`
      a.click()
    } catch (err) { alert('Could not generate report: ' + err.message) }
  }

  const roleBadge    = { worker: 'badge-green', verifier: 'badge-blue', advocate: 'badge-violet' }
  const avatarColor  = { worker: 'text-emerald-400 bg-emerald-500/15', verifier: 'text-blue-400 bg-blue-500/15', advocate: 'text-violet-400 bg-violet-500/15' }

  const verifiedCount     = verifiedShifts.filter(s => s.verification_status === 'verified').length
  const flaggedCount      = verifiedShifts.filter(s => s.verification_status === 'flagged').length
  const unverifiableCount = verifiedShifts.filter(s => s.verification_status === 'unverifiable').length

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="page-title fade-up">Profile</h1>

      {/* Profile card */}
      <div className="card fade-up-1">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${avatarColor[user?.role] || avatarColor.worker}`}
            style={{ border: '1px solid var(--border)' }}>
            <span className="font-display text-xl font-bold">
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-base truncate" style={{ color: 'var(--ink)' }}>{user?.full_name}</p>
            <p className="text-sm truncate" style={{ color: 'var(--ink-muted)' }}>{user?.email}</p>
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
          {error && (
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm scale-in"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              <CheckCircle size={14} /> Profile updated
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
            {saving
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Save size={14} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Worker: income report */}
      {user?.role === 'worker' && (
        <div className="card fade-up-2">
          <p className="section-label mb-2">Income Report</p>
          <p className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>
            Generate a shareable income summary — useful for banks, landlords, and loan applications.
          </p>
          <button onClick={generateReport} className="btn-ghost w-full">
            <FileDown size={15} /> Download Income Report (.txt)
          </button>
        </div>
      )}

      {/* Verifier / Advocate: verification activity */}
      {(user?.role === 'verifier' || user?.role === 'advocate') && (
        <div className="card fade-up-2">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-blue-400" />
            <p className="section-label">Verification Activity</p>
          </div>

          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-4 stagger">
            {[
              { label: 'Verified',      count: verifiedCount,     color: '#4ade80', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.15)'  },
              { label: 'Flagged',       count: flaggedCount,      color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
              { label: 'Unverifiable', count: unverifiableCount, color: 'var(--ink-muted)', bg: 'var(--bg-elevated)', border: 'var(--border)' },
            ].map(k => (
              <div key={k.label} className="rounded-xl p-3 text-center"
                style={{ background: k.bg, border: `1px solid ${k.border}` }}>
                <p className="font-display text-xl font-bold" style={{ color: k.color }}>{k.count}</p>
                <p className="section-label mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Recent reviews */}
          {loadingV ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}
            </div>
          ) : verifiedShifts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--ink-faint)' }}>
              No shifts reviewed yet.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="section-label mb-2">Recent Reviews</p>
              {verifiedShifts.slice(0, 8).map(s => {
                const vs = VSTATUS[s.verification_status] || VSTATUS.pending
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl transition-colors"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <vs.Icon size={14} className={
                        s.verification_status === 'verified' ? 'text-emerald-400 flex-shrink-0' :
                        s.verification_status === 'flagged'  ? 'text-amber-400 flex-shrink-0' :
                        'flex-shrink-0'
                      } style={s.verification_status === 'unverifiable' ? { color: 'var(--ink-faint)' } : {}} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{s.platform}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>{s.shift_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-sm font-semibold text-emerald-400">PKR {fmt(s.net_received)}</p>
                      <span className={`badge ${vs.cls}`}>{vs.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Account info */}
      <div className="card fade-up-3">
        <p className="section-label mb-3">Account Info</p>
        <div className="space-y-0">
          {[
            { label: 'Email',        value: user?.email,                   mono: true  },
            { label: 'Member since', value: safeDate(user?.created_at),   mono: false },
            { label: 'Role',         value: user?.role,                    mono: false },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2.5"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--ink-faint)' }}>{r.label}</span>
              <span className={`text-sm ${r.mono ? 'font-mono text-xs' : 'capitalize'}`}
                style={{ color: 'var(--ink-muted)' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}