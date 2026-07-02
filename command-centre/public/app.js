'use strict';
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
    ...opts,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
  });
  if (res.status === 401) { location.href = '/login'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const $ = (sel, root = document) => root.querySelector(sel);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMUR = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-US');
function timeago(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
function toast(msg, type = 'ok') {
  const t = el(`<div class="toast ${type}">${esc(msg)}</div>`);
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 3800);
}
function modal(html) {
  const root = $('#modalRoot');
  root.innerHTML = '';
  const back = el(`<div class="modal-backdrop"><div class="modal">${html}</div></div>`);
  back.addEventListener('click', (e) => { if (e.target === back) closeModal(); });
  root.appendChild(back);
  return back;
}
function closeModal() { $('#modalRoot').innerHTML = ''; }

let BUSINESSES = [];
let STATUS = { integrations: {}, demoMode: true };
const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#1877f2' },
  { key: 'instagram', label: 'Instagram', color: '#e1306c' },
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
  { key: 'youtube', label: 'YouTube', color: '#ff0000' },
];
const bizName = (id) => (BUSINESSES.find((b) => b.id === id) || {}).name || '—';
function bizOptions(selected) {
  return BUSINESSES.map((b) => `<option value="${b.id}" ${b.id == selected ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */
const VIEWS = {};
async function go(view) {
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#viewTitle').textContent = document.querySelector(`#nav button[data-view="${view}"]`).textContent.trim();
  $('#view').innerHTML = '<p class="muted">Loading…</p>';
  try { await VIEWS[view](); } catch (e) { $('#view').innerHTML = `<div class="card">Error: ${esc(e.message)}</div>`; }
}
document.querySelectorAll('#nav button').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));

async function logout() { await api('/logout', { method: 'POST' }); location.href = '/login'; }

/* ------------------------------------------------------------------ */
/*  Command bar                                                        */
/* ------------------------------------------------------------------ */
$('#cmd').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;
  const text = e.target.value.trim();
  if (!text) return;
  try {
    const r = await api('/command', { method: 'POST', body: { text } });
    toast('✓ ' + (r.action || 'done').replace(/_/g, ' '));
    e.target.value = '';
    const active = document.querySelector('#nav button.active').dataset.view;
    go(active);
  } catch (err) { toast(err.message, 'err'); }
});

/* ================================================================== */
/*  DASHBOARD                                                          */
/* ================================================================== */
VIEWS.dashboard = async function () {
  const d = await api('/dashboard/summary');
  const bizCards = d.businesses.map((b) => `
    <div class="card revenue-card">
      <div class="kpi-row"><h3 style="color:${b.color}">${esc(b.name)}</h3><span class="pill">${b.progress}%</span></div>
      <div class="stat">${fmtMUR(b.month_revenue)} <small>this month</small></div>
      <div class="bar"><span style="width:${b.progress}%;background:${b.color}"></span></div>
      <div class="target">Target ${fmtMUR(b.target)} · Today ${fmtMUR(b.today_revenue)}</div>
    </div>`).join('');

  const counts = d.counts;
  const apptRows = d.todaysAppointments.length
    ? d.todaysAppointments.map((a) => `<tr><td>${new Date(a.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(a.contact_name || '—')}</td><td>${esc(a.service_name || a.title)}</td><td><span class="dot" style="background:${a.business_color}"></span> ${esc(a.business_name || '')}</td></tr>`).join('')
    : '<tr><td colspan="4" class="muted">No appointments today.</td></tr>';

  const upcoming = d.upcomingPosts.length
    ? d.upcomingPosts.map((p) => `<tr><td>${esc(p.platform)}</td><td>${esc((p.caption || '').slice(0, 40))}</td><td class="muted">${p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : ''}</td></tr>`).join('')
    : '<tr><td colspan="3" class="muted">Nothing scheduled — head to Social Studio.</td></tr>';

  $('#view').innerHTML = `
    <div class="grid cols-2" style="margin-bottom:16px">${bizCards}</div>
    <div class="grid cols-4" style="margin-bottom:16px">
      <div class="card"><h3>Unread messages</h3><div class="stat">${counts.unread}</div></div>
      <div class="card"><h3>Open deals</h3><div class="stat">${counts.openDeals}</div></div>
      <div class="card"><h3>Pending tasks</h3><div class="stat">${counts.pendingTasks}</div></div>
      <div class="card"><h3>Posts published</h3><div class="stat">${d.posts.published || 0} <small>/ ${d.posts.scheduled || 0} scheduled</small></div></div>
    </div>
    <div class="grid cols-2" style="margin-bottom:16px">
      <div class="card"><h3>Revenue trend (6 months)</h3><canvas id="revChart" height="160"></canvas></div>
      <div class="card"><h3>Engagement by platform</h3><canvas id="engChart" height="160"></canvas></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><h3>Today's appointments</h3><table><thead><tr><th>Time</th><th>Client</th><th>Service</th><th>Business</th></tr></thead><tbody>${apptRows}</tbody></table></div>
      <div class="card"><h3>Upcoming posts</h3><table><thead><tr><th>Platform</th><th>Caption</th><th>When</th></tr></thead><tbody>${upcoming}</tbody></table></div>
    </div>`;

  drawRevChart(d);
  drawEngChart(d.engagement);
};

