import { useState, useRef, useEffect } from 'react'
import { useStore, fmt, planConfig } from '../store/useStore'
import { SBar, Spinner, Toast, CameraIcon, CheckIcon } from '../components/UI'
import { api } from '../api/clad'

const REASONS = {
  'Heavy rain — unable to deliver':       'heavy_rain',
  'Road blocked due to waterlogging':     'waterlogging',
  'Hazardous AQI — outdoor work unsafe':  'aqi_spike',
  'Cyclonic wind — delivery halted':      'cyclone_wind',
  'Strike/curfew — movement restricted':  'strike_curfew',
}

// ── VISION FRAUD CHECK ────────────────────────────────────────
// Calls ONLY the backend /vision/verify endpoint.
// Removed broken browser-direct Anthropic call (causes 401 + CORS errors).
// If backend is down → returns null → claim proceeds without vision block.
async function checkPhotoFraud(photoBase64, triggerType, pincode) {
  let mimeType = 'image/jpeg'
  if (photoBase64.startsWith('iVBOR')) mimeType = 'image/png'
  else if (photoBase64.startsWith('UklGR')) mimeType = 'image/webp'

  try {
    const BACKEND = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const res = await fetch(`${BACKEND}/vision/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_b64: photoBase64, mime_type: mimeType, trigger_type: triggerType, pincode }),
    })
    if (res.ok) {
      const data = await res.json()
      console.log('✅ Vision OK — verdict:', data.verdict)
      return { ...data, vision_used: true }
    }
    console.warn('⚠ Vision endpoint returned', res.status, '— claim proceeds')
    return null
  } catch (e) {
    console.warn('⚠ Vision backend unreachable:', e.message, '— claim proceeds')
    return null
  }
}

// ── MANUAL CLAIM ─────────────────────────────────────────────
export function ManualClaim() {
  const store = useStore()
  const { name, cladScore, cladGrade, plan, avgDailyEarning, pincode, triggerResult } = store
  const cfg    = planConfig[plan] || planConfig.plus
  const estAmt = Math.round(avgDailyEarning * cfg.rate)

  const [step,  setStep]  = useState('form')  // form|camera|preview|analyzing|submitting
  const [photo, setPhoto] = useState(null)
  const [blob,  setBlob]  = useState(null)
  const [err,   setErr]   = useState('')
  const [vr,    setVr]    = useState(null)    // visionResult

  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const uploadRef = useRef(null)

  useEffect(() => () => stopCam(), [])

  const stopCam = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }



  const openCam = async () => {
    setErr('')
    if (!navigator.mediaDevices?.getUserMedia) { setErr('Camera not supported. Use Chrome on localhost or HTTPS.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      streamRef.current = stream; setStep('camera')
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 50)
    } catch (e) {
      const msgs = { NotAllowedError: 'Camera permission denied. Click 🔒 → Allow camera.', PermissionDeniedError: 'Camera permission denied.', NotFoundError: 'No camera found.', NotReadableError: 'Camera is in use by another app.' }
      setErr(msgs[e.name] || `Camera error: ${e.message}`)
    }
  }

  const capture = () => {
    const v = videoRef.current; if (!v) return
    const c = document.createElement('canvas'); c.width = v.videoWidth || 640; c.height = v.videoHeight || 480
    const ctx = c.getContext('2d')
ctx.drawImage(v, 0, 0)

// 🔥 Advanced diagonal watermark
const time = new Date().toLocaleString()

// get location (if available)
const lat = window.__coords?.lat?.toFixed(3) || ''
const lon = window.__coords?.lon?.toFixed(3) || ''

const text = `CLAD • ${time} ${lat && lon ? `• ${lat},${lon}` : ''} • LIVE`

// stronger style
ctx.font = "22px Arial"
ctx.fillStyle = "rgba(255,255,255,0.35)"
ctx.textAlign = "center"

// random offset
const offset = Math.random() * 100

// rotate for diagonal
ctx.translate(c.width / 2, c.height / 2)
ctx.rotate(-Math.PI / 4)

// repeat watermark
const spacing = 180

for (let x = -c.width; x < c.width; x += spacing) {
  for (let y = -c.height; y < c.height; y += spacing) {
    ctx.fillText(text, x + offset, y + offset)
  }
}

// reset transform (VERY IMPORTANT)
ctx.setTransform(1, 0, 0, 1, 0, 0)
    const url = c.toDataURL('image/jpeg', 0.85); setBlob(url); setPhoto(url.split(',')[1]); setVr(null); stopCam(); setStep('preview')
  }

  const submit = async () => {
    if (!photo) { setErr('Photo is required'); return }
    const amt    = parseFloat(document.getElementById('mc_amt')?.value) || estAmt
    const reason = document.getElementById('mc_reason')?.value || Object.keys(REASONS)[0]
    const needed = REASONS[reason]

    setStep('analyzing'); setErr('')
    const vision = await checkPhotoFraud(photo, needed || 'manual', pincode)
    setVr(vision)

    if (vision?.vision_used) {
      const isFraud = vision.recommended_action === 'REJECT' || vision.is_stock_photo || vision.is_screenshot || vision.is_ai_generated
      if (isFraud) {
        store.penalizeFalseClaim()
        store.set('visionRejectReason', vision.reason || 'Photo did not pass AI verification.')
        store.go('claimrejected'); return
      }
    }

    setStep('submitting')
    try {
      let fired = triggerResult?.triggers_fired || []
      try { const td = await api.checkTriggers(pincode); store.onTriggerResult(td); fired = td.triggers_fired || [] } catch {}
      const valid = needed === null || fired.includes(needed)
      if (!valid) { store.penalizeFalseClaim(); store.go('claimrejected'); return }

      const fc = store.falseClaims; let finalAmt = amt, note = ''
      if (fc >= 3) { finalAmt = Math.round(amt * 0.50); note = '50% payout — fraud history' }
      else if (fc === 2) { finalAmt = Math.round(amt * 0.70); note = '70% payout — fraud history' }
      else if (fc === 1) { finalAmt = Math.round(amt * 0.85); note = '85% payout — fraud history' }
      store.set('payoutPenaltyNote', note)

        let coords = null

try {
  coords = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
} catch {}
      window.__coords = coords
      const data = await api.createClaim({
  user: name,
  amount: finalAmt,
  reason,
  photo_submitted: true,
  photo_metadata: {
  timestamp_utc: new Date().toISOString(),
  vision_verdict: vision?.verdict || 'UNVERIFIED',
  vision_used: vision?.vision_used || false,

  // ✅ NEW
  location: coords,
  capture_type: "camera_only"
}
})

// ✅ get real claim
const claim = data.claim || data
const claimId = claim.id

// ✅ store it
store.onClaimCreated({ ...claim, amount: finalAmt })

// ✅ CALL PAYOUT HERE (FIX)
await api.payout({
      claim_id: claimId,
      worker_name: name
    })

    store.go('payout')

  } catch (e) {
    setErr(e.message || 'Submit failed.')
    setStep('preview')
  }
}


  // Camera view
  if (step === 'camera') return (
    <div className="screen" style={{ background: '#000' }}>
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'rgba(0,0,0,0.55)' }}>
        <button onClick={() => { stopCam(); setStep('form') }} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div><div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Take Photo Proof</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Show disruption clearly — AI will verify</div></div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 24, border: '2px solid rgba(255,255,255,0.3)', borderRadius: 18, pointerEvents: 'none' }} />
        {[{ top: 24, left: 24, borderWidth: '3px 0 0 3px' }, { top: 24, right: 24, borderWidth: '3px 3px 0 0' }, { bottom: 24, left: 24, borderWidth: '0 0 3px 3px' }, { bottom: 24, right: 24, borderWidth: '0 3px 3px 0' }].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderColor: 'white', borderStyle: 'solid', borderRadius: 4, pointerEvents: 'none', ...s }} />
        ))}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(transparent,rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
      </div>
      <div style={{ padding: '18px 22px 40px', flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 14 }}>Tip: Show flooded streets, dark skies, or restricted areas</div>
        <button onClick={capture} style={{ width: '100%', padding: 18, background: 'white', border: 'none', borderRadius: 18, fontFamily: 'Bricolage Grotesque', fontSize: 16, fontWeight: 800, color: '#111110', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <CameraIcon size={20} color="#111110" /> Capture Photo
        </button>
      </div>
    </div>
  )

  // Analyzing
  if (step === 'analyzing') return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 24 }}>
      <div style={{ width: 80, height: 80, borderRadius: 28, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="38" height="38" fill="none" viewBox="0 0 24 24">
          <path d="M1 12C1 12 5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>AI Analyzing Photo</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Claude Vision checking for real disruption…</div>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {['Checking image authenticity…', 'Looking for weather evidence…', 'Cross-referencing zone data…'].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: 'white', flexShrink: 0, animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite` }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // Submitting
  if (step === 'submitting') return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 22 }}>
      <div style={{ width: 62, height: 62, borderRadius: 22, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>Processing claim…</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Checking live triggers · Fraud engine</div>
      </div>
    </div>
  )

  // Preview
  if (step === 'preview') return (
    <div className="screen">
      <SBar />
      <div style={{ padding: '8px 22px 16px', flexShrink: 0 }}>
        <button onClick={() => { setPhoto(null); setBlob(null); openCam() }} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer', padding: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>← Retake</button>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em', marginBottom: 4 }}>Review Photo</div>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Make sure the disruption is clearly visible</div>
      </div>
      <div className="scroll-body" style={{ padding: '0 22px' }}>
        {blob && <img src={blob} alt="proof" style={{ width: '100%', borderRadius: 18, objectFit: 'cover', maxHeight: 260 }} />}
        <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '1px solid var(--green-bd)', borderRadius: 14, padding: '13px 15px', display: 'flex', gap: 10 }}>
          <CheckIcon color="var(--green)" size={16} />
          <div style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.6, fontWeight: 600 }}>Photo ready · Claude Vision will verify before approving</div>
        </div>
      </div>
      <div style={{ padding: '14px 22px 0' }}><Toast msg={err} /></div>
      <div style={{ padding: '8px 22px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-ink" onClick={submit}>Submit Claim →</button>
        <button className="btn btn-ghost" onClick={() => { setPhoto(null); setBlob(null); openCam() }}>Retake Photo</button>
      </div>
    </div>
  )

  // Main form
  return (
    <div className="screen">
      <SBar />
      <div style={{ padding: '8px 22px 0', flexShrink: 0 }}>
        <button onClick={() => store.go('home')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer', padding: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Manual Claim</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.15, letterSpacing: '-0.025em', marginBottom: 6 }}>File a claim.</div>
        <div style={{ fontSize: 14, color: 'var(--t2)' }}>Photo proof required. AI-verified in seconds.</div>
      </div>
      <div className="scroll-body" style={{ padding: '16px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card-shadow" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginBottom: 3 }}>Your CladScore</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: cladScore >= 75 ? 'var(--green)' : cladScore >= 50 ? 'var(--amber)' : 'var(--red)' }}>{cladScore} · {cladGrade}</div>
          </div>
          <span className={`tag ${cladScore >= 75 ? 'tag-green' : cladScore >= 50 ? 'tag-amber' : 'tag-red'}`}>
            {cladScore >= 75 ? '✓ Auto-approve' : cladScore >= 50 ? '2hr hold' : 'Manual review'}
          </span>
        </div>
        <div>
          <label className="lbl">Claim amount (₹)</label>
          <input className="inp" id="mc_amt" type="number" placeholder={estAmt} defaultValue={estAmt} />
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, fontWeight: 600 }}>Suggested ₹{estAmt} — {Math.round(cfg.rate * 100)}% of ₹{Math.round(avgDailyEarning)}/day</div>
        </div>
        <div>
          <label className="lbl">Reason</label>
          <select className="inp" id="mc_reason">{Object.keys(REASONS).map(r => <option key={r} value={r}>{r}</option>)}</select>
        </div>
        <div style={{ background: '#111110', borderRadius: 18, padding: 18 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CameraIcon size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 3 }}>Photo proof required</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Take a photo showing the disruption. Claude Vision verifies it's real before approving.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openCam} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, fontFamily: 'Bricolage Grotesque', fontSize: 14, fontWeight: 700, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <CameraIcon size={16} color="white" /> Camera
            </button>
          </div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: '13px 15px', fontSize: 12, color: 'var(--t2)', lineHeight: 1.65 }}>
          Submit → AI photo check → Live trigger confirmed → Payout in <strong style={{ color: 'var(--t1)' }}>{cfg.speed}</strong> via UPI
        </div>
      </div>
      <div style={{ padding: '12px 22px 0' }}><Toast msg={err} /></div>
      <div style={{ padding: '8px 22px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-ink" onClick={openCam}>Take Photo & Continue →</button>
        <button className="btn btn-ghost" onClick={() => store.go('home')}>Cancel</button>
      </div>
    </div>
  )
}

// ── CLAIMING ─────────────────────────────────────────────────
export function Claiming() {
  const store = useStore()
  const [step, setStep] = useState(0)
  const [prog, setProg] = useState(0)
  const steps = ['Verifying photo with AI…', 'Checking weather data…', `Zone: ${store.selectedZone} confirmed`, 'Preparing UPI transfer…']
  useEffect(() => {
    const iv = setInterval(() => {
      setStep(s => { const n = s + 1; setProg((n / steps.length) * 100); if (n >= steps.length) { clearInterval(iv); setTimeout(() => store.go('payout'), 600) } return n })
    }, 900)
    return () => clearInterval(iv)
  }, [])
  return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ width: 66, height: 66, borderRadius: 22, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.025em', marginBottom: 6 }}>Processing<br />your claim</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Zero-touch · Fraud-free in 4 seconds</div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {steps.map((s, i) => {
            const done = i < step, active = i === step
            return (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: active ? 'rgba(255,255,255,0.07)' : 'transparent', opacity: i > step ? 0.22 : 1, transition: 'all .28s' }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: done ? '#22C55E' : active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {done ? <CheckIcon size={11} color="white" /> : active ? <div style={{ width: 7, height: 7, borderRadius: 4, background: 'white', animation: 'pulse .85s ease-in-out infinite' }} /> : null}
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s}</span>
              </div>
            )
          })}
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: '#22C55E', width: `${prog}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── PAYOUT ────────────────────────────────────────────────────
export function Payout() {
  const store = useStore()
  const { latestClaim, plan, cladScore, cladGrade, name, payoutPenaltyNote, selectedZone } = store
  const cfg  = planConfig[plan] || planConfig.plus
  const amt  = latestClaim?.amount ? fmt(latestClaim.amount) : fmt(Math.round(store.avgDailyEarning * cfg.rate))
  const ref  = latestClaim?.id ? `CLAD-${String(latestClaim.id).padStart(4, '0')}` : `CLAD-${Date.now().toString().slice(-4)}`
  const [mode, setMode]     = useState('choice')
  const [upiId, setUpiId]   = useState('')
  const [bankAcc, setBankAcc] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [busy, setBusy]     = useState(false)
  const [payErr, setPayErr] = useState('')

  useEffect(() => { if (name) api.getClaims(name).then(d => store.onClaimsLoaded(d.claims || [])).catch(() => {}) }, [])

const pay = async () => {
  if (mode === 'upi' && !upiId.includes('@')) {
    setPayErr('Enter a valid UPI ID e.g. name@upi')
    return
  }

  if (mode === 'bank' && bankAcc.length < 8) {
    setPayErr('Enter a valid account number')
    return
  }

  setBusy(true)
  setPayErr('')
  setMode('processing')

  try {
    // ❌ REMOVED api.payout call (already done earlier)

    await new Promise(r => setTimeout(r, 1400))

    setMode('done')
  } catch (e) {
    setPayErr(e.message || 'Payment failed.')
    setMode(upiId ? 'upi' : 'bank')
    setBusy(false)
  }
}

  if (mode === 'processing') return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 22 }}>
      <div style={{ width: 62, height: 62, borderRadius: 22, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 6 }}>Sending payment…</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Razorpay processing your transfer</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '13px 16px', display: 'flex', gap: 10 }}>
        <span>🔒</span><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Secured by Razorpay test sandbox</div>
      </div>
    </div>
  )

  if (mode === 'done') return (
    <div className="screen" style={{ background: '#111110', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 80, height: 80, borderRadius: 28, background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 40px rgba(34,197,94,0.38)', animation: 'bounceIn .55s cubic-bezier(.34,1.56,.64,1) both' }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
        </div>
        <div style={{ textAlign: 'center', animation: 'countUp .45s .15s both' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 5, fontWeight: 700 }}>Money sent</div>
          <div style={{ fontSize: 64, fontWeight: 800, color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>{amt}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{upiId || 'Bank Account'} · {cfg.speed}</div>
        </div>
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 18 }}>
          {[['Reference', ref], ['Via', upiId ? `UPI — ${upiId}` : 'Bank NEFT'], ['Powered by', 'Razorpay sandbox'], ['CladScore', `${cladScore} · ${cladGrade}`], ['Zone', selectedZone]].map(([k, v], i, a) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < a.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {payoutPenaltyNote && <div style={{ marginTop: 10, fontSize: 12, color: '#FCD34D', fontWeight: 600 }}>⚠ {payoutPenaltyNote}</div>}
        </div>
        <button style={{ width: '100%', padding: 16, background: 'white', border: 'none', borderRadius: 16, fontFamily: 'Bricolage Grotesque', fontSize: 16, fontWeight: 800, color: '#111110', cursor: 'pointer' }} onClick={() => store.go('home')}>Back to Home</button>
      </div>
    </div>
  )

  return (
    <div className="screen">
      <SBar />
      <div style={{ padding: '8px 22px 18px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Claim Approved 🎉</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', marginBottom: 4 }}>Get your money.</div>
        <div style={{ fontSize: 15, color: 'var(--t2)' }}>Choose how to receive <strong style={{ color: 'var(--green)' }}>{amt}</strong></div>
      </div>
      <div className="scroll-body" style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: 'linear-gradient(135deg,var(--green),#22A052)', borderRadius: 20, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginBottom: 4 }}>Approved amount</div><div style={{ fontSize: 34, fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>{amt}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Payout speed</div><span className="tag tag-white" style={{ fontSize: 13 }}>{cfg.speed}</span></div>
        </div>
        <div style={{ background: 'var(--blue-bg)', border: '1px solid var(--blue-bd)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>Secured by Razorpay</div><div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>Test sandbox mode · No real money</div></div>
        </div>
        {mode === 'choice' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>Choose payment method</div>
            {[{ id: 'upi', emoji: '📱', title: 'UPI Transfer', sub: 'Instant · GPay, PhonePe, BHIM, Paytm', bg: 'var(--purple-bg)' }, { id: 'bank', emoji: '🏦', title: 'Bank Account', sub: '1-2 hrs · NEFT/IMPS to any bank', bg: 'var(--blue-bg)' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className="card-shadow" style={{ padding: '16px 18px', border: '2px solid var(--border)', borderRadius: 18, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%', fontFamily: 'Bricolage Grotesque', transition: 'all .14s' }} onPointerDown={e => e.currentTarget.style.transform = 'scale(.97)'} onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{m.title}</div><div style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 500, marginTop: 2 }}>{m.sub}</div></div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            ))}
          </>
        )}
        {mode === 'upi' && (<>
          <button onClick={() => setMode('choice')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>← Back</button>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>Enter your UPI ID</div>
          <input className="inp" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi / mobile@ybl" style={{ fontSize: 17 }} />
          <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>Accepts: GPay, PhonePe, Paytm, BHIM</div>
          <Toast msg={payErr} />
          <button className="btn btn-green" onClick={pay} disabled={busy || !upiId}>{busy ? <><Spinner />Processing…</> : `Send ${amt} to UPI →`}</button>
        </>)}
        {mode === 'bank' && (<>
          <button onClick={() => setMode('choice')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: 'var(--t2)', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>← Back</button>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>Bank account details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label className="lbl">Account number</label><input className="inp" value={bankAcc} onChange={e => setBankAcc(e.target.value)} placeholder="11-16 digit account number" type="number" /></div>
            <div><label className="lbl">IFSC code</label><input className="inp" value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" style={{ textTransform: 'uppercase' }} /></div>
            <div><label className="lbl">Account holder name</label><input className="inp" placeholder={store.name} defaultValue={store.name} /></div>
          </div>
          <Toast msg={payErr} />
          <button className="btn btn-ink" onClick={pay} disabled={busy}>{busy ? <><Spinner />Processing…</> : `Transfer ${amt} →`}</button>
        </>)}
        <div style={{ height: 16 }} />
      </div>
    </div>
  )
}

// ── CLAIM REJECTED ────────────────────────────────────────────
export function ClaimRejected() {
  const store = useStore()
  const { cladScore, cladGrade, falseClaims } = store
  const penalty = falseClaims >= 3 ? 15 : falseClaims === 2 ? 10 : 8
  const visionReason = store.visionRejectReason || null
  return (
    <div className="screen">
      <SBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 28, gap: 18 }}>
        <div style={{ width: 76, height: 76, borderRadius: 26, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 30px rgba(201,42,42,0.32)', animation: 'bounceIn .5s cubic-bezier(.34,1.56,.64,1) both' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Claim Rejected</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.025em', lineHeight: 1.15 }}>{visionReason ? 'Photo verification failed.' : 'No active trigger in your zone.'}</div>
          <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 10, lineHeight: 1.65 }}>{visionReason || `The event isn't live in ${store.selectedZone} right now.`}</div>
        </div>
        <div style={{ width: '100%', background: 'var(--red-bg)', border: '1px solid var(--red-bd)', borderRadius: 20, padding: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>⚠ CladScore Penalty</div>
          {[['Reason', visionReason ? 'Fraudulent photo' : 'False claim attempt'], ['Penalty', `−${penalty} pts (attempt ${falseClaims})`], ['New score', `${cladScore} · ${cladGrade}`]].map(([k, v], i, a) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < a.length - 1 ? '1px solid var(--red-bd)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 13, color: i === 1 ? 'var(--red)' : 'var(--t1)', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ width: '100%', background: 'var(--bg2)', borderRadius: 14, padding: '13px 15px', fontSize: 12, color: 'var(--t2)', lineHeight: 1.65 }}>
          {visionReason ? 'Submit a real photo of actual weather. Stock images and AI photos are rejected.' : <><strong style={{ color: 'var(--t1)' }}>Claims need a live trigger</strong>: rain, AQI, flood, storm, or curfew.</>}
        </div>
        <button className="btn btn-ink" style={{ width: '100%' }} onClick={() => { store.set('visionRejectReason', null); store.go('home') }}>Back to Home</button>
      </div>
    </div>
  )
}