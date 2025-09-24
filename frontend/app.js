// === app.js (validação cliente + fallbacks + campos esperados) ===
const STORAGE = { base: 'API_BASE_URL', token: 'JWT_TOKEN', user: 'AUTH_USER' };
function trimTrailingSlash(v){ v=String(v||''); while(v.endsWith('/')) v=v.slice(0,-1); return v; }
const getBase = () => trimTrailingSlash(localStorage.getItem(STORAGE.base) || 'http://localhost:3000');
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

const state = { token: localStorage.getItem(STORAGE.token) || null, user: JSON.parse(localStorage.getItem(STORAGE.user) || 'null'), items: [], filtered: [] };
function toast(msg, ok=true){ const b=$('#toast'); if(!b) return; b.classList.remove('hidden'); b.firstElementChild.textContent=String(msg); b.firstElementChild.className='rounded-xl px-4 py-2 shadow '+(ok?'bg-gray-900 text-white':'bg-red-600 text-white'); setTimeout(()=>b.classList.add('hidden'),2600); }
function currency(n){ return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function isAdmin(){ return !!(state.user && (state.user.role==='admin' || state.user.isAdmin)); }
function authHeader(){ return state.token ? { Authorization: 'Bearer ' + state.token } : {}; }
function fullURL(p){ if(!p) return ''; const s=String(p); if(s.startsWith('http://')||s.startsWith('https://')) return s; const b=getBase(); return b+(s.startsWith('/')?'':'/')+s; }

// Converte "12,50" ou "12.50" em centavos inteiros
function parsePriceToCentsInput(str){
  let s = String(str || '').trim();
  if (!s) return 0;
  // mantém só dígitos, vírgula e ponto
  let keep = ''; for (let i=0;i<s.length;i++){ const ch=s[i]; if ('0123456789,.'.indexOf(ch)>=0) keep+=ch; }
  // se houver vírgula, trata como separador decimal PT-BR
  if (keep.indexOf(',')>=0){
    while(keep.indexOf('.')>=0) keep = keep.replace('.',''); // remove milhares
    keep = keep.replace(',','.');
  }
  const v = Number(keep);
  return Math.round((isNaN(v)?0:v)*100);
}

// Endpoints com fallback
const urls = {
  login:   () => [getBase()+'/api/auth/login',    getBase()+'/auth/login'],
  register:() => [getBase()+'/api/auth/register', getBase()+'/auth/register'],
  list:    () => [getBase()+'/api/cupcakes',      getBase()+'/cupcakes'],
  create:  () => [
    getBase()+'/api/admin/cupcakes',
    getBase()+'/admin/cupcakes',
    getBase()+'/api/cupcakes',
    getBase()+'/cupcakes'
  ],
  del: (id) => [
    getBase()+'/api/admin/cupcakes/'+id,
    getBase()+'/admin/cupcakes/'+id,
    getBase()+'/api/cupcakes/'+id,
    getBase()+'/cupcakes/'+id
  ],
};

async function tryFetchList(){ let last; for(const u of urls.list()){ try{ const r=await fetch(u); if(r.ok) return r; last=new Error('HTTP '+r.status+' em '+u);}catch(e){ last=e; } } throw last||new Error('Falha de rede'); }
async function apiList(){ const r=await tryFetchList(); return r.json(); }
async function apiLogin(email,password){ for (const u of urls.login()){ try{ const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}); if(r.ok) return r.json(); }catch{} } throw new Error('Falha no login'); }
async function apiRegister(name,email,password){ for (const u of urls.register()){ try{ const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})}); if(r.ok) return r.json(); }catch{} } throw new Error('Falha no cadastro'); }

