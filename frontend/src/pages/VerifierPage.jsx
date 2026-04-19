import { useState, useEffect, useCallback } from 'react'
import { earningsApi } from '../lib/api'
import { CheckCircle, AlertTriangle, XCircle, Eye, ExternalLink } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

export default function VerifierPage() {
  const [pending,    setPending]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [processing, setProcessing] = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [note,       setNote]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { const data = await earningsApi.pendingVerifications(); setPending(data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const verify = async (shiftId, status) => {
    setProcessing(shiftId)
    try {
      await earningsApi.verifyShift(shiftId, { verification_status: status, verifier_note: note })
      setPending(prev => prev.filter(s => s.id !== shiftId))
      setSelected(null); setNote('')
    } finally { setProcessing(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="page-title">Earnings Verification</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>{pending.length} shifts pending review</p>
      </div>

      {pending.length === 0 ? (
        <div className="card text-center py-16 fade-in">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-display font-semibold text-base" style={{ color: 'var(--ink)' }}>All caught up!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-muted)' }}>No pending verifications at the moment.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 fade-up-1">
          {/* List */}
          <div className="flex-1 space-y-3 min-w-0">
            {pending.map(shift => (
              <div key={shift.id} onClick={() => { setSelected(shift); setNote('') }}
                className="card cursor-pointer transition-all"
                style={{
                  borderColor: selected?.id === shift.id ? 'rgba(34,197,94,0.5)' : 'var(--border)',
                  background: selected?.id === shift.id ? 'rgba(34,197,94,0.05)' : 'var(--bg-card)',
                }}>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div>
                    <p className="font-display font-semibold text-sm" style={{ color: 'var(--ink)' }}>{shift.platform}</p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>{shift.shift_date}</p>
                  </div>
                  {shift.screenshot_url && (
                    <a href={shift.screenshot_url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
                      <ExternalLink size={12} /> Screenshot
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Gross', value: `PKR ${fmt(shift.gross_earned)}`, color: 'var(--ink)' },
                    { label: 'Deductions', value: `PKR ${fmt(shift.platform_deductions)}`, color: '#fbbf24' },
                    { label: 'Net', value: `PKR ${fmt(shift.net_received)}`, color: '#4ade80' },
                  ].map(k => (
                    <div key={k.label} className="rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
                      <p className="section-label mb-1">{k.label}</p>
                      <p className="text-xs font-semibold" style={{ color: k.color }}>{k.value}</p>
                    </div>
                  ))}
                </div>
                {shift.notes && <p className="text-xs italic mt-2" style={{ color: 'var(--ink-faint)' }}>"{shift.notes}"</p>}
              </div>
            ))}
          </div>

          {/* Review panel — sticks on desktop, shows below on mobile */}
          <div className="w-full lg:w-72 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-4">
              {selected ? (
                <div className="card space-y-4">
                  <p className="section-label">Review Decision</p>
                  <div className="rounded-xl p-3 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
                    {[
                      { label: 'Platform', value: selected.platform },
                      { label: 'Date', value: selected.shift_date },
                      { label: 'Commission', value: selected.gross_earned > 0 ? `${(selected.platform_deductions / selected.gross_earned * 100).toFixed(1)}%` : '—' },
                      ...(selected.city ? [{ label: 'City', value: selected.city }] : []),
                    ].map(r => (
                      <div key={r.label} className="flex justify-between">
                        <span style={{ color: 'var(--ink-faint)' }}>{r.label}</span>
                        <span className="font-medium" style={{ color: 'var(--ink)' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Verifier Note (optional)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                      placeholder="Add a note..." rows={3} className="resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { status: 'verified',      label: 'Verify', Icon: CheckCircle, color: '#4ade80', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
                      { status: 'flagged',        label: 'Flag',   Icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
                      { status: 'unverifiable',   label: 'N/A',    Icon: XCircle, color: 'var(--ink-faint)', bg: 'var(--bg-elevated)', border: 'var(--border)' },
                    ].map(a => (
                      <button key={a.status} onClick={() => verify(selected.id, a.status)} disabled={!!processing}
                        className="flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                        style={{ background: a.bg, color: a.color, border: `1px solid ${a.border}` }}>
                        <a.Icon size={13} /> {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card text-center py-10 border-dashed">
                  <Eye size={22} className="mx-auto mb-2" style={{ color: 'var(--ink-faint)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Select a shift to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}