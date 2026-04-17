import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore, fmt, inits, planConfig, scoreLabel, scoreColor, TRIGGER_META } from '../store/useStore'
import { SBar, BNav, ScoreRing, BoltIcon, ShieldIcon, CheckIcon } from '../components/UI'
import { api } from '../api/clad'

export function Home() {
  const store = useStore()
  const { name, cladScore, cladGrade, plan, premiumData, notification,
          claimsHistory, selectedZone, pincode, avgDailyEarning, policy } = store
  const cfg     = planConfig[plan] || planConfig.plus
  const weekPaid = claimsHistory.filter(c => {
    try { return new Date(c.created_at) > new Date(Date.now()-7*86400000) && c.status==='approved' } catch { return false }
  }).reduce((s,c)=>s+(c.amount||0),0)
  const capPct  = Math.min(weekPaid/cfg.cap*100, 100)

  useEffect(() => {
    if (name) api.getClaims(name).then(d => store.onClaimsLoaded(d.claims||[])).catch(()=>{})
  }, [name])

  const hour = new Date().getHours()
  const tod  = hour<12?'Morning':hour<17?'Afternoon':'Evening'

  return (
    // FIX 1: Use overflow-hidden on the outer screen so the inner scroll-body
    // can flex-grow properly without the header taking unbounded space
    <div className="screen" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* DARK HEADER — flexShrink:0 so it never compresses */}
      <div style={{ background:'#111110', flexShrink:0 }}>
        <SBar dark />
        <div style={{ padding:'2px 20px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.38)', fontWeight:600, marginBottom:3 }}>Good {tod},</div>
            <div style={{ fontSize:28, fontWeight:800, color:'white', letterSpacing:'-0.025em' }}>{name||'Partner'} 👋</div>
          </div>
          <div style={{ width:44, height:44, borderRadius:15, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:15, color:'white', flexShrink:0 }}>
            {inits(name)}
          </div>
        </div>
      </div>

      {/* NOTIFICATION BANNER — rendered INSIDE scroll so it doesn't steal layout height */}
      {/* FIX 2: Moved into scroll-body so coverage card is always fully visible on load */}

      {/* SCROLLABLE CONTENT — minHeight:0 is critical for flex children to scroll correctly */}
      <div className="scroll-body" style={{ padding:'14px 14px 0', display:'flex', flexDirection:'column', gap:12, minHeight:0 }}>

        {/* NOTIFICATION BANNER inside scroll — animates in at top */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity:0, y:-16, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-12, scale:0.97 }}
              transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}>
              <NotifBanner n={notification} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* COVERAGE STATUS — always fully visible, no longer clipped */}
        <div className="card-shadow" style={{ padding:18, overflow:'hidden', position:'relative', flexShrink:0 }}>
          <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:`${cfg.color}10`, pointerEvents:'none' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>Active Coverage</div>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.015em' }}>{cfg.label}</div>
              <div style={{ display:'flex', gap:6, marginTop:7, flexWrap:'wrap' }}>
                <span className="tag tag-green" style={{ fontSize:10 }}>● Active</span>
                <span className="tag tag-muted" style={{ fontSize:10 }}>{cfg.speed} payout</span>
              </div>
            </div>
            <ScoreRing score={cladScore} size={58} />
          </div>
          <div className="pbar" style={{ marginBottom:6 }}>
            <div className="pfill" style={{ width:`${capPct}%`, background:`linear-gradient(90deg,${cfg.color},${cfg.color}cc)` }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t3)', fontWeight:600 }}>
            <span>{fmt(weekPaid)} claimed this week</span>
            <span>{cfg.capStr} weekly cap</span>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <ActionCard icon={<BoltIcon size={18} color={cfg.color}/>} iconBg={`${cfg.color}14`} title="File Claim" sub="With photo proof" onClick={() => store.go('manualclaim')} accent={cfg.color} />
          <ActionCard icon={<ShieldIcon size={18} color="var(--blue)"/>} iconBg="var(--blue-bg)" title="View Policy" sub={cfg.label} onClick={() => store.go('policy')} accent="var(--blue)" />
        </div>

        {/* LIVE CONDITIONS */}
        <LiveWeatherCard pincode={pincode} selectedZone={selectedZone} />

        {/* ML PREMIUM */}
        {premiumData && <PremiumCard data={premiumData} />}

        {/* STATS ROW */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            [fmt(store.avgDailyEarning), 'Daily avg', 'var(--t1)'],
            [`${cladScore}`, 'CladScore', scoreColor(cladScore)],
            [claimsHistory.length||'0', 'Claims filed', 'var(--t1)'],
          ].map(([v,l,c]) => (
            <div key={l} className="card-shadow" style={{ padding:'14px 12px', textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:800, color:c, letterSpacing:'-0.02em', marginBottom:3 }}>{v}</div>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* RECENT CLAIMS */}
        {claimsHistory.length > 0 && (
          <div className="card-shadow" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>Recent Claims</div>
              <span style={{ fontSize:11, color:'var(--t3)', fontWeight:600 }}>{claimsHistory.length} total</span>
            </div>
            {claimsHistory.slice(-3).reverse().map((c,i,a) => (
              <div key={c.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:i<a.length-1?'1px solid var(--border)':'none' }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:c.status==='approved'?'var(--green-bg)':'var(--amber-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    {c.trigger==='heavy_rain'?'🌧':c.trigger==='aqi_spike'?'😷':c.trigger==='waterlogging'?'🌊':'⚡'}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{(c.trigger||'weather').replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</div>
                    <div style={{ fontSize:11, color:'var(--t3)', fontWeight:500 }}>{c.created_at?new Date(c.created_at).toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'}):'—'}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--green)' }}>{fmt(c.amount)}</div>
                  <div style={{ fontSize:9, fontWeight:700, color:c.status==='approved'?'var(--green)':'var(--amber)' }}>{(c.status||'approved').toUpperCase()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HOW IT WORKS */}
        <div className="card-shadow" style={{ padding:18, marginBottom:4 }}>
          <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:14 }}>How Clad Works</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { n:'01', t:'Trigger detected', s:'Rain/AQI/flood in your zone', c:'var(--blue)', bg:'var(--blue-bg)' },
              { n:'02', t:'Auto-verified',    s:'ML engine confirms disruption', c:'var(--purple)', bg:'var(--purple-bg)' },
              { n:'03', t:'Payout sent',       s:'UPI transfer in '+cfg.speed,    c:'var(--green)', bg:'var(--green-bg)' },
            ].map(item => (
              <div key={item.n} style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:34, height:34, borderRadius:11, background:item.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:item.c, flexShrink:0 }}>{item.n}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{item.t}</div>
                  <div style={{ fontSize:11, color:'var(--t3)', fontWeight:500 }}>{item.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height:16 }} />
      </div>

      <BNav active="home" />
    </div>
  )
}

