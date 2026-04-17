import { useEffect, useState } from 'react'
import { useStore, fmt, planConfig } from '../store/useStore'
import { SBar, RainDrops, CheckIcon, CloseIcon, Spinner } from '../components/UI'

// ── ALERT ─────────────────────────────────────────────────────
export function Alert() {
  const store = useStore()
  const { triggerResult, selectedZone, pincode, plan, avgDailyEarning, latestClaim } = store
  const cfg     = planConfig[plan] || planConfig.plus
  const weather = triggerResult?.weather_readings || {}
  const aqi     = triggerResult?.aqi_readings?.aqi || weather.aqi || 97
  const fired   = triggerResult?.triggers_fired || []
  const checks  = triggerResult?.triggers_checked || []
  const claimAmt = latestClaim?.amount
    ? Math.round(latestClaim.amount)
    : Math.round(avgDailyEarning * cfg.rate)

  return (
    <div className="screen">
      {/* Rain header */}
      <div style={{ background:'linear-gradient(180deg,#061628 0%,var(--bg) 100%)', position:'relative', overflow:'hidden', minHeight:230, flexShrink:0 }}>
        <SBar />
        <RainDrops />
        <div style={{ padding:'4px 22px 20px', position:'relative', zIndex:2 }}>
          <div className="tag fu1" style={{ background:'rgba(255,100,50,.12)', color:'#FF7B50', border:'1px solid rgba(255,100,50,.22)', marginBottom:14 }}>
            ● {fired.length} trigger{fired.length !== 1 ? 's' : ''} fired
          </div>
          <div className="display fu2" style={{ fontSize:36, color:'var(--t1)', lineHeight:1.18, marginBottom:8 }}>Disruption<br/>detected.</div>
          <div className="fu3" style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:7, height:7, borderRadius:3.5, background:'var(--green)', boxShadow:'0 0 8px var(--green)' }} />
            <span style={{ fontSize:13, color:'var(--t2)' }}>{selectedZone} · Pincode {pincode}</span>
          </div>
        </div>
      </div>

      <div className="scroll-content" style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Trigger checks */}
        <div className="fu1 glass" style={{ padding:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>5 Automated Triggers</div>
          {(checks.length > 0 ? checks : fired.map(t => ({ trigger:t, condition:'Threshold exceeded', fired:true }))).map((t, i) => (
            <div key={i} className="check-item" style={{ animation:`slideInRow 0.3s ${i*0.07}s both` }}>
              <div style={{ width:22, height:22, borderRadius:7, background: t.fired ? 'var(--green)' : 'var(--s3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: t.fired ? '0 0 8px rgba(0,230,118,.3)' : 'none' }}>
                {t.fired
                  ? <CheckIcon size={11} color="#080808" />
                  : <CloseIcon size={11} />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color: t.fired ? 'var(--t1)' : 'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {t.trigger.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
                </div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}>{t.condition}</div>
              </div>
              <div className={`tag ${t.fired?'tag-green':'tag-dim'}`} style={{ fontSize:9, flexShrink:0 }}>{t.fired?'FIRED':'—'}</div>
            </div>
          ))}
        </div>

        {/* Live readings */}
        <div className="fu2 glass" style={{ padding:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>Live Readings</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              [weather.rain_intensity ? `${weather.rain_intensity}mm/hr` : '—', 'Rain intensity', true],
              [weather.duration       ? `${weather.duration}min`         : '—', 'Duration',       true],
              [`AQI ${aqi}`,                                                     'Air quality',    false],
              [`${weather.wind_speed||'—'} km/h`,                                'Wind speed',     false],
            ].map(([v,l,hi]) => (
              <div key={l} style={{ background: hi ? 'rgba(0,230,118,.07)' : 'var(--s2)', borderRadius:13, padding:13, border:`1px solid ${hi?'rgba(0,230,118,.13)':'var(--b1)'}` }}>
                <div className="display" style={{ fontSize:18, color: hi ? 'var(--green)' : 'var(--t1)' }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payout calc */}
        <div className="fu3" style={{ background:'linear-gradient(135deg,rgba(0,230,118,.08),rgba(0,230,118,.02))', border:'1px solid rgba(0,230,118,.14)', borderRadius:22, padding:18 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:14 }}>Your Payout</div>
          {[["Earning DNA", fmt(avgDailyEarning)], [`${cfg.label} rate`, `× ${Math.round(cfg.rate*100)}%`]].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--t2)', padding:'3px 0' }}>
              <span>{k}</span><span style={{ color:'var(--t1)', fontWeight:700 }}>{v}</span>
            </div>
          ))}
          <div style={{ height:1, background:'rgba(0,230,118,.12)', margin:'12px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>You receive</span>
            <div className="display" style={{ fontSize:42, color:'var(--green)', filter:'drop-shadow(0 0 16px rgba(0,230,118,.4))' }}>{fmt(claimAmt)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 14px 32px', flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-primary fu4" onClick={() => store.go('claiming')} style={{ fontSize:16 }}>
          Claim {fmt(claimAmt)} Now →
        </button>
        <button className="btn btn-ghost fu5" onClick={() => store.go('home')}>Back to home</button>
      </div>
    </div>
  )
}

// ── CLAIMING ──────────────────────────────────────────────────
export function Claiming() {
  const store = useStore()
  const [step, setStep] = useState(0)
  const [prog, setProg] = useState(0)
  const steps = [
    'Validating trigger data…',
    'Running 15 fraud signals…',
    `Zone consensus: ${store.selectedZone}…`,
    'Initiating UPI transfer…',
  ]

  useEffect(() => {
    const iv = setInterval(() => {
      setStep(s => {
        const n = s + 1
        setProg((n / steps.length) * 100)
        if (n >= steps.length) { clearInterval(iv); setTimeout(() => store.go('payout'), 600) }
        return n
      })
    }, 750)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="screen" style={{ background:'linear-gradient(160deg,#090909,#061512,#090909)', justifyContent:'center', alignItems:'center', padding:28 }}>
      <div style={{ position:'absolute', top:'45%', left:'50%', transform:'translate(-50%,-50%)', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,230,118,.09),transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1, width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
        <div style={{ width:68, height:68, borderRadius:22, background:'rgba(0,230,118,.1)', border:'1px solid rgba(0,230,118,.18)', display:'flex', alignItems:'center', justifyContent:'center', animation:'glowBox 1.3s ease-in-out infinite' }}>
          <svg width="30" height="30" fill="none" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div className="display" style={{ fontSize:28, color:'var(--t1)', marginBottom:6 }}>Processing<br/>your claim</div>
          <div style={{ fontSize:13, color:'var(--t3)' }}>Zero-touch · Under 3 seconds</div>
        </div>
        <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
          {steps.map((s, i) => {
            const done = i < step; const active = i === step
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 14px', borderRadius:12, background: active ? 'rgba(0,230,118,.06)' : 'transparent', border:`1px solid ${active?'rgba(0,230,118,.1)':'transparent'}`, opacity: i > step ? 0.28 : 1, transition:'all .35s ease' }}>
                <div style={{ width:22, height:22, borderRadius:7, flexShrink:0, background: done ? 'var(--green)' : active ? 'rgba(0,230,118,.14)' : 'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {done ? <CheckIcon size={11} color="#080808" /> : active ? <div style={{ width:7, height:7, borderRadius:3.5, background:'var(--green)', animation:'glowPulse .9s ease-in-out infinite' }} /> : null}
                </div>
                <span style={{ fontSize:13, color:'var(--t1)', fontWeight:500 }}>{s}</span>
              </div>
            )
          })}
        </div>
        <div style={{ width:'100%' }}>
          <div className="pbar" style={{ height:4 }}>
            <div className="pfill" style={{ width:`${prog}%`, background:'linear-gradient(90deg,rgba(0,230,118,.6),var(--green))', boxShadow:'0 0 10px rgba(0,230,118,.35)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PAYOUT ────────────────────────────────────────────────────
export function Payout() {
  const store = useStore()
  const { latestClaim, plan, cladScore, cladGrade, selectedZone, policy, payoutPenaltyNote, name } = store
  const cfg = planConfig[plan] || planConfig.plus
  const amt = latestClaim?.amount ? fmt(latestClaim.amount) : fmt(Math.round(store.avgDailyEarning * cfg.rate))
  const ref = latestClaim?.id ? `GS-${String(latestClaim.id).padStart(4,'0')}` : `GS-${Date.now().toString().slice(-4)}`

  useEffect(() => {
    if (name) api_loadClaims(name, store)
  }, [])

  return (
    <div className="screen" style={{ background:'linear-gradient(160deg,#060f08,var(--bg) 60%)', justifyContent:'center', alignItems:'center', padding:28 }}>
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,230,118,.13),transparent 70%)', filter:'blur(48px)', animation:'glowPulse 3s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1, width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
        {/* Check icon */}
        <div style={{ width:80, height:80, borderRadius:26, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 50px rgba(0,230,118,.45),0 0 100px rgba(0,230,118,.15)', animation:'scaleSpring .5s cubic-bezier(.34,1.56,.64,1) both' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="#080808" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="0" style={{ animation:'checkDraw .4s .2s ease both' }}/></svg>
        </div>
        {/* Amount */}
        <div style={{ textAlign:'center', animation:'countUp .5s cubic-bezier(.34,1.56,.64,1) .15s both' }}>
          <div style={{ fontSize:12, color:'var(--t3)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:5 }}>Payout sent</div>
          <div className="display" style={{ fontSize:68, color:'var(--green)', lineHeight:1, filter:'drop-shadow(0 0 24px rgba(0,230,118,.45))' }}>{amt}</div>
          <div style={{ fontSize:14, color:'var(--t3)', marginTop:5 }}>Credited · {cfg.speed}</div>
        </div>
        {/* Details */}
        <div className="glass" style={{ width:'100%', padding:18, animation:'fadeUp .4s .3s cubic-bezier(.16,1,.3,1) both' }}>
          {[['Reference',ref],['Plan',cfg.label],['CladScore',`${cladScore} · ${cladGrade}`],['Status','✓ Credited']].map(([k,v],i,a) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i<a.length-1 ? '1px solid var(--b1)' : 'none' }}>
              <span style={{ fontSize:13, color:'var(--t3)' }}>{k}</span>
              <span style={{ fontSize:13, color:'var(--t1)', fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Zone note */}
        <div style={{ width:'100%', background:'rgba(0,230,118,.05)', border:'1px solid rgba(0,230,118,.1)', borderRadius:13, padding:'12px 15px', animation:'fadeUp .4s .4s both' }}>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6 }}>
            Zone <span style={{ color:'var(--green)', fontWeight:700 }}>{selectedZone}</span> consensus verified.{' '}
            {payoutPenaltyNote ? <span style={{ color:'var(--amber)', fontWeight:700 }}>⚠ {payoutPenaltyNote}</span> : 'No fraud flags. Auto-approved.'}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => store.go('home')} style={{ width:'100%', animation:'fadeUp .4s .5s both' }}>
          Back to Home
        </button>
      </div>
    </div>
  )
}

async function api_loadClaims(name, store) {
  try {
    const { api } = await import('../api/clad')
    const d = await api.getClaims(name)
    store.onClaimsLoaded(d.claims || [])
  } catch {}
}

// ── CLAIM REJECTED ────────────────────────────────────────────
export function ClaimRejected() {
  const store = useStore()
  const { cladScore, cladGrade, falseClaims } = store
  const penalty = falseClaims >= 3 ? 15 : falseClaims === 2 ? 10 : 8

  return (
    <div className="screen" style={{ background:'linear-gradient(160deg,#100808,var(--bg) 60%)', justifyContent:'center', alignItems:'center', padding:28 }}>
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,82,82,.09),transparent 70%)', filter:'blur(45px)', pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:1, width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:18 }}>
        <div style={{ width:80, height:80, borderRadius:26, background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 50px rgba(255,82,82,.4)', animation:'scaleSpring .5s cubic-bezier(.34,1.56,.64,1) both' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
        </div>
        <div style={{ textAlign:'center', animation:'countUp .5s .15s both' }}>
          <div style={{ fontSize:11, color:'var(--red)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:5 }}>Claim Rejected</div>
          <div className="display" style={{ fontSize:36, color:'var(--t1)', lineHeight:1.15 }}>No active<br/>trigger found.</div>
          <div style={{ fontSize:14, color:'var(--t3)', marginTop:8, lineHeight:1.6 }}>The event you selected isn't<br/>currently active in your zone.</div>
        </div>
        <div style={{ width:'100%', background:'rgba(255,82,82,.07)', border:'1px solid rgba(255,82,82,.18)', borderRadius:18, padding:18, animation:'fadeUp .4s .3s both' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--red)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:13 }}>⚠ CladScore Penalty</div>
          {[['Reason','False claim attempt'],[`Score change`,`− ${penalty} pts (attempt ${falseClaims})`],['New CladScore',`${cladScore} · ${cladGrade}`]].map(([k,v],i,a) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i<a.length-1?'1px solid rgba(255,82,82,.12)':'none' }}>
              <span style={{ fontSize:13, color:'var(--t2)' }}>{k}</span>
              <span style={{ fontSize:13, color: i===1?'var(--red)':'var(--t1)', fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ width:'100%', background:'var(--s1)', border:'1px solid var(--b1)', borderRadius:13, padding:'13px 15px', animation:'fadeUp .4s .4s both' }}>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.65 }}>
            Claims need a live trigger — rain, AQI spike, waterlogging, storm, or curfew. <span style={{ color:'var(--green)', fontWeight:700 }}>Repeat false claims lower your score further.</span>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => store.go('home')} style={{ width:'100%', animation:'fadeUp .4s .5s both' }}>
          Back to Home
        </button>
      </div>
    </div>
  )
}