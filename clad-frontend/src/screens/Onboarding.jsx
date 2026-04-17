import { useState } from 'react'
import { useStore, ZONES, planConfig } from '../store/useStore'
import { SBar, Steps, Toast } from '../components/UI'

export function OB1() {
  const { name, phone, set, go } = useStore()
  const [err, setErr] = useState('')
  const next = () => {
    const n = document.getElementById('ob1_name')?.value?.trim()
    if (!n||n.length<2) { setErr('Please enter your full name'); return }
    set('name', n); set('phone', document.getElementById('ob1_phone')?.value?.trim()||'')
    setErr(''); go('ob2')
  }
  return (
    <div className="screen">
      <SBar />
      <Steps step={0} />
      <div className="scroll-body" style={{ padding:'8px 22px 0' }}>
        <div className="fu1" style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Step 1 of 4</div>
        <div className="fu2" style={{ fontSize:38, fontWeight:800, color:'var(--t1)', lineHeight:1.12, letterSpacing:'-0.025em', marginBottom:10 }}>Let's get<br/>you covered.</div>
        <div className="fu3" style={{ fontSize:15, color:'var(--t2)', lineHeight:1.65, marginBottom:32 }}>2 minutes. Protects your income<br/>starting this Monday.</div>
        <div className="fu4" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div><label className="lbl">Full name</label><input className="inp" id="ob1_name" placeholder="Ravi Kumar" defaultValue={name} autoFocus /></div>
          <div><label className="lbl">Mobile number</label><input className="inp" id="ob1_phone" placeholder="+91 98765 43210" defaultValue={phone} type="tel" /></div>
        </div>
        <div className="fu5" style={{ marginTop:20, background:'var(--bg2)', borderRadius:14, padding:'14px 16px', display:'flex', gap:10 }}>
          <span style={{ fontSize:18 }}>🔒</span>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6 }}>Encrypted and never shared with third parties.</div>
        </div>
      </div>
      <div style={{ padding:'12px 22px 0' }}><Toast msg={err} /></div>
      <div style={{ padding:'8px 22px 36px', display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-ink fu5" onClick={next}>Continue →</button>
      </div>
    </div>
  )
}