// Criação com campos exatamente como o backend espera (multer .single('image'))
// - nome (string), preco_cents (int), estoque (int), image (arquivo)
// - 404 tenta próxima rota; 400/401/403/422 retornam mensagem do servidor
async function apiCreateStrict({ name, description, priceCents, stock, file }){
  const fd = new FormData();
  fd.append('nome', name);
  fd.append('preco_cents', priceCents);
  fd.append('estoque', Number(stock||0));
  // opcional guardar descrição se o backend aceitar no futuro (não atrapalha se ignorar)
  fd.append('descricao', description || '');
  if (file) fd.append('image', file);

  let lastErr='';
  for (const u of urls.create()){
    try{
      const r = await fetch(u, { method:'POST', headers:{...authHeader()}, body: fd });
      if (r.status === 404) { lastErr = '404 em '+u; continue; }
      const text = await r.text();
      let data; try{ data = JSON.parse(text); }catch{ data = { message: text || ('HTTP '+r.status+' em '+u) }; }
      if (!r.ok) throw new Error((data && (data.error||data.message)) || ('HTTP '+r.status+' em '+u));
      return data;
    }catch(e){ lastErr = e.message; break; }
  }
  throw new Error(lastErr || 'Falha ao criar');
}

async function apiDelete(id){
  let lastErr='';
  for (const u of urls.del(id)){
    try{
      const r=await fetch(u,{method:'DELETE',headers:{...authHeader()}});
      if (r.status===404){ lastErr='404 em '+u; continue; }
      if (!r.ok){ const t=await r.text(); throw new Error(t || ('HTTP '+r.status+' em '+u)); }
      return true;
    }catch(e){ lastErr=e.message; break; }
  }
  throw new Error(lastErr || 'Falha ao excluir');
}

// ===== Render (idêntico ao anterior) =====
function normalize(it){ const img=it.image_url||it.imageUrl||it.image||it.image_path||it.path; const cents=(it.preco_cents!=null?it.preco_cents:(it.price_cents!=null?it.price_cents:(it.price!=null?Math.round(Number(it.price)*100):0))); return { id:it.id, name:it.nome||it.name||'Cupcake', description:it.descricao||it.description||'', price_cents:cents, image:fullURL(img) }; }
function renderSkeleton(n){ const g=$('#grid'); if(!g) return; g.innerHTML=''; for(let i=0;i<(n||6);i++){ const d=document.createElement('div'); d.className='card'; d.innerHTML='<div class="h-40 skeleton"></div><div class="p-4 space-y-2"><div class="h-4 w-3/4 skeleton rounded"></div><div class="h-3 w-1/2 skeleton rounded"></div><div class="h-8 w-24 skeleton rounded"></div></div>'; g.appendChild(d);} }
function parsePriceToCentsText(t){ let s=''; const str=String(t); for(let i=0;i<str.length;i++){ const ch=str[i]; if('0123456789,.'.indexOf(ch)>=0) s+=ch; } if (s.indexOf(',')>=0){ while(s.indexOf('.')>=0) s=s.replace('.',''); s=s.replace(',','.'); } const v=Number(s); return Math.round((isNaN(v)?0:v)*100); }
function renderList(raw){ const g=$('#grid'), emp=$('#empty'), chip=$('#countChip'); if(!g) return; const items=(raw||[]).map(normalize); g.innerHTML=''; if(chip) chip.textContent=items.length+' '+(items.length===1?'item':'itens'); if(!items.length){ if(emp) emp.classList.remove('hidden'); return; } if(emp) emp.classList.add('hidden'); items.forEach(c=>{ const el=document.createElement('article'); el.className='card flex flex-col'; el.setAttribute('data-id', c.id ?? ''); el.innerHTML='<img src="'+(c.image||'')+'" alt="'+(c.name||'Cupcake')+'" class="w-full h-40 object-cover bg-gray-50"><div class="p-4 flex-1 flex flex-col gap-2"><h3 class="font-extrabold text-gray-900 leading-tight">'+(c.name||'—')+'</h3><p class="text-sm text-gray-600 line-clamp-2">'+(c.description||'')+'</p><div class="mt-auto flex items-center justify-between gap-2"><span class="font-extrabold text-green-700">'+currency((c.price_cents||0)/100)+'</span><div class="flex gap-2">'+(isAdmin()?('<button data-del="'+c.id+'" class="btn btn-danger text-sm">Excluir</button>'):'')+((state.token&&state.user)?'<button data-add="1" class="btn btn-secondary text-sm">Adicionar ao carrinho</button>':'')+'</div></div></div>'; g.appendChild(el); }); if (isAdmin()){ $$('#grid [data-del]').forEach(b=>{ b.onclick=async(ev)=>{ const id=ev.currentTarget.getAttribute('data-del'); if(!id) return; if(!confirm('Confirma excluir este cupcake?')) return; try{ await apiDelete(id); toast('Cupcake excluído'); await load(); }catch(e){ toast(e.message||'Erro ao excluir', false); } }; }); } if (state.token && state.user){ $$('#grid [data-add]').forEach(b=>{ b.onclick=(ev)=>{ const card=ev.currentTarget.closest('article'); const id=(card&&card.getAttribute('data-id'))||((card?.querySelector('h3')?.textContent||'')+'|'+(card?.querySelector('img')?.src||'')); const name=card?.querySelector('h3')?.textContent||''; const img=card?.querySelector('img')?.src||''; const priceText=card?.querySelector('span.font-extrabold')?.textContent||'R$ 0,00'; const cents=parsePriceToCentsText(priceText); addToCart({id,name,image:img,price_cents:cents}); }; }); } }
async function load(){ try{ renderSkeleton(); const data=await apiList(); state.items=Array.isArray(data)?data:(data.items||data.rows||[]); renderList(state.items);}catch(e){ toast(e.message||'Erro ao carregar cupcakes', false);} }
function applyFilter(){ const s=$('#search'); const q=(s&&s.value?s.value:'').trim().toLowerCase(); const f=!q?state.items:state.items.filter(x=>{ const n=String(x.nome||x.name||'').toLowerCase(); const d=String(x.descricao||x.description||'').toLowerCase(); return n.indexOf(q)>-1 || d.indexOf(q)>-1; }); state.filtered=f; renderList(f); }

