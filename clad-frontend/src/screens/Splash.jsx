import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

export function Splash() {
  const { go, set } = useStore()
  const [phase, setPhase] = useState('logo')

  useEffect(() => { const t = setTimeout(() => setPhase('role'), 1800); return () => clearTimeout(t) }, [])

  if (phase === 'logo') return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div className="fu1" style={{ width: 82, height: 82, borderRadius: 28, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 48px rgba(255,255,255,0.12)' }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" fill="rgba(26,107,58,0.12)" stroke="#1A6B3A" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="#1A6B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="fu2" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: 'white', letterSpacing: '-0.035em', lineHeight: 1 }}>Clad</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Income Insurance</div>
        </div>
        <div className="fu3" style={{ display: 'flex', gap: 6 }}>
          {['Rain','AQI','Flood','Storm'].map((t,i) => (
            <div key={t} style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, animation: `fadeUp 0.3s ${0.5+i*0.08}s both` }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 28 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 6px 24px rgba(255,255,255,0.1)' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" fill="rgba(26,107,58,0.12)" stroke="#1A6B3A" strokeWidth="1.8"/><path d="M9 12l2 2 4-4" stroke="#1A6B3A" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'white', letterSpacing: '-0.025em', marginBottom: 8 }}>Welcome to Clad</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Who are you logging in as?</div>
        </div>

        {[
          { emoji:'🛵', title:'Gig Delivery Worker', sub:'File claims · View coverage · Receive UPI payouts', action:() => { set('role','worker'); go('ob1') }, accent:'#1A6B3A', accentBg:'rgba(26,107,58,0.2)', accentBd:'rgba(26,107,58,0.35)' },
          { emoji:'🏢', title:'Insurer / Admin',     sub:'Loss ratios · Fraud analytics · Predictive forecasts', action:() => { set('role','admin'); go('adminlogin') }, accent:'#2563EB', accentBg:'rgba(37,99,235,0.2)', accentBd:'rgba(37,99,235,0.35)' },
        ].map(r => (
          <button key={r.title} onClick={r.action}
            style={{ width: '100%', padding: 20, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 20, cursor: 'pointer', textAlign: 'left', fontFamily: 'Bricolage Grotesque', display: 'flex', gap: 16, alignItems: 'center', transition: 'all .16s' }}
            onPointerDown={e => { e.currentTarget.style.background = r.accentBg; e.currentTarget.style.borderColor = r.accent }}
            onPointerUp={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; r.action() }}
            onPointerLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: r.accentBg, border: `1px solid ${r.accentBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{r.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{r.sub}</div>
            </div>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        ))}

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', fontWeight: 600 }}>
          Guidewire DEVTrails 2026 · Team 4AM Club
        </div>
      </div>
    </div>
  )
}