import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { CheckIcon } from '../components/UI'
import { api } from '../api/clad'

const STEPS = ['Registering worker…','Creating policy…','Calculating ML premium…','Activating coverage…']

export function Building() {
  const store = useStore()
  const [idx,  setIdx]   = useState(0)
  const [prog, setProg]  = useState(8)
  const [cards,setCards] = useState(null)

  useEffect(() => {
    const planKeys = ['basic','plus','pro']
    ;(async () => {
      try {
        setIdx(0); setProg(12)
        const reg = await api.register({
          name:store.name, pincode:store.pincode, plan:planKeys[store.selectedPlan],
          account_age_days:180, delivery_consistency:0.88, avg_daily_earning:720,
          claim_free_weeks:8, past_claims_count:1, location_honesty:0.90,
          claim_history_score:0.95, fraudulent_flags:0, has_delivery_history:true,
          total_deliveries:120, platform_links:[(store.platform||'zepto').toLowerCase()],
          pan_number:store.pan||'ABCDE1234F', pan_verified:true,
        })
        if (reg.user || reg.status==='registered' || reg.status==='already_registered')
          store.onWorkerRegistered(reg.user||reg)
        setProg(32)

        setIdx(1)
        const pol = await api.createPolicy(store.name, planKeys[store.selectedPlan])
        store.onPolicyCreated(pol.policy||pol); setProg(55)

        setIdx(2)
        const prem = await api.getPremium({ name:store.name, month:new Date().getMonth()+1 })
        store.onPremiumCalculated(prem)
        setCards({ score:prem.clad_score, grade:prem.clad_grade, premium:prem.predicted_premium, speed:prem.payout_speed })
        setProg(82)

        setIdx(3); setProg(100)
        await new Promise(r => setTimeout(r, 900))

        // Auto-check triggers — sets notification if live event
        try { const td=await api.checkTriggers(store.pincode); store.onTriggerResult(td) } catch {}

        store.go('home')
      } catch(e) {
        console.error(e)
        await new Promise(r => setTimeout(r,1500))
        store.go('home')
      }
    })()
  }, [])

  return (
    <div className="screen" style={{ background:'#111110', justifyContent:'center', alignItems:'center', padding:32 }}>
      <div style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
        <div style={{ width:72, height:72, borderRadius:24, background:'white', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 40px rgba(255,255,255,0.12)' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6l-8-4z" fill="rgba(26,107,58,0.15)" stroke="#1A6B3A" strokeWidth="1.8"/>
          </svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'white', marginBottom:6, letterSpacing:'-0.025em' }}>Setting up<br/>your coverage.</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>{STEPS[Math.min(idx,STEPS.length-1)]}</div>
        </div>
        <div style={{ width:'100%', background:'rgba(255,255,255,0.08)', borderRadius:4, height:4, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:4, background:'white', width:`${prog}%`, transition:'width 0.5s ease' }} />
        </div>
        <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:7 }}>
          {STEPS.map((s,i) => {
            const done=i<idx, active=i===idx
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, background:active?'rgba(255,255,255,0.08)':'transparent', opacity:i>idx?0.25:1, transition:'all .3s' }}>
                <div style={{ width:22, height:22, borderRadius:7, background:done?'white':active?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {done?<CheckIcon color="var(--green)" size={11}/>:active?<div style={{ width:7,height:7,borderRadius:4,background:'white',animation:'pulse .9s ease-in-out infinite' }}/>:null}
                </div>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{s}</span>
              </div>
            )
          })}
        </div>
        {cards && (
          <div style={{ width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['CladScore',`${cards.score}/100`],['Grade',cards.grade],['Premium',`₹${cards.premium}/wk`],['Payout',cards.speed]].map(([l,v]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.07)', borderRadius:14, padding:'13px 14px', animation:'scaleIn 0.3s ease both' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'white', marginBottom:3 }}>{v}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', fontWeight:600 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}