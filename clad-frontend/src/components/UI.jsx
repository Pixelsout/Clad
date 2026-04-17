import { useRef } from 'react'
import { useStore, scoreColor, TRIGGER_META } from '../store/useStore'

export function SBar({ dark }) {
  const t    = new Date()
  const time = `${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`
  return (
    <div className={`sbar ${dark?'sbar-dark':'sbar-light'}`}>
      <span style={{ fontWeight:700 }}>{time}</span>
      <span style={{ display:'flex', gap:5, alignItems:'center', fontSize:11 }}>
        <span>●●●●</span><span>WiFi</span><span>🔋</span>
      </span>
    </div>
  )
}

export function Steps({ step, total=4 }) {
  return (
    <div className="steps">
      {Array.from({ length:total }, (_,i) => <div key={i} className={`sdot${i<=step?' on':''}`} />)}
    </div>
  )
}

export function BNav({ active }) {
  const go = useStore(s => s.go)
  return (
    <div className="bnav">
      {[
        { id:'home',    label:'Home',   Icon:HomeIcon   },
        { id:'policy',  label:'Policy', Icon:ShieldIcon },
        { id:'profile', label:'You',    Icon:UserIcon   },
      ].map(({ id,label,Icon }) => (
        <div key={id} className={`ni${active===id?' on':''}`} onClick={() => go(id)}>
          <div className="ni-icon" style={{ color:active===id?'var(--green)':'var(--t3)' }}><Icon size={17} /></div>
          <div className="ni-lbl">{label}</div>
        </div>
      ))}
    </div>
  )
}

export function ScoreRing({ score, size=60 }) {
  const r    = 24
  const circ = 2 * Math.PI * r
  const off  = circ - (circ * score / 100)
  const col  = scoreColor(score)
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--bg2)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={col} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
        style={{ transform:'rotate(-90deg)', transformOrigin:'28px 28px', transition:'stroke-dashoffset 0.9s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="12" fontWeight="800"
        fill={col} fontFamily="Bricolage Grotesque">{score}</text>
    </svg>
  )
}

export function Toast({ msg, type='error' }) {
  if (!msg) return null
  const styles = {
    error:   { bg:'var(--red-bg)',   border:'var(--red-bd)',   color:'var(--red)'   },
    success: { bg:'var(--green-bg)', border:'var(--green-bd)', color:'var(--green)' },
    warn:    { bg:'var(--amber-bg)', border:'var(--amber-bd)', color:'var(--amber)' },
  }
  const s = styles[type] || styles.error
  return (
    <div style={{ margin:'0 0 12px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:12, padding:'11px 14px', fontSize:13, color:s.color, fontWeight:600, textAlign:'center' }}>
      {msg}
    </div>
  )
}

export function TriggerBadge({ type }) {
  const m = TRIGGER_META[type] || TRIGGER_META.heavy_rain
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:999, background:m.bg, border:`1px solid ${m.border}`, fontSize:12, fontWeight:700, color:m.color }}>
      <span>{m.emoji}</span> {m.title}
    </div>
  )
}

export function Spinner({ dark }) {
  return <span className={dark?'spinner spinner-dark':'spinner'} style={{ marginRight:0 }} />
}

// Icons
export const HomeIcon    = ({ size=18, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V21a.5.5 0 01-.5.5H15v-6H9v6H3.5A.5.5 0 013 21V10.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></svg>
export const ShieldIcon  = ({ size=18, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.5 3.5 10.5 8 12 4.5-1.5 8-6.5 8-12V6l-8-4z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></svg>
export const UserIcon    = ({ size=18, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>
export const CheckIcon   = ({ size=14, color='white' })        => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
export const CameraIcon  = ({ size=22, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8"/></svg>
export const BoltIcon    = ({ size=18, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
export const ArrowRight  = ({ size=16, color='currentColor' }) => <svg width={size} height={size} fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>