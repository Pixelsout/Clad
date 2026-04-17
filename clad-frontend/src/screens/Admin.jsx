import { useState, useEffect, useRef } from 'react'
import { useStore, fmt } from '../store/useStore'

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const ADMIN_PASS  = 'clad2026'
const get         = (path) => fetch(`${BASE}${path}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })

const TRIGGER_EMOJI = { heavy_rain:'🌧', aqi_spike:'😷', waterlogging:'🌊', cyclone_wind:'🌪', strike_curfew:'⚠️', manual:'📝' }
const TRIGGER_COLOR = { heavy_rain:'#2563EB', aqi_spike:'#D97706', waterlogging:'#0891B2', cyclone_wind:'#DC2626', strike_curfew:'#EA580C', manual:'#7C3AED' }
const PLAN_COLOR    = { basic:'#2563EB', plus:'#16A34A', pro:'#D97706' }

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
export function AdminLogin() {
  const { go, set } = useStore()
  const [pass, setPass] = useState('')
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)

  const login = async () => {
    if (!pass) { setErr('Enter password'); return }
    setBusy(true); await new Promise(r => setTimeout(r, 500))
    if (pass === ADMIN_PASS) { set('adminAuth', true); go('admindash') }
    else { setErr('Wrong password — hint: clad2026'); setBusy(false) }
  }

  return (
    <div style={{ minHeight:'100%', background:'#0A0D14', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:'32px 24px', position:'relative', overflow:'hidden' }}>
      {/* Grid overlay */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(37,99,235,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.06) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />
      {/* Glow */}
      <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:300, height:300, background:'radial-gradient(circle,rgba(37,99,235,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div style={{ position:'relative', width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:28 }}>
        {/* Logo block */}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:72, height:72, margin:'0 auto 16px', borderRadius:24, background:'linear-gradient(135deg,rgba(37,99,235,0.25),rgba(37,99,235,0.08))', border:'1px solid rgba(37,99,235,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, boxShadow:'0 0 32px rgba(37,99,235,0.2)' }}>🏢</div>
          <div style={{ fontSize:26, fontWeight:800, color:'white', letterSpacing:'-0.03em', lineHeight:1.1 }}>Insurer Portal</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginTop:6, fontWeight:600, letterSpacing:'.06em' }}>CLAD · GUIDEWIRE DEVTRAILS 2026</div>
        </div>

        {/* Feature pills */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[['📊','Analytics'],['🛡','Fraud Intel'],['🔮','ML Forecast'],['⚡','Live Triggers']].map(([e,l]) => (
            <div key={l} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, display:'flex', gap:8, alignItems:'center' }}>
              <span>{e}</span><span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)' }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr('') }} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Admin password" autoFocus
            style={{ padding:'15px 18px', background:'rgba(255,255,255,0.07)', border:`1.5px solid ${err ? '#EF4444' : 'rgba(255,255,255,0.12)'}`, borderRadius:14, fontFamily:'Bricolage Grotesque', fontSize:16, color:'white', outline:'none', transition:'border-color .15s' }} />
          {err && <div style={{ fontSize:12, color:'#EF4444', fontWeight:600, textAlign:'center' }}>{err}</div>}
          <button onClick={login} disabled={busy}
            style={{ padding:16, background:busy ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg,#2563EB,#1D4ED8)', border:'none', borderRadius:14, fontFamily:'Bricolage Grotesque', fontSize:15, fontWeight:800, color:'white', cursor:busy ? 'not-allowed' : 'pointer', boxShadow:'0 4px 20px rgba(37,99,235,0.4)', transition:'all .14s' }}>
            {busy ? 'Authenticating…' : 'Enter Dashboard →'}
          </button>
          <button onClick={() => useStore.getState().go('splash')}
            style={{ padding:13, background:'transparent', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:14, fontFamily:'Bricolage Grotesque', fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>
            ← Back to Role Select
          </button>
        </div>

        <div style={{ fontSize:11, color:'rgba(255,255,255,0.18)', textAlign:'center' }}>Demo password: <strong style={{ color:'rgba(255,255,255,0.35)' }}>clad2026</strong></div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD SHELL
// ─────────────────────────────────────────────────────────────
export function AdminDash() {
  const { go, set } = useStore()
  const [tab,     setTab]     = useState('overview')
  const [dash,    setDash]    = useState(null)
  const [workers, setWorkers] = useState([])
  const [claims,  setClaims]  = useState([])
  const [health,  setHealth]  = useState(null)
  const [live,    setLive]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [ts,      setTs]      = useState(null)
  const timerRef = useRef(null)

  const fetchAll = async () => {
    const [d, w, c, h] = await Promise.allSettled([
      get('/dashboard/insurer'),
      get('/workers'),
      get('/claims'),
      get('/api/health'),
    ])
    if (d.status === 'fulfilled') setDash(d.value);       else setDash(DEMO_DASH)
    if (w.status === 'fulfilled') setWorkers(w.value?.workers || [])
    if (c.status === 'fulfilled') setClaims(c.value?.claims  || [])
    if (h.status === 'fulfilled') setHealth(h.value)
    setTs(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }))
    setLoading(false)
  }

  const scanLive = async (pin = '560034') => {
    try { const r = await get(`/trigger/check?pincode=${pin}`); setLive(r) } catch {}
  }

  useEffect(() => {
    fetchAll(); scanLive()
    timerRef.current = setInterval(() => { fetchAll(); scanLive() }, 8000)
    return () => clearInterval(timerRef.current)
  }, [])

  const lr       = dash?.financials?.loss_ratio_pct    || 0
  const lrStatus = dash?.financials?.loss_ratio_status || 'healthy'
  const lrClr    = lrStatus === 'healthy' ? '#22C55E' : lrStatus === 'watch' ? '#F59E0B' : '#EF4444'

  const TABS = [
    { id:'overview', label:'Overview',  e:'📊' },
    { id:'workers',  label:'Workers',   e:'👥' },
    { id:'claims',   label:'Claims',    e:'📋' },
    { id:'fraud',    label:'Fraud',     e:'🛡' },
    { id:'forecast', label:'Forecast',  e:'🔮' },
    { id:'live',     label:'Live',      e:'🌦' },
    { id:'apis',     label:'APIs',      e:'⚡' },
  ]

  return (
    <div className="screen" style={{ background:'#F5F4F0', display:'flex', flexDirection:'column' }}>

      {/* ── TOPBAR ── */}
      <div style={{ background:'#0A0D14', flexShrink:0 }}>

        {/* Title row */}
        <div style={{ padding:'13px 18px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom:3 }}>Insurer Dashboard</div>
            <div style={{ fontSize:20, fontWeight:800, color:'white', letterSpacing:'-0.025em' }}>Clad Admin</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:3, background:'#22C55E', animation:'pulse 1.6s ease-in-out infinite' }} />
              <span style={{ fontSize:10, fontWeight:800, color:'#22C55E', letterSpacing:'.06em' }}>LIVE</span>
              {ts && <span style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginLeft:4 }}>{ts}</span>}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={fetchAll}
                style={{ width:30, height:30, borderRadius:9, background:'rgba(255,255,255,0.08)', border:'none', color:'white', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>⟳</button>
              <button onClick={() => { set('adminAuth', false); go('splash') }}
                style={{ padding:'0 11px', height:30, borderRadius:9, background:'rgba(255,255,255,0.08)', border:'none', color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'Bricolage Grotesque' }}>Logout</button>
            </div>
          </div>
        </div>

        {/* Loss ratio strip */}
        {dash && (
          <div style={{ padding:'8px 18px 0', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'.1em', flexShrink:0 }}>Loss Ratio</span>
            <div style={{ flex:1, height:5, borderRadius:3, background:'rgba(255,255,255,0.08)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', left:0, top:0, height:'100%', width:`${Math.min(lr,100)}%`, background:lrClr, borderRadius:3, transition:'width 1s ease' }} />
              <div style={{ position:'absolute', left:'55%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.2)' }} />
              <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.2)' }} />
            </div>
            <span style={{ fontSize:11, fontWeight:800, color:lrClr, flexShrink:0, minWidth:42, textAlign:'right' }}>{lr}% {lrStatus === 'healthy' ? '✓' : '⚠'}</span>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', marginTop:8 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'9px 14px', background:'none', border:'none', borderBottom:`2px solid ${tab === t.id ? '#3B82F6' : 'transparent'}`, color: tab === t.id ? 'white' : 'rgba(255,255,255,0.35)', fontFamily:'Bricolage Grotesque', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s', letterSpacing:'.03em' }}>
              {t.e} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      {loading
        ? <Skeleton />
        : (
          <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:12, paddingBottom:32 }}>
            {tab === 'overview'  && <TabOverview  dash={dash} workers={workers} claims={claims} />}
            {tab === 'workers'   && <TabWorkers   workers={workers} />}
            {tab === 'claims'    && <TabClaims    claims={claims} dash={dash} />}
            {tab === 'fraud'     && <TabFraud     dash={dash} workers={workers} claims={claims} />}
            {tab === 'forecast'  && <TabForecast  dash={dash} workers={workers} />}
            {tab === 'live'      && <TabLive      live={live} onScan={scanLive} />}
            {tab === 'apis'      && <TabApis      health={health} dash={dash} />}
          </div>
        )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────────────────────
function TabOverview({ dash, workers, claims }) {
  const ov = dash?.overview    || {}
  const fn = dash?.financials  || {}
  const cs = dash?.clad_score  || {}
  const ph = dash?.pool_health || {}
  const tb = dash?.trigger_breakdown || {}
  const lrClr = fn.loss_ratio_status === 'healthy' ? 'var(--green)' : fn.loss_ratio_status === 'watch' ? 'var(--amber)' : 'var(--red)'

  // Compute live stats from actual data
  const avgEarning = workers.length > 0
    ? Math.round(workers.reduce((s, w) => s + (w.avg_daily_earning || 0), 0) / workers.length) : 720
  const approvedClaims = claims.filter(c => c.status === 'approved')
  const totalPaid      = approvedClaims.reduce((s, c) => s + (c.amount || 0), 0)

  return (<>
    {/* KPI row */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <KpiHero icon="👥" label="Workers"  val={ov.total_workers    || 0} sub="registered"   accent="#2563EB" />
      <KpiHero icon="🛡" label="Policies" val={ov.active_policies  || 0} sub="active"       accent="#16A34A" />
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
      <KpiSm label="Claims"   val={ov.total_claims || 0} accent="#1E293B" />
      <KpiSm label="Approved" val={ov.approved     || 0} accent="#16A34A" />
      <KpiSm label="Pending"  val={ov.pending      || 0} accent="#D97706" />
      <KpiSm label="Blocked"  val={ov.rejected     || 0} accent="#DC2626" />
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      <KpiSm label="Avg Daily Earn" val={fmt(avgEarning)} accent="#0891B2" />
      <KpiSm label="Total Paid Out" val={fmt(totalPaid)}  accent="#D97706" />
    </div>

    {/* Pool financials */}
    <Panel title="Pool Financials" icon="💰">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        {[
          ['Weekly Pool',    `₹${(fn.weekly_premium_pool_inr  || 0).toLocaleString('en-IN')}`, '#3B82F6'],
          ['Annual Pool',    `₹${((fn.annualized_pool_inr     || 0)/100000).toFixed(1)}L`,      '#1E293B'],
          ['Paid Out',       `₹${(fn.total_payout_inr         || 0).toLocaleString('en-IN')}`, '#D97706'],
          ['Processed',      `₹${(fn.payout_processed_inr     || 0).toLocaleString('en-IN')}`, '#16A34A'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#F1F0EC', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:800, color:c, letterSpacing:'-0.02em' }}>{v}</div>
            <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Loss ratio card */}
      <div style={{ borderRadius:14, padding:'14px 16px', background: fn.loss_ratio_status === 'healthy' ? '#F0FDF4' : fn.loss_ratio_status === 'watch' ? '#FFFBEB' : '#FEF2F2', border:`1px solid ${lrClr}28` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#1E293B' }}>Loss Ratio</span>
          <LrBadge status={fn.loss_ratio_status || 'healthy'} />
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:14, marginBottom:12 }}>
          <div style={{ fontSize:44, fontWeight:800, color:lrClr, letterSpacing:'-0.05em', lineHeight:1 }}>{fn.loss_ratio_pct || 0}<span style={{ fontSize:22 }}>%</span></div>
          <div style={{ paddingBottom:4 }}>
            <div style={{ fontSize:12, color:'#475569', fontWeight:600 }}>Target: &lt; 55%</div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>Healthy &lt;55 · Watch 55–70 · Critical &gt;70</div>
          </div>
        </div>
        {/* Bar with zone markers */}
        <div style={{ position:'relative', height:10, borderRadius:5, background:'rgba(0,0,0,0.07)', overflow:'visible' }}>
          <div style={{ position:'absolute', left:0, top:0, height:'100%', borderRadius:5, background:lrClr, width:`${Math.min(fn.loss_ratio_pct||0,100)}%`, transition:'width 1s ease' }} />
          {[{p:55,label:'55'},{p:70,label:'70'}].map(({p,label}) => (
            <div key={p} style={{ position:'absolute', left:`${p}%`, top:-4, bottom:-4, width:2, background:'rgba(0,0,0,0.15)', borderRadius:1 }}>
              <span style={{ position:'absolute', top:14, left:-6, fontSize:9, color:'#94A3B8', fontWeight:700 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>

    {/* Pool health */}
    <Panel title="Pool Health" icon="🏦">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          ['Utilisation',    `${ph.utilisation_pct    || 0}%`, ph.utilisation_pct > 70 ? 'var(--red)' : ph.utilisation_pct > 50 ? 'var(--amber)' : 'var(--green)'],
          ['Reserve Buffer', `${ph.reserve_buffer_pct || 0}%`, 'var(--green)'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ background:'#F1F0EC', borderRadius:13, padding:'16px 14px', textAlign:'center' }}>
            <div style={{ fontSize:24, fontWeight:800, color:c, letterSpacing:'-0.03em' }}>{v}</div>
            <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>
    </Panel>

    {/* Trigger breakdown */}
    <Panel title="Claims by Trigger Type" icon="⚡">
      {Object.keys(tb).length === 0
        ? <Empty text="No claims yet — register workers to begin" />
        : (() => {
            const maxV = Math.max(...Object.values(tb), 1)
            return Object.entries(tb).sort(([,a],[,b]) => b - a).map(([t, n]) => (
              <div key={t} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#1E293B' }}>{TRIGGER_EMOJI[t]||'⚡'} {t.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:TRIGGER_COLOR[t]||'#2563EB' }}>{n}</span>
                </div>
                <div style={{ height:8, background:'#E2E8F0', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:4, background:TRIGGER_COLOR[t]||'#2563EB', width:`${(n/maxV)*100}%`, transition:'width 0.9s ease' }} />
                </div>
              </div>
            ))
          })()
      }
    </Panel>

    {/* CladScore distribution */}
    <Panel title="CladScore Distribution" icon="📈">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:11, color:'#94A3B8', fontWeight:700 }}>Portfolio Average</div>
          <div style={{ fontSize:28, fontWeight:800, color:'#1E293B', letterSpacing:'-0.03em' }}>{cs.average || 0}<span style={{ fontSize:14, color:'#94A3B8', marginLeft:2 }}>/100</span></div>
        </div>
        <div style={{ width:56, height:56 }}><DonutRing pct={(cs.average || 0)} /></div>
      </div>
      {[['A+','#22C55E'],['A','#4ADE80'],['B+','#60A5FA'],['B','#93C5FD'],['C','#FCD34D'],['D','#F87171']].map(([g,c]) => {
        const n = cs.by_grade?.[g] || 0
        const maxV = Math.max(...Object.values(cs.by_grade || {}), 1)
        return (
          <div key={g} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
            <div style={{ width:20, fontSize:11, fontWeight:800, color:c, textAlign:'right', flexShrink:0 }}>{g}</div>
            <div style={{ flex:1, height:8, background:'#E2E8F0', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, background:c, width:`${(n/maxV)*100}%`, transition:'width 0.9s ease' }} />
            </div>
            <div style={{ width:18, fontSize:11, fontWeight:700, color:'#94A3B8', textAlign:'right', flexShrink:0 }}>{n}</div>
          </div>
        )
      })}
    </Panel>
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: WORKERS
// ─────────────────────────────────────────────────────────────
function TabWorkers({ workers }) {
  const [q,    setQ]    = useState('')
  const [sort, setSort] = useState('score')

  const rows = [...workers]
    .filter(w => !q || w.name?.toLowerCase().includes(q.toLowerCase()) || w.pincode?.includes(q) || (w.plan||'').includes(q))
    .sort((a, b) => sort === 'score' ? (b.clad_score||0)-(a.clad_score||0) : (b.avg_daily_earning||0)-(a.avg_daily_earning||0))

  return (<>
    {/* Stats strip */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
      {[
        ['Total',       workers.length,                                             '#2563EB'],
        ['PAN OK',      workers.filter(w => w.pan_verified).length,                '#16A34A'],
        ['Flagged',     workers.filter(w => (w.fraudulent_flags||0)>0).length,     '#DC2626'],
        ['With History',workers.filter(w => w.has_delivery_history).length,        '#0891B2'],
      ].map(([l,v,c]) => (
        <div key={l} style={{ background:'white', borderRadius:13, padding:'12px 8px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{l}</div>
        </div>
      ))}
    </div>

    {/* Controls */}
    <div style={{ display:'flex', gap:8 }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, pincode, plan…" className="inp" style={{ flex:1, fontSize:13, padding:'10px 14px', borderRadius:12 }} />
      <select value={sort} onChange={e => setSort(e.target.value)} className="inp" style={{ width:110, fontSize:12, padding:'10px 12px', borderRadius:12 }}>
        <option value="score">By Score</option>
        <option value="earn">By Earning</option>
      </select>
    </div>

    {/* Worker list */}
    {workers.length === 0
      ? <Panel title="Worker Registry" icon="👥"><Empty text="No workers registered yet" /></Panel>
      : (
        <Panel title={`${rows.length} Workers`} icon="👥">
          {rows.map((w, i) => {
            const sc = w.clad_score || 0
            const sc_c = sc >= 75 ? '#22C55E' : sc >= 50 ? '#F59E0B' : '#EF4444'
            return (
              <div key={w.name || i} style={{ padding:'13px 0', borderBottom: i < rows.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                  {/* Avatar */}
                  <div style={{ width:38, height:38, borderRadius:12, background:`${sc_c}18`, border:`1.5px solid ${sc_c}40`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:sc_c, flexShrink:0 }}>
                    {(w.name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:800, color:'#1E293B', marginBottom:1 }}>{w.name}</div>
                        <div style={{ fontSize:11, color:'#94A3B8', fontWeight:500 }}>📍 {w.pincode} · {w.platform_links?.[0] || '—'}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:sc_c, lineHeight:1 }}>{sc}</div>
                        <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, letterSpacing:'.06em' }}>SCORE</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:5, marginTop:7, flexWrap:'wrap' }}>
                      <Pill label={(w.plan||'plus').toUpperCase()} color={PLAN_COLOR[w.plan]||'#1E293B'} />
                      {w.pan_verified     && <Pill label="✓ PAN" color="#16A34A" />}
                      {(w.fraudulent_flags||0) > 0 && <Pill label={`⚠ ${w.fraudulent_flags} flags`} color="#DC2626" />}
                      {w.policy_paused    && <Pill label="Paused" color="#D97706" />}
                      <Pill label={`₹${Math.round(w.avg_daily_earning||0)}/day`}  color="#475569" />
                      {w.total_deliveries && <Pill label={`${w.total_deliveries} trips`} color="#475569" />}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </Panel>
      )
    }
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: CLAIMS
// ─────────────────────────────────────────────────────────────
function TabClaims({ claims, dash }) {
  const [filter, setFilter] = useState('all')
  const ov = dash?.overview || {}

  const rows = [...claims].filter(c => {
    if (filter === 'approved') return c.status === 'approved'
    if (filter === 'pending')  return c.status?.includes('pending')
    if (filter === 'rejected') return c.status?.includes('rejected')
    return true
  }).reverse()

  const total      = ov.total_claims   || claims.length
  const approved   = ov.approved       || 0
  const pending    = ov.pending        || 0
  const rejected   = ov.rejected       || 0
  const totalPaid  = claims.filter(c => c.status === 'approved').reduce((s,c) => s+(c.amount||0), 0)
  const approvalRate = total > 0 ? Math.round(approved/total*100) : 0

  return (<>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
      {[['Total',total,'#1E293B'],['OK',approved,'#16A34A'],['Pending',pending,'#D97706'],['Blocked',rejected,'#DC2626']].map(([l,v,c]) => (
        <div key={l} style={{ background:'white', borderRadius:13, padding:'11px 8px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:20, fontWeight:800, color:c }}>{v}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{l}</div>
        </div>
      ))}
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      <div style={{ background:'white', borderRadius:13, padding:'14px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:26, fontWeight:800, color:'#16A34A', letterSpacing:'-0.03em' }}>{approvalRate}%</div>
        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginTop:3 }}>Approval Rate</div>
      </div>
      <div style={{ background:'white', borderRadius:13, padding:'14px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize:26, fontWeight:800, color:'#D97706', letterSpacing:'-0.03em' }}>{fmt(totalPaid)}</div>
        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginTop:3 }}>Total Paid Out</div>
      </div>
    </div>

    {/* Filter tabs */}
    <div style={{ display:'flex', gap:6 }}>
      {[['all','All'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']].map(([id,lbl]) => (
        <button key={id} onClick={() => setFilter(id)}
          style={{ padding:'6px 14px', borderRadius:9, border:'none', fontFamily:'Bricolage Grotesque', fontSize:12, fontWeight:700, cursor:'pointer', background:filter===id?'#1E293B':'#E2E8F0', color:filter===id?'white':'#64748B', transition:'all .13s' }}>
          {lbl}
        </button>
      ))}
    </div>

    {/* Claims ledger */}
    <Panel title={`${rows.length} Claims`} icon="📋">
      {rows.length === 0
        ? <Empty text="No claims in this category" />
        : rows.map((c, i) => {
            const sc = c.status === 'approved' ? '#16A34A' : c.status?.includes('rejected') ? '#DC2626' : '#D97706'
            return (
              <div key={c.id||i} style={{ padding:'12px 0', borderBottom: i < rows.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:15 }}>{TRIGGER_EMOJI[c.trigger]||'⚡'}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:'#1E293B' }}>{c.user}</span>
                      <span style={{ fontSize:9, fontWeight:800, color:sc, padding:'2px 7px', borderRadius:5, background:`${sc}14`, flexShrink:0, textTransform:'uppercase' }}>{(c.status||'unknown').replace('_',' ')}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#94A3B8', fontWeight:500 }}>
                      {(c.trigger||c.reason||'manual').replace(/_/g,' ')} · {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                    </div>
                    {c.payout_id && <div style={{ fontSize:10, color:'#CBD5E1', marginTop:3, fontFamily:'monospace' }}>Ref: {c.payout_id.slice(0,22)}…</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color: c.status==='approved'?'#16A34A':'#94A3B8' }}>{fmt(c.amount||0)}</div>
                    <div style={{ fontSize:10, color:'#CBD5E1' }}>ID #{c.id}</div>
                  </div>
                </div>
              </div>
            )
          })
      }
    </Panel>
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: FRAUD
// ─────────────────────────────────────────────────────────────
function TabFraud({ dash, workers, claims }) {
  const fs      = dash?.fraud_summary || {}
  const flagged = workers.filter(w => (w.fraudulent_flags||0) > 0)
  const rejected= claims.filter(c  => c.status?.includes('rejected'))
  const fraudPct= claims.length > 0 ? (rejected.length/claims.length*100).toFixed(1) : '0.0'
  const saved   = rejected.reduce((s,c) => s+(c.amount||0), 0)

  return (<>
    {/* Fraud KPIs */}
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #FEE2E2' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#DC2626', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>⚠ Fraud Rate</div>
        <div style={{ fontSize:36, fontWeight:800, color:'#DC2626', letterSpacing:'-0.04em', lineHeight:1 }}>{fraudPct}%</div>
        <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>{rejected.length} claims blocked</div>
      </div>
      <div style={{ background:'white', borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #DCFCE7' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#16A34A', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>✓ Fraud Savings</div>
        <div style={{ fontSize:28, fontWeight:800, color:'#16A34A', letterSpacing:'-0.03em', lineHeight:1 }}>{fmt(saved)}</div>
        <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>Protected from payouts</div>
      </div>
    </div>

    {/* 5-layer engine */}
    <Panel title="5-Layer Fraud Engine" icon="🛡">
      <div style={{ marginBottom:14, padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:11, fontSize:11, color:'#16A34A', fontWeight:700, lineHeight:1.6 }}>
        Industry-leading real-time pipeline · No manual review needed · Each layer feeds the next
      </div>
      {[
        ['0','🔐','Account Integrity',    '#2563EB', 'PAN format + NSDL mock · Delivery history gate · Account age <3 days = reject · Platform link verify'],
        ['1','📏','10-Signal Rules',       '#D97706', 'Amount ratio · 3am filing · Round numbers · GPS velocity · Reason mismatch · Device farm patterns'],
        ['2','🕸','NetworkX Graph',        '#7C3AED', 'Zone burst >8 claims/hr · Worker in 3+ zones · Device shared across accounts · Cluster detection'],
        ['3','🌲','Isolation Forest ML',   '#16A34A', '6 features: amount_ratio, hour, DOW, claim_freq, clad_score, account_age · scikit-learn anomaly'],
        ['4','👁','Claude Vision API',     '#DC2626', 'Photo authenticity · Stock image detect · AI-generated · Weather evidence cross-check · EXIF'],
      ].map(([n,e,title,color,desc]) => (
        <div key={n} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom: n!=='4' ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ width:36, height:36, borderRadius:11, background:`${color}10`, border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{e}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:4 }}>
              <span style={{ fontSize:9, fontWeight:800, color:'white', background:color, padding:'2px 7px', borderRadius:5 }}>LAYER {n}</span>
              <span style={{ fontSize:13, fontWeight:700, color:'#1E293B' }}>{title}</span>
            </div>
            <div style={{ fontSize:11, color:'#64748B', lineHeight:1.55 }}>{desc}</div>
          </div>
        </div>
      ))}
    </Panel>

    {/* Live stats */}
    <Panel title="Live Fraud Stats" icon="📊">
      {[
        ['Fraud flags raised',          fs.total_fraud_flags         || 0, '#DC2626'],
        ['Flagged workers',             flagged.length,                    '#D97706'],
        ['Claims blocked',              rejected.length,                   '#DC2626'],
        ['PAN verified workers',        fs.pan_verified_workers      || workers.filter(w=>w.pan_verified).length, '#16A34A'],
        ['Workers with delivery history',fs.workers_with_delivery_history || workers.filter(w=>w.has_delivery_history).length, '#16A34A'],
      ].map(([l,v,c]) => (
        <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #F1F5F9' }}>
          <span style={{ fontSize:12, color:'#475569', fontWeight:600 }}>{l}</span>
          <span style={{ fontSize:14, fontWeight:800, color:c }}>{v}</span>
        </div>
      ))}
    </Panel>

    {/* Flagged workers list */}
    {flagged.length > 0 && (
      <Panel title={`${flagged.length} Flagged Worker${flagged.length>1?'s':''}`} icon="⚠️">
        {flagged.map((w, i) => (
          <div key={w.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i < flagged.length-1 ? '1px solid #F1F5F9' : 'none' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#1E293B' }}>{w.name}</div>
              <div style={{ fontSize:11, color:'#94A3B8' }}>Pincode {w.pincode} · Score {w.clad_score||'—'} · {(w.plan||'plus').toUpperCase()}</div>
            </div>
            <Pill label={`⚠ ${w.fraudulent_flags} flags`} color="#DC2626" />
          </div>
        ))}
      </Panel>
    )}

    {/* Penalty table */}
    <Panel title="CladScore Penalty System" icon="📉">
      <div style={{ marginBottom:12, padding:'10px 13px', background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:11, fontSize:11, color:'#DC2626', fontWeight:700, lineHeight:1.6 }}>
        Score penalties auto-apply on every false claim · Compounding punishment for repeat offenders
      </div>
      {[
        ['1st false claim',  '−8 pts · 85% payout cap · 30 days'],
        ['2nd false claim',  '−10 pts · 70% payout cap · 60 days'],
        ['3rd+ false claim', '−15 pts · 50% payout cap · permanent'],
        ['Vision REJECT',    'Immediate block · PAN flag raised'],
        ['Grade D score',    'All claims go to manual review'],
      ].map(([k,v], i, a) => (
        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom: i<a.length-1 ? '1px solid #F1F5F9' : 'none', gap:12 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'#475569', flexShrink:0 }}>{k}</span>
          <span style={{ fontSize:12, color:'#DC2626', fontWeight:600, textAlign:'right' }}>{v}</span>
        </div>
      ))}
    </Panel>
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: FORECAST
// ─────────────────────────────────────────────────────────────
function TabForecast({ dash, workers }) {
  const fc       = dash?.seven_day_forecast || []
  const maxC     = Math.max(...fc.map(d => d.expected_claims), 1)
  const totalFcP = fc.reduce((s,d) => s+(d.expected_payout_inr||0), 0)
  const insured  = dash?.overview?.active_policies || 0
  const total_w  = dash?.overview?.total_workers   || 0
  const avgE     = workers.length > 0 ? Math.round(workers.reduce((s,w)=>s+(w.avg_daily_earning||0),0)/workers.length) : 720

  return (<>
    <Panel title="7-Day ML Claims Forecast" icon="🔮">
      <div style={{ marginBottom:14, padding:'10px 14px', background:'#F5F3FF', border:'1px solid #DDD6FE', borderRadius:11, fontSize:11, color:'#7C3AED', fontWeight:700, lineHeight:1.6 }}>
        LightGBM model · Zone disruption history + monsoon seasonality + historical AQI patterns · Updates nightly
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
        <div style={{ background:'#F1F0EC', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#2563EB', letterSpacing:'-0.02em' }}>{fc.reduce((s,d)=>s+(d.expected_claims||0),0).toFixed(1)}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:3 }}>Expected Claims</div>
        </div>
        <div style={{ background:'#F1F0EC', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#D97706', letterSpacing:'-0.02em' }}>{fmt(totalFcP)}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginTop:3 }}>Expected Payout</div>
        </div>
      </div>

      {/* Bar chart rows */}
      {fc.length === 0
        ? <Empty text="Register workers to enable forecasting" />
        : fc.map((d, i) => (
          <div key={d.date} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
              <div>
                <span style={{ fontSize:12, fontWeight:700, color:'#1E293B' }}>{d.day}</span>
                <span style={{ fontSize:10, color:'#94A3B8', marginLeft:8 }}>{d.date}</span>
              </div>
              <div style={{ textAlign:'right' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#2563EB' }}>{d.expected_claims} claims  </span>
                <span style={{ fontSize:11, fontWeight:700, color:'#D97706' }}>₹{(d.expected_payout_inr||0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div style={{ height:9, background:'#E2E8F0', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:4, background: i<2?'#2563EB':i<5?'#16A34A':'#D97706', width:`${(d.expected_claims/maxC)*100}%`, transition:'width 0.9s ease' }} />
            </div>
          </div>
        ))
      }
    </Panel>

    {/* Market gap */}
    <Panel title="Market Coverage Gap" icon="🌍">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
        <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:13, padding:'14px 12px', textAlign:'center' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#16A34A', letterSpacing:'-0.03em' }}>{insured}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginTop:3 }}>✓ Protected</div>
        </div>
        <div style={{ background:'#FEF2F2', border:'1px solid #FEE2E2', borderRadius:13, padding:'14px 12px', textAlign:'center' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#DC2626', letterSpacing:'-0.03em' }}>{Math.max(0, total_w - insured)}</div>
          <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginTop:3 }}>✗ Uninsured</div>
        </div>
      </div>
      {[
        ['Weekly earnings at risk',  fmt(insured * avgE * 5),    '#2563EB'],
        ['Avg portfolio daily earn',  fmt(avgE),                 '#1E293B'],
        ['India gig workforce',       '15,000,000+',             '#1E293B'],
        ['Currently insured (India)', '<1%',                     '#DC2626'],
        ['Clad addressable TAM',      '₹8,400 Cr / yr',         '#D97706'],
        ['LightGBM accuracy (R²)',    '0.92',                    '#16A34A'],
        ['Training samples',          '8,000',                   '#16A34A'],
      ].map(([l,v,c]) => (
        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F1F5F9' }}>
          <span style={{ fontSize:12, color:'#475569', fontWeight:600 }}>{l}</span>
          <span style={{ fontSize:12, fontWeight:800, color:c }}>{v}</span>
        </div>
      ))}
    </Panel>

    {/* Plan distribution */}
    {workers.length > 0 && (
      <Panel title="Plan Distribution" icon="📊">
        {['basic','plus','pro'].map(p => {
          const count = workers.filter(w => w.plan === p).length
          const pct   = Math.round(count / workers.length * 100)
          return (
            <div key={p} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:38, fontSize:11, fontWeight:800, color:PLAN_COLOR[p]||'#1E293B', textTransform:'uppercase', flexShrink:0 }}>{p}</div>
              <div style={{ flex:1, height:9, background:'#E2E8F0', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background:PLAN_COLOR[p]||'#1E293B', width:`${pct}%`, transition:'width 0.9s ease' }} />
              </div>
              <div style={{ width:56, fontSize:11, fontWeight:700, color:'#94A3B8', textAlign:'right', flexShrink:0 }}>{count} ({pct}%)</div>
            </div>
          )
        })}
      </Panel>
    )}
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: LIVE
// ─────────────────────────────────────────────────────────────
function TabLive({ live, onScan }) {
  const [pin,      setPin]      = useState('560034')
  const [scanning, setScanning] = useState(false)

  const scan = async () => {
    setScanning(true)
    await onScan(pin)
    await new Promise(r => setTimeout(r, 700))
    setScanning(false)
  }

  const fired  = live?.triggers_fired   || []
  const checks = live?.triggers_checked || []
  const wr     = live?.weather_readings || {}
  const aqr    = live?.aqi_readings     || {}

  return (<>
    {/* Controls */}
    <div style={{ display:'flex', gap:8 }}>
      <input value={pin} onChange={e => setPin(e.target.value)} placeholder="Pincode…" className="inp" style={{ flex:1, fontSize:14, padding:'11px 14px', borderRadius:12 }} />
      <button onClick={scan} disabled={scanning}
        style={{ padding:'0 20px', height:46, background: scanning ? '#94A3B8' : '#0A0D14', border:'none', borderRadius:12, fontFamily:'Bricolage Grotesque', fontSize:13, fontWeight:800, color:'white', cursor: scanning ? 'not-allowed' : 'pointer', flexShrink:0, whiteSpace:'nowrap' }}>
        {scanning ? '⟳ Scanning…' : '🔍 Scan Zone'}
      </button>
    </div>

    {/* Alert banner */}
    {fired.length > 0 && (
      <div style={{ padding:'14px 16px', background:'linear-gradient(135deg,#FEF2F2,#FFF)', border:'2px solid #FCA5A5', borderRadius:16 }}>
        <div style={{ fontSize:11, fontWeight:800, color:'#DC2626', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>🔴 {fired.length} ACTIVE ALERT{fired.length>1?'S':''} — AUTO-PAYOUTS TRIGGERED</div>
        {fired.map(t => (
          <div key={t} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>{TRIGGER_EMOJI[t]||'⚡'}</span>
            <span style={{ fontSize:14, fontWeight:800, color:TRIGGER_COLOR[t]||'#DC2626' }}>{t.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
            <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, color:'white', background:'#DC2626', padding:'2px 8px', borderRadius:5 }}>FIRED</span>
          </div>
        ))}
      </div>
    )}

    {/* Trigger check list */}
    <Panel title={`Zone ${pin} · ${live ? 'Checked' : 'Not yet checked'}`} icon="🌦">
      {live?.checked_at && (
        <div style={{ fontSize:10, color:'#94A3B8', marginBottom:12, fontWeight:600 }}>
          Last scan: {new Date(live.checked_at).toLocaleString('en-IN')} · Pincode {pin}
        </div>
      )}
      {checks.length === 0 && !live && <Empty text="Click Scan Zone to check live trigger conditions" />}
      {checks.map((c, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 0', borderBottom: i < checks.length-1 ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ width:28, height:28, borderRadius:9, background: c.fired ? '#22C55E' : '#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: c.fired ? '0 0 10px rgba(34,197,94,0.3)' : 'none', transition:'all .3s' }}>
            <span style={{ fontSize:12, color: c.fired ? 'white' : '#94A3B8' }}>{c.fired ? '✓' : '—'}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color: c.fired ? '#1E293B' : '#94A3B8' }}>
              {TRIGGER_EMOJI[c.trigger]||'⚡'} {(c.trigger||'').replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
            </div>
            <div style={{ fontSize:10, color:'#CBD5E1', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.condition||'—'}</div>
          </div>
          <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:5, background: c.fired ? '#DCFCE7' : '#F1F5F9', color: c.fired ? '#16A34A' : '#94A3B8', textTransform:'uppercase', flexShrink:0 }}>
            {c.fired ? 'FIRED' : 'CLEAR'}
          </span>
        </div>
      ))}
    </Panel>

    {/* Weather readings */}
    {live && (
      <Panel title="Live Sensor Data" icon="🌡">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          {[
            ['Rain',     wr.rain_intensity!=null ? `${wr.rain_intensity} mm/hr` : '—',   wr.rain_intensity > 7.5 ? '#DC2626' : '#1E293B'],
            ['Duration', wr.duration      !=null ? `${wr.duration} min`         : '—',   wr.duration > 45 ? '#D97706' : '#1E293B'],
            ['Wind',     wr.wind_speed    !=null ? `${wr.wind_speed} km/h`      : '—',   '#2563EB'],
            ['AQI',      aqr.aqi          !=null ? `${aqr.aqi}`                 : '—',   aqr.aqi > 150 ? '#DC2626' : '#16A34A'],
          ].map(([l,v,c]) => (
            <div key={l} style={{ background:'#F1F0EC', borderRadius:12, padding:'13px 10px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:c, letterSpacing:'-0.02em' }}>{v}</div>
              <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, color:'#94A3B8', fontWeight:600, textAlign:'center' }}>
          Sources: Open-Meteo · AQICN · Tomorrow.io · Pincode {pin}
        </div>
      </Panel>
    )}
  </>)
}

// ─────────────────────────────────────────────────────────────
// TAB: APIs
// ─────────────────────────────────────────────────────────────
function TabApis({ health, dash }) {
  const apis     = health?.apis      || {}
  const overall  = health?.overall   || 'unknown'
  const liveCount= health?.live_count|| 0
  const total    = health?.total     || 9

  const INTS = [
    { key:'open_meteo_weather', label:'Open-Meteo Weather',  sub:'Rain + wind + weather code · Free · No API key', emoji:'🌦', color:'#2563EB' },
    { key:'open_meteo_aqi',     label:'Open-Meteo AQI',      sub:'Air quality index · Free · No API key',          emoji:'🌫', color:'#D97706' },
    { key:'aqicn',              label:'AQICN',                sub:'Real-time AQI · 150+ Indian cities · Token',     emoji:'😷', color:'#EA580C' },
    { key:'tomorrow_io',        label:'Tomorrow.io',          sub:'Wind alerts · Flood · Free tier · 100/day',      emoji:'🌊', color:'#0891B2' },
    { key:'razorpay',           label:'Razorpay Payouts',     sub:'3-step: Contact → Fund Account → UPI Payout',    emoji:'💳', color:'#16A34A' },
    { key:'claude_vision',      label:'Claude Vision API',    sub:'Photo fraud detection · claude-opus-4-5',        emoji:'👁', color:'#7C3AED' },
    { key:'zone_risk_db',       label:'Zone Risk Database',   sub:'7 Bangalore pincodes · Disruption profiles',     emoji:'📍', color:'#16A34A' },
    { key:'lightgbm_model',     label:'LightGBM ML Engine',   sub:'400 estimators · R²=0.92 · 8,000 training rows', emoji:'🌲', color:'#16A34A' },
    { key:'fraud_engine',       label:'5-Layer Fraud Engine', sub:'Integrity · Rules · Graph · IsoForest · Vision', emoji:'🛡', color:'#16A34A' },
  ]

  const badge = (key) => {
    const d = apis[key]; if (!d) return { label:'—', bg:'#F1F5F9', color:'#94A3B8' }
    const map = { live:{label:'LIVE',bg:'#DCFCE7',color:'#16A34A'}, sandbox:{label:'SANDBOX',bg:'#FEF9C3',color:'#D97706'}, offline:{label:'OFFLINE',bg:'#FEE2E2',color:'#DC2626'}, degraded:{label:'DEGRADED',bg:'#FEF9C3',color:'#D97706'} }
    return map[d.status] || { label:(d.status||'live').toUpperCase(), bg:'#DCFCE7', color:'#16A34A' }
  }

  return (<>
    {/* System status */}
    <div style={{ padding:'16px', background: overall==='all_live'?'#F0FDF4':'#FFFBEB', border:`2px solid ${overall==='all_live'?'#86EFAC':'#FCD34D'}`, borderRadius:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color: overall==='all_live'?'#16A34A':'#D97706', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }}>System Status</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#1E293B' }}>{overall==='all_live' ? '✅ All Systems Live' : '⚠ Partial Outage'}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:30, fontWeight:800, color: overall==='all_live'?'#16A34A':'#D97706', letterSpacing:'-0.04em' }}>{liveCount}<span style={{ fontSize:14, color:'#94A3B8' }}>/{total}</span></div>
        <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, letterSpacing:'.07em' }}>APIS LIVE</div>
      </div>
    </div>

    {/* Deployment strip */}
    <div style={{ padding:'12px 16px', background:'#0A0D14', borderRadius:14, display:'flex', gap:9, alignItems:'center' }}>
      <div style={{ width:7, height:7, borderRadius:4, background:'#22C55E', animation:'pulse 1.4s ease-in-out infinite', flexShrink:0 }} />
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:600 }}>Deployed at </span>
      <span style={{ fontSize:12, color:'#60A5FA', fontWeight:700 }}>clad-five.vercel.app</span>
    </div>

    <Panel title="Integration Status" icon="⚡">
      {INTS.map((it, i) => {
        const b = badge(it.key); const d = apis[it.key]
        return (
          <div key={it.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i<INTS.length-1 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ width:36, height:36, borderRadius:11, background:`${it.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{it.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1E293B' }}>{it.label}</div>
              <div style={{ fontSize:10, color:'#94A3B8', lineHeight:1.4 }}>{it.sub}</div>
              {d?.http_code && <div style={{ fontSize:9, color:'#CBD5E1', fontFamily:'monospace', marginTop:1 }}>HTTP {d.http_code}</div>}
            </div>
            <div style={{ padding:'3px 10px', borderRadius:999, background:b.bg, fontSize:9, fontWeight:800, color:b.color, textTransform:'uppercase', letterSpacing:'.07em', flexShrink:0 }}>{b.label}</div>
          </div>
        )
      })}
    </Panel>

    <Panel title="Backend Specs" icon="⚙️">
      {[
        ['Framework',       'FastAPI · Python 3.11'],
        ['API Version',     '3.2.0 · 17 endpoints'],
        ['ML Engine',       'LightGBM 400 estimators'],
        ['Training data',   '8,000 synthetic worker rows'],
        ['Test accuracy',   'R² = 0.92'],
        ['Fraud layers',    '5-layer real-time pipeline'],
        ['Triggers',        '5 types · pincode-level precision'],
        ['Razorpay key',    'rzp_test_SdtXKcSuPhPgo8 (sandbox)'],
        ['Claude Vision',   'claude-opus-4-5'],
        ['Deployed',        'Vercel (frontend) + local backend'],
      ].map(([k,v]) => (
        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F1F5F9', gap:12 }}>
          <span style={{ fontSize:11, color:'#94A3B8', fontWeight:700, flexShrink:0 }}>{k}</span>
          <span style={{ fontSize:11, color:'#1E293B', fontWeight:600, textAlign:'right' }}>{v}</span>
        </div>
      ))}
    </Panel>
  </>)
}

