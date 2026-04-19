import { useState, useEffect, useCallback } from 'react'
import { earningsApi } from '../lib/api'
import { Plus, Trash2, Eye, Filter, FileDown, List } from 'lucide-react'
import LogShiftModal from '../components/worker/LogShiftModal'

const STATUS_CLASS = { verified: 'badge-green', pending: 'badge-amber', flagged: 'badge-red', unverifiable: 'badge-gray' }
const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

export default function ShiftsPage() {
  const [shifts,   setShifts]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showLog,  setShowLog]  = useState(false)
  const [filters,  setFilters]  = useState({ platform: '', from: '', to: '' })
  const [deleting, setDeleting] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = '?'
      if (filters.platform) q += `&platform=eq.${filters.platform}`
      if (filters.from)     q += `&from_date=${filters.from}`
      if (filters.to)       q += `&to_date=${filters.to}`
      const data = await earningsApi.listShifts(q === '?' ? '' : q)
      setShifts(data)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const deleteShift = async (id) => {
    if (!confirm('Delete this shift?')) return
    setDeleting(id)
    try {
      await earningsApi.deleteShift(id)
      setShifts(prev => prev.filter(s => s.id !== id))
    } finally { setDeleting(null) }
  }

  const exportCsv = () => {
    const header = 'platform,shift_date,hours_worked,gross_earned,platform_deductions,net_received,city,category,verification_status'
    const rows = shifts.map(s =>
      [s.platform,s.shift_date,s.hours_worked||'',s.gross_earned,s.platform_deductions,s.net_received,s.city||'',s.category||'',s.verification_status].join(',')
    )
    const blob = new Blob([[header,...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-shifts.csv'; a.click()
  }

  const platforms = [...new Set(shifts.map(s => s.platform))].sort()
  const hasFilters = filters.platform || filters.from || filters.to

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 fade-up">
        <div>
          <h1 className="page-title">My Shifts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>{shifts.length} shifts logged</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(f => !f)} className="btn-ghost text-sm">
            <Filter size={14} />
            <span className="hidden sm:inline">Filter</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
          <button onClick={exportCsv} className="btn-ghost text-sm">
            <FileDown size={14} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => setShowLog(true)} className="btn-primary text-sm">
            <Plus size={14} />
            <span className="hidden sm:inline">Log Shift</span>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card py-4 scale-in">
          <div className="flex flex-wrap gap-3 items-end">
            <select value={filters.platform} onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
              className="w-full sm:w-40">
              <option value="">All Platforms</option>
              {platforms.map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input type="date" value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                className="flex-1 sm:w-36 text-xs" />
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>to</span>
              <input type="date" value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                className="flex-1 sm:w-36 text-xs" />
            </div>
            {hasFilters && (
              <button onClick={() => setFilters({ platform: '', from: '', to: '' })}
                className="text-xs underline" style={{ color: 'var(--ink-faint)' }}>Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Table — desktop */}
      <div className="card p-0 overflow-hidden fade-up-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <List size={28} className="mx-auto" style={{ color: 'var(--ink-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>No shifts yet.</p>
            <button onClick={() => setShowLog(true)} className="btn-primary text-sm">
              <Plus size={14} /> Log Your First Shift
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Date','Platform','Gross','Deductions','Net','Hours','Commission','Status',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--ink-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => {
                    const commRate = s.gross_earned > 0 ? (s.platform_deductions / s.gross_earned * 100).toFixed(1) : '—'
                    return (
                      <tr key={s.id} className="table-row">
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>{s.shift_date}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: 'var(--ink)' }}>{s.platform}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--ink-muted)' }}>PKR {fmt(s.gross_earned)}</td>
                        <td className="px-4 py-3 text-red-400">PKR {fmt(s.platform_deductions)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">PKR {fmt(s.net_received)}</td>
                        <td className="px-4 py-3" style={{ color: 'var(--ink-muted)' }}>{s.hours_worked ? `${s.hours_worked}h` : '—'}</td>
                        <td className="px-4 py-3 text-amber-400">{commRate !== '—' ? `${commRate}%` : '—'}</td>
                        <td className="px-4 py-3"><span className={`badge ${STATUS_CLASS[s.verification_status]}`}>{s.verification_status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.screenshot_url && (
                              <a href={s.screenshot_url} target="_blank" rel="noreferrer" title="View screenshot"
                                className="transition-colors" style={{ color: 'var(--ink-faint)' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}>
                                <Eye size={14} />
                              </a>
                            )}
                            <button onClick={() => deleteShift(s.id)} disabled={deleting === s.id}
                              className="transition-colors" style={{ color: 'var(--ink-faint)' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {shifts.map(s => {
                const commRate = s.gross_earned > 0 ? (s.platform_deductions / s.gross_earned * 100).toFixed(1) : null
                return (
                  <div key={s.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{s.platform}</p>
                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>{s.shift_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${STATUS_CLASS[s.verification_status]}`}>{s.verification_status}</span>
                        <button onClick={() => deleteShift(s.id)} disabled={deleting === s.id}
                          style={{ color: 'var(--ink-faint)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="section-label mb-0.5">Gross</p>
                        <p style={{ color: 'var(--ink-muted)' }}>PKR {fmt(s.gross_earned)}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="section-label mb-0.5">Net</p>
                        <p className="text-emerald-400 font-semibold">PKR {fmt(s.net_received)}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-elevated)' }}>
                        <p className="section-label mb-0.5">Cut</p>
                        <p className="text-amber-400">{commRate ? `${commRate}%` : '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showLog && <LogShiftModal onClose={() => { setShowLog(false); load() }} />}
    </div>
  )
}