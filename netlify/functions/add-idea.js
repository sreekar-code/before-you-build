const rateLimit = require('./_ratelimit')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  if (!rateLimit(ip, { max: 15, windowMs: 60_000 })) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { username, name, effort, impact, notes } = body

  if (!username || typeof username !== 'string' || !username.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'username required' }) }
  }
  if (username.length > 100) {
    return { statusCode: 400, body: JSON.stringify({ error: 'username too long (max 100)' }) }
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'name required' }) }
  }
  if (name.length > 200) {
    return { statusCode: 400, body: JSON.stringify({ error: 'name too long (max 200)' }) }
  }
  if (!Number.isInteger(effort) || effort < 0 || effort > 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'effort must be integer 0–5' }) }
  }
  if (!Number.isInteger(impact) || impact < 0 || impact > 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'impact must be integer 0–5' }) }
  }
  if (notes && notes.length > 2000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'notes too long (max 2000)' }) }
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const url = `${SUPABASE_URL}/rest/v1/ideas`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      username: username.trim(),
      name: name.trim(),
      effort,
      impact,
      notes: notes?.trim() || null,
    }),
  })

  if (!res.ok) {
    const data = await res.json()
    return { statusCode: res.status, body: JSON.stringify({ error: data }) }
  }

  const created = await res.json()
  return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(created[0]) }
}