// Carrinho (igual)
function cartKey(){ return state.user && state.user.email ? 'CART_'+state.user.email : null; }
function loadCart(){ const k=cartKey(); return k? JSON.parse(localStorage.getItem(k)||'[]') : []; }
function saveCart(a){ const k=cartKey(); if(k) localStorage.setItem(k, JSON.stringify(a)); }
function updateCartBadge(){ const c=loadCart().reduce((s,i)=>s+Number(i.qty||0),0); const b=$('#cartBadge'); if(!b) return; if(c>0){ b.textContent=String(c); b.classList.remove('hidden'); } else { b.classList.add('hidden'); } }
function addToCart(it){ if(!(state.token&&state.user)) return toast('Faça login para adicionar ao carrinho', false); const cart=loadCart(); const i=cart.findIndex(x=>String(x.id)===String(it.id)); if(i>=0) cart[i].qty+=1; else cart.push({...it, qty:1}); saveCart(cart); updateCartBadge(); toast('Adicionado ao carrinho'); }
function renderCart(){ const list=$('#cartList'); if(!list) return; const cart=loadCart(); list.innerHTML=''; if(!cart.length){ list.innerHTML='<p class="text-sm text-gray-600">Carrinho vazio.</p>'; $('#cartTotal').textContent='R$ 0,00'; return; } let total=0; cart.forEach((it,i)=>{ const price=(it.price_cents||0)/100; total+=price*(it.qty||1); const row=document.createElement('div'); row.className='flex items-center gap-3 border rounded-xl p-3 bg-white'; row.innerHTML='<img src="'+(it.image||'')+'" alt="'+(it.name||'Cupcake')+'" class="w-16 h-16 object-cover rounded-lg border"/><div class="flex-1"><div class="font-semibold">'+(it.name||'')+'</div><div class="text-sm text-gray-600">'+currency(price)+'</div></div><div class="flex items-center gap-2"><button class="btn btn-secondary" data-dec="'+i+'">-</button><span class="w-8 text-center">'+(it.qty||1)+'</span><button class="btn btn-secondary" data-inc="'+i+'">+</button><button class="btn btn-danger" data-del="'+i+'">Remover</button></div>'; list.appendChild(row); }); $('#cartTotal').textContent=currency(total); list.querySelectorAll('[data-inc]').forEach(b=> b.onclick=()=>{ const c=loadCart(); const i=+b.dataset.inc; c[i].qty++; saveCart(c); renderCart(); }); list.querySelectorAll('[data-dec]').forEach(b=> b.onclick=()=>{ const c=loadCart(); const i=+b.dataset.dec; c[i].qty=Math.max(1,(c[i].qty||1)-1); saveCart(c); renderCart(); }); list.querySelectorAll('[data-del]').forEach(b=> b.onclick=()=>{ const c=loadCart(); const i=+b.dataset.del; c.splice(i,1); saveCart(c); renderCart(); updateCartBadge(); }); }

