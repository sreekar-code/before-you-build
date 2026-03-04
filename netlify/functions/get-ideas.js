exports.handler = async (event) => {
  const username = event.queryStringParameters?.username
  if (!username) {
    return { statusCode: 400, body: JSON.stringify({ error: 'username required' }) }
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const url = `${SUPABASE_URL}/rest/v1/ideas?username=eq.${encodeURIComponent(username)}&order=created_at.desc&select=*`

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    return { statusCode: res.status, body: JSON.stringify({ error: data }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }
}