// ─────────────────────────────────────────────────────────────
// MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────
function KpiHero({ icon, label, val, sub, accent }) {
  return (
    <div style={{ background:'white', borderRadius:16, padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', textAlign:'center' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>{icon} {label}</div>
      <div style={{ fontSize:42, fontWeight:800, color:accent, letterSpacing:'-0.04em', lineHeight:1 }}>{val}</div>
      {sub && <div style={{ fontSize:11, color:'#94A3B8', marginTop:5, fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

function KpiSm({ label, val, accent }) {
  return (
    <div style={{ background:'white', borderRadius:13, padding:'12px 8px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize:19, fontWeight:800, color:accent, letterSpacing:'-0.025em' }}>{val}</div>
      <div style={{ fontSize:9, color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginTop:3 }}>{label}</div>
    </div>
  )
}

function Panel({ title, icon, children }) {
  return (
    <div style={{ background:'white', borderRadius:16, padding:'18px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' }}>
      <div style={{ fontSize:13, fontWeight:800, color:'#1E293B', marginBottom:14, display:'flex', alignItems:'center', gap:7 }}>
        <span>{icon}</span>{title}
      </div>
      {children}
    </div>
  )
}

function Pill({ label, color }) {
  return (
    <span style={{ padding:'2px 8px', borderRadius:6, background:`${color}14`, fontSize:10, fontWeight:700, color, flexShrink:0 }}>{label}</span>
  )
}

function LrBadge({ status }) {
  const map = { healthy:{label:'HEALTHY',bg:'#DCFCE7',color:'#16A34A'}, watch:{label:'WATCH',bg:'#FEF9C3',color:'#D97706'}, critical:{label:'CRITICAL',bg:'#FEE2E2',color:'#DC2626'} }
  const s = map[status] || map.healthy
  return <span style={{ fontSize:10, fontWeight:800, color:s.color, background:s.bg, padding:'3px 9px', borderRadius:6, textTransform:'uppercase', letterSpacing:'.07em' }}>{s.label}</span>
}

function DonutRing({ pct }) {
  const r = 22, c = 2*Math.PI*r, fill = c - (c * Math.min(pct,100) / 100)
  const color = pct >= 75 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444'
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#E2E8F0" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={fill}
        style={{ transform:'rotate(-90deg)', transformOrigin:'28px 28px', transition:'stroke-dashoffset 1s ease' }} />
    </svg>
  )
}

function Empty({ text }) {
  return <div style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:'24px 0', fontWeight:600 }}>{text}</div>
}

function Skeleton() {
  return (
    <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
      {[50, 90, 130, 100, 80, 120].map((h, i) => (
        <div key={i} style={{ height:h, borderRadius:14, background:'#E2E8F0', animation:'shimmer 1.4s ease-in-out infinite', backgroundImage:'linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)', backgroundSize:'200% 100%' }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OFFLINE DEMO DATA
// ─────────────────────────────────────────────────────────────
const DEMO_DASH = {
  overview:   { total_workers:8, active_policies:6, total_claims:14, approved:10, pending:2, rejected:2 },
  financials: { total_payout_inr:5840, payout_processed_inr:5108, weekly_premium_pool_inr:392, annualized_pool_inr:20384, loss_ratio_pct:48.3, loss_ratio_status:'healthy' },
  pool_health:{ utilisation_pct:28.6, reserve_buffer_pct:71.4 },
  clad_score: { average:73.2, by_grade:{'A+':1,'A':2,'B+':2,'B':2,'C':1,'D':0} },
  trigger_breakdown: { heavy_rain:7, waterlogging:3, aqi_spike:2, strike_curfew:1, manual:1 },
  fraud_summary: { total_fraud_flags:3, flagged_workers:2, pan_verified_workers:7, workers_with_delivery_history:8 },
  seven_day_forecast: Array.from({length:7},(_,i) => ({
    date: new Date(Date.now()+(i+1)*86400000).toISOString().slice(0,10),
    day:  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
    expected_claims:    [1.2,0.8,1.5,0.5,2.1,0.9,1.3][i],
    expected_payout_inr:[518,345,648,216,907,389,562][i],
  })),
}