function lastSixMonths() {
  const arr = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(dt.toISOString().slice(0, 7));
  }
  return arr;
}
function drawRevChart(d) {
  const ctx = $('#revChart'); if (!ctx || !window.Chart) return;
  const months = lastSixMonths();
  const datasets = BUSINESSES.map((b) => ({
    label: b.name,
    data: months.map((m) => {
      const row = d.revenueTrend.find((r) => r.ym === m && r.business_id === b.id);
      return row ? row.v : 0;
    }),
    borderColor: b.color, backgroundColor: b.color + '33', tension: .35, fill: true,
  }));
  new Chart(ctx, { type: 'line', data: { labels: months, datasets },
    options: { plugins: { legend: { labels: { color: '#8a97b8' } } }, scales: { x: { ticks: { color: '#8a97b8' } }, y: { ticks: { color: '#8a97b8' } } } } });
}
function drawEngChart(engagement) {
  const ctx = $('#engChart'); if (!ctx || !window.Chart) return;
  const labels = PLATFORMS.map((p) => p.label);
  const val = (metric) => PLATFORMS.map((p) => { const e = engagement.find((x) => x.platform === p.key); return e ? e[metric] : 0; });
  new Chart(ctx, { type: 'bar', data: { labels, datasets: [
    { label: 'Likes', data: val('likes'), backgroundColor: '#6366f1' },
    { label: 'Comments', data: val('comments'), backgroundColor: '#22d3ee' },
    { label: 'Shares', data: val('shares'), backgroundColor: '#ec4899' },
  ] }, options: { plugins: { legend: { labels: { color: '#8a97b8' } } }, scales: { x: { ticks: { color: '#8a97b8' } }, y: { ticks: { color: '#8a97b8' } } } } });
}

/* ================================================================== */
/*  CRM & INBOX                                                        */
/* ================================================================== */
let CRM_SELECTED = null;
VIEWS.crm = async function () {
  $('#view').innerHTML = `
    <div class="toolbar">
      <input id="crmSearch" placeholder="Search name or phone…" style="max-width:260px" />
      <select id="crmStage" style="max-width:170px"><option value="">All stages</option>
        ${['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map((s) => `<option>${s}</option>`).join('')}</select>
      <div class="spacer"></div>
      <button class="btn" onclick="newContactModal()">+ New contact</button>
      <button class="btn ghost" onclick="logCommModal()">Log call / SMS</button>
    </div>
    <div class="crm">
      <div class="card contact-list" id="contactList"></div>
      <div class="card thread" id="thread"><p class="muted">Select a conversation.</p></div>
    </div>`;
  $('#crmSearch').addEventListener('input', debounce(loadContacts, 300));
  $('#crmStage').addEventListener('change', loadContacts);
  await loadContacts();
};
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

