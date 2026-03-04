// ── STATE ──────────────────────────────────────────────────────
let currentUser = null
let ideas       = []
let hovered     = null

// ── QUADRANT ───────────────────────────────────────────────────
const Q = {
  'do-it':   { label: 'Do It',   cls: 'q-do-it',   color: '#52a878' },
  'plan-it': { label: 'Plan It', cls: 'q-plan-it',  color: '#5089c4' },
  'maybe':   { label: 'Maybe',   cls: 'q-maybe',    color: '#686868' },
  'skip':    { label: 'Skip',    cls: 'q-skip',     color: '#be5454' },
}

function quad(effort, impact) {
  if (effort < 3 && impact >= 3) return Q['do-it']
  if (effort >= 3 && impact >= 3) return Q['plan-it']
  if (effort < 3 && impact < 3)  return Q['maybe']
  return Q['skip']
}

// ── NAME SCREEN ────────────────────────────────────────────────
const nameScreen = document.getElementById('name-screen')
const appEl      = document.getElementById('app')

function showApp(name) {
  currentUser = name
  document.getElementById('display-username').textContent = name
  nameScreen.classList.add('hidden')
  appEl.classList.remove('hidden')
  document.fonts.ready.then(() => { initCanvas(); loadIdeas() })
}

function showNameScreen() {
  nameScreen.classList.remove('hidden')
  appEl.classList.add('hidden')
  document.getElementById('username-input').value = ''
  setTimeout(() => document.getElementById('username-input').focus(), 60)
}

document.getElementById('name-submit-btn').addEventListener('click', () => {
  const name = document.getElementById('username-input').value.trim()
  if (!name) { document.getElementById('name-error').textContent = 'Enter a name to continue.'; return }
  document.getElementById('name-error').textContent = ''
  localStorage.setItem('idea-matrix-username', name)
  showApp(name)
})

document.getElementById('username-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('name-submit-btn').click()
})

document.getElementById('change-name-btn').addEventListener('click', () => {
  localStorage.removeItem('idea-matrix-username')
  currentUser = null; ideas = []
  showNameScreen()
})

const saved = localStorage.getItem('idea-matrix-username')
if (saved) showApp(saved); else showNameScreen()

// ── CACHE ──────────────────────────────────────────────────────
function cacheKey() { return `idea-matrix-ideas-${currentUser}` }
function saveCache() { localStorage.setItem(cacheKey(), JSON.stringify(ideas)) }
function loadCache() {
  try { return JSON.parse(localStorage.getItem(cacheKey())) || null } catch { return null }
}

// ── API ────────────────────────────────────────────────────────
async function loadIdeas() {
  setErr('list', '')
  const cached = loadCache()
  if (cached) { ideas = cached; renderList(); renderMatrix() }
  else setLoading(true)

  try {
    const res = await fetch(`/.netlify/functions/get-ideas?username=${encodeURIComponent(currentUser)}`)
    const data = await res.json()
    if (!res.ok) { setErr('list', 'Load failed: ' + (data.error || res.status)); setLoading(false); return }
    ideas = data || []
    saveCache()
  } catch (e) {
    setErr('list', 'Load failed: ' + e.message); setLoading(false); return
  }
  setLoading(false)
  renderList(); renderMatrix()
}

async function insertIdea(payload) {
  try {
    const res = await fetch('/.netlify/functions/add-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) { setErr('form', 'Could not add: ' + (data.error || res.status)); return null }
    return data
  } catch (e) {
    setErr('form', 'Could not add: ' + e.message); return null
  }
}

async function deleteIdea(id) {
  try {
    const res = await fetch('/.netlify/functions/delete-idea', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username: currentUser }),
    })
    if (!res.ok) {
      const data = await res.json()
      setErr('list', 'Delete failed: ' + (data.error || res.status)); return false
    }
    return true
  } catch (e) {
    setErr('list', 'Delete failed: ' + e.message); return false
  }
}