export function OB2() {
  const { pan, set, go } = useStore()
  const [otpSent, setOtpSent] = useState(false)
  const sendOtp = () => { setOtpSent(true); setTimeout(() => { const el=document.getElementById('ob2_otp'); if(el) el.value='234567' }, 600) }
  const next = () => { set('pan', document.getElementById('ob2_pan')?.value?.trim()?.toUpperCase()||'ABCDE1234F'); go('ob3') }
  return (
    <div className="screen">
      <SBar />
      <Steps step={1} />
      <div className="scroll-body" style={{ padding:'8px 22px 0' }}>
        <div className="fu1" style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Step 2 of 4</div>
        <div className="fu2" style={{ fontSize:38, fontWeight:800, color:'var(--t1)', lineHeight:1.12, letterSpacing:'-0.025em', marginBottom:10 }}>Verify your<br/>identity.</div>
        <div className="fu3" style={{ fontSize:15, color:'var(--t2)', lineHeight:1.65, marginBottom:28 }}>PAN prevents fraud — keeping premiums low for everyone.</div>
        <div className="fu4" style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label className="lbl">PAN number</label>
            <input className="inp" id="ob2_pan" placeholder="ABCDE1234F" defaultValue={pan} style={{ textTransform:'uppercase', letterSpacing:'0.08em' }} />
          </div>
          <div>
            <label className="lbl">OTP</label>
            <div style={{ display:'flex', gap:10 }}>
              <input className="inp" id="ob2_otp" placeholder="6-digit OTP" type="number" style={{ flex:1 }} />
              <button onClick={sendOtp} style={{ padding:'0 20px', background:otpSent?'var(--green-bg)':'var(--bg2)', border:`1.5px solid ${otpSent?'var(--green-bd)':'var(--border)'}`, borderRadius:12, fontFamily:'Bricolage Grotesque', fontSize:13, fontWeight:700, color:otpSent?'var(--green)':'var(--t2)', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap', transition:'all .2s' }}>
                {otpSent?'✓ Sent':'Send OTP'}
              </button>
            </div>
          </div>
        </div>
        <div className="fu5 card" style={{ marginTop:20, padding:'14px 16px', background:'var(--blue-bg)', borderColor:'var(--blue-bd)' }}>
          <div style={{ display:'flex', gap:10 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>💡</span>
            <div style={{ fontSize:12, color:'var(--blue)', lineHeight:1.65, fontWeight:600 }}>Fraud rings can't batch-create 500 PANs. One check — door permanently closed.</div>
          </div>
        </div>
      </div>
      <div style={{ padding:'12px 22px 36px', display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-ink fu5" onClick={next}>Verify & Continue →</button>
        <button className="btn btn-ghost fu6" onClick={() => go('ob1')}>← Back</button>
      </div>
    </div>
  )
}

export function OB3() {
  const { selectedZone, pincode, setZone, go, set } = useStore()
  return (
    <div className="screen">
      <SBar />
      <Steps step={2} />
      <div className="scroll-body" style={{ padding:'8px 22px 0' }}>
        <div className="fu1" style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Step 3 of 4</div>
        <div className="fu2" style={{ fontSize:38, fontWeight:800, color:'var(--t1)', lineHeight:1.12, letterSpacing:'-0.025em', marginBottom:10 }}>Your delivery<br/>zone.</div>
        <div className="fu3" style={{ fontSize:15, color:'var(--t2)', lineHeight:1.65, marginBottom:24 }}>We monitor <strong style={{ color:'var(--t1)' }}>3km around your zone</strong> with live rain + AQI data every minute.</div>
        <div className="fu4" style={{ marginBottom:18 }}>
          <label className="lbl">Platform</label>
          <select className="inp" id="ob3_platform">
            {['Zepto','Blinkit','Swiggy Instamart','Dunzo','BigBasket'].map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="fu5">
          <label className="lbl">Your area</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {ZONES.map(z => <div key={z} className={`zone-chip${z===selectedZone?' on':''}`} onClick={() => setZone(z)}>{z}</div>)}
          </div>
        </div>
        {selectedZone && (
          <div className="fu6" style={{ marginTop:14, padding:'12px 16px', background:'var(--green-bg)', border:'1px solid var(--green-bd)', borderRadius:14, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:4, background:'var(--green)', animation:'pulse 1.5s ease-in-out infinite', flexShrink:0 }} />
            <span style={{ fontSize:13, color:'var(--green)', fontWeight:700 }}>Monitoring {selectedZone} · Pincode {pincode}</span>
          </div>
        )}
      </div>
      <div style={{ padding:'16px 22px 36px', display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-ink" onClick={() => { const p=document.getElementById('ob3_platform')?.value; if(p) set('platform',p); go('ob4') }}>Continue →</button>
        <button className="btn btn-ghost" onClick={() => go('ob2')}>← Back</button>
      </div>
    </div>
  )
}

export function OB4() {
  const { selectedPlan, set, go } = useStore()
  const plans = [
    { key:'basic', idx:0, badge:'Starter',      note:'Best for new workers' },
    { key:'plus',  idx:1, badge:'Most popular',  note:'Best balance of cost & cover', rec:true },
    { key:'pro',   idx:2, badge:'High earner',   note:'₹2,500 cap per week' },
  ]
  return (
    <div className="screen">
      <SBar />
      <Steps step={3} />
      <div className="scroll-body" style={{ padding:'8px 22px 0' }}>
        <div className="fu1" style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:10 }}>Step 4 of 4</div>
        <div className="fu2" style={{ fontSize:38, fontWeight:800, color:'var(--t1)', lineHeight:1.12, letterSpacing:'-0.025em', marginBottom:10 }}>Choose your<br/>plan.</div>
        <div className="fu3" style={{ fontSize:15, color:'var(--t2)', marginBottom:22 }}>Most workers choose Plus for the best balance.</div>
        <div className="fu4" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {plans.map(p => {
            const cfg = planConfig[p.key]
            const sel = selectedPlan === p.idx
            return (
              <div key={p.key} className={`plan-card${sel?' selected':''}`}
                onClick={() => set('selectedPlan', p.idx)}
                style={{ background: sel ? cfg.bgColor : 'white' }}>
                {p.rec && <div style={{ position:'absolute', top:-1, right:18, background:cfg.color, color:'white', fontSize:9, fontWeight:800, padding:'3px 10px', borderRadius:'0 0 8px 8px', letterSpacing:'.08em' }}>BEST FIT</div>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:sel?cfg.color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>{p.badge}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.01em' }}>Clad {p.key.charAt(0).toUpperCase()+p.key.slice(1)}</div>
                    <div style={{ fontSize:12, color:'var(--t3)', marginTop:2, fontWeight:500 }}>{p.note}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'var(--t3)', marginBottom:1 }}>per week</div>
                    <div style={{ fontSize:30, fontWeight:800, color:sel?cfg.color:'var(--t1)', letterSpacing:'-0.03em' }}>₹{cfg.price}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {[cfg.capStr+' cap', cfg.speed+' payout'].map(f => (
                    <span key={f} style={{ fontSize:11, fontWeight:600, color:sel?cfg.color:'var(--t2)', background:sel?`${cfg.color}14`:'var(--bg2)', padding:'3px 8px', borderRadius:6 }}>{f}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop:12, padding:'12px 16px', background:'var(--bg2)', borderRadius:14, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, color:'var(--t2)' }}>Auto-renews every Monday</span>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>Pause anytime</span>
        </div>
      </div>
      <div style={{ padding:'16px 22px 36px', display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-ink fu5" onClick={() => { set('plan',['basic','plus','pro'][selectedPlan]); go('building') }} style={{ fontSize:17 }}>Activate Coverage →</button>
        <button className="btn btn-ghost fu6" onClick={() => go('ob3')}>← Back</button>
      </div>
    </div>
  )
}