async function loadContacts() {
  const q = $('#crmSearch')?.value || '';
  const stage = $('#crmStage')?.value || '';
  const list = await api(`/contacts?q=${encodeURIComponent(q)}&stage=${stage}`);
  const box = $('#contactList');
  if (!list.length) { box.innerHTML = '<p class="muted">No contacts.</p>'; return; }
  box.innerHTML = list.map((c) => `
    <div class="contact-item ${CRM_SELECTED == c.id ? 'active' : ''}" onclick="openContact(${c.id})">
      <div class="name">
        <span><span class="dot" style="background:${c.business_color || '#555'}"></span> ${esc(c.name)}</span>
        ${c.unread ? '<span class="unread-dot" title="unread"></span>' : ''}
      </div>
      <div class="snippet">${esc(c.last_message || c.phone || '')}</div>
      <div class="snippet"><span class="badge ${c.stage}">${c.stage}</span> · ${timeago(c.last_at)}</div>
    </div>`).join('');
}

async function openContact(id) {
  CRM_SELECTED = id;
  document.querySelectorAll('.contact-item').forEach((n) => n.classList.remove('active'));
  const { contact, messages, deals } = await api(`/contacts/${id}`);
  await api(`/contacts/${id}/read`, { method: 'POST' }).catch(() => {});
  const msgs = messages.map((m) => {
    if (m.channel === 'call') return `<div class="msg call">📞 ${esc(m.body)} · ${timeago(m.created_at)}</div>`;
    return `<div class="msg ${m.direction}">${esc(m.body)}<div class="meta">${m.channel} · ${timeago(m.created_at)}</div></div>`;
  }).join('');
  const wonTotal = deals.filter((d) => d.status === 'won').reduce((s, d) => s + d.amount, 0);
  $('#thread').innerHTML = `
    <div class="thread-header">
      <div>
        <div style="font-weight:700;font-size:16px">${esc(contact.name)}</div>
        <div class="muted" style="font-size:12px">${esc(contact.phone || 'no phone')} · ${esc(bizName(contact.business_id))} · ${fmtMUR(wonTotal)} won</div>
      </div>
      <div class="row">
        <select id="stageSel" onchange="updateStage(${id}, this.value)" style="width:150px">
          ${['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'].map((s) => `<option ${s === contact.stage ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button class="btn green sm" onclick="saleModal(${id})">💰 Mark sale</button>
      </div>
    </div>
    <div class="messages" id="messages">${msgs || '<p class="muted">No messages yet.</p>'}</div>
    <div class="composer">
      <select id="replyChannel"><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select>
      <input id="replyBody" class="grow" placeholder="Type a reply…" onkeydown="if(event.key==='Enter')sendReply(${id})" />
      <button class="btn" onclick="sendReply(${id})">Send</button>
    </div>`;
  const m = $('#messages'); m.scrollTop = m.scrollHeight;
  loadContacts();
}
async function updateStage(id, stage) {
  await api(`/contacts/${id}`, { method: 'PUT', body: { stage } });
  toast('Stage → ' + stage); loadContacts();
}
async function sendReply(id) {
  const body = $('#replyBody').value.trim();
  const channel = $('#replyChannel').value;
  if (!body) return;
  try {
    const r = await api('/messages/reply', { method: 'POST', body: { contact_id: id, channel, body } });
    if (r.demo) toast('Sent (demo mode — not delivered)', 'ok');
    else toast('Message sent');
    openContact(id);
  } catch (e) { toast(e.message, 'err'); }
}
function saleModal(id) {
  modal(`<h3>Mark as sale 💰</h3>
    <label>Amount (MUR)</label><input id="saleAmt" type="number" placeholder="e.g. 8000" />
    <label>Description</label><input id="saleTitle" placeholder="e.g. Bridal package" />
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button>
    <button class="btn green" onclick="submitSale(${id})">Record sale</button></div>`);
}
async function submitSale(id) {
  const amount = $('#saleAmt').value;
  const title = $('#saleTitle').value;
  await api('/messages/sale', { method: 'POST', body: { contact_id: id, amount, title } });
  closeModal(); toast('Sale recorded 🎉'); openContact(id);
}
function newContactModal() {
  modal(`<h3>New contact</h3>
    <label>Name</label><input id="ncName" />
    <label>Phone</label><input id="ncPhone" placeholder="+230…" />
    <label>Email</label><input id="ncEmail" />
    <label>Business</label><select id="ncBiz">${bizOptions()}</select>
    <label>Source</label><select id="ncSrc"><option>manual</option><option>whatsapp</option><option>sms</option><option>call</option></select>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button>
    <button class="btn" onclick="submitContact()">Create</button></div>`);
}
async function submitContact() {
  await api('/contacts', { method: 'POST', body: {
    name: $('#ncName').value, phone: $('#ncPhone').value, email: $('#ncEmail').value,
    business_id: $('#ncBiz').value, source: $('#ncSrc').value } });
  closeModal(); toast('Contact created'); loadContacts();
}
function logCommModal() {
  modal(`<h3>Log call / message</h3>
    <p class="muted" style="font-size:12px">Manually record communication (e.g. from Microsoft Phone Link).</p>
    <label>Phone</label><input id="lcPhone" placeholder="+230…" />
    <label>Name (if new)</label><input id="lcName" />
    <label>Business</label><select id="lcBiz">${bizOptions()}</select>
    <div class="row">
      <div class="grow"><label>Channel</label><select id="lcChannel"><option>call</option><option>whatsapp</option><option>sms</option></select></div>
      <div class="grow"><label>Direction</label><select id="lcDir"><option value="in">Incoming</option><option value="out">Outgoing</option></select></div>
    </div>
    <label>Notes / body</label><textarea id="lcBody" rows="3"></textarea>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button>
    <button class="btn" onclick="submitLog()">Log</button></div>`);
}
async function submitLog() {
  await api('/messages/log', { method: 'POST', body: {
    phone: $('#lcPhone').value, name: $('#lcName').value, business_id: $('#lcBiz').value,
    channel: $('#lcChannel').value, direction: $('#lcDir').value, body: $('#lcBody').value } });
  closeModal(); toast('Logged'); loadContacts();
}

/* ================================================================== */
/*  SOCIAL STUDIO                                                      */
/* ================================================================== */
VIEWS.social = async function () {
  const posts = await api('/posts');
  const platformChecks = PLATFORMS.map((p) => `
    <label style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;color:var(--text)">
      <input type="checkbox" style="width:auto" value="${p.key}" class="pfCheck" checked /> ${p.label}</label>`).join('');
  const rows = posts.map((p) => `
    <tr>
      <td>${esc(p.platform)}</td>
      <td>${esc((p.caption || '').slice(0, 50))}</td>
      <td>${esc(p.business_name || '—')}</td>
      <td class="muted">${p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : '—'}</td>
      <td><span class="badge ${p.status}">${p.status}</span>${p.error ? `<div class="muted" style="font-size:11px">${esc(p.error)}</div>` : ''}</td>
      <td class="row">
        ${p.status !== 'published' ? `<button class="btn sm" onclick="publishNow(${p.id})">Publish</button>` : ''}
        <button class="btn ghost sm" onclick="delPost(${p.id})">✕</button>
      </td>
    </tr>`).join('');

  $('#view').innerHTML = `
    <div class="grid cols-2" style="align-items:start">
      <div class="card">
        <h3>Create / schedule post</h3>
        <label>Business</label><select id="spBiz">${bizOptions()}</select>
        <label>Platforms</label><div style="margin:4px 0 6px">${platformChecks}</div>
        <label>Caption</label><textarea id="spCaption" rows="4" placeholder="Write your post…"></textarea>
        <label>Media (image/video — optional, required for IG/TikTok)</label>
        <input type="file" id="spMedia" accept="image/*,video/*" style="padding:7px" />
        <label>Schedule for</label>
        <input type="datetime-local" id="spWhen" />
        <div class="row" style="margin-top:14px">
          <button class="btn" onclick="submitPost(false)">Schedule</button>
          <button class="btn green" onclick="submitPost(true)">Publish now</button>
        </div>
        <p class="muted" style="font-size:12px;margin-top:10px">Leave time empty + "Publish now" to post immediately. Two posts/day auto-publish per your schedule (Settings).</p>
      </div>
      <div class="card">
        <h3>All posts</h3>
        <table><thead><tr><th>Platform</th><th>Caption</th><th>Business</th><th>When</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="muted">No posts yet.</td></tr>'}</tbody></table>
      </div>
    </div>`;
};
async function submitPost(now) {
  const platforms = [...document.querySelectorAll('.pfCheck:checked')].map((c) => c.value);
  if (!platforms.length) return toast('Pick at least one platform', 'err');
  const fd = new FormData();
  fd.append('business_id', $('#spBiz').value);
  fd.append('platforms', platforms.join(','));
  fd.append('caption', $('#spCaption').value);
  const when = $('#spWhen').value;
  if (when && !now) fd.append('scheduled_at', new Date(when).toISOString());
  const file = $('#spMedia').files[0];
  if (file) fd.append('media', file);
  try {
    const created = await api('/posts', { method: 'POST', body: fd });
    if (now) { for (const p of created) await api(`/posts/${p.id}/publish`, { method: 'POST' }); toast('Published to ' + platforms.length + ' platform(s)'); }
    else toast('Scheduled ' + created.length + ' post(s)');
    go('social');
  } catch (e) { toast(e.message, 'err'); }
}
async function publishNow(id) {
  const r = await api(`/posts/${id}/publish`, { method: 'POST' });
  toast(r.ok ? 'Published' + (r.result?.demo ? ' (demo)' : '') : 'Failed: ' + r.error, r.ok ? 'ok' : 'err');
  go('social');
}
async function delPost(id) { await api(`/posts/${id}`, { method: 'DELETE' }); go('social'); }

/* ================================================================== */
/*  CONTENT CALENDAR                                                   */
/* ================================================================== */
VIEWS.calendar = async function () {
  const posts = await api('/posts');
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDay = {};
  posts.forEach((p) => {
    if (!p.scheduled_at) return;
    const d = new Date(p.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      (byDay[d.getDate()] = byDay[d.getDate()] || []).push(p);
    }
  });
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let cells = labels.map((l) => `<div class="muted" style="text-align:center;font-size:12px">${l}</div>`).join('');
  for (let i = 0; i < startDay; i++) cells += '<div></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const items = (byDay[day] || []).map((p) => {
      const col = (PLATFORMS.find((x) => x.key === p.platform) || {}).color || '#666';
      return `<div class="cal-post" style="background:${col}" title="${esc(p.caption || '')}">${esc(p.platform)} ${new Date(p.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
    }).join('');
    const isToday = day === now.getDate();
    cells += `<div class="cal-cell ${isToday ? 'today' : ''}"><div class="day">${day}</div>${items}</div>`;
  }
  $('#view').innerHTML = `
    <div class="card">
      <h3>${first.toLocaleString('default', { month: 'long' })} ${year} — content calendar</h3>
      <div class="cal-grid">${cells}</div>
    </div>`;
};

