import { useEffect, useState } from 'react'
import { useStore, fmt, inits, planConfig, scoreLabel, scoreColor } from '../store/useStore'
import { SBar, BNav, ScoreRing, CheckIcon, Toast } from '../components/UI'
import { api } from '../api/clad'

// ── POLICY ────────────────────────────────────────────────────
export function Policy() {
  const store = useStore()
  const { name, plan, policy, premiumData, cladScore, cladGrade, pincode } = store
  const cfg = planConfig[plan] || planConfig.plus
  const [scanning, setScanning] = useState(false)

  const TRIGGERS = [
    { emoji:'🌧', name:'Heavy Rain',    thresh:'> 7.5mm/hr · 45+ min', rate:`${Math.round(cfg.rate*100)}%`, accent:'var(--blue)',   bg:'var(--blue-bg)'   },
    { emoji:'😷', name:'AQI Spike',     thresh:'AQI > 150 · Unhealthy', rate:'30%',                         accent:'var(--amber)',  bg:'var(--amber-bg)'  },
    { emoji:'🌊', name:'Waterlogging',  thresh:'Zone score > 0.65',      rate:'50%',                         accent:'var(--blue)',   bg:'var(--blue-bg)'   },
    { emoji:'🌪', name:'Cyclone/Wind',  thresh:'Wind > 60 km/h',          rate:'50%',                         accent:'var(--red)',    bg:'var(--red-bg)'    },
    { emoji:'⚠️', name:'Strike/Curfew', thresh:'Civil alert active',       rate:'60%',                         accent:'var(--amber)',  bg:'var(--amber-bg)'  },
  ]

  const scanNow = async () => {
  setScanning(true)

  try {
    const d = await api.checkTriggers(pincode)
    store.onTriggerResult(d)

    if (d.triggers_fired?.length > 0) {
      // ✅ GO TO ALERT SCREEN
      store.go('alert')
    } else {
      // optional: small feedback
      store.set('notification', {
  message: 'No triggers right now ❌'
})

// ⏳ auto hide after 2 sec
setTimeout(() => {
  store.set('notification', null)
}, 2000)
    }

  } catch (e) {
    console.log("Error scanning triggers")
  } finally {
    setScanning(false)
  }
}

  return (
    <div className="screen">
      {/* Dark header */}
      <div style={{ background:'#111110', flexShrink:0 }}>
        <SBar dark />
        <div style={{ padding:'2px 22px 22px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>My Shield</div>
          <div style={{ fontSize:28, fontWeight:800, color:'white', letterSpacing:'-0.025em' }}>Policy Details</div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Plan card */}
        <div className="card-shadow" style={{ padding:20, background:`linear-gradient(135deg,${cfg.bgColor},white)`, border:`1.5px solid ${cfg.color}22` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <span className="tag tag-green" style={{ fontSize:10, marginBottom:8, display:'inline-flex' }}>● Active</span>
              <div style={{ fontSize:24, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>{cfg.label}</div>
              {policy && <div style={{ fontSize:11, color:'var(--t3)', fontWeight:600, marginTop:4 }}>Policy #{policy.id} · Since {policy.created_at?new Date(policy.created_at).toLocaleDateString('en-IN'):'today'}</div>}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:2 }}>weekly</div>
              <div style={{ fontSize:28, fontWeight:800, color:cfg.color, letterSpacing:'-0.03em' }}>₹{cfg.price}</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {[[cfg.capStr,'Weekly cap'],[cfg.speed,'Payout speed'],['5','Triggers']].map(([v,l]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.8)', borderRadius:12, padding:'11px 10px', textAlign:'center', border:'1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:14, fontWeight:800, color:cfg.color }}>{v}</div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ML Premium */}
        {premiumData && (
          <div className="card-shadow" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>ML Premium Engine</div>
              <span className={`tag ${premiumData.ml_used?'tag-green':'tag-amber'}`} style={{ fontSize:9 }}>{premiumData.ml_used?'LightGBM':'Actuarial'}</span>
            </div>
            {(premiumData.breakdown||[]).map((b,i,a) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:i<a.length-1?'1px solid var(--border)':'none' }}>
                <span style={{ color:'var(--t2)', fontWeight:500 }}>{b.factor}</span>
                <span style={{ fontWeight:700, color:b.direction==='discount'?'var(--green)':b.direction==='base'?'var(--t1)':'var(--red)' }}>
                  {b.direction==='discount'?'− ':b.direction==='base'?'':'+ '}₹{Math.abs(b.amount)}
                </span>
              </div>
            ))}
            <div style={{ marginTop:14, background:'var(--green-bg)', border:'1px solid var(--green-bd)', borderRadius:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>Weekly premium</span>
              <span style={{ fontSize:20, fontWeight:800, color:'var(--green)', letterSpacing:'-0.03em' }}>₹{premiumData.predicted_premium}</span>
            </div>
          </div>
        )}

        {/* CladScore */}
        <div className="card-shadow" style={{ padding:18 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:14 }}>CladScore</div>
          <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:14 }}>
            <ScoreRing score={cladScore} size={58} />
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:scoreColor(cladScore), letterSpacing:'-0.02em' }}>{cladScore}/100</div>
              <div style={{ fontSize:13, color:'var(--t2)', fontWeight:600, marginTop:2 }}>Grade {cladGrade} · {scoreLabel(cladScore)}</div>
            </div>
          </div>
          <div className="pbar" style={{ height:6, borderRadius:3 }}>
            <div className="pfill" style={{ width:`${cladScore}%`, background:`linear-gradient(90deg,${scoreColor(cladScore)},${scoreColor(cladScore)}aa)`, borderRadius:3 }} />
          </div>
        </div>

        {/* 5 Triggers */}
        <div className="card-shadow" style={{ padding:18 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:4 }}>5 Automated Triggers</div>
          <div style={{ fontSize:12, color:'var(--t3)', fontWeight:600, marginBottom:14 }}>Auto-payouts when these thresholds are exceeded</div>
          {TRIGGERS.map((t,i,a) => (
            <div key={t.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:i<a.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ width:40, height:40, borderRadius:13, background:t.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{t.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{t.name}</div>
                <div style={{ fontSize:11, color:'var(--t3)', fontWeight:500 }}>{t.thresh}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:800, color:t.accent }}>{t.rate}</div>
            </div>
          ))}
        </div>

        {/* Exclusions */}
        <div className="card-shadow" style={{ padding:18 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:14 }}>Not covered</div>
          {['War, terrorism, nuclear events','Nationwide lockdown or pandemic','Worker-caused disruption','Claims filed >6 hours after event','Activity outside registered zone'].map((e,i,a) => (
            <div key={e} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:i<a.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ width:18, height:18, borderRadius:5, background:'var(--red-bg)', border:'1px solid var(--red-bd)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <svg width="8" height="8" fill="none" viewBox="0 0 12 12"><path d="M9 3L3 9M3 3l6 6" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize:12, color:'var(--t2)', fontWeight:500, lineHeight:1.5 }}>{e}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingBottom:10 }}>
          <button className="btn btn-ink" onClick={() => store.go('manualclaim')}>⚡ File Manual Claim</button>
          <button className="btn btn-outline-green" disabled={scanning} onClick={scanNow}>
            {scanning?'Scanning…':'🔍 Scan Live Triggers'}
          </button>
            <Toast msg={store.notification?.message} />
        </div>
      </div>
      <BNav active="policy" />
    </div>
  )
}

// ── PROFILE ───────────────────────────────────────────────────
export function Profile() {
  const store = useStore()
  const { name, cladScore, cladGrade, plan, worker, avgDailyEarning, claimsHistory, selectedZone, platform } = store
  const cfg = planConfig[plan] || planConfig.plus
  const [health, setHealth] = useState(null)

  useEffect(() => {
    if(name) api.getClaims(name).then(d=>store.onClaimsLoaded(d.claims||[])).catch(()=>{})
    api.health().then(setHealth).catch(()=>{})
  }, [name])

  const total = claimsHistory.reduce((s,c)=>s+(c.amount||0),0)

  return (
    <div className="screen">
      <div style={{ background:'#111110', flexShrink:0 }}>
        <SBar dark />
        <div style={{ padding:'2px 22px 22px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:18, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:'white', flexShrink:0 }}>{inits(name)}</div>
          <div>
            <div style={{ fontSize:21, fontWeight:800, color:'white', letterSpacing:'-0.02em' }}>{name||'Partner'}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.38)', fontWeight:600 }}>{platform||'Zepto'} · {selectedZone}</div>
          </div>
        </div>
      </div>

      <div className="scroll-body" style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[[`₹${Math.round(worker?.avg_daily_earning||avgDailyEarning)}`,'Daily avg','var(--t1)'],[worker?.delivery_consistency?`${Math.round(worker.delivery_consistency*100)}%`:'88%','Consistency',scoreColor(cladScore)],[`${claimsHistory.length}`,'Total claims','var(--t1)']].map(([v,l,c]) => (
            <div key={l} className="card-shadow" style={{ padding:'14px 12px', textAlign:'center' }}>
              <div style={{ fontSize:17, fontWeight:800, color:c, letterSpacing:'-0.02em', marginBottom:3 }}>{v}</div>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Score */}
        <div className="card-shadow" style={{ padding:18, display:'flex', gap:14, alignItems:'center' }}>
          <ScoreRing score={cladScore} size={60} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--t1)', marginBottom:3 }}>CladScore · {scoreLabel(cladScore)}</div>
            <div style={{ fontSize:12, color:'var(--t3)', fontWeight:600, marginBottom:8 }}>Grade {cladGrade} · {cfg.label}</div>
            <div className="pbar" style={{ height:6, borderRadius:3 }}>
              <div className="pfill" style={{ width:`${cladScore}%`, background:`linear-gradient(90deg,${scoreColor(cladScore)},${scoreColor(cladScore)}bb)`, borderRadius:3 }} />
            </div>
          </div>
        </div>

        {/* Earning DNA */}
        <div className="card-shadow" style={{ padding:18 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:14 }}>Earning DNA</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {[[fmt(Math.round(avgDailyEarning*.88)),'Weekday avg','var(--t1)'],[fmt(Math.round(avgDailyEarning*1.25)),'Weekend avg','var(--green)'],['7–9 PM','Peak hours','var(--amber)'],['Sunday','Best day','var(--blue)']].map(([v,l,c]) => (
              <div key={l} style={{ background:'var(--bg2)', borderRadius:13, padding:13, textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:2, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-bd)', borderRadius:12, padding:'11px 13px', fontSize:12, color:'var(--green)', lineHeight:1.5, fontWeight:600 }}>
            Payouts based on <strong>your</strong> actual earnings — LightGBM model trained on 8,000 samples.
          </div>
        </div>

        {/* Claim history */}
        {claimsHistory.length > 0 && (
          <div className="card-shadow" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>Claim History</div>
            </div>
            {claimsHistory.slice(-5).reverse().map((c,i,a) => (
              <div key={c.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:i<a.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:c.status==='approved'?'var(--green-bg)':'var(--amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    {c.trigger==='heavy_rain'?'🌧':c.trigger==='aqi_spike'?'😷':c.trigger==='waterlogging'?'🌊':'⚡'}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{(c.trigger||'weather').replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', fontWeight:500 }}>{c.created_at?new Date(c.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric'}):'—'}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--green)' }}>{fmt(c.amount)}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:c.status==='approved'?'var(--green)':'var(--amber)' }}>{(c.status||'approved').toUpperCase()}</div>
                </div>
              </div>
            ))}
            {total>0 && (
              <div style={{ marginTop:12, background:'var(--green-bg)', border:'1px solid var(--green-bd)', borderRadius:12, padding:'11px 14px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--green)' }}>Total claimed</span>
                <span style={{ fontSize:18, fontWeight:800, color:'var(--green)' }}>{fmt(total)}</span>
              </div>
            )}
          </div>
        )}

        {/* System */}
        <div className="card-shadow" style={{ padding:16, marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:12 }}>System Status</div>
          {health ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['API','v'+health.version],['Workers',health.workers],['Policies',health.policies],['Claims',health.claims]].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--t3)', fontWeight:600 }}>{k}</span>
                  <span style={{ fontSize:12, color:'var(--green)', fontWeight:800 }}>{v}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>⚠ Backend offline</div>}
        </div>
      </div>
        <div style={{ padding: '10px 14px' }}>
  <button
    className="btn btn-outline-red"
    onClick={() => store.logout()}
  >
    🚪 Logout
  </button>
</div>
      <BNav active="profile" />
    </div>
  )
}