import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { grievanceApi } from '../lib/api'
import {
  Plus, MessageSquare, ChevronDown, Tag, ArrowUpCircle,
  CheckCircle2, X, Filter,
} from 'lucide-react'

const STATUS_CLASS = {
  open: 'badge-blue', escalated: 'badge-amber',
  resolved: 'badge-green', closed: 'badge-gray',
}

const CATEGORIES = [
  'deactivation','commission-change','payment-delay','account-ban',
  'unfair-rating','no-reason','harassment','support-failure','other',
]

const PLATFORMS = ['Uber','Careem','InDriver','Foodpanda','Bykea','Rozee.pk','Upwork','Other']

export default function GrievancePage() {
  const { user } = useAuth()
  const [grievances, setGrievances] = useState([])
  const [loading, setLoading]  = useState(true)
  const [showNew, setShowNew]  = useState(false)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [advocacy, setAdvocacy] = useState({ note: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q = '?'
      if (statusFilter)   q += `&status=${statusFilter}`
      if (platformFilter) q += `&platform=${platformFilter}`
      const data = await grievanceApi.list(q === '?' ? '' : q)
      setGrievances(data)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, platformFilter])

  useEffect(() => { load() }, [load])

  const handleEscalate = async (id) => {
    await grievanceApi.escalate(id, advocacy.note)
    setSelected(null)
    load()
  }

  const handleResolve = async (id) => {
    await grievanceApi.resolve(id, advocacy.note)
    setSelected(null)
    load()
  }

  const handleClose = async (id) => {
    await grievanceApi.close(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Community Board</h1>
          <p className="text-ink-muted text-sm mt-0.5">
            {user.role === 'worker'
              ? 'Share rate intel and platform issues — anonymously if you prefer'
              : 'Review and manage worker grievances'}
          </p>
        </div>
        {user.role === 'worker' && (
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={15} /> Post Complaint
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-ink-faint" />
        {['','open','escalated','resolved','closed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              statusFilter === s
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'text-ink-muted border-surface-border hover:border-surface-hover'
            }`}>
            {s || 'All'}
          </button>
        ))}
        <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
          className="ml-auto w-36 text-xs">
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grievances.length === 0 ? (
        <div className="card text-center py-16">
          <MessageSquare size={28} className="text-ink-faint mx-auto mb-3" />
          <p className="text-ink-muted text-sm">No complaints found.</p>
          {user.role === 'worker' && (
            <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-sm">
              <Plus size={14} /> Post First Complaint
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grievances.map(g => (
            <div key={g.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`badge ${STATUS_CLASS[g.status]}`}>{g.status}</span>
                    <span className="text-xs font-medium text-ink">{g.platform}</span>
                    <span className="text-xs text-ink-faint capitalize">{g.category?.replace(/-/g,' ')}</span>
                    {g.is_anonymous && <span className="badge badge-gray">anonymous</span>}
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed">{g.description}</p>

                  {g.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.tags.map(tag => (
                        <span key={tag} className="badge badge-violet">{tag}</span>
                      ))}
                    </div>
                  )}

                  {g.advocate_note && (
                    <div className="mt-2 pl-3 border-l-2 border-brand-500/30">
                      <p className="text-xs text-ink-faint italic">Advocate: "{g.advocate_note}"</p>
                    </div>
                  )}

                  <p className="text-xs text-ink-faint mt-2 font-mono">
                    {new Date(g.created_at).toLocaleDateString()}
                    {g.cluster_id && <span className="ml-2 opacity-60">cluster: {g.cluster_id}</span>}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {user.role === 'advocate' && g.status === 'open' && (
                    <button
                      onClick={() => { setSelected(g); setAdvocacy({ note: '' }) }}
                      className="text-xs btn-ghost py-1 px-2">
                      <ArrowUpCircle size={13} /> Manage
                    </button>
                  )}
                  {(user.role === 'worker' && g.worker_id === user.id && g.status === 'open') && (
                    <button onClick={() => handleClose(g.id)}
                      className="text-xs btn-ghost py-1 px-2 hover:text-red">
                      <X size={13} /> Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New grievance modal */}
      {showNew && <NewGrievanceModal onClose={() => { setShowNew(false); load() }} />}

      {/* Advocate action modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl p-6 fade-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Manage Grievance</h2>
              <button onClick={() => setSelected(null)} className="text-ink-faint hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="bg-surface rounded-lg p-3 text-sm mb-4">
              <p className="font-medium">{selected.platform} — {selected.category}</p>
              <p className="text-ink-muted text-xs mt-1">{selected.description}</p>
            </div>

            <div className="mb-4">
              <label className="section-label block mb-1.5">Advocate Note</label>
              <textarea
                value={advocacy.note}
                onChange={e => setAdvocacy({ note: e.target.value })}
                placeholder="Describe the action taken or reason for escalation..."
                rows={3} className="resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleEscalate(selected.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber/10 text-amber border border-amber/30 rounded-lg py-2 text-sm font-medium hover:bg-amber/20">
                <ArrowUpCircle size={14} /> Escalate
              </button>
              <button onClick={() => handleResolve(selected.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-500/10 text-brand-400 border border-brand-500/30 rounded-lg py-2 text-sm font-medium hover:bg-brand-500/20">
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
  const [form, setForm] = useState({
    platform: 'Uber', category: 'deactivation',
    description: '', is_anonymous: true,
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [e.target.name]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.description.length < 20) { setError('Please describe your complaint in more detail (min 20 chars)'); return }
    setError(''); setLoading(true)
    try {
      await grievanceApi.create(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-display font-semibold">Post a Complaint</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-4 space-y-4">
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
              placeholder="Describe what happened in detail. E.g.: Uber raised commission from 20% to 28% without notice on June 1st..."
              rows={4} className="resize-none" required />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" name="is_anonymous" checked={form.is_anonymous} onChange={handle}
              className="w-4 h-4 rounded border-surface-border accent-brand-500" />
            <span className="text-sm text-ink-muted">Post anonymously</span>
          </label>

          {error && <p className="text-red text-sm bg-red/10 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading
                ? <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
                : 'Post Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
