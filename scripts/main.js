// Utilidades
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const by = (k) => (a,b) => (a[k] > b[k]) ? 1 : (a[k] < b[k]) ? -1 : 0;

async function loadDocs(){
  const res = await fetch('data/docs.json');
  if(!res.ok) throw new Error('No se pudo cargar data/docs.json');
  return await res.json();
}

function renderDocCard(d){
  const roles = d.roles.join(', ');
  const week = `Semana ${d.semana}`;
  const iframe = d.tipo === 'pdf' ? `<iframe src="${d.ruta}" loading="lazy"></iframe>` :
    `<div class="badge warn">Vista previa no disponible</div>`;
  return `
  <article class="doc">
    <h3>${d.titulo}</h3>
    <div class="meta">
      <span class="badge">${week}</span>
      <span class="badge">${roles}</span>
      ${d.destacado ? '<span class="badge ok">Destacado</span>' : ''}
    </div>
    ${iframe}
    <div class="actions">
      <a class="btn" href="${d.ruta}" target="_blank">Abrir</a>
      <a class="btn" href="${d.ruta}" download>Descargar</a>
    </div>
  </article>`;
}

function uniqueWeeks(docs){
  return [...new Set(docs.map(d => d.semana))].sort((a,b)=>a-b);
}

// Página: Inicio (index.html)
async function initHome(){
  const featured = $('#featured');
  const weeks = $('#weeks');
  if(!featured || !weeks) return;

  const docs = (await loadDocs()).sort(by('fecha'));
  const feats = docs.filter(d=>d.destacado);
  featured.innerHTML = feats.map(renderDocCard).join('') || '<p>No hay documentos destacados aún.</p>';

  const w = uniqueWeeks(docs);
  weeks.innerHTML = w.map(num=>`<a class="badge" href="documentos.html#semana-${num}">Semana ${num}</a>`).join('');
}

// Página: Documentos (documentos.html)
async function initDocs(){
  const list = $('#docs-list');
  if(!list) return;
  const docs = (await loadDocs()).sort((a,b)=> a.semana - b.semana || a.titulo.localeCompare(b.titulo));

  // Poblar filtros
  const weekSel = $('#filter-week');
  uniqueWeeks(docs).forEach(w=>{
    const opt = document.createElement('option');
    opt.value = String(w); opt.textContent = `Semana ${w}`; weekSel.appendChild(opt);
  });

  const roleSel = $('#filter-role');
  const search = $('#filter-search');
  const clearBtn = $('#clear-filters');

  function apply(){
    const w = weekSel.value ? Number(weekSel.value) : null;
    const r = roleSel.value || null;
    const q = (search.value || '').toLowerCase();

    const filtered = docs.filter(d =>
      (w === null || d.semana === w) &&
      (r === null || d.roles.includes(r)) &&
      (q === '' || d.titulo.toLowerCase().includes(q))
    );

    // Anchor por semana
    list.innerHTML = filtered.map(d => `
      <div id="semana-${d.semana}">
        ${renderDocCard(d)}
      </div>
    `).join('') || '<p>No hay documentos con esos filtros.</p>';
  }

  [weekSel, roleSel, search].forEach(el=> el.addEventListener('input', apply));
  clearBtn.addEventListener('click', ()=>{ weekSel.value=''; roleSel.value=''; search.value=''; apply(); });

  apply();
}

// Página: Rol (rol.html)
function getParam(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}

async function initRole(){
  const roleDocs = $('#role-docs');
  if(!roleDocs) return;
  const role = getParam('role') || 'general';
  const roleMap = {
    'general': 'General',
    'lider-de-equipo': 'Líder de equipo',
    'lider-de-desarrollo': 'Líder de desarrollo',
    'lider-de-calidad': 'Líder de calidad',
    'lider-de-soporte': 'Líder de soporte',
    'lider-de-planeacion': 'Líder de planeación'
  };
  $('#role-title').textContent = `Rol — ${roleMap[role] || role}`;
  $('#role-heading').textContent = `Documentos: ${roleMap[role] || role}`;

  const docs = (await loadDocs()).filter(d=> d.roles.includes(role));
  const wSel = $('#role-filter-week');
  uniqueWeeks(docs).forEach(w=>{ const o=document.createElement('option'); o.value=String(w); o.textContent=`Semana ${w}`; wSel.appendChild(o); });

  function apply(){
    const w = wSel.value ? Number(wSel.value) : null;
    const filtered = docs.filter(d => w === null || d.semana === w);
    roleDocs.innerHTML = filtered.map(renderDocCard).join('') || '<p>No hay documentos para este rol aún.</p>';
  }

  wSel.addEventListener('input', apply);
  apply();
}

// Router simple por página
window.addEventListener('DOMContentLoaded', () => {
  initHome();
  initDocs();
  initRole();
});
