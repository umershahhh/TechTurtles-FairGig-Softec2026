// Central API client for all FairGig microservices

const AUTH     = import.meta.env.VITE_AUTH_SERVICE_URL     || 'http://localhost:8001'
const EARNINGS = import.meta.env.VITE_EARNINGS_SERVICE_URL || 'http://localhost:8002'
const ANOMALY  = import.meta.env.VITE_ANOMALY_SERVICE_URL  || 'http://localhost:8003'
const GRIEVANCE= import.meta.env.VITE_GRIEVANCE_SERVICE_URL|| 'http://localhost:8004'
const ANALYTICS= import.meta.env.VITE_ANALYTICS_SERVICE_URL|| 'http://localhost:8005'

function getToken() {
  return localStorage.getItem('fg_access_token')
}

async function request(baseUrl, path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Try refresh
    const refreshToken = localStorage.getItem('fg_refresh_token')
    if (refreshToken) {
      const rr = await fetch(`${AUTH}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (rr.ok) {
        const { access_token } = await rr.json()
        localStorage.setItem('fg_access_token', access_token)
        headers.Authorization = `Bearer ${access_token}`
        const retry = await fetch(`${baseUrl}${path}`, { ...options, headers })
        if (!retry.ok) throw new Error((await retry.json()).detail || retry.statusText)
        return retry.status === 204 ? null : retry.json()
      }
    }
    localStorage.removeItem('fg_access_token')
    localStorage.removeItem('fg_refresh_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.status === 204 ? null : res.json()
}

const get  = (base, path)        => request(base, path, { method: 'GET' })
const post = (base, path, body)  => request(base, path, { method: 'POST',  body: JSON.stringify(body) })
const patch= (base, path, body)  => request(base, path, { method: 'PATCH', body: JSON.stringify(body) })
const del  = (base, path)        => request(base, path, { method: 'DELETE' })

// ── Auth ──────────────────────────────────
export const authApi = {
  register:      (data) => post(AUTH, '/auth/register', data),
  login:         (data) => post(AUTH, '/auth/login', data),
  refresh:       (rt)   => post(AUTH, '/auth/refresh', { refresh_token: rt }),
  me:            ()     => get(AUTH, '/auth/me'),
  updateProfile: (data) => patch(AUTH, '/auth/me', data),
  listUsers:     ()     => get(AUTH, '/auth/users'),
}

// ── Earnings ──────────────────────────────
export const earningsApi = {
  createShift:         (data) => post(EARNINGS, '/shifts', data),
  listShifts:          (q='') => get(EARNINGS, `/shifts${q}`),
  getShift:            (id)   => get(EARNINGS, `/shifts/${id}`),
  updateShift:         (id, data) => patch(EARNINGS, `/shifts/${id}`, data),
  deleteShift:         (id)   => del(EARNINGS, `/shifts/${id}`),
  verifyShift:         (id, data) => patch(EARNINGS, `/shifts/${id}/verify`, data),
  pendingVerifications:()     => get(EARNINGS, '/shifts/pending/verification'),
  getSummary:          ()     => get(EARNINGS, '/earnings/summary'),
  importCsv: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return request(EARNINGS, '/shifts/import/csv', {
      method: 'POST',
      body: fd,
      headers: { Authorization: `Bearer ${getToken()}` },
    })
  },
}

// ── Anomaly ───────────────────────────────
export const anomalyApi = {
  getFlags:       (workerId) => get(ANOMALY, `/anomaly/flags/${workerId}`),
  checkWorker:    (workerId) => post(ANOMALY, `/anomaly/check/${workerId}`, {}),
  acknowledgeFlag:(flagId)   => patch(ANOMALY, `/anomaly/flags/${flagId}/acknowledge`, {}),
}

// ── Grievance ─────────────────────────────
export const grievanceApi = {
  create:         (data) => post(GRIEVANCE, '/grievances', data),
  list:           (q='') => get(GRIEVANCE, `/grievances${q}`),
  get:            (id)   => get(GRIEVANCE, `/grievances/${id}`),
  escalate:       (id, note) => patch(GRIEVANCE, `/grievances/${id}/escalate`, { advocate_note: note }),
  resolve:        (id, note) => patch(GRIEVANCE, `/grievances/${id}/resolve`,  { advocate_note: note }),
  close:          (id)   => patch(GRIEVANCE, `/grievances/${id}/close`, {}),
  addTags:        (id, tags) => patch(GRIEVANCE, `/grievances/${id}/tags`, { tags }),
  clusterSummary: ()     => get(GRIEVANCE, '/clusters/summary'),
}

// ── Analytics ─────────────────────────────
export const analyticsApi = {
  overview:          () => get(ANALYTICS, '/analytics/overview'),
  commissionTrends:  () => get(ANALYTICS, '/analytics/commission-trends'),
  incomeDistribution:() => get(ANALYTICS, '/analytics/income-distribution'),
  vulnerabilityFlags:() => get(ANALYTICS, '/analytics/vulnerability-flags'),
  topComplaints:     () => get(ANALYTICS, '/analytics/top-complaints'),
  workerAnalytics:   (id) => get(ANALYTICS, `/analytics/worker/${id}`),
}
