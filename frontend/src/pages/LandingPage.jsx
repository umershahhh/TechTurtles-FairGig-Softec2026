import { Link } from 'react-router-dom'
import { Zap, Shield, TrendingUp, Users, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: TrendingUp, title: 'Earnings Intelligence',
    desc: 'Log every shift, track effective hourly rates, and see exactly how platform commissions erode your income.',
    color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)',
  },
  {
    icon: Shield, title: 'Verified Income Reports',
    desc: 'Upload earnings screenshots. Our verifiers confirm them so you can prove income to banks and landlords.',
    color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)',
  },
  {
    icon: Zap, title: 'Anomaly Alerts',
    desc: 'AI-powered detection flags unusual deductions, sudden rate changes, and income drops with plain-language explanations.',
    color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',
  },
  {
    icon: Users, title: 'Worker Community',
    desc: 'Post rate intelligence, share platform complaints, and connect with labour advocates — anonymously if you prefer.',
    color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)',
  },
]

const roles = [
  {
    role: 'Worker', badge: 'badge-green', border: 'rgba(34,197,94,0.2)', glow: 'rgba(34,197,94,0.07)',
    items: ['Log shifts & earnings', 'Upload screenshots', 'See income analytics', 'Generate income reports', 'Post on community board'],
  },
  {
    role: 'Verifier', badge: 'badge-blue', border: 'rgba(59,130,246,0.2)', glow: 'rgba(59,130,246,0.07)',
    items: ['Review earnings screenshots', 'Confirm or flag anomalies', 'Mark records unverifiable', 'Leave verifier notes'],
  },
  {
    role: 'Advocate', badge: 'badge-violet', border: 'rgba(139,92,246,0.2)', glow: 'rgba(139,92,246,0.07)',
    items: ['Platform commission trends', 'Income distribution by city', 'Vulnerability flags', 'Cluster & escalate complaints'],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden relative" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* Orbs */}
      <div className="orb w-[500px] h-[500px]" style={{ background: '#22c55e', opacity: 0.06, top: '-10%', left: '20%' }} />
      <div className="orb w-80 h-80"  style={{ background: '#8b5cf6', opacity: 0.05, top: '30%', right: '-5%', animationDelay: '4s' }} />
      <div className="orb w-64 h-64"  style={{ background: '#3b82f6', opacity: 0.05, bottom: '15%', left: '5%', animationDelay: '2s' }} />

      {/* Nav */}
      <nav className="relative flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap size={15} className="text-white" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>FairGig</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="btn-ghost text-sm">Sign In</Link>
          <Link to="/register" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative text-center px-6 pt-24 pb-20">
        <div className="fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80' }}>
          <div className="pulse-dot" />
          Built for gig workers, by their advocates
        </div>

        <h1 className="fade-up-1 font-display text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto mb-6"
          style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Your income.{' '}
          <span className="gradient-text">Verified.</span>{' '}
          Your rights.{' '}
          <span className="gradient-text">Protected.</span>
        </h1>

        <p className="fade-up-2 text-lg max-w-xl mx-auto mb-10" style={{ color: 'var(--ink-muted)', lineHeight: 1.7 }}>
          FairGig gives ride-hailing drivers, food delivery riders, and freelancers
          a unified record of earnings, anomaly detection, and a collective voice.
        </p>

        <div className="fade-up-3 flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-7 py-3">
            Start Tracking Free <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-ghost text-base px-6 py-3">Sign In</Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-8 pb-24 max-w-5xl mx-auto">
        <p className="section-label text-center mb-8">What FairGig does for you</p>
        <div className="grid md:grid-cols-2 gap-4 stagger">
          {features.map(f => (
            <div key={f.title} className="card card-hover"
              style={{ borderColor: f.border }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
                style={{ background: f.bg }}>
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 className="font-display font-bold text-base mb-2" style={{ color: 'var(--ink)' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role cards */}
      <section className="relative px-8 pb-24 max-w-5xl mx-auto">
        <p className="section-label text-center mb-8">Three roles. One platform.</p>
        <div className="grid md:grid-cols-3 gap-4 stagger">
          {roles.map(r => (
            <div key={r.role} className="card card-hover"
              style={{ borderColor: r.border, background: `linear-gradient(135deg, ${r.glow} 0%, var(--bg-card) 50%)` }}>
              <span className={`badge ${r.badge} mb-4`}>{r.role}</span>
              <ul className="space-y-2.5 mt-1">
                {r.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-muted)' }}>
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative text-center px-6 pb-24">
        <div className="card max-w-xl mx-auto fade-up" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, var(--bg-card) 60%)' }}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-3" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Ready to take control?
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>
            Join FairGig and start building a verifiable income record today. Free forever.
          </p>
          <Link to="/register" className="btn-primary px-8 py-3">
            Create Free Account <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  )
}