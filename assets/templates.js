const MANIFEST_URL = './data/templates-manifest.json';

const state = {
  templates: [],
  category: '',
  role: '',
  search: '',
  sort: 'recent'
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmtDate = d => new Date(d).toLocaleString();

async function loadManifest(){
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if(!res.ok) throw new Error('No se pudo cargar templates-manifest.json');
  const data = await res.json();
  state.templates = Array.isArray(data) ? data : (data.templates || []);
}

function buildCategoryOptions(){
  const sel = $('#filterCategory');
  const set = new Set(state.templates.map(t => t.category).filter(Boolean));
  for(const cat of Array.from(set).sort()){
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  }
}

function computeVisible(){
  let list = [...state.templates];
  if(state.category) list = list.filter(t => (t.category||'') === state.category);
  if(state.role) list = list.filter(t => (t.role||'') === state.role);
  if(state.search){
    const q = state.search.toLowerCase();
    list = list.filter(t =>
      (t.name||'').toLowerCase().includes(q) ||
      (t.description||'').toLowerCase().includes(q) ||
      (t.tags||[]).some(tag => (tag||'').toLowerCase().includes(q))
    );
  }
  if(state.sort === 'recent') list.sort((a,b) => new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
  if(state.sort === 'nameAsc') list.sort((a,b) => (a.name||'').localeCompare(b.name||''));
  if(state.sort === 'nameDesc') list.sort((a,b) => (b.name||'').localeCompare(a.name||''));
  return list;
}

function isPreviewable(t){
  const ct = (t.contentType||'').toLowerCase();
  return ct.startsWith('application/pdf') || ct.startsWith('image/');
}

function render(){
  const grid = $('#grid'); grid.innerHTML = '';
  const list = computeVisible();
  $('#emptyState').hidden = list.length > 0;

  for(const t of list){
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <div class="kicker">${t.category || 'Plantilla'}</div>
        <h3>${t.name || 'Sin título'}</h3>
        <div class="desc">${t.description || ''}</div>
      </div>
      <div class="tags">${(t.tags||[]).map(x=>`<span class="tag">${x}</span>`).join('')}</div>
      <div class="kicker">${t.role ? `Rol sugerido: ${t.role}` : ''} ${t.updatedAt ? `• Actualizada: ${fmtDate(t.updatedAt)}` : ''}</div>
      <div class="actions">
        ${isPreviewable(t) ? `<button class="btn secondary" data-action="preview" data-url="${t.url}" data-name="${t.name}" data-ct="${t.contentType||''}">Vista</button>` : ''}
        <a class="btn" href="${t.url}" download>Descargar</a>
      </div>
    `;
    grid.appendChild(card);
  }

  grid.onclick = (e)=>{
    const btn = e.target.closest('[data-action="preview"]');
    if(!btn) return;
    openViewer({
      url: btn.getAttribute('data-url'),
      name: btn.getAttribute('data-name'),
      ct: btn.getAttribute('data-ct')
    });
  };
}

function wireUI(){
  $('#filterCategory').onchange = e => { state.category = e.target.value; render(); };
  $('#filterRole').onchange = e => { state.role = e.target.value; render(); };
  $('#sort').onchange = e => { state.sort = e.target.value; render(); };
  $('#search').oninput = e => { state.search = e.target.value; render(); };
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); $('#search').focus(); }
  });

  // modal
  $('#closeViewer').onclick = () => { $('#viewer').style.display = 'none'; };
  $('#viewer').onclick = (e) => { if (e.target.id === 'viewer') $('#closeViewer').click(); };
}

function openViewer(meta){
  const viewer = $('#viewer');
  const title = $('#viewerTitle');
  const embed = $('#viewerEmbed');
  const dl = $('#viewerDownload');

  title.textContent = meta.name || 'Vista previa';
  dl.href = meta.url; dl.download = (meta.name||'plantilla');
  const ct = (meta.ct||'').toLowerCase();

  if(ct.startsWith('application/pdf')){
    embed.replaceWith(embed.cloneNode()); // reset
    const fresh = $('#viewerEmbed');
    fresh.type = 'application/pdf';
    fresh.src = meta.url;
  }else if(ct.startsWith('image/')){
    const imgWrap = document.createElement('div');
    imgWrap.id = 'viewerEmbed';
    imgWrap.style = 'display:grid;place-items:center;height:100%;padding:10px;';
    imgWrap.innerHTML = `<img src="${meta.url}" alt="${meta.name||''}" style="max-width:100%;max-height:100%;border-radius:12px;" />`;
    embed.replaceWith(imgWrap);
  }else{
    const msg = document.createElement('div');
    msg.id = 'viewerEmbed';
    msg.style = 'display:grid;place-items:center;padding:20px;text-align:center;';
    msg.innerHTML = `<div><div style="font-weight:700;font-size:18px;">Vista previa no disponible</div><div class="subtitle">Usa “Descargar”.</div></div>`;
    embed.replaceWith(msg);
  }
  viewer.style.display = 'grid';
}

(async function init(){
  wireUI();
  try { await loadManifest(); } catch(e){ console.error(e); alert('No se pudo cargar el catálogo de plantillas.'); }
  buildCategoryOptions();
  render();
})();
