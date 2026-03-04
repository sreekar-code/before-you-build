const store = new Map()

// Returns true if allowed, false if rate limit exceeded
module.exports = function rateLimit(ip, { max = 20, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const timestamps = (store.get(ip) || []).filter(t => now - t < windowMs)
  if (timestamps.length >= max) return false
  timestamps.push(now)
  store.set(ip, timestamps)
  return true
}
