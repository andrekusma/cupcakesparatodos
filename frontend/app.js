const DEFAULT_API = 'https://cupcakesparatodos.onrender.com';
const API_BASE_URL = localStorage.getItem('API_BASE_URL') || DEFAULT_API;

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function ensureToast() {
  let t = $('#global-toast');
  if (t) return t;
  t = document.createElement('div');
  t.id = 'global-toast';
  t.style.position = 'fixed';
  t.style.left = '50%';
  t.style.top = '16px';
  t.style.transform = 'translateX(-50%)';
  t.style.zIndex = '9999';
  t.style.maxWidth = '90vw';
  t.style.padding = '12px 16px';
  t.style.borderRadius = '8px';
  t.style.fontWeight = '600';
  t.style.display = 'none';
  document.body.appendChild(t);
  return t;
}
function showToast(message, type = 'error', ms = 4000) {
  const t = ensureToast();
  t.textContent = message;
  t.style.display = 'block';
  t.style.background = type === 'success' ? '#16a34a' : '#dc2626';
  t.style.color = '#fff';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.display = 'none'; }, ms);
}
function getToken() {
  return localStorage.getItem('AUTH_TOKEN') || '';
}
function setToken(tok) {
  if (!tok) localStorage.removeItem('AUTH_TOKEN');
  else localStorage.setItem('AUTH_TOKEN', tok);
}
async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {}
  );
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const cfg = Object.assign({}, options, { headers });
  let res;
  try {
    res = await fetch(url, cfg);
  } catch (e) {
    showToast('Falha de rede. Tente novamente.');
    throw e;
  }
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) {
    const msg = payload && payload.message ? payload.message : `Erro ${res.status}`;
    if (res.status === 401) {
      setToken('');
    }
    showToast(msg);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data && data.token) {
    setToken(data.token);
    showToast('Login realizado', 'success', 2000);
    await refreshSessionUI();
    return true;
  }
  showToast('Resposta de login inválida');
  return false;
}
function logout() {
  setToken('');
  refreshSessionUI();
}

async function fetchMyOrders() {
  return apiFetch('/api/orders/mine', { method: 'GET' });
}

function renderOrders(list) {
  const container = $('#orders-list');
  if (!container) return;
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<p class="text-gray-600">Você ainda não tem pedidos.</p>';
    return;
  }
  const html = list.map(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    const li = items.map(i => {
      const nome = i.nome || 'Cupcake';
      const qtd = i.quantidade || i.quantity || 1;
      const preco = i.preco_unit_cents != null ? (i.preco_unit_cents/100).toFixed(2) : '';
      return `<li class="text-sm">${qtd}× ${nome} ${preco ? `– R$ ${preco}` : ''}</li>`;
    }).join('');
    const total = o.total_cents != null ? (o.total_cents/100).toFixed(2) : '';
    const code = o.code || o.id;
    const dt = o.created_at ? new Date(o.created_at).toLocaleString() : '';
    return `
      <div class="rounded-xl border p-4 mb-3">
        <div class="flex items-center justify-between">
          <div class="font-semibold">Pedido #${code}</div>
          <div class="text-xs uppercase">${o.status || ''}</div>
        </div>
        <div class="text-xs text-gray-500">${dt}</div>
        <ul class="mt-2 pl-4 list-disc">${li}</ul>
        <div class="mt-2 font-semibold">Total: R$ ${total}</div>
      </div>
    `;
  }).join('');
  container.innerHTML = html;
}

async function loadOrders() {
  try {
    const data = await fetchMyOrders();
    renderOrders(data);
  } catch (e) {
    const container = $('#orders-list');
    if (container) container.innerHTML = '';
  }
}

function refreshSessionUI() {
  const isAuth = !!getToken();
  const loggedEls = $all('[data-auth="in"]');
  const guestEls = $all('[data-auth="out"]');
  loggedEls.forEach(el => { el.style.display = isAuth ? '' : 'none'; });
  guestEls.forEach(el => { el.style.display = isAuth ? 'none' : ''; });
}

function bindAuthForms() {
  const f = $('#login-form');
  if (f) {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = f.querySelector('input[name="email"]')?.value || '';
      const password = f.querySelector('input[name="password"]')?.value || '';
      await login(email, password);
      await loadOrders();
    });
  }
  const lo = $('#logout-btn');
  if (lo) {
    lo.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

function bindNav() {
  const btn = $('#nav-orders');
  if (btn) {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await loadOrders();
      const section = $('#section-orders');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function init() {
  refreshSessionUI();
  bindAuthForms();
  bindNav();
  const preload = $('#orders-list[data-preload="true"]');
  if (preload && getToken()) {
    loadOrders();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
