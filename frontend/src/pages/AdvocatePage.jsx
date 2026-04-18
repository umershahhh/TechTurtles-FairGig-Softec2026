import { useState, useEffect, useCallback } from 'react'
import { analyticsApi } from '../lib/api'
import {
  Users, TrendingUp, AlertTriangle, MessageSquare,
  BarChart2, MapPin, Zap,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Legend,
} from 'recharts'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4']

export default function AdvocatePage() {
  const [overview,      setOverview]      = useState(null)
  const [trends,        setTrends]        = useState([])
  const [distribution,  setDistribution]  = useState(null)
  const [vulnFlags,     setVulnFlags]     = useState([])
  const [complaints,    setComplaints]    = useState(null)
  const [loading,       setLoading]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ov, tr, di, vf, cp] = await Promise.allSettled([
        analyticsApi.overview(),
        analyticsApi.commissionTrends(),
        analyticsApi.incomeDistribution(),
        analyticsApi.vulnerabilityFlags(),
        analyticsApi.topComplaints(),
      ])
      if (ov.status === 'fulfilled') setOverview(ov.value)
      if (tr.status === 'fulfilled') setTrends(tr.value)
      if (di.status === 'fulfilled') setDistribution(di.value)
      if (vf.status === 'fulfilled') setVulnFlags(vf.value)
      if (cp.status === 'fulfilled') setComplaints(cp.value)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Pivot commission trends by platform for the chart
  const trendChartData = (() => {
    const byMonth = {}
    const platforms = [...new Set(trends.map(t => t.platform))]
    trends.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = { month: t.month.slice(5) }
      byMonth[t.month][t.platform] = t.commission_rate
    })
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
  })()

  const trendPlatforms = [...new Set(trends.map(t => t.platform))]

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Advocate Analytics</h1>
        <p className="text-ink-muted text-sm mt-0.5">System-wide view of worker income and platform fairness</p>
      </div>

      {/* Overview KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Workers', value: overview.total_workers, icon: Users, color: 'text-brand-400' },
            { label: 'Avg Commission', value: `${overview.avg_commission_rate}%`, icon: Zap, color: 'text-amber' },
            { label: 'Open Grievances', value: overview.open_grievances, icon: MessageSquare, color: 'text-blue' },
            { label: 'High Anomalies', value: overview.high_severity_anomalies, icon: AlertTriangle, color: 'text-red' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{k.label}</p>
                <k.icon size={16} className={k.color} />
              </div>
              <p className="font-display text-2xl font-bold">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Commission trend chart */}
      <div className="card">
        <p className="section-label mb-4">Platform Commission Rates Over Time</p>
        {trendChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false}
                width={35} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, fontSize: 12 }}
                formatter={v => [`${v}%`, '']}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              {trendPlatforms.map((p, i) => (
                <Line key={p} type="monotone" dataKey={p} strokeWidth={2}
                  stroke={COLORS[i % COLORS.length]} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-ink-faint text-sm text-center py-8">No shift data yet to compute trends.</p>
        )}
      </div>

      {/* Income distribution + top complaints */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* By city */}
        <div className="card">
          <p className="section-label mb-4">Income Distribution by City</p>
          {distribution?.by_city?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={distribution.by_city.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" />
                <XAxis dataKey="city" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false}
                  width={50} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [`PKR ${fmt(v)}`, '']}
                />
                <Bar dataKey="median" name="Median Net" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="mean"   name="Mean Net"   fill="#3b82f6" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-ink-faint text-sm text-center py-8">No city data yet.</p>
          )}
        </div>

        {/* Top complaints this week */}
        <div className="card">
          <p className="section-label mb-4">Top Complaints This Week</p>
          {complaints?.this_week?.by_category?.length > 0 ? (
            <div className="space-y-2">
              {complaints.this_week.by_category.slice(0, 6).map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-ink-faint text-xs w-4">{i+1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{c.name}</span>
                      <span className="text-xs text-ink-faint">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue"
                        style={{ width: `${(c.count / complaints.this_week.by_category[0].count) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-ink-faint mt-2">{complaints.this_week.total} total this week</p>
            </div>
          ) : (
            <p className="text-ink-faint text-sm text-center py-8">No complaints this week.</p>
          )}
        </div>
      </div>

      {/* Vulnerability flags */}
      {vulnFlags.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber" />
            <p className="section-label">Vulnerability Flags — Income Drop {'>'} 20%</p>
            <span className="badge badge-amber ml-auto">{vulnFlags.length} workers</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['Worker','City','Category','Period','Prev Income','Curr Income','Change'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-ink-faint font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vulnFlags.slice(0, 15).map(f => (
                  <tr key={`${f.worker_id}-${f.curr_month}`} className="table-row">
                    <td className="px-3 py-2.5 text-sm">{f.worker?.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{f.worker?.city || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-muted">{f.worker?.category || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-faint">
                      {f.prev_month} → {f.curr_month}
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted">PKR {fmt(f.prev_income)}</td>
                    <td className="px-3 py-2.5 text-brand-400">PKR {fmt(f.curr_income)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`badge ${f.severity === 'high' ? 'badge-red' : 'badge-amber'}`}>
                        {f.change_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform complaint distribution */}
      {complaints?.all_time?.by_platform?.length > 0 && (
        <div className="card">
          <p className="section-label mb-4">All-Time Complaints by Platform</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {complaints.all_time.by_platform.slice(0, 8).map((p, i) => (
              <div key={p.name} className="bg-surface rounded-lg p-3 border border-surface-border text-center">
                <p className="font-display font-semibold text-sm mb-1">{p.name}</p>
                <p className="text-2xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>{p.count}</p>
                <p className="text-xs text-ink-faint mt-0.5">complaints</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
