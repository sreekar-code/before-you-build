const rateLimit = require('./_ratelimit')

exports.handler = async (event) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  if (!rateLimit(ip, { max: 30, windowMs: 60_000 })) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests' }) }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { id, username } = body

  if (!id || !username) {
    return { statusCode: 400, body: JSON.stringify({ error: 'id and username required' }) }
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const url = `${SUPABASE_URL}/rest/v1/ideas?id=eq.${encodeURIComponent(id)}&username=eq.${encodeURIComponent(username)}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!res.ok) {
    const data = await res.json()
    return { statusCode: res.status, body: JSON.stringify({ error: data }) }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
