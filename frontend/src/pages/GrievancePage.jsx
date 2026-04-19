import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { grievanceApi } from '../lib/api'
import { Plus, MessageSquare, ArrowUpCircle, CheckCircle2, X, Filter } from 'lucide-react'

const STATUS_CLASS = { open: 'badge-blue', escalated: 'badge-amber', resolved: 'badge-green', closed: 'badge-gray' }
const CATEGORIES = ['deactivation','commission-change','payment-delay','account-ban','unfair-rating','no-reason','harassment','support-failure','other']
const PLATFORMS  = ['Uber','Careem','InDriver','Foodpanda','Bykea','Rozee.pk','Upwork','Other']

export default function GrievancePage() {
  const { user } = useAuth()
  const [grievances,      setGrievances]      = useState([])
  const [loading,         setLoading]         = useState(true)
  const [showNew,         setShowNew]         = useState(false)
  const [selected,        setSelected]        = useState(null)
  const [statusFilter,    setStatusFilter]    = useState('')
  const [platformFilter,  setPlatformFilter]  = useState('')
  const [advocacy,        setAdvocacy]        = useState({ note: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = '?'
      if (statusFilter)   q += `&status=${statusFilter}`
      if (platformFilter) q += `&platform=${platformFilter}`
      const data = await grievanceApi.list(q === '?' ? '' : q)
      setGrievances(data)
    } finally { setLoading(false) }
  }, [statusFilter, platformFilter])

  useEffect(() => { load() }, [load])

  const handleEscalate = async (id) => { await grievanceApi.escalate(id, advocacy.note); setSelected(null); load() }
  const handleResolve  = async (id) => { await grievanceApi.resolve(id, advocacy.note);  setSelected(null); load() }
  const handleClose    = async (id) => { await grievanceApi.close(id); load() }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 fade-up">
        <div>
          <h1 className="page-title">Community Board</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {user.role === 'worker' ? 'Share rate intel & platform issues' : 'Review and manage worker grievances'}
          </p>
        </div>
        {user.role === 'worker' && (
          <button onClick={() => setShowNew(true)} className="btn-primary text-sm flex-shrink-0">
            <Plus size={15} />
            <span className="hidden sm:inline">Post Complaint</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center fade-up-1">
        <Filter size={13} style={{ color: 'var(--ink-faint)' }} className="flex-shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {['','open','escalated','resolved','closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
              style={{
                background: statusFilter === s ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: statusFilter === s ? '#4ade80' : 'var(--ink-muted)',
                borderColor: statusFilter === s ? 'rgba(34,197,94,0.3)' : 'var(--border)',
              }}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          className="ml-auto w-full sm:w-36 text-xs mt-1 sm:mt-0">
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grievances.length === 0 ? (
        <div className="card text-center py-14 fade-in">
          <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--ink-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>No complaints found.</p>
          {user.role === 'worker' && (
            <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-sm">
              <Plus size={14} /> Post First Complaint
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {grievances.map(g => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge ${STATUS_CLASS[g.status]}`}>{g.status}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{g.platform}</span>
                    <span className="text-xs capitalize" style={{ color: 'var(--ink-faint)' }}>{g.category?.replace(/-/g,' ')}</span>
                    {g.is_anonymous && <span className="badge badge-gray">anon</span>}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{g.description}</p>
                  {g.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.tags.map(tag => <span key={tag} className="badge badge-violet">{tag}</span>)}
                    </div>
                  )}
                  {g.advocate_note && (
                    <div className="mt-2 pl-3" style={{ borderLeft: '2px solid rgba(34,197,94,0.3)' }}>
                      <p className="text-xs italic" style={{ color: 'var(--ink-faint)' }}>Advocate: "{g.advocate_note}"</p>
                    </div>
                  )}
                  <p className="text-xs font-mono mt-2" style={{ color: 'var(--ink-faint)' }}>
                    {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {user.role === 'advocate' && g.status === 'open' && (
                    <button onClick={() => { setSelected(g); setAdvocacy({ note: '' }) }}
                      className="btn-ghost py-1 px-2 text-xs whitespace-nowrap">
                      <ArrowUpCircle size={12} /> Manage
                    </button>
                  )}
                  {user.role === 'worker' && g.worker_id === user.id && g.status === 'open' && (
                    <button onClick={() => handleClose(g.id)}
                      className="btn-ghost py-1 px-2 text-xs"
                      style={{ color: 'var(--ink-faint)' }}>
                      <X size={12} /> Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewGrievanceModal onClose={() => { setShowNew(false); load() }} />}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal-box w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Manage Grievance</h2>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--ink-faint)' }}><X size={18} /></button>
            </div>
            <div className="p-3 rounded-xl text-sm mb-4" style={{ background: 'var(--bg-elevated)' }}>
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>{selected.platform} — {selected.category}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>{selected.description}</p>
            </div>
            <div className="mb-4">
              <label className="section-label block mb-1.5">Advocate Note</label>
              <textarea value={advocacy.note} onChange={e => setAdvocacy({ note: e.target.value })}
                placeholder="Describe action taken or reason for escalation..." rows={3} className="resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleEscalate(selected.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                <ArrowUpCircle size={14} /> Escalate
              </button>
              <button onClick={() => handleResolve(selected.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                <CheckCircle2 size={14} /> Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewGrievanceModal({ onClose }) {
  const [form,    setForm]    = useState({ platform: 'Uber', category: 'deactivation', description: '', is_anonymous: true })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [e.target.name]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.description.length < 20) { setError('Please describe in more detail (min 20 chars)'); return }
    setError(''); setLoading(true)
    try { await grievanceApi.create(form); onClose() }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Post a Complaint</h2>
          <button onClick={onClose} style={{ color: 'var(--ink-faint)' }}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1.5">Platform</label>
              <select name="platform" value={form.platform} onChange={handle}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Category</label>
              <select name="category" value={form.category} onChange={handle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/-/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="section-label block mb-1.5">Description</label>
            <textarea name="description" value={form.description} onChange={handle}
              placeholder="Describe what happened in detail. E.g.: Uber raised commission from 20% to 28% without notice..."
              rows={4} className="resize-none" required />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" name="is_anonymous" checked={form.is_anonymous} onChange={handle}
              className="w-4 h-4 rounded" style={{ accentColor: '#22c55e' }} />
            <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>Post anonymously</span>
          </label>
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Post Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}