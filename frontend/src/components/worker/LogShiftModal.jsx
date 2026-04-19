import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { earningsApi } from '../../lib/api'

const PLATFORMS  = ['Uber','Careem','InDriver','Foodpanda','Bykea','Rozee.pk','Upwork','Other']
const CATEGORIES = ['ride-hailing','food-delivery','freelancer','other']

export default function LogShiftModal({ onClose }) {
  const [form, setForm] = useState({
    platform: 'Uber', shift_date: new Date().toISOString().slice(0,10),
    hours_worked: '', gross_earned: '', platform_deductions: '', net_received: '',
    city: '', category: 'ride-hailing', notes: '', screenshot_url: '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [tab,     setTab]     = useState('manual')

  const handle = (e) => {
    const val = e.target.value
    setForm(f => {
      const u = { ...f, [e.target.name]: val }
      if (e.target.name === 'gross_earned' || e.target.name === 'platform_deductions') {
        const gross  = parseFloat(e.target.name === 'gross_earned' ? val : u.gross_earned) || 0
        const deduct = parseFloat(e.target.name === 'platform_deductions' ? val : u.platform_deductions) || 0
        u.net_received = String(Math.max(0, gross - deduct))
      }
      return u
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await earningsApi.createShift({
        ...form,
        hours_worked:        form.hours_worked ? parseFloat(form.hours_worked) : null,
        gross_earned:        parseFloat(form.gross_earned),
        platform_deductions: parseFloat(form.platform_deductions) || 0,
        net_received:        parseFloat(form.net_received),
      })
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const result = await earningsApi.importCsv(file)
      alert(`Imported ${result.imported} shifts${result.errors.length ? `, ${result.errors.length} errors` : ''}`)
      onClose()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Log Shift</h2>
          <button onClick={onClose} style={{ color: 'var(--ink-faint)' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {[['manual','Manual Entry'],['csv','CSV Import']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t ? 'rgba(34,197,94,0.1)' : 'transparent',
                color: tab === t ? '#4ade80' : 'var(--ink-faint)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {tab === 'csv' ? (
            <div className="space-y-4">
              <div className="rounded-xl p-8 text-center"
                style={{ border: '2px dashed var(--border)' }}>
                <Upload size={24} className="mx-auto mb-3" style={{ color: 'var(--ink-faint)' }} />
                <p className="text-sm mb-1" style={{ color: 'var(--ink-muted)' }}>Upload a CSV file</p>
                <p className="text-xs mb-4" style={{ color: 'var(--ink-faint)' }}>
                  Columns: platform, shift_date, hours_worked, gross_earned, platform_deductions, net_received, city, category, notes
                </p>
                <label className="btn-primary cursor-pointer text-sm">
                  <Upload size={14} /> Choose File
                  <input type="file" accept=".csv" onChange={handleCsv} className="hidden" />
                </label>
              </div>
              <a href="data:text/csv;charset=utf-8,platform,shift_date,hours_worked,gross_earned,platform_deductions,net_received,city,category,notes%0AUber,2024-06-01,4,1200,180,1020,Lahore,ride-hailing,Evening shift"
                download="fairgig-sample.csv"
                className="block text-center text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                Download sample CSV
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label block mb-1.5">Platform</label>
                  <select name="platform" value={form.platform} onChange={handle}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label block mb-1.5">Date</label>
                  <input name="shift_date" type="date" value={form.shift_date} onChange={handle} required />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Gross Earned (PKR)</label>
                  <input name="gross_earned" type="number" min="0" step="0.01"
                    value={form.gross_earned} onChange={handle} placeholder="1200" required />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Deductions (PKR)</label>
                  <input name="platform_deductions" type="number" min="0" step="0.01"
                    value={form.platform_deductions} onChange={handle} placeholder="180" />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Net Received (PKR)</label>
                  <input name="net_received" type="number" min="0" step="0.01"
                    value={form.net_received} onChange={handle} placeholder="Auto-calculated" required />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Hours Worked</label>
                  <input name="hours_worked" type="number" min="0" step="0.5"
                    value={form.hours_worked} onChange={handle} placeholder="4" />
                </div>
                <div>
                  <label className="section-label block mb-1.5">City</label>
                  <input name="city" value={form.city} onChange={handle} placeholder="Lahore" />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handle}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label block mb-1.5">Screenshot URL (optional)</label>
                <input name="screenshot_url" value={form.screenshot_url} onChange={handle}
                  placeholder="https://... (link to earnings screenshot)" />
              </div>
              <div>
                <label className="section-label block mb-1.5">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handle}
                  placeholder="Any notes about this shift..." rows={2} className="resize-none" />
              </div>

              {error && (
                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Save Shift'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}