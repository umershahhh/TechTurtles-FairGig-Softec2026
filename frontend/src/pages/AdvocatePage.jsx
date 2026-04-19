import { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '../lib/api'
import { Users, TrendingUp, AlertTriangle, MessageSquare, Zap } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Legend,
} from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })
const COLORS = ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4']

export default function AdvocatePage() {
  const [overview,     setOverview]     = useState(null)
  const [trends,       setTrends]       = useState([])
  const [distribution, setDistribution] = useState(null)
  const [vulnFlags,    setVulnFlags]    = useState([])
  const [complaints,   setComplaints]   = useState(null)
  const [loading,      setLoading]      = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, tr, di, vf, cp] = await Promise.allSettled([
        analyticsApi.overview(), analyticsApi.commissionTrends(),
        analyticsApi.incomeDistribution(), analyticsApi.vulnerabilityFlags(),
        analyticsApi.topComplaints(),
      ])
      if (ov.status === 'fulfilled') setOverview(ov.value)
      if (tr.status === 'fulfilled') setTrends(tr.value)
      if (di.status === 'fulfilled') setDistribution(di.value)
      if (vf.status === 'fulfilled') setVulnFlags(vf.value)
      if (cp.status === 'fulfilled') setComplaints(cp.value)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const trendChartData = (() => {
    const byMonth = {}
    trends.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = { month: t.month.slice(5) }
      byMonth[t.month][t.platform] = t.commission_rate
    })
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
  })()
  const trendPlatforms = [...new Set(trends.map(t => t.platform))]

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }
  const axisStyle    = { fill: 'var(--ink-faint)', fontSize: 11 }

  return (
    <div className="space-y-5">
      <div className="fade-up">
        <h1 className="page-title">Advocate Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>System-wide view of worker income and platform fairness</p>
      </div>

      {/* KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {[
            { label: 'Total Workers',   value: overview.total_workers,           icon: Users,         color: '#22c55e' },
            { label: 'Avg Commission',  value: `${overview.avg_commission_rate}%`, icon: TrendingUp,   color: '#fbbf24' },
            { label: 'Open Grievances', value: overview.open_grievances,          icon: MessageSquare, color: '#60a5fa' },
            { label: 'High Anomalies',  value: overview.high_severity_anomalies,  icon: AlertTriangle, color: '#f87171' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{k.label}</p>
                <k.icon size={15} style={{ color: k.color }} />
              </div>
              <p className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Commission trend */}
      <div className="card fade-up-1">
        <p className="section-label mb-4">Platform Commission Rates Over Time</p>
        {trendChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={35} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--ink-muted)' }} formatter={v => [`${v}%`, '']} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--ink-muted)' }} />
              {trendPlatforms.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} strokeWidth={2} stroke={COLORS[i % COLORS.length]} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: 'var(--ink-faint)' }}>No shift data yet to compute trends.</p>
        )}
      </div>

      {/* Distribution + complaints */}
      <div className="grid md:grid-cols-2 gap-4 fade-up-2">
        <div className="card">
          <p className="section-label mb-4">Income Distribution by City</p>
          {distribution?.by_city?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distribution.by_city.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="city" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`PKR ${fmt(v)}`, '']} />
                <Bar dataKey="median" name="Median Net" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="mean"   name="Mean Net"   fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-8" style={{ color: 'var(--ink-faint)' }}>No city data yet.</p>}
        </div>

        <div className="card">
          <p className="section-label mb-4">Top Complaints This Week</p>
          {complaints?.this_week?.by_category?.length > 0 ? (
            <div className="space-y-2.5">
              {complaints.this_week.by_category.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs w-4 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize truncate" style={{ color: 'var(--ink)' }}>{c.name}</span>
                      <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--ink-faint)' }}>{c.count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(c.count / complaints.this_week.by_category[0].count) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>{complaints.this_week.total} total this week</p>
            </div>
          ) : <p className="text-sm text-center py-8" style={{ color: 'var(--ink-faint)' }}>No complaints this week.</p>}
        </div>
      </div>

      {/* Vulnerability flags table */}
      {vulnFlags.length > 0 && (
        <div className="card fade-up-3">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} className="text-amber-400" />
            <p className="section-label">Vulnerability Flags — Income Drop &gt; 20%</p>
            <span className="badge badge-amber ml-auto">{vulnFlags.length} workers</span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Worker','City','Category','Period','Prev','Current','Change'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--ink-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vulnFlags.slice(0, 15).map(f => (
                  <tr key={`${f.worker_id}-${f.curr_month}`} className="table-row">
                    <td className="px-3 py-2.5" style={{ color: 'var(--ink)' }}>{f.worker?.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>{f.worker?.city || '—'}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>{f.worker?.category || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{f.prev_month} → {f.curr_month}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--ink-muted)' }}>PKR {fmt(f.prev_income)}</td>
                    <td className="px-3 py-2.5 text-xs text-emerald-400">PKR {fmt(f.curr_income)}</td>
                    <td className="px-3 py-2.5"><span className={`badge ${f.severity === 'high' ? 'badge-red' : 'badge-amber'}`}>{f.change_pct}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {vulnFlags.slice(0, 10).map(f => (
              <div key={`${f.worker_id}-${f.curr_month}`} className="rounded-xl p-3"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{f.worker?.full_name || '—'}</p>
                  <span className={`badge ${f.severity === 'high' ? 'badge-red' : 'badge-amber'}`}>{f.change_pct}%</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{f.prev_month} → {f.curr_month}</p>
                <div className="flex gap-4 mt-1.5 text-xs">
                  <span style={{ color: 'var(--ink-muted)' }}>Prev: PKR {fmt(f.prev_income)}</span>
                  <span className="text-emerald-400">Now: PKR {fmt(f.curr_income)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform complaint breakdown */}
      {complaints?.all_time?.by_platform?.length > 0 && (
        <div className="card fade-up-4">
          <p className="section-label mb-4">All-Time Complaints by Platform</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {complaints.all_time.by_platform.slice(0, 8).map((p, i) => (
              <div key={p.name} className="rounded-xl p-3 text-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>{p.name}</p>
                <p className="text-2xl font-bold font-display" style={{ color: COLORS[i % COLORS.length] }}>{p.count}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-faint)' }}>complaints</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}