// ── ADD FORM ───────────────────────────────────────────────────
const effortSlider = document.getElementById('effort-slider')
const impactSlider = document.getElementById('impact-slider')
effortSlider.addEventListener('input', () => document.getElementById('effort-val').textContent = effortSlider.value)
impactSlider.addEventListener('input', () => document.getElementById('impact-val').textContent = impactSlider.value)

document.getElementById('add-form').addEventListener('submit', async e => {
  e.preventDefault(); setErr('form', '')
  const name = document.getElementById('idea-name').value.trim()
  if (!name) return

  const btn = document.getElementById('add-btn')
  btn.disabled = true; btn.textContent = 'adding…'

  const newIdea = await insertIdea({
    username: currentUser,
    name,
    effort: +effortSlider.value,
    impact: +impactSlider.value,
    notes:  document.getElementById('idea-notes').value.trim() || null,
  })

  btn.disabled = false; btn.textContent = 'add to matrix'
  if (newIdea) {
    document.getElementById('idea-name').value  = ''
    document.getElementById('idea-notes').value = ''
    effortSlider.value = 0; document.getElementById('effort-val').textContent = '0'
    impactSlider.value = 0; document.getElementById('impact-val').textContent = '0'
    document.getElementById('idea-name').focus()
    ideas.unshift(newIdea)
    saveCache()
    renderList(); renderMatrix()
  }
})

document.getElementById('idea-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-form').requestSubmit() }
})

// ── RENDER LIST ────────────────────────────────────────────────
function renderList() {
  const list = document.getElementById('ideas-list')
  const cnt  = document.getElementById('ideas-count')
  cnt.textContent = ideas.length ? `${ideas.length} idea${ideas.length !== 1 ? 's' : ''}` : ''

  if (!ideas.length) {
    list.innerHTML = '<div class="empty-list">No ideas yet.<br>Add the first one above.</div>'
    return
  }

  list.innerHTML = ideas.map(idea => {
    const q = quad(idea.effort, idea.impact)
    return `<div class="idea-card ${q.cls}">
      <div class="card-name">${esc(idea.name)}</div>
      <div class="card-footer">
        <span class="card-scores">E${idea.effort} · I${idea.impact}</span>
        <span class="q-pill ${q.cls}">${q.label}</span>
      </div>
      <button class="del-btn" data-id="${idea.id}">×</button>
    </div>`
  }).join('')

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const prev = [...ideas]
      ideas = ideas.filter(i => i.id !== id)
      saveCache(); renderList(); renderMatrix()
      const ok = await deleteIdea(id)
      if (!ok) { ideas = prev; saveCache(); renderList(); renderMatrix() }
    })
  })
}

// ── EXPORT ─────────────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  if (!ideas.length) return
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(ideas, null, 2)], { type: 'application/json' }))
  a.download = `idea-matrix-${currentUser}-${Date.now()}.json`
  a.click()
})

// ── CANVAS ─────────────────────────────────────────────────────
const canvas  = document.getElementById('matrix-canvas')
const ctx     = canvas.getContext('2d')
const tooltip = document.getElementById('tooltip')

const PAD = { top: 32, right: 32, bottom: 60, left: 52 }
const DR  = 6  // dot radius
const HR  = 9  // hover radius

function initCanvas() {
  resize(); renderMatrix()
  new ResizeObserver(() => { resize(); renderMatrix() }).observe(canvas.parentElement)
  canvas.addEventListener('mousemove', onMove)
  canvas.addEventListener('mouseleave', onLeave)
}

function resize() {
  const el  = canvas.parentElement
  const dpr = window.devicePixelRatio || 1
  const w   = el.clientWidth
  const h   = el.clientHeight
  canvas.width  = w * dpr
  canvas.height = h * dpr
  canvas.style.width  = w + 'px'
  canvas.style.height = h + 'px'
  ctx.scale(dpr, dpr)
}

