const STORAGE_KEY = 'mision2-documents-v1';
const editor = document.getElementById('editor');
const title = document.getElementById('documentTitle');
const status = document.getElementById('saveStatus');
let saveTimer;

const getDocs = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const setDocs = docs => localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
const currentDoc = () => ({ title: title.value.trim() || 'Documento sin título', html: editor.innerHTML, updated: Date.now() });

function renderDocs() {
  const list = document.getElementById('savedDocuments');
  list.innerHTML = '';
  getDocs().sort((a,b) => b.updated - a.updated).forEach(doc => {
    const button = document.createElement('button'); button.textContent = '📄 ' + doc.title; button.title = doc.title;
    button.onclick = () => { title.value = doc.title; editor.innerHTML = doc.html; updateCount(); setStatus('Documento abierto'); };
    list.appendChild(button);
  });
}
function save() {
  const doc = currentDoc(); const docs = getDocs(); const index = docs.findIndex(d => d.title === doc.title);
  if (index >= 0) docs[index] = doc; else docs.push(doc); setDocs(docs); renderDocs(); setStatus('Guardado local');
}
function scheduleSave() { setStatus('Guardando…'); clearTimeout(saveTimer); saveTimer = setTimeout(save, 500); updateCount(); }
function setStatus(text) { status.textContent = text; }
function updateCount() { const text = editor.innerText.trim(); const count = text ? text.split(/\s+/).length : 0; document.getElementById('wordCount').textContent = `${count} ${count === 1 ? 'palabra' : 'palabras'}`; }
function command(command, value = null) { editor.focus(); document.execCommand(command, false, value); scheduleSave(); }

document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => command(button.dataset.command)));
document.getElementById('blockFormat').addEventListener('change', e => command('formatBlock', e.target.value));
document.getElementById('fontName').addEventListener('change', e => command('fontName', e.target.value));
document.getElementById('fontSize').addEventListener('change', e => command('fontSize', e.target.value));
document.getElementById('clearFormat').addEventListener('click', () => command('removeFormat'));
document.getElementById('insertLink').addEventListener('click', () => { const url = prompt('Dirección del enlace:'); if (url) command('createLink', url); });
editor.addEventListener('input', scheduleSave); title.addEventListener('input', scheduleSave);
document.getElementById('newDocument').addEventListener('click', () => { if (confirm('¿Crear un documento nuevo?')) { title.value = 'Documento sin título'; editor.innerHTML = '<h1>Nuevo documento</h1><p>Comienza a escribir aquí...</p>'; updateCount(); scheduleSave(); } });
document.getElementById('menuButton').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('uploadTemplate').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', async e => { const file = e.target.files[0]; if (!file) return; try { if (file.name.toLowerCase().endsWith('.docx')) await openDocx(file); else await openOdt(file); title.value = file.name.replace(/\.(docx|odt)$/i, ''); updateCount(); scheduleSave(); } catch (error) { alert('No se pudo abrir la plantilla. Comprueba que sea un archivo .docx o .odt válido.'); console.error(error); } e.target.value = ''; });
async function openDocx(file) { if (!window.mammoth) throw new Error('Mammoth no disponible'); const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }); editor.innerHTML = result.value || '<p>Documento vacío</p>'; }
async function openOdt(file) { if (!window.JSZip) throw new Error('JSZip no disponible'); const zip = await JSZip.loadAsync(await file.arrayBuffer()); const xml = new DOMParser().parseFromString(await zip.file('content.xml').async('text'), 'application/xml'); const paragraphs = [...xml.getElementsByTagNameNS('*', 'p')]; editor.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p.textContent || '')}</p>`).join('') || '<p>Documento vacío</p>'; }
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

document.getElementById('downloadPdf').addEventListener('click', async () => { if (!window.html2pdf) { alert('La herramienta PDF todavía está cargando.'); return; } save(); setStatus('Preparando PDF…'); const clone = editor.cloneNode(true); clone.style.cssText = 'background:#fff;color:#202124;width:820px;min-height:1060px;padding:78px 82px;font-family:Arial;line-height:1.65;'; const wrapper = document.createElement('div'); wrapper.appendChild(clone); const filename = (title.value.trim() || 'mision-2-documento').replace(/[^a-z0-9áéíóúñ _-]/gi, '').replace(/\s+/g, '-'); await html2pdf().set({ margin: 0, filename: `${filename}.pdf`, image: { type: 'jpeg', quality: .98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'px', format: [820, 1060], orientation: 'portrait' } }).from(wrapper).save(); setStatus('PDF descargado'); });

renderDocs(); updateCount();