// Eventos / Inicialização
document.addEventListener('DOMContentLoaded',()=>{
  const apiBase=$('#apiBase'); if(apiBase) apiBase.value=getBase();
  const openSettings=$('#openSettings'); if(openSettings) openSettings.onclick=()=>$('#settings').showModal();
  const btnSaveBase=$('#btnSaveBase'); if(btnSaveBase) btnSaveBase.onclick=()=>{ localStorage.setItem(STORAGE.base, apiBase.value||''); toast('API Base URL salva'); };
  const btnPing=$('#btnPing'); if(btnPing) btnPing.onclick=async()=>{ try{ const r=await fetch(getBase()+'/cupcakes'); toast(r.ok?'Conexão OK':'Resposta '+r.status, r.ok); }catch(e){ toast('Falha de conexão', false);} };

  function setAuthUI(){ const logged=!!(state.token&&state.user);
    const openAuth=$('#openAuth'); if(openAuth) openAuth.classList.toggle('hidden', logged);
    const btnLogout=$('#btnLogout'); if(btnLogout) btnLogout.classList.toggle('hidden', !logged);
    const btnCart=$('#btnCart'); if(btnCart) btnCart.classList.toggle('hidden', !logged);
    const openRegister=$('#openRegister'); if(openRegister) openRegister.classList.toggle('hidden', logged);
    const openSettingsBtn=$('#openSettings'); if(openSettingsBtn) openSettingsBtn.classList.toggle('hidden', !(logged&&isAdmin()));
    const adminPanel=$('#adminPanel'); if(adminPanel) (isAdmin()?adminPanel.classList.remove('hidden'):adminPanel.classList.add('hidden')); }

  const openAuthBtn=$('#openAuth'); if(openAuthBtn) openAuthBtn.onclick=()=>$('#auth').showModal();
  const openRegisterBtn=$('#openRegister'); if(openRegisterBtn) openRegisterBtn.onclick=()=>$('#register').showModal();
  const openRegisterInline=$('#openRegisterInline'); if(openRegisterInline) openRegisterInline.onclick=()=>{ $('#auth')?.close(); $('#register')?.showModal(); };

  const doLogin=$('#doLogin'); if(doLogin) doLogin.onclick=async()=>{ const email=($('#email')?.value||'').trim(); const password=($('#password')?.value||''); const err=$('#authError'); if(err) err.classList.add('hidden'); try{ const data=await apiLogin(email,password); state.token=data.token; state.user=data.user||null; localStorage.setItem(STORAGE.token,state.token); localStorage.setItem(STORAGE.user,JSON.stringify(state.user)); $('#auth')?.close(); setAuthUI(); toast('Login realizado'); load(); updateCartBadge(); }catch(e){ if(err){ err.textContent=e.message; err.classList.remove('hidden'); } else { toast(e.message||'Falha no login', false);} } };

  const doRegister=$('#doRegister'); if(doRegister) doRegister.onclick=async()=>{ const name=($('#rname')?.value||'').trim(); const email=($('#remail')?.value||'').trim(); const password=($('#rpass')?.value||''); const err=$('#regError'); if(err) err.classList.add('hidden'); try{ await apiRegister(name,email,password); $('#register')?.close(); toast('Cadastro realizado'); $('#auth')?.showModal(); }catch(e){ if(err){ err.textContent=e.message; err.classList.remove('hidden'); } else { toast(e.message||'Falha no cadastro', false);} } };

  const btnLogout=$('#btnLogout'); if(btnLogout) btnLogout.onclick=()=>{ localStorage.removeItem(STORAGE.token); localStorage.removeItem(STORAGE.user); state.token=null; state.user=null; setAuthUI(); toast('Sessão encerrada'); load(); saveCart([]); updateCartBadge(); };

  const search=$('#search'); if(search) search.addEventListener('input',()=>applyFilter());
  const btnClear=$('#btnClear'); if(btnClear) btnClear.onclick=()=>{ if(search){ search.value=''; applyFilter(); } };
  const btnRefresh=$('#btnRefresh'); if(btnRefresh) btnRefresh.onclick=load;

  const drop=$('#drop'), fileInput=$('#image'), preview=$('#preview'); if(drop&&fileInput){
    drop.addEventListener('click',()=>fileInput.click());
    drop.addEventListener('dragover',e=>{ e.preventDefault(); drop.classList.add('bg-gray-50'); });
    drop.addEventListener('dragleave',()=>drop.classList.remove('bg-gray-50'));
    drop.addEventListener('drop',e=>{ e.preventDefault(); drop.classList.remove('bg-gray-50'); if(e.dataTransfer.files&&e.dataTransfer.files[0]){ fileInput.files=e.dataTransfer.files; showPreview(fileInput.files[0]); } });
    fileInput.addEventListener('change',e=>{ if(e.target.files&&e.target.files[0]) showPreview(e.target.files[0]); });
    function showPreview(file){ const t=String(file?.type||''); const ok=t.startsWith('image/png')||t.startsWith('image/jpeg'); if(!ok){ toast('Apenas PNG/JPEG', false); fileInput.value=''; if(preview) preview.classList.add('hidden'); return; } const url=URL.createObjectURL(file); if(preview){ preview.src=url; preview.classList.remove('hidden'); } }
  }

  const form=$('#formCreate'); if(form) form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!(state.token && isAdmin())) return toast('Ação restrita a administradores', false);

    const name = ($('#name')?.value||'').trim();
    const description = ($('#description')?.value||'').trim();
    const priceCents = parsePriceToCentsInput($('#price')?.value||'');
    const stock = $('#stock')?.value||0;
    const file = $('#image')?.files?.[0] || null;

    if (!name){ toast('Preencha o nome do cupcake', false); return; }
    if (!file){ toast('Selecione uma imagem (PNG/JPEG)', false); return; }

    try{
      await apiCreateStrict({ name, description, priceCents, stock, file });
      toast('Cupcake cadastrado'); form.reset(); const p=$('#preview'); if(p) p.classList.add('hidden'); load();
    }catch(err){ toast(err.message||'Erro ao cadastrar', false); }
  });

  const btnCart=$('#btnCart'); if(btnCart) btnCart.onclick=()=>{ renderCart(); $('#cart')?.showModal(); };
  const btnCheckout=$('#btnCheckout'); if(btnCheckout) btnCheckout.onclick=()=>{ const code='CPT-'+Date.now().toString(36).toUpperCase(); const oc=$('#orderCode'); if(oc) oc.textContent=code; $('#checkout')?.showModal(); saveCart([]); updateCartBadge(); renderCart(); };

  function setAuthUI(){ const logged=!!(state.token&&state.user); const openAuth=$('#openAuth'); if(openAuth) openAuth.classList.toggle('hidden', logged); const btnLogout=$('#btnLogout'); if(btnLogout) btnLogout.classList.toggle('hidden', !logged); const btnCart=$('#btnCart'); if(btnCart) btnCart.classList.toggle('hidden', !logged); const openRegister=$('#openRegister'); if(openRegister) openRegister.classList.toggle('hidden', logged); const openSettingsBtn=$('#openSettings'); if(openSettingsBtn) openSettingsBtn.classList.toggle('hidden', !(logged&&isAdmin())); const adminPanel=$('#adminPanel'); if(adminPanel) (isAdmin()?adminPanel.classList.remove('hidden'):adminPanel.classList.add('hidden')); }
  setAuthUI(); load(); updateCartBadge();
});

window.addEventListener('error', (e)=> console.warn('[JS Error]', e.message));