const cw = () => canvas.clientWidth
const ch = () => canvas.clientHeight
function px(effort) { return PAD.left + (effort / 5) * (cw() - PAD.left - PAD.right) }
function py(impact) { return PAD.top  + (1 - impact / 5) * (ch() - PAD.top - PAD.bottom) }

function renderMatrix() {
  const W = cw(), H = ch()
  const pw = W - PAD.left - PAD.right
  const ph = H - PAD.top  - PAD.bottom
  ctx.clearRect(0, 0, W, H)

  const mx = px(2.5)
  const my = py(2.5)

  // Quadrant fills
  const fills = [
    { x: PAD.left, y: PAD.top, w: mx - PAD.left,      h: my - PAD.top,         c: 'rgba(82,168,120,0.055)' },
    { x: mx,       y: PAD.top, w: PAD.left + pw - mx,  h: my - PAD.top,         c: 'rgba(80,137,196,0.055)' },
    { x: PAD.left, y: my,      w: mx - PAD.left,       h: PAD.top + ph - my,    c: 'rgba(100,100,100,0.04)' },
    { x: mx,       y: my,      w: PAD.left + pw - mx,  h: PAD.top + ph - my,    c: 'rgba(190,84,84,0.055)'  },
  ]
  fills.forEach(f => { ctx.fillStyle = f.c; ctx.fillRect(f.x, f.y, f.w, f.h) })

  // Quadrant labels — Fraunces italic, centered in each quadrant
  const qlabels = [
    { text: 'Do It',   x: PAD.left + (mx - PAD.left) / 2, y: PAD.top + (my - PAD.top) * 0.3,   c: 'rgba(82,168,120,0.38)'  },
    { text: 'Plan It', x: mx + (PAD.left + pw - mx) / 2,  y: PAD.top + (my - PAD.top) * 0.3,   c: 'rgba(80,137,196,0.38)'  },
    { text: 'Maybe',   x: PAD.left + (mx - PAD.left) / 2, y: my + (PAD.top + ph - my) * 0.7,   c: 'rgba(100,100,100,0.30)' },
    { text: 'Skip',    x: mx + (PAD.left + pw - mx) / 2,  y: my + (PAD.top + ph - my) * 0.7,   c: 'rgba(190,84,84,0.38)'   },
  ]
  ctx.font = 'italic 400 15px Fraunces, Georgia, serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  qlabels.forEach(g => { ctx.fillStyle = g.c; ctx.fillText(g.text, g.x, g.y) })

  // Faint grid lines at each integer
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'
  ctx.lineWidth   = 1
  ctx.setLineDash([])
  for (let i = 1; i <= 4; i++) {
    if (i === 2 || i === 3) continue
    const gx = px(i), gy = py(i)
    ctx.beginPath(); ctx.moveTo(gx, PAD.top); ctx.lineTo(gx, PAD.top + ph); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(PAD.left, gy); ctx.lineTo(PAD.left + pw, gy); ctx.stroke()
  }

  // Dividers
  ctx.setLineDash([2, 8])
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(mx, PAD.top); ctx.lineTo(mx, PAD.top + ph); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(PAD.left, my); ctx.lineTo(PAD.left + pw, my); ctx.stroke()
  ctx.setLineDash([])

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth   = 1
  ctx.strokeRect(PAD.left, PAD.top, pw, ph)

  // Axis ticks + numbers
  ctx.fillStyle    = 'rgba(62,58,54,0.9)'
  ctx.strokeStyle  = 'rgba(255,255,255,0.04)'
  ctx.lineWidth    = 1

  for (let i = 0; i <= 5; i++) {
    const tx = px(i), ty = py(i)
    ctx.font = '11px Space Mono, monospace'
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    ctx.fillText(i, tx, PAD.top + ph + 10)
    ctx.beginPath(); ctx.moveTo(tx, PAD.top + ph); ctx.lineTo(tx, PAD.top + ph + 5); ctx.stroke()
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(i, PAD.left - 10, ty)
    ctx.beginPath(); ctx.moveTo(PAD.left, ty); ctx.lineTo(PAD.left - 4, ty); ctx.stroke()
  }

  // Axis titles
  ctx.fillStyle    = 'rgba(62,58,54,0.6)'
  ctx.font         = '10px Space Mono, monospace'
  ctx.textAlign    = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('effort →', PAD.left + pw / 2, PAD.top + ph + 44)
  ctx.save()
  ctx.translate(14, PAD.top + ph / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('impact →', 0, 0)
  ctx.restore()

  // Empty state
  if (!ideas.length) {
    ctx.font      = 'italic 400 16px Fraunces, Georgia, serif'
    ctx.fillStyle = 'rgba(62,58,54,0.5)'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Your ideas will appear here.', W / 2, H / 2)
    return
  }

  // Dots
  ideas.forEach(idea => {
    const x  = px(idea.effort)
    const y  = py(idea.impact)
    const q  = quad(idea.effort, idea.impact)
    const ho = hovered && hovered.id === idea.id
    const r  = ho ? HR : DR

    if (ho) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5)
      g.addColorStop(0, q.color + '28')
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r * 3.5, 0, Math.PI * 2); ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = q.color + (ho ? '' : 'bb')
    ctx.fill()

    if (ho) {
      ctx.strokeStyle = q.color + '66'; ctx.lineWidth = 2; ctx.stroke()
    }

    const label = idea.name.length > 22 ? idea.name.slice(0, 21) + '…' : idea.name
    ctx.font      = `${ho ? 500 : 400} 11px Space Grotesk, system-ui, sans-serif`
    ctx.fillStyle = ho ? 'rgba(226,219,208,0.95)' : 'rgba(226,219,208,0.45)'
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    ctx.fillText(label, x + r + 6, y)
  })
}

