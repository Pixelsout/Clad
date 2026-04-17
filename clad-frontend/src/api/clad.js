const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const r    = await fetch(`${BASE}${path}`, opts)
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.detail || `HTTP ${r.status}`)
  return data
}

export const api = {
  health:        ()                => req('GET',  '/health'),
  register:      (b)               => req('POST', '/register', b),
  createPolicy:  (name, plan)      => req('POST', '/policy/create', { name, plan }),
  getPremium:    (b)               => req('POST', '/premium', b),
  checkTriggers: (pincode)         => req('GET',  `/trigger/check?pincode=${pincode}`),
  simulate:      (p, t)            => req('GET',  `/trigger/simulate?pincode=${p}&trigger=${t}`),
  getClaims:     (name)            => req('GET',  `/claims/${encodeURIComponent(name)}`),
  createClaim:   (b)               => req('POST', '/claims/create', b),
  payout:        (b)               => req('POST', '/payout', b),
  workerDash:    (name)            => req('GET',  `/dashboard/worker/${encodeURIComponent(name)}`),
  insurerDash: () => req('GET', '/dashboard/insurer'),
  apiHealth:   () => req('GET', '/api/health'),
}