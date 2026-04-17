import { useState } from 'react'
import { useStore, fmt, planConfig } from '../store/useStore'
import { SBar, Spinner, Toast } from '../components/UI'
import { api } from '../api/clad'

const REASONS = {
  'Heavy rain — unable to deliver':        'heavy_rain',
  'Road blocked due to waterlogging':      'waterlogging',
  'Hazardous AQI — outdoor work unsafe':   'aqi_spike',
  'Cyclonic wind — delivery halted':       'cyclone_wind',
  'Strike/curfew — movement restricted':   'strike_curfew',
  'App outage — no orders received':       null,
}

export function ManualClaim() {
  const store = useStore()
  const { name, cladScore, cladGrade, plan, avgDailyEarning, pincode, triggerResult } = store
  const cfg     = planConfig[plan] || planConfig.plus
  const estAmt  = Math.round(avgDailyEarning * cfg.rate)
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')
  const activeFired = triggerResult?.triggers_fired || []

  const submit = async () => {
    if (!name) { setErr('Register a worker first'); return }
    setBusy(true); setErr('')

    const amt    = parseFloat(document.getElementById('mc_amt')?.value)  || estAmt
    const reason = document.getElementById('mc_reason')?.value || Object.keys(REASONS)[0]
    const needed = REASONS[reason]

    try {
      // Refresh triggers from API
      let fired = activeFired
      try {
        const fresh = await api.checkTriggers(pincode)
        store.onTriggerResult(fresh)
        fired = fresh.triggers_fired || []
      } catch { /* use cached */ }

      const valid = needed === null || fired.includes(needed)

      if (!valid) {
        store.penalizeFalseClaim()
        setBusy(false)
        store.go('claimrejected')
        return
      }

      // Apply repeat-fraud penalty
      const fc = store.falseClaims
      let finalAmt = amt
      let note = ''
      if      (fc >= 3) { finalAmt = Math.round(amt * 0.50); note = '50% payout — fraud history' }
      else if (fc === 2) { finalAmt = Math.round(amt * 0.70); note = '70% payout — fraud history' }
      else if (fc === 1) { finalAmt = Math.round(amt * 0.85); note = '85% payout — fraud history' }
      store.set('payoutPenaltyNote', note)

      const data = await api.createClaim({ user: name, amount: finalAmt, reason })
      const claim = { ...(data.claim || data), amount: finalAmt }
      store.onClaimCreated(claim)
      setBusy(false)
      store.go('claiming')

    } catch (e) {
      setErr(e.message || 'Could not submit. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <SBar />
      <div style={{ padding:'8px 22px 0', flexShrink:0 }}>
        <div className="fu1" style={{ fontSize:11, fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:8 }}>Zero-touch claim</div>
        <div className="display fu2" style={{ fontSize:34, color:'var(--t1)', lineHeight:1.18, marginBottom:6 }}>File a<br/>manual claim.</div>
        <div className="fu3" style={{ fontSize:14, color:'var(--t2)', marginBottom:0 }}>Auto-approved for CladScore ≥ 75.</div>
      </div>

      <div className="scroll-content" style={{ padding:'16px 22px 0', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Score badge */}
        <div className="fu4 glass" style={{ padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:10, color:'var(--t3)', marginBottom:3 }}>Your CladScore</div>
            <div style={{ fontSize:18, fontWeight:900, color: cladScore>=75?'var(--green)':cladScore>=50?'var(--amber)':'var(--red)' }}>{cladScore} · {cladGrade}</div>
          </div>
          <div className={`tag ${cladScore>=75?'tag-green':cladScore>=50?'tag-amber':'tag-red'}`}>
            {cladScore>=75?'✓ Auto-approve':cladScore>=50?'6hr hold':'Manual review'}
          </div>
        </div>

        {/* Amount */}
        <div className="fu5">
          <label className="lbl">Claim amount (₹)</label>
          <input className="inp" id="mc_amt" type="number" placeholder={estAmt} defaultValue={estAmt} />
          <div style={{ fontSize:11, color:'var(--t3)', marginTop:6 }}>Suggested ₹{estAmt} — {Math.round(cfg.rate*100)}% of ₹{Math.round(avgDailyEarning)}/day</div>
        </div>

        {/* Reason */}
        <div className="fu6">
          <label className="lbl">Reason</label>
          <select className="inp" id="mc_reason">
            {Object.keys(REASONS).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Status */}
        <div className="glass" style={{ padding:'13px 15px', borderColor:'rgba(0,230,118,.1)' }}>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.7 }}>
            <span style={{ color:'var(--green)', fontWeight:700 }}>Live verification:</span>{' '}
            {activeFired.length > 0
              ? <span style={{ color:'var(--green)' }}>✓ Active trigger: <strong>{activeFired[0].replace(/_/g,' ')}</strong></span>
              : <span style={{ color:'var(--amber)' }}>⚠ No trigger cached — will check on submit</span>}
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 22px 0', flexShrink:0 }}>
        <Toast msg={err} type="error" />
      </div>
      <div style={{ padding:'8px 22px 36px', flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? <><span className="spinner" />Verifying triggers…</> : 'Submit Claim →'}
        </button>
        <button className="btn btn-ghost" onClick={() => store.go('home')} disabled={busy}>Cancel</button>
      </div>
    </div>
  )
}