function ActionCard({ icon, iconBg, title, sub, onClick, accent }) {
  return (
    <button className="card-shadow" style={{ padding:16, border:'none', cursor:'pointer', textAlign:'left', background:'white', borderRadius:20, userSelect:'none', transition:'transform .14s', display:'block', width:'100%' }}
      onPointerDown={e=>e.currentTarget.style.transform='scale(.96)'}
      onPointerUp={e=>{e.currentTarget.style.transform='scale(1)'; onClick()}}
      onPointerLeave={e=>e.currentTarget.style.transform='scale(1)'}>
      <div style={{ width:38, height:38, borderRadius:12, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)', marginBottom:2 }}>{title}</div>
      <div style={{ fontSize:11, color:'var(--t3)', fontWeight:600 }}>{sub}</div>
    </button>
  )
}

function LiveWeatherCard({ pincode, selectedZone }) {
  return (
    <div style={{ background:'linear-gradient(135deg,#1E3A5F,#1A4A6B)', borderRadius:20, padding:18, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>Live Zone Monitor</div>
          <div style={{ fontSize:17, fontWeight:800, color:'white', letterSpacing:'-0.01em' }}>{selectedZone}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:3, fontWeight:500 }}>Pincode {pincode} · 5 triggers active</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:'#4ADE80', animation:'pulse 1.2s ease-in-out infinite' }} />
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:700 }}>LIVE</span>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[['🌧','Rain'],['😷','AQI'],['🌊','Flood'],['🌪','Wind']].map(([e,l]) => (
          <div key={l} style={{ background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{e}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PremiumCard({ data }) {
  return (
    <div className="card-shadow" style={{ padding:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:800, color:'var(--t1)' }}>Your Premium</div>
        <span className={`tag ${data.ml_used?'tag-green':'tag-amber'}`} style={{ fontSize:9 }}>{data.ml_used?'LightGBM':'Actuarial'}</span>
      </div>
      {(data.breakdown||[]).slice(0,4).map((b,i,a) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'7px 0', borderBottom:i<Math.min(a.length,4)-1?'1px solid var(--border)':'none' }}>
          <span style={{ color:'var(--t2)', fontWeight:500 }}>{b.factor}</span>
          <span style={{ fontWeight:700, color:b.direction==='discount'?'var(--green)':b.direction==='base'?'var(--t1)':'var(--red)' }}>
            {b.direction==='discount'?'− ':b.direction==='base'?'':'+ '}₹{Math.abs(b.amount)}
          </span>
        </div>
      ))}
      <div style={{ marginTop:14, background:'var(--green-bg)', border:'1px solid var(--green-bd)', borderRadius:14, padding:'13px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>Weekly premium</span>
        <span style={{ fontSize:22, fontWeight:800, color:'var(--green)', letterSpacing:'-0.03em' }}>₹{data.predicted_premium}</span>
      </div>
    </div>
  )
}

function NotifBanner({ n }) {
  const store = useStore()
  const m = TRIGGER_META[n.type] || TRIGGER_META.heavy_rain
  return (
    <div style={{ background:m.bg, border:`1.5px solid ${m.border}`, borderRadius:20, padding:18, position:'relative', overflow:'hidden', animation:'notifIn 0.32s cubic-bezier(0.16,1,0.3,1) both' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:6 }}>
            <div style={{ width:7, height:7, borderRadius:4, background:m.color, animation:'pulse 1.2s ease-in-out infinite' }} />
            <span style={{ fontSize:10, fontWeight:800, color:m.color, letterSpacing:'.12em', textTransform:'uppercase' }}>Live Alert</span>
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:m.color, lineHeight:1.2, letterSpacing:'-0.01em' }}>{m.emoji} {m.title}</div>
          <div style={{ fontSize:12, color:`${m.color}99`, marginTop:4, fontWeight:600 }}>Detected in {store.selectedZone}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
          <div style={{ fontSize:11, color:`${m.color}80`, marginBottom:2, fontWeight:600 }}>your payout</div>
          <div style={{ fontSize:34, fontWeight:800, color:m.color, letterSpacing:'-0.04em', lineHeight:1 }}>{fmt(n.amount)}</div>
        </div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => { store.dismissNotif(); store.go('claiming') }}
          style={{ flex:1, padding:'12px 16px', background:m.color, border:'none', borderRadius:13, fontFamily:'Bricolage Grotesque', fontSize:14, fontWeight:800, color:'white', cursor:'pointer', transition:'transform .13s' }}
          onPointerDown={e=>e.currentTarget.style.transform='scale(.97)'}
          onPointerUp={e=>e.currentTarget.style.transform='scale(1)'}>
          Claim {fmt(n.amount)} →
        </button>
        <button onClick={() => store.dismissNotif()}
          style={{ padding:'12px 16px', background:`${m.color}14`, border:`1px solid ${m.border}`, borderRadius:13, fontFamily:'Bricolage Grotesque', fontSize:13, fontWeight:700, color:m.color, cursor:'pointer' }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}