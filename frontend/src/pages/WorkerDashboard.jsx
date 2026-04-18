import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { earningsApi, anomalyApi, analyticsApi } from '../lib/api'
import {
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Percent, Plus, XCircle, ArrowUpRight, ArrowDownRight,
  Sparkles, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import LogShiftModal from '../components/worker/LogShiftModal'

const fmt = (n) => Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })

const SEVERITY_CLASS = { high: 'badge-red', medium: 'badge-amber', low: 'badge-blue' }
const STATUS_CLASS   = { verified: 'badge-green', pending: 'badge-amber', flagged: 'badge-red', unverifiable: 'badge-gray' }

function SkeletonCard() {
  return (
    <div className="stat-card space-y-3">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-32" />
      <div className="skeleton h-2.5 w-20" />
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2.5 rounded-xl text-xs scale-in"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <p className="section-label mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--ink-muted)' }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>PKR {fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkerDashboard() {
  const { user } = useAuth()
  const [summary,   setSummary]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [flags,     setFlags]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showLog,   setShowLog]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, a, f] = await Promise.allSettled([
        earningsApi.getSummary(),
        analyticsApi.workerAnalytics(user.id),
        anomalyApi.getFlags(user.id),
      ])
      if (s.status === 'fulfilled') setSummary(s.value)
      if (a.status === 'fulfilled') setAnalytics(a.value)
      if (f.status === 'fulfilled') setFlags(f.value.filter(x => !x.is_acknowledged))
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  const acknowledgeFlag = async (id) => {
    await anomalyApi.acknowledgeFlag(id)
    setFlags(prev => prev.filter(f => f.id !== id))
  }

  const s            = summary?.summary || {}
  const monthly      = analytics?.monthly || []
  const platformRates = analytics?.platform_rates || []
  const cityMedian   = analytics?.city_median_net

  const chartData = monthly.slice(-6).map(m => ({
    month: m.month.slice(5),
    net:   Math.round(m.net),
    gross: Math.round(m.gross),
    rate:  Math.round(m.deductions / (m.gross || 1) * 100),
  }))

  const kpis = [
    {
      label: 'Total Net Earned',
      value: `PKR ${fmt(s.total_net)}`,
      sub:   `from ${fmt(s.shift_count)} shifts`,
      icon:  DollarSign,
      color: '#22c55e',
      bg:    'rgba(34,197,94,0.1)',
      trend: 'up',
    },
    {
      label: 'Effective Hourly',
      value: `PKR ${fmt(s.effective_hourly_rate)}`,
      sub:   `${fmt(s.total_hours)} hrs logged`,
      icon:  Clock,
      color: '#60a5fa',
      bg:    'rgba(59,130,246,0.1)',
      trend: null,
    },
    {
      label: 'Platform Cut',
      value: `${s.overall_commission_rate || 0}%`,
      sub:   `PKR ${fmt(s.total_deductions)} deducted`,
      icon:  Percent,
      color: '#fbbf24',
      bg:    'rgba(245,158,11,0.1)',
      trend: 'down',
    },
    {
      label: 'City Median',
      value: cityMedian ? `PKR ${fmt(cityMedian)}` : '—',
      sub:   'per shift avg',
      icon:  TrendingUp,
      color: '#a78bfa',
      bg:    'rgba(139,92,246,0.1)',
      trend: null,
    },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between fade-up">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Dashboard
            <Sparkles size={20} className="text-emerald-400 opacity-70" />
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            Welcome back, <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{user.full_name}</span>
          </p>
        </div>
        <button onClick={() => setShowLog(true)} className="btn-primary fade-up">
          <Plus size={15} /> Log Shift
        </button>
      </div>

      {/* Anomaly alerts */}
      {flags.length > 0 && (
        <div className="space-y-2 fade-up-1">
          <p className="section-label flex items-center gap-1.5">
            <Activity size={11} /> Anomaly Alerts
          </p>
          {flags.map(flag => (
            <div key={flag.id} className="flex items-start gap-3 p-4 rounded-xl scale-in"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <AlertTriangle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${SEVERITY_CLASS[flag.severity]}`}>{flag.severity}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
                    {flag.flag_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{flag.explanation}</p>
              </div>
              <button onClick={() => acknowledgeFlag(flag.id)} title="Dismiss"
                className="flex-shrink-0 transition-colors p-1 rounded-lg hover:bg-white/5"
                style={{ color: 'var(--ink-faint)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink-muted)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-faint)'}
              >
                <XCircle size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
        {loading
          ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map(k => (
            <div key={k.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <p className="section-label">{k.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: k.bg }}>
                  <k.icon size={15} style={{ color: k.color }} />
                </div>
              </div>
              <p className="font-display text-xl font-bold mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                {k.value}
              </p>
              <div className="flex items-center gap-1.5">
                {k.trend === 'up' && <ArrowUpRight size={12} className="text-emerald-400" />}
                {k.trend === 'down' && <ArrowDownRight size={12} className="text-red-400" />}
                <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{k.sub}</p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-5 fade-up-2">

        {/* Monthly net income */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Monthly Net Income</p>
            <span className="badge badge-green">Last 6 months</span>
          </div>
          {!loading && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={52}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="net" name="Net" stroke="#22c55e" strokeWidth={2.5} fill="url(#netGrad)" dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5, fill: '#4ade80' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Activity size={24} style={{ color: 'var(--ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>No data yet — log your first shift!</p>
            </div>
          )}
        </div>

        {/* Commission trends */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Platform Commission %</p>
            <span className="badge badge-amber">Trend</span>
          </div>
          {!loading && platformRates.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={(() => {
                const byMonth = {}
                platformRates.forEach(r => {
                  if (!byMonth[r.month]) byMonth[r.month] = { month: r.month.slice(5) }
                  byMonth[r.month][r.platform] = r.rate
                })
                return Object.values(byMonth).sort((a,b) => a.month.localeCompare(b.month))
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--ink-faint)', fontSize: 11 }} axisLine={false} tickLine={false} width={30}
                  tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--ink-muted)' }} />
                {[...new Set(platformRates.map(r => r.platform))].map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} strokeWidth={2}
                    stroke={['#22c55e','#60a5fa','#fbbf24','#a78bfa'][i % 4]} dot={false}
                    activeDot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Percent size={24} style={{ color: 'var(--ink-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Log shifts across platforms to see rates.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent shifts table */}
      {summary?.recent_shifts?.length > 0 && (
        <div className="card fade-up-3">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Recent Shifts</p>
            <span className="badge badge-gray">{summary.recent_shifts.length} shown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date','Platform','Gross','Net','Commission','Status'].map(h => (
                    <th key={h} className="text-left pb-2.5 font-medium pr-4" style={{ color: 'var(--ink-faint)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.recent_shifts.map(shift => (
                  <tr key={shift.id} className="table-row">
                    <td className="py-3 pr-4 font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>{shift.shift_date}</td>
                    <td className="py-3 pr-4 font-semibold" style={{ color: 'var(--ink)' }}>{shift.platform}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--ink-muted)' }}>PKR {fmt(shift.gross_earned)}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-400">PKR {fmt(shift.net_received)}</td>
                    <td className="py-3 pr-4 text-amber-400">
                      {shift.gross_earned > 0 ? `${(shift.platform_deductions / shift.gross_earned * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${STATUS_CLASS[shift.verification_status]}`}>
                        {shift.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      {summary?.by_platform && Object.keys(summary.by_platform).length > 0 && (
        <div className="card fade-up-4">
          <p className="section-label mb-4">By Platform</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
            {Object.entries(summary.by_platform).map(([platform, data]) => (
              <div key={platform} className="rounded-xl p-4 card-hover transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display font-semibold text-sm" style={{ color: 'var(--ink)' }}>{platform}</p>
                  <span className="badge badge-gray">{data.shifts} shifts</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--ink-faint)' }}>Net earned</span>
                    <span className="font-semibold text-emerald-400">PKR {fmt(data.net)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--ink-faint)' }}>Commission</span>
                    <span className="text-amber-400">{data.commission_rate}%</span>
                  </div>
                  {/* Progress bar showing commission % */}
                  <div className="progress-bar mt-2">
                    <div className="progress-fill" style={{ width: `${Math.min(data.commission_rate, 100)}%`,
                      background: data.commission_rate > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#22c55e,#4ade80)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showLog && <LogShiftModal onClose={() => { setShowLog(false); load() }} />}
    </div>
  )
}