/* ================================================================== */
/*  APPOINTMENTS                                                       */
/* ================================================================== */
VIEWS.appointments = async function () {
  const [appts, services] = await Promise.all([api('/appointments'), api('/appointments/services')]);
  const rows = appts.map((a) => `
    <tr>
      <td>${new Date(a.starts_at).toLocaleString()}</td>
      <td>${esc(a.contact_name || '—')}<div class="muted" style="font-size:11px">${esc(a.contact_phone || '')}</div></td>
      <td>${esc(a.service_name || a.title)}</td>
      <td><span class="dot" style="background:${a.business_color}"></span> ${esc(a.business_name || '')}</td>
      <td><span class="badge ${a.status === 'booked' ? 'scheduled' : a.status === 'completed' ? 'won' : 'lost'}">${a.status}</span></td>
      <td class="row">
        <button class="btn ghost sm" onclick="apptStatus(${a.id},'completed')">✓</button>
        <button class="btn ghost sm" onclick="apptStatus(${a.id},'cancelled')">✕</button>
      </td>
    </tr>`).join('');
  window.__services = services;
  $('#view').innerHTML = `
    <div class="toolbar">
      <button class="btn" onclick="newApptModal()">+ New appointment</button>
      <div class="spacer"></div>
      <a class="btn ghost" href="/book" target="_blank">Open public booking page ↗</a>
    </div>
    <div class="card">
      <table><thead><tr><th>When</th><th>Client</th><th>Service</th><th>Business</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No appointments.</td></tr>'}</tbody></table>
    </div>`;
};
async function apptStatus(id, status) { await api(`/appointments/${id}/status`, { method: 'PUT', body: { status } }); toast('Updated'); go('appointments'); }
function newApptModal() {
  const svcOpts = (window.__services || []).map((s) => `<option value="${s.id}" data-biz="${s.business_id}">${esc(s.business_name)} — ${esc(s.name)} (${s.duration_min}m)</option>`).join('');
  modal(`<h3>New appointment</h3>
    <label>Service</label><select id="apSvc">${svcOpts}</select>
    <label>Business</label><select id="apBiz">${bizOptions()}</select>
    <label>Client name</label><input id="apName" />
    <label>Phone</label><input id="apPhone" placeholder="+230…" />
    <label>Date &amp; time</label><input type="datetime-local" id="apWhen" />
    <label>Notes</label><textarea id="apNotes" rows="2"></textarea>
    <div class="actions"><button class="btn ghost" onclick="closeModal()">Cancel</button>
    <button class="btn" onclick="submitAppt()">Book</button></div>`);
  $('#apSvc').addEventListener('change', (e) => {
    const biz = e.target.selectedOptions[0].dataset.biz; if (biz) $('#apBiz').value = biz;
  });
  $('#apSvc').dispatchEvent(new Event('change'));
}
async function submitAppt() {
  try {
    await api('/appointments', { method: 'POST', body: {
      service_id: $('#apSvc').value, business_id: $('#apBiz').value, name: $('#apName').value,
      phone: $('#apPhone').value, starts_at: new Date($('#apWhen').value).toISOString(), notes: $('#apNotes').value } });
    closeModal(); toast('Appointment booked'); go('appointments');
  } catch (e) { toast(e.message, 'err'); }
}