// ── HOVER ──────────────────────────────────────────────────────
function onMove(e) {
  const r   = canvas.getBoundingClientRect()
  const mx  = e.clientX - r.left
  const my  = e.clientY - r.top
  let found = null

  for (const idea of ideas) {
    const dx = px(idea.effort) - mx, dy = py(idea.impact) - my
    if (Math.hypot(dx, dy) <= HR + 5) { found = idea; break }
  }

  if (found !== hovered) {
    hovered = found
    canvas.style.cursor = found ? 'pointer' : 'default'
    renderMatrix()
  }
  found ? showTip(e.clientX, e.clientY, found) : hideTip()
}

function onLeave() {
  hovered = null; canvas.style.cursor = 'default'
  hideTip(); renderMatrix()
}

function showTip(mx, my, idea) {
  const q = quad(idea.effort, idea.impact)
  document.getElementById('tt-name').textContent   = idea.name
  document.getElementById('tt-scores').textContent = `effort: ${idea.effort}  ·  impact: ${idea.impact}`
  const ttQ = document.getElementById('tt-quadrant')
  ttQ.textContent = q.label; ttQ.style.color = q.color
  const ttN = document.getElementById('tt-notes')
  ttN.textContent = idea.notes || ''; ttN.style.display = idea.notes ? 'block' : 'none'

  tooltip.classList.add('show')
  const tw = tooltip.offsetWidth || 230, th = tooltip.offsetHeight || 110
  let tx = mx + 18, ty = my - 10
  if (tx + tw > innerWidth  - 12) tx = mx - tw - 18
  if (ty + th > innerHeight - 12) ty = my - th - 4
  tooltip.style.left = tx + 'px'; tooltip.style.top = ty + 'px'
}

function hideTip() { tooltip.classList.remove('show') }

// ── HELPERS ────────────────────────────────────────────────────
function setLoading(on) { document.getElementById('loading-ideas').style.display = on ? 'flex' : 'none' }
function setErr(scope, msg) {
  document.getElementById(scope === 'list' ? 'list-error' : 'form-error').textContent = msg
}
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
