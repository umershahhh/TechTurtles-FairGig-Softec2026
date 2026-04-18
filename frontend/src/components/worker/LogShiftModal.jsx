import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { earningsApi } from '../../lib/api'

const PLATFORMS = ['Uber', 'Careem', 'InDriver', 'Foodpanda', 'Bykea', 'Rozee.pk', 'Upwork', 'Other']
const CATEGORIES = ['ride-hailing', 'food-delivery', 'freelancer', 'other']

export default function LogShiftModal({ onClose }) {
  const [form, setForm] = useState({
    platform: 'Uber', shift_date: new Date().toISOString().slice(0,10),
    hours_worked: '', gross_earned: '', platform_deductions: '', net_received: '',
    city: '', category: 'ride-hailing', notes: '', screenshot_url: '',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('manual') // manual | csv

  const handle = (e) => {
    const val = e.target.value
    setForm(f => {
      const updated = { ...f, [e.target.name]: val }
      // Auto-calculate net if gross and deductions filled
      if (e.target.name === 'gross_earned' || e.target.name === 'platform_deductions') {
        const gross = parseFloat(e.target.name === 'gross_earned' ? val : updated.gross_earned) || 0
        const deduct = parseFloat(e.target.name === 'platform_deductions' ? val : updated.platform_deductions) || 0
        updated.net_received = String(Math.max(0, gross - deduct))
      }
      return updated
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await earningsApi.createShift({
        ...form,
        hours_worked: form.hours_worked ? parseFloat(form.hours_worked) : null,
        gross_earned: parseFloat(form.gross_earned),
        platform_deductions: parseFloat(form.platform_deductions) || 0,
        net_received: parseFloat(form.net_received),
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    try {
      const result = await earningsApi.importCsv(file)
      alert(`Imported ${result.imported} shifts${result.errors.length ? `, ${result.errors.length} errors` : ''}`)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-card fade-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-display font-semibold text-base">Log Shift</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {['manual','csv'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t ? 'bg-brand-500/10 text-brand-400' : 'text-ink-faint hover:text-ink'
              }`}>
              {t === 'manual' ? 'Manual Entry' : 'CSV Import'}
            </button>
          ))}
        </div>

        <div className="px-6 py-4">
          {tab === 'csv' ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-surface-border rounded-xl p-8 text-center">
                <Upload size={24} className="text-ink-faint mx-auto mb-3" />
                <p className="text-sm text-ink-muted mb-1">Upload a CSV file</p>
                <p className="text-xs text-ink-faint mb-4">
                  Columns: platform, shift_date, hours_worked, gross_earned, platform_deductions, net_received, city, category, notes
                </p>
                <label className="btn-primary cursor-pointer text-sm">
                  <Upload size={14} /> Choose File
                  <input type="file" accept=".csv" onChange={handleCsv} className="hidden" />
                </label>
              </div>
              <a
                href="data:text/csv;charset=utf-8,platform,shift_date,hours_worked,gross_earned,platform_deductions,net_received,city,category,notes%0AUber,2024-06-01,4,1200,180,1020,Lahore,ride-hailing,Evening shift"
                download="fairgig-sample.csv"
                className="block text-center text-xs text-brand-400 hover:underline"
              >
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
                    value={form.gross_earned} onChange={handle}
                    placeholder="e.g. 1200" required />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Platform Deductions</label>
                  <input name="platform_deductions" type="number" min="0" step="0.01"
                    value={form.platform_deductions} onChange={handle} placeholder="e.g. 180" />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Net Received (PKR)</label>
                  <input name="net_received" type="number" min="0" step="0.01"
                    value={form.net_received} onChange={handle}
                    placeholder="Auto-calculated" required />
                </div>
                <div>
                  <label className="section-label block mb-1.5">Hours Worked</label>
                  <input name="hours_worked" type="number" min="0" step="0.5"
                    value={form.hours_worked} onChange={handle} placeholder="e.g. 4" />
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
                  placeholder="https://... (link to your earnings screenshot)" />
              </div>
              <div>
                <label className="section-label block mb-1.5">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handle}
                  placeholder="Any notes about this shift..." rows={2}
                  className="resize-none" />
              </div>

              {error && <p className="text-red text-sm bg-red/10 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
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