/* ================================================================== */
/*  TASKS & LEADS                                                      */
/* ================================================================== */
VIEWS.tasks = async function () {
  const tasks = await api('/tasks');
  const rows = tasks.map((t) => `
    <tr>
      <td><input type="checkbox" style="width:auto" ${t.done ? 'checked' : ''} onchange="toggleTask(${t.id}, this.checked)" /></td>
      <td style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(t.title)}</td>
      <td class="muted">${t.contact_name || ''}</td>
      <td class="muted">${t.due_at ? new Date(t.due_at).toLocaleString() : ''}</td>
      <td><button class="btn ghost sm" onclick="delTask(${t.id})">✕</button></td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="toolbar">
      <input id="tkTitle" placeholder="New task…" class="grow" onkeydown="if(event.key==='Enter')addTask()" />
      <input type="datetime-local" id="tkDue" style="max-width:220px" />
      <button class="btn" onclick="addTask()">Add task</button>
    </div>
    <div class="card">
      <table><thead><tr><th></th><th>Task</th><th>Contact</th><th>Due</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="muted">No tasks. Add follow-ups here.</td></tr>'}</tbody></table>
    </div>`;
};
async function addTask() {
  const title = $('#tkTitle').value.trim(); if (!title) return;
  const due = $('#tkDue').value;
  await api('/tasks', { method: 'POST', body: { title, due_at: due ? new Date(due).toISOString() : null } });
  toast('Task added'); go('tasks');
}
async function toggleTask(id, done) { await api(`/tasks/${id}`, { method: 'PUT', body: { done } }); }
async function delTask(id) { await api(`/tasks/${id}`, { method: 'DELETE' }); go('tasks'); }

/* ================================================================== */
/*  SETTINGS                                                           */
/* ================================================================== */
VIEWS.settings = async function () {
  const [status, schedule] = await Promise.all([api('/dashboard/status'), api('/posts/schedule/config')]);
  const integ = status.integrations;
  const chip = (ok) => ok ? '<span class="badge won">Connected</span>' : '<span class="badge lost">Not configured</span>';
  const items = [
    ['Facebook / Instagram (Meta)', integ.meta],
    ['YouTube', integ.youtube],
    ['TikTok', integ.tiktok],
    ['Twilio SMS', integ.twilioSms],
    ['Twilio WhatsApp', integ.twilioWhatsapp],
    ['Google Calendar', integ.google],
  ].map(([n, ok]) => `<tr><td>${n}</td><td>${chip(ok)}</td></tr>`).join('');

  const schedRows = schedule.map((s) => `
    <tr><td>${esc(s.platform)}</td><td>Slot ${s.slot}</td>
    <td><input type="time" value="${s.time_hhmm}" data-id="${s.id}" class="schedInput" style="max-width:130px" /></td></tr>`).join('');

  $('#view').innerHTML = `
    <div class="grid cols-2" style="align-items:start">
      <div class="card">
        <h3>Integration status</h3>
        ${status.demoMode ? '<p class="muted" style="font-size:13px">⚠️ DEMO MODE is ON — sends/publishes are simulated. Add API keys in <span class="mono">.env</span> and set <span class="mono">DEMO_MODE=false</span> to go live.</p>' : ''}
        <table><tbody>${items}</tbody></table>
        <p class="muted" style="font-size:12px;margin-top:12px">Configure keys in the <span class="mono">.env</span> file — see README for step-by-step instructions.</p>
      </div>
      <div class="card">
        <h3>Auto-post schedule (2/day per platform)</h3>
        <table><thead><tr><th>Platform</th><th>Slot</th><th>Time</th></tr></thead><tbody>${schedRows}</tbody></table>
        <button class="btn" style="margin-top:12px" onclick="saveSchedule()">Save times</button>
        <p class="muted" style="font-size:12px;margin-top:8px">Create posts in Social Studio and set their time to a slot; the scheduler publishes them automatically.</p>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>Webhooks (for live inbound WhatsApp / SMS)</h3>
      <p class="muted" style="font-size:13px">Point your Twilio number's inbound webhook at these URLs (expose your laptop with ngrok/cloudflared):</p>
      <div class="mono" style="font-size:13px;line-height:1.9">
        SMS &nbsp;&nbsp;&nbsp;→ ${esc(status.publicBaseUrl)}/webhooks/twilio/sms<br/>
        WhatsApp → ${esc(status.publicBaseUrl)}/webhooks/twilio/whatsapp<br/>
        Voice &nbsp;→ ${esc(status.publicBaseUrl)}/webhooks/twilio/voice
      </div>
    </div>`;
};
async function saveSchedule() {
  const updates = [...document.querySelectorAll('.schedInput')].map((i) => ({ id: Number(i.dataset.id), time_hhmm: i.value }));
  await api('/posts/schedule/config', { method: 'PUT', body: { updates } });
  toast('Schedule saved');
}

/* ------------------------------------------------------------------ */
/*  Boot                                                               */
/* ------------------------------------------------------------------ */
(async function boot() {
  try {
    [BUSINESSES, STATUS] = await Promise.all([api('/dashboard/businesses'), api('/dashboard/status')]);
    $('#bizLegend').innerHTML = BUSINESSES.map((b) => `<div style="font-size:12px;margin:2px 0"><span class="dot" style="background:${b.color}"></span> ${esc(b.name)}</div>`).join('') + (STATUS.demoMode ? '<div class="pill" style="margin-top:8px">DEMO MODE</div>' : '');
    go('dashboard');
  } catch (e) { location.href = '/login'; }
})();
