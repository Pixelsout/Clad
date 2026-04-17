import { create } from 'zustand'

export const ZONE_PINCODES = {
  'Koramangala': '560034', 'Indiranagar': '560038',
  'HSR Layout': '560102',  'Whitefield': '560066',
  'JP Nagar': '560078',    'Marathahalli': '560037',
}
export const ZONES = Object.keys(ZONE_PINCODES)

export const planConfig = {
  basic: { label:'Clad Basic',  price:29,  cap:800,  capStr:'₹800',   speed:'24hr',    rate:0.40, color:'#1971C2', bgColor:'#EFF6FF' },
  plus:  { label:'Clad Plus',   price:49,  cap:1500, capStr:'₹1,500', speed:'2hr',     rate:0.60, color:'#1A6B3A', bgColor:'#F0FDF4' },
  pro:   { label:'Clad Pro',    price:79,  cap:2500, capStr:'₹2,500', speed:'Instant', rate:0.80, color:'#E07000', bgColor:'#FFF7ED' },
}

export const fmt       = n => `₹${Math.round(n).toLocaleString('en-IN')}`
export const inits     = n => n ? n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : 'U'
export const scoreLabel= s => s>=82?'Excellent':s>=68?'Good':s>=52?'Fair':'Building'
export const scoreColor= s => s>=75?'var(--green)':s>=50?'var(--amber)':'var(--red)'

export const TRIGGER_META = {
  heavy_rain:   { emoji:'🌧', title:'Heavy Rain Alert',   color:'#1971C2', bg:'#EFF6FF', border:'#BFDBFE' },
  aqi_spike:    { emoji:'😷', title:'Air Quality Hazard', color:'#E07000', bg:'#FFF7ED', border:'#FED7AA' },
  waterlogging: { emoji:'🌊', title:'Waterlogging Alert', color:'#1971C2', bg:'#EFF6FF', border:'#BFDBFE' },
  cyclone_wind: { emoji:'🌪', title:'Storm Warning',      color:'#C92A2A', bg:'#FEF2F2', border:'#FECACA' },
  strike_curfew:{ emoji:'⚠️', title:'Area Restricted',   color:'#E07000', bg:'#FFF7ED', border:'#FED7AA' },
}

export const useStore = create((set, get) => ({
  screen: 'splash',

  // Auth / role
  role:      'worker',   // 'worker' | 'admin'
  adminAuth: false,

  // Onboarding
  name:'', phone:'', pan:'', platform:'Zepto',
  selectedPlan:1, selectedZone:'Koramangala', pincode:'560034',

  // Backend data
  worker:null, policy:null, premiumData:null,
  triggerResult:null, latestClaim:null, claimsHistory:[],

  // State
  cladScore:72, cladGrade:'B+', plan:'plus',
  avgDailyEarning:700, falseClaims:0, payoutPenaltyNote:'',
  notification: null,
  visionRejectReason: null,

  go:  (screen) => set({ screen }),
  set: (key, val) => set({ [key]: val }),
  setZone: (zone) => set({ selectedZone:zone, pincode:ZONE_PINCODES[zone]||'560034' }),
    logout: () => set({
  screen: 'splash',

  // reset user data
  name: '',
  phone: '',
  pan: '',
  platform: 'Zepto',

  worker: null,
  policy: null,
  premiumData: null,

  triggerResult: null,
  latestClaim: null,
  claimsHistory: [],

  // reset state
  cladScore: 72,
  cladGrade: 'B+',
  avgDailyEarning: 700,
  falseClaims: 0,

  notification: null,
  visionRejectReason: null
}),

  onWorkerRegistered:  (w) => set({ worker:w, avgDailyEarning:w.avg_daily_earning||get().avgDailyEarning, name:w.name||get().name }),
  onPremiumCalculated: (d) => set({ premiumData:d, cladScore:d.clad_score||get().cladScore, cladGrade:d.clad_grade||get().cladGrade }),
  onPolicyCreated:     (p) => set({ policy:p }),

  onTriggerResult: (data) => {
    const fired  = data.triggers_fired || []
    const claims = data.claims_created || []
    const notif  = fired.length > 0 ? {
      type:    fired[0],
      amount:  claims[0]?.amount || Math.round(get().avgDailyEarning * (planConfig[get().plan]?.rate||0.6)),
      claimId: claims[0]?.id || null,
      weather: data.weather_readings || {},
    } : null
    set({ triggerResult:data, notification:notif, latestClaim: claims.length>0 ? claims[claims.length-1] : get().latestClaim })
  },

  onClaimCreated:  (c) => set({ latestClaim:c }),
  onClaimsLoaded:  (c) => set({ claimsHistory:c }),
  dismissNotif:    ()  => set({ notification:null }),

  penalizeFalseClaim: () => {
    const fc = get().falseClaims + 1
    const p  = fc>=3?15:fc===2?10:8
    const s  = Math.max(10, get().cladScore-p)
    const g  = s>=85?'A+':s>=75?'A':s>=62?'B+':s>=50?'B':s>=35?'C':'D'
    set({ falseClaims:fc, cladScore:s, cladGrade:g })
    return { fc, penalty:p, score:s, grade:g }
  },
}))


if (typeof window !== "undefined") {
  window.__cladStore = {
    simulateNotif: (type) => {
      const store = useStore.getState()

      // fake trigger result (so your UI behaves like real backend)
      store.onTriggerResult({
        triggers_fired: [type],
        claims_created: [
          {
            id: Date.now(),
            amount: Math.round(store.avgDailyEarning * 0.6)
          }
        ],
        weather_readings: {}
      })
    }
  }
}