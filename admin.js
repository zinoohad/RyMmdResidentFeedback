const A = ResidentFeedbackShared;
let adminState = { token: localStorage.getItem('RF_ADMIN_TOKEN') || '', feedback: [], files: [] };

document.addEventListener('DOMContentLoaded', () => {
  bindAdmin();
  loadAdminSettings();
  if(adminState.token) loadAdminData();
});
function bindAdmin(){
  A.qs('#loginBtn').addEventListener('click', login);
  A.qs('#logoutBtn').addEventListener('click', logout);
  A.qs('#refreshAdminBtn').addEventListener('click', loadAdminData);
  A.qs('#exportAdminCsvBtn').addEventListener('click', exportCsv);
  A.qs('#saveAdminSettings').addEventListener('click', saveAdminSettings);
  A.qsa('.nav').forEach(b=>b.addEventListener('click',()=>showAdminView(b.dataset.view)));
  ['#adminSearch','#filterStatus','#filterClass','#filterArea'].forEach(s=>A.qs(s)?.addEventListener('input',renderTable));
  A.qs('#editForm').addEventListener('submit', saveTreatment);
}
function loadAdminSettings(){ const c=A.cfg(); A.qs('#adminBackendUrl').value=c.API_BASE_URL||''; A.qs('#adminPublicKey').value=c.PUBLIC_API_KEY||''; }
function saveAdminSettings(){ localStorage.setItem('RF_API_BASE_URL',A.qs('#adminBackendUrl').value.trim()); localStorage.setItem('RF_PUBLIC_API_KEY',A.qs('#adminPublicKey').value.trim()); A.toast('ההגדרות נשמרו בדפדפן'); }
async function login(){ try{ const password=A.qs('#adminPassword').value; const data=await A.post('adminLogin',{password}); adminState.token=data.token; localStorage.setItem('RF_ADMIN_TOKEN',data.token); await loadAdminData(); }catch(e){ A.showAlert('#adminAlert',e.message,'error'); } }
function logout(){ localStorage.removeItem('RF_ADMIN_TOKEN'); adminState.token=''; A.qs('#adminContent').classList.add('hidden'); A.qs('#loginPanel').classList.remove('hidden'); A.qs('#logoutBtn').classList.add('hidden'); }
async function loadAdminData(){ try{ const data=await A.jsonp('adminDashboard',{adminToken:adminState.token}); adminState.feedback=data.feedback||[]; adminState.files=data.files||[]; A.qs('#loginPanel').classList.add('hidden'); A.qs('#adminContent').classList.remove('hidden'); A.qs('#logoutBtn').classList.remove('hidden'); populateFilters(); renderAll(); A.hideAlert('#adminAlert'); }catch(e){ logout(); A.showAlert('#adminAlert',e.message,'error'); } }
function populateFilters(){ fill('#filterStatus', A.unique(adminState.feedback.map(x=>x.status)), 'כל הסטטוסים'); fill('#filterClass', A.unique(adminState.feedback.map(x=>x.teamClassification)), 'כל הסיווגים'); fill('#filterArea', A.unique(adminState.feedback.map(x=>x.area)), 'כל האזורים'); }
function fill(sel, values, placeholder){ const el=A.qs(sel); const cur=el.value; el.innerHTML=`<option value="">${A.esc(placeholder)}</option>`+values.map(v=>`<option>${A.esc(v)}</option>`).join(''); if(values.includes(cur)) el.value=cur; }
function renderAll(){ renderDashboard(); renderTable(); renderFiles(); }
function renderDashboard(){ const f=adminState.feedback; const open=f.filter(x=>x.status!=='נסגר').length; const urgent=f.filter(x=>(x.importance||'').includes('מהותי מאוד')).length; const planning=f.filter(x=>x.teamClassification==='תכנונית').length; const safety=f.filter(x=>x.teamClassification==='בטיחותית').length; A.qs('#adminKpis').innerHTML=[['סה״כ התייחסויות',f.length],['פתוחות',open],['מהותי מאוד',urgent],['תכנוניות',planning],['בטיחותיות',safety],['קבצים',adminState.files.length]].map(([a,b])=>`<div class="kpi"><span>${A.esc(a)}</span><strong>${A.esc(b)}</strong></div>`).join(''); A.renderBars(A.qs('#classChart'),A.countBy(f,x=>x.teamClassification||'טרם סווג')); A.renderBars(A.qs('#statusChart'),A.countBy(f,x=>x.status||'פתוח')); A.renderBars(A.qs('#impactChart'),{ 'תכנון': f.filter(x=>x.planningImpactTeam==='כן'||x.planningImpactResident==='כן').length, 'ביצוע': f.filter(x=>x.executionImpactTeam==='כן'||x.executionImpactResident==='כן').length, 'בטיחות': f.filter(x=>x.safetyImpactTeam==='כן'||x.safetyImpactResident==='כן').length }); A.renderBars(A.qs('#areaChart'),A.countBy(f,x=>x.area)); }
function filtered(){ const s=(A.qs('#adminSearch').value||'').toLowerCase(); const st=A.qs('#filterStatus').value; const cl=A.qs('#filterClass').value; const ar=A.qs('#filterArea').value; return adminState.feedback.filter(x=>{ const hay=[x.feedbackId,x.submitterName,x.phone,x.area,x.buildingNumber,x.unitNumber,x.description,x.locationDescription,x.openBlockers,x.teamClassification,x.status].join(' ').toLowerCase(); return (!s||hay.includes(s))&&(!st||x.status===st)&&(!cl||x.teamClassification===cl)&&(!ar||x.area===ar); }); }
function renderTable(){ const rows=filtered(); A.table(A.qs('#feedbackTable'), ['תאריך','מבנה','דירה','אזור','ממלא','סוג','מהותיות','סיווג צוות','סטטוס','אחראי','יעד','פעולה'], rows.map(x=>[x.timestamp,x.buildingNumber,x.unitNumber,x.area,x.submitterName,(x.feedbackTypes||'').split('|').join('<br>'),x.importance,badge(x.teamClassification||'טרם סווג'),badge(x.status||'פתוח'),x.owner||'',x.dueDate||'',`<button class="btn mini" onclick="openEdit('${A.escAttr(x.feedbackId)}')">טיפול</button>`])); }
function renderFiles(){ const byId=Object.fromEntries(adminState.feedback.map(f=>[f.feedbackId,f])); A.qs('#filesGrid').innerHTML=adminState.files.length?adminState.files.map(f=>{ const fb=byId[f.feedbackId]||{}; const icon=(f.mimeType||'').includes('pdf')?'📄':'🖼️'; return `<a class="file-card" href="${A.esc(f.fileUrl)}" target="_blank"><div>${icon}</div><b>מבנה ${A.esc(f.buildingNumber)} / דירה ${A.esc(f.unitNumber)}</b><span>${A.esc(f.fileCategory||'קובץ')}</span><small>${A.esc(f.fileName||'')}</small><small>${A.esc(fb.submitterName||'')}</small></a>`; }).join(''):'<p class="muted">אין קבצים.</p>'; }
function openEdit(id){ const fb=adminState.feedback.find(x=>x.feedbackId===id); if(!fb) return; const form=A.qs('#editForm'); Object.entries(fb).forEach(([k,v])=>{ if(form.elements[k]) form.elements[k].value=v||''; }); form.elements.feedbackId.value=id; A.qs('#editDialog').showModal(); }
async function saveTreatment(ev){ ev.preventDefault(); const payload=Object.fromEntries(new FormData(A.qs('#editForm')).entries()); payload.adminToken=adminState.token; try{ await A.post('updateTreatment',payload); A.toast('הטיפול עודכן'); A.qs('#editDialog').close(); await loadAdminData(); }catch(e){ A.toast(e.message); } }
function showAdminView(v){ A.qsa('.admin-view').forEach(x=>x.classList.toggle('active',x.id===`${v}View`)); A.qsa('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v)); A.qs('#adminTitle').textContent={dashboard:'Dashboard',table:'טבלת התייחסויות',files:'קבצים ותמונות',settings:'חיבור'}[v]||''; }
function badge(v){ return `<span class="badge">${A.esc(v||'')}</span>`; }
function exportCsv(){ const headers=['feedbackId','timestamp','buildingNumber','unitNumber','area','submitterName','phone','feedbackTypes','description','teamClassification','status','owner','dueDate','responseToResident']; const rows=[headers].concat(filtered().map(x=>headers.map(h=>x[h]||''))); A.download(`resident-feedback-${new Date().toISOString().slice(0,10)}.csv`,A.csv(rows)); }
window.openEdit=openEdit;
