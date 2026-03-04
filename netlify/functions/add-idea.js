exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
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
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'name required' }) }
  }
  if (!Number.isInteger(effort) || effort < 0 || effort > 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'effort must be integer 0–5' }) }
  }
  if (!Number.isInteger(impact) || impact < 0 || impact > 5) {
    return { statusCode: 400, body: JSON.stringify({ error: 'impact must be integer 0–5' }) }
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const url = `${SUPABASE_URL}/rest/v1/ideas`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
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

  return { statusCode: 201, body: JSON.stringify({ ok: true }) }
}
