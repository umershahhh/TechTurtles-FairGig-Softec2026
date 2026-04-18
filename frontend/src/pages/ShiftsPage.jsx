import { useState, useEffect, useCallback } from 'react'
import { earningsApi } from '../lib/api'
import { Plus, Trash2, Eye, Filter, FileDown } from 'lucide-react'
import LogShiftModal from '../components/worker/LogShiftModal'

const STATUS_CLASS = {
  verified: 'badge-green', pending: 'badge-amber',
  flagged: 'badge-red', unverifiable: 'badge-gray',
}

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [filters, setFilters] = useState({ platform: '', from: '', to: '' })
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = '?'
      if (filters.platform) q += `&platform=eq.${filters.platform}`
      if (filters.from)     q += `&from_date=${filters.from}`
      if (filters.to)       q += `&to_date=${filters.to}`
      const data = await earningsApi.listShifts(q === '?' ? '' : q)
      setShifts(data)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const deleteShift = async (id) => {
    if (!confirm('Delete this shift?')) return
    setDeleting(id)
    try {
      await earningsApi.deleteShift(id)
      setShifts(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const exportCsv = () => {
    const header = 'platform,shift_date,hours_worked,gross_earned,platform_deductions,net_received,city,category,verification_status'
    const rows = shifts.map(s =>
      [s.platform,s.shift_date,s.hours_worked||'',s.gross_earned,s.platform_deductions,s.net_received,s.city||'',s.category||'',s.verification_status].join(',')
    )
    const blob = new Blob([[header,...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'my-shifts.csv'; a.click()
  }

  const platforms = [...new Set(shifts.map(s => s.platform))].sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">My Shifts</h1>
          <p className="text-ink-muted text-sm mt-0.5">{shifts.length} shifts logged</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost text-sm">
            <FileDown size={14} /> Export
          </button>
          <button onClick={() => setShowLog(true)} className="btn-primary text-sm">
            <Plus size={14} /> Log Shift
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card py-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-ink-faint">
            <Filter size={14} />
            <span className="section-label">Filter</span>
          </div>
          <select value={filters.platform} onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
            className="w-40">
            <option value="">All Platforms</option>
            {platforms.map(p => <option key={p}>{p}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.from}
              onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
              className="w-36 text-xs" />
            <span className="text-ink-faint text-xs">to</span>
            <input type="date" value={filters.to}
              onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
              className="w-36 text-xs" />
          </div>
          {(filters.platform || filters.from || filters.to) && (
            <button onClick={() => setFilters({ platform: '', from: '', to: '' })}
              className="text-xs text-ink-faint hover:text-ink underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-faint text-sm">No shifts yet.</p>
            <button onClick={() => setShowLog(true)} className="btn-primary mt-4 text-sm">
              <Plus size={14} /> Log Your First Shift
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Date','Platform','Gross','Deductions','Net','Hours','Commission','Status',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-ink-faint font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map(s => {
                  const commRate = s.gross_earned > 0
                    ? (s.platform_deductions / s.gross_earned * 100).toFixed(1)
                    : '—'
                  return (
                    <tr key={s.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{s.shift_date}</td>
                      <td className="px-4 py-3 font-medium">{s.platform}</td>
                      <td className="px-4 py-3 text-ink-muted">PKR {fmt(s.gross_earned)}</td>
                      <td className="px-4 py-3 text-red/80">PKR {fmt(s.platform_deductions)}</td>
                      <td className="px-4 py-3 text-brand-400 font-medium">PKR {fmt(s.net_received)}</td>
                      <td className="px-4 py-3 text-ink-muted">{s.hours_worked ? `${s.hours_worked}h` : '—'}</td>
                      <td className="px-4 py-3 text-amber">{commRate !== '—' ? `${commRate}%` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_CLASS[s.verification_status]}`}>
                          {s.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {s.screenshot_url && (
                            <a href={s.screenshot_url} target="_blank" rel="noreferrer"
                              className="text-ink-faint hover:text-blue" title="View screenshot">
                              <Eye size={14} />
                            </a>
                          )}
                          <button onClick={() => deleteShift(s.id)}
                            disabled={deleting === s.id}
                            className="text-ink-faint hover:text-red transition-colors">
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
        )}
      </div>

      {showLog && <LogShiftModal onClose={() => { setShowLog(false); load() }} />}
    </div>
  )
}
