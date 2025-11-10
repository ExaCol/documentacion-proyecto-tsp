// --- Config ---
const ROLES = [
  'Líder de calidad',
  'Líder de soporte',
  'Líder de desarrollo',
  'Líder de equipo',
  'Líder de planeación',
  'Ciclo-II'
];
const DEFAULT_ROLE = 'Líder de calidad'; // tu rol por defecto
const MANIFEST_URL = './data/docs-manifest.json';
const PHASES = ['iniciación', 'estrategia', 'requerimientos', 'planeación', 
                'diseño', 'implementación','pruebas', 'postmortem',
                'iniciación-II | estrategia -II', 'requerimientos-II | planeación-II', 
                'diseño-II', 'implementación-II', 'pruebas-II | postmortem-II']; // orden de fases


 const state = {
   currentRole: DEFAULT_ROLE,
   search: '',
   sort: 'updatedDesc',
   phase: '',                 // '' = todas las fases
   manifest: { documents: [] } // fallback
 };

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmtDate = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};


// --- Carga de manifiesto (soporta array o {documents:[]}) ---
async function loadManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error('No se pudo cargar docs-manifest.json');
  const data = await res.json();
  state.manifest = Array.isArray(data) ? { documents: data } : data;
}

// --- Render roles (usa #roleList) ---
function renderRoleButtons() {
  const roleList = $('#roleList');
  roleList.innerHTML = '';
  ROLES.forEach(role => {
    const btn = document.createElement('button');
    btn.className = 'role-btn' + (role === state.currentRole ? ' active' : '');
    btn.textContent = role;
    btn.onclick = () => {
      state.currentRole = role;
      refresh();
      $$('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
    roleList.appendChild(btn);
  });
}

// --- Agrupar por documento ---
function groupByName(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.name.trim().toLowerCase();
    if (!map.has(key)) map.set(key, { name: it.name, role: it.role, items: [] });
    map.get(key).items.push(it);
  }

  // Función para convertir "1.2.3" en [1,2,3]
  function parseVersion(ver) {
    if (!ver) return [0];
    return ver.split('.').map(n => parseInt(n, 10));
  }

  // Ordenar versiones numéricamente (ascendente)
  for (const v of map.values()) {
    v.items.sort((a, b) => {
      const va = parseVersion(a.version);
      const vb = parseVersion(b.version);

      for (let i = 0; i < Math.max(va.length, vb.length); i++) {
        const na = va[i] || 0;
        const nb = vb[i] || 0;
        if (na !== nb) return na - nb;
      }
      return 0;
    });
  }

  // Mantener orden alfabético por nombre del documento
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}


function computeVisible() {
  if (!state.manifest) return [];
  const norm = (s) => (s || '').toString().trim().toLowerCase();

  let list = (state.manifest.documents || []).filter(d => d.role === state.currentRole);

  if (state.phase) {
  list = list.filter(d => {
    const p = norm(d.phase) || 'otras'; // si no tiene fase -> "otras"
    return p === state.phase;
  });
}


  // 🔎 búsqueda por nombre
  if (state.search) {
    const q = norm(state.search);
    list = list.filter(d => norm(d.name).includes(q));
  }

  // órdenes existentes
  if (state.sort === 'updatedDesc') list.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (state.sort === 'updatedAsc')  list.sort((a,b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  if (state.sort === 'nameAsc')     list.sort((a,b) => a.name.localeCompare(b.name));
  if (state.sort === 'nameDesc')    list.sort((a,b) => b.name.localeCompare(a.name));

  return list;
}


// --- Render listado (sin columna de tamaño) ---
function renderList() {
  const container = $('#docList');
  container.innerHTML = '';

  const list = computeVisible();
  $('#emptyState').hidden = list.length > 0;

  // Orden de fases (usa global PHASES si la declaraste arriba)
  const PHASES_ORDER = (typeof PHASES !== 'undefined' && Array.isArray(PHASES))
    ? PHASES
    : ['iniciación', 'estrategia', 'requerimientos', 'planeación', 
                'diseño', 'implementación','pruebas', 'postmortem',
                'iniciación-II | estrategia -II', 'requerimientos-II | planeación-II', 
                'diseño-II', 'implementación-II', 'pruebas-II | postmortem-II'];

  // 1) Agrupar por fase
  const norm = (p) => (p || '').toString().trim().toLowerCase() || 'otras';
  const phaseGroups = new Map();
  for (const it of list) {
    const p = norm(it.phase);
    if (!phaseGroups.has(p)) phaseGroups.set(p, []);
    phaseGroups.get(p).push(it);
  }

  // 2) Ordenar fases: definidas + el resto (si apareciera)
  const others = Array.from(phaseGroups.keys()).filter(p => !PHASES_ORDER.includes(p));
  const orderedPhases = [...PHASES_ORDER, ...others];

  for (const phase of orderedPhases) {
    const items = phaseGroups.get(phase);
    if (!items || items.length === 0) continue;

    // Encabezado de la fase
    const phaseHeader = document.createElement('h3');
    phaseHeader.textContent = `Fase: ${phase}`;
    phaseHeader.className = 'subtitle';
    phaseHeader.style.margin = '14px 0 8px';
    container.appendChild(phaseHeader);

    // 3) Dentro de la fase, agrupar por documento (usa tu groupByName)
    const groups = groupByName(items);

    for (const group of groups) {
      const details = document.createElement('details');
      details.className = 'doc';
      const sum = document.createElement('summary');

      const chips = group.items.map(it => `
        <span class="chip"
              data-url="${it.url}"
              data-mime="${it.contentType}"
              data-name="${it.name}"
              data-version="${it.version}"
              data-filename="${it.filename}">v${it.version}</span>`).join('');

      sum.innerHTML = `
        <div class="doc-item">
          <div class="doc-header">
            <div>
              <div class="doc-title">${group.name}</div>
              <div class="doc-meta">${group.role} • ${group.items.length} versión(es)</div>
            </div>
            <div class="chips">${chips}</div>
          </div>
        </div>`;
      details.appendChild(sum);

      const wrap = document.createElement('div');
      wrap.className = 'versions';

      // Encabezado sin "Notas" (columna vacía para respetar tu grid de 5)
      wrap.innerHTML = `
        <div class="version-row" style="font-weight:700;">
          <div>Notas</div>        
          <div>Versión</div>
          <div>Actualizado</div>
          <div></div>        <!-- col vacía en lugar de Tamaño -->
          <div class="ops">Acciones</div>
        </div>`;

      for (const it of group.items) {
        const row = document.createElement('div');
        row.className = 'version-row';
        row.innerHTML = `
          <div>${it.notes}</div> 
          <div><span class="kbd">v${it.version}</span></div>
          <div>${fmtDate(it.updatedAt)}</div>
          <div></div> <!-- col vacía -->
          <div class="ops">
            <button class="btn secondary"
                    data-action="preview"
                    data-url="${it.url}"
                    data-mime="${it.contentType}"
                    data-name="${it.name}"
                    data-version="${it.version}"
                    data-filename="${it.filename}">Vista</button>
            <a class="btn" href="${it.url}" download>Descargar</a>
          </div>`;
        wrap.appendChild(row);
      }

      details.appendChild(wrap);
      container.appendChild(details);
    }
  }

  // Delegación de eventos (igual que tenías)
  container.onclick = (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      openViewer({
        url: chip.getAttribute('data-url'),
        mime: chip.getAttribute('data-mime'),
        name: chip.getAttribute('data-name'),
        version: chip.getAttribute('data-version'),
        filename: chip.getAttribute('data-filename')
      });
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.getAttribute('data-action') === 'preview') {
      openViewer({
        url: btn.getAttribute('data-url'),
        mime: btn.getAttribute('data-mime'),
        name: btn.getAttribute('data-name'),
        version: btn.getAttribute('data-version'),
        filename: btn.getAttribute('data-filename')
      });
    }
  };
}


// --- Visor ---
function openViewer(meta) {
  const viewer = $('#viewer');
  const title = $('#viewerTitle');
  const embed = $('#viewerEmbed');
  const dl = $('#viewerDownload');

  title.textContent = `${meta.name} – v${meta.version}`;
  dl.href = meta.url; dl.download = meta.filename || '';

  if (meta.mime === 'application/pdf') {
    embed.type = 'application/pdf';
    embed.src = meta.url;
  } else {
    // reemplaza el embed por un mensaje si no es PDF
    if (embed && embed.parentElement) embed.remove();
    const msg = document.createElement('div');
    msg.id = 'viewerEmbed';
    msg.style = 'display:grid;place-items:center;padding:20px;text-align:center;';
    msg.innerHTML = `<div><div style="font-weight:700;font-size:18px;">Vista previa no disponible</div><div class="subtitle">Tipo: ${meta.mime}. Usa “Descargar”.</div></div>`;
    document.querySelector('.panel').appendChild(msg);
  }

  viewer.style.display = 'grid';
  $('#closeViewer').onclick = () => { viewer.style.display = 'none'; };
  viewer.onclick = (e) => { if (e.target === viewer) $('#closeViewer').click(); };
}

 function wireUI() {
   $('#search').oninput = () => { state.search = $('#search').value; renderList(); };
   $('#sort').onchange = (e) => { state.sort = e.target.value; renderList(); };
   // filtro por fase
   const fp = $('#filterPhase');
   if (fp) {
     fp.onchange = (e) => {
       state.phase = (e.target.value || '').toLowerCase();
       renderList();
     };
}
   window.addEventListener('keydown', (e) => {
     if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') {
       e.preventDefault(); $('#search').focus();
     }
   });
 }


async function refresh() {
  renderList();
}

(async function init(){
  renderRoleButtons();     // monta los botones de roles de inmediato
  wireUI();
  try {
    await loadManifest();  // carga catálogo (soporta ambos formatos)
  } catch (e) {
    console.error(e);
    alert('No se pudo cargar el catálogo (docs-manifest.json).');
  }
  renderList();
})();
