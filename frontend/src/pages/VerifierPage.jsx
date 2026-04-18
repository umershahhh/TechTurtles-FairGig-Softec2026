import { useState, useEffect, useCallback } from 'react'
import { earningsApi } from '../lib/api'
import { CheckCircle, AlertTriangle, XCircle, Eye, ExternalLink } from 'lucide-react'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

export default function VerifierPage() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [note, setNote]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await earningsApi.pendingVerifications()
      setPending(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const verify = async (shiftId, status) => {
    setProcessing(shiftId)
    try {
      await earningsApi.verifyShift(shiftId, {
        verification_status: status,
        verifier_note: note,
      })
      setPending(prev => prev.filter(s => s.id !== shiftId))
      setSelected(null)
      setNote('')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Earnings Verification</h1>
        <p className="text-ink-muted text-sm mt-0.5">
          {pending.length} shifts pending review
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : pending.length === 0 ? (
        <div className="card text-center py-16">
          <CheckCircle size={32} className="text-brand-400 mx-auto mb-3" />
          <p className="font-display font-semibold text-base">All caught up!</p>
          <p className="text-ink-muted text-sm mt-1">No pending verifications at the moment.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {/* List */}
          <div className="space-y-3">
            {pending.map(shift => (
              <div
                key={shift.id}
                onClick={() => { setSelected(shift); setNote('') }}
                className={`card cursor-pointer transition-all ${
                  selected?.id === shift.id
                    ? 'border-brand-500/50 bg-brand-500/5'
                    : 'hover:border-surface-hover'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-display font-semibold text-sm">{shift.platform}</p>
                    <p className="text-ink-faint text-xs font-mono mt-0.5">{shift.shift_date}</p>
                  </div>
                  {shift.screenshot_url && (
                    <a href={shift.screenshot_url} target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-blue hover:text-brand-400 flex items-center gap-1 text-xs">
                      <ExternalLink size={13} /> Screenshot
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Gross', value: `PKR ${fmt(shift.gross_earned)}`, color: 'text-ink' },
                    { label: 'Deductions', value: `PKR ${fmt(shift.platform_deductions)}`, color: 'text-amber' },
                    { label: 'Net', value: `PKR ${fmt(shift.net_received)}`, color: 'text-brand-400' },
                  ].map(k => (
                    <div key={k.label} className="bg-surface rounded-lg p-2">
                      <p className="section-label mb-1">{k.label}</p>
                      <p className={`text-xs font-semibold ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>

                {shift.notes && (
                  <p className="text-xs text-ink-faint mt-2 italic">"{shift.notes}"</p>
                )}
              </div>
            ))}
          </div>

          {/* Review panel */}
          <div className="sticky top-0">
            {selected ? (
              <div className="card space-y-4">
                <p className="section-label">Review Decision</p>
                <div className="bg-surface rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Platform</span>
                    <span className="font-medium">{selected.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Date</span>
                    <span className="font-mono text-xs">{selected.shift_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Commission rate</span>
                    <span className="text-amber">
                      {selected.gross_earned > 0
                        ? `${(selected.platform_deductions / selected.gross_earned * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  {selected.city && (
                    <div className="flex justify-between">
                      <span className="text-ink-faint">City</span>
                      <span>{selected.city}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="section-label block mb-1.5">Verifier Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a note about this verification..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => verify(selected.id, 'verified')}
                    disabled={!!processing}
                    className="flex items-center justify-center gap-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded-lg py-2.5 text-sm font-medium hover:bg-brand-500/20 transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Verify
                  </button>
                  <button
                    onClick={() => verify(selected.id, 'flagged')}
                    disabled={!!processing}
                    className="flex items-center justify-center gap-1.5 bg-amber/10 text-amber border border-amber/30 rounded-lg py-2.5 text-sm font-medium hover:bg-amber/20 transition-all disabled:opacity-50"
                  >
                    <AlertTriangle size={14} /> Flag
                  </button>
                  <button
                    onClick={() => verify(selected.id, 'unverifiable')}
                    disabled={!!processing}
                    className="flex items-center justify-center gap-1.5 bg-surface text-ink-faint border border-surface-border rounded-lg py-2.5 text-sm font-medium hover:bg-surface-hover transition-all disabled:opacity-50"
                  >
                    <XCircle size={14} /> N/A
                  </button>
                </div>
              </div>
            ) : (
              <div className="card text-center py-12 border-dashed">
                <Eye size={24} className="text-ink-faint mx-auto mb-2" />
                <p className="text-ink-faint text-sm">Select a shift to review</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
