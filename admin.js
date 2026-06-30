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
function renderTable(){ const rows=filtered(); A.table(A.qs('#feedbackTable'), ['תאריך','מבנה','דירה','אזור','ממלא','סוג','מהותיות','סיווג צוות','סטטוס','אחראי','יעד','פעולה'], rows.map(x=>[x.timestamp,x.buildingNumber,x.unitNumber,x.area,x.submitterName,(x.feedbackTypes||'').split('|').join('<br>'),x.importance,badge(x.teamClassification||'טרם סווג'),badge(x.status||'פתוח'),x.owner||'',x.dueDate||'',`<div class="row-actions"><button class="btn mini secondary" onclick="openDetails('${A.escAttr(x.feedbackId)}')">צפייה</button><button class="btn mini" onclick="openEdit('${A.escAttr(x.feedbackId)}')">טיפול</button></div>`])); }
function renderFiles(){ const byId=Object.fromEntries(adminState.feedback.map(f=>[f.feedbackId,f])); A.qs('#filesGrid').innerHTML=adminState.files.length?adminState.files.map(f=>{ const fb=byId[f.feedbackId]||{}; const icon=(f.mimeType||'').includes('pdf')?'📄':'🖼️'; return `<a class="file-card" href="${A.esc(f.fileUrl)}" target="_blank"><div>${icon}</div><b>מבנה ${A.esc(f.buildingNumber)} / דירה ${A.esc(f.unitNumber)}</b><span>${A.esc(f.fileCategory||'קובץ')}</span><small>${A.esc(f.fileName||'')}</small><small>${A.esc(fb.submitterName||'')}</small></a>`; }).join(''):'<p class="muted">אין קבצים.</p>'; }

function filesForFeedback(id){ return (adminState.files||[]).filter(f=>String(f.feedbackId)===String(id)); }
function val(v){ return A.esc(v || '—'); }
function splitList(v){ return String(v||'').split('|').filter(Boolean).map(x=>`<span class="badge light">${A.esc(x)}</span>`).join(' ') || '<span class="muted">—</span>'; }
function filePreview(f){
  const isPdf=(f.mimeType||'').includes('pdf');
  const thumb=!isPdf && f.driveFileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(f.driveFileId)}&sz=w600` : '';
  return `<a class="detail-file" href="${A.esc(f.fileUrl)}" target="_blank" rel="noreferrer">
    ${thumb ? `<img src="${A.esc(thumb)}" alt="${A.esc(f.fileName||'קובץ')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'detail-file-icon',textContent:'🖼️'}))">` : `<div class="detail-file-icon">${isPdf?'📄':'🖼️'}</div>`}
    <div><b>${A.esc(f.fileCategory||'קובץ')}</b><span>${A.esc(f.fileName||'')}</span></div>
  </a>`;
}
function openDetails(id){
  const fb=adminState.feedback.find(x=>String(x.feedbackId)===String(id));
  if(!fb) return;
  const files=filesForFeedback(id);
  A.qs('#detailsBody').innerHTML=`
    <div class="details-header">
      <div><span class="muted">מספר פנייה</span><h2>${A.esc(fb.feedbackId)}</h2></div>
      <div>${badge(fb.status||'פתוח')} ${badge(fb.teamClassification||'טרם סווג')}</div>
    </div>
    <section class="detail-section"><h3>פרטי זיהוי</h3><div class="detail-grid">
      <p><b>תאריך:</b> ${val(fb.timestamp)}</p><p><b>אזור:</b> ${val(fb.area)}</p><p><b>מבנה:</b> ${val(fb.buildingNumber)}</p><p><b>דירה:</b> ${val(fb.unitNumber)}</p>
      <p><b>שם ממלא:</b> ${val(fb.submitterName)}</p><p><b>טלפון:</b> ${val(fb.phone)}</p><p><b>דוא״ל:</b> ${val(fb.email)}</p><p><b>מתגורר בדירה:</b> ${val(fb.residentRelation)}</p>
    </div></section>
    <section class="detail-section"><h3>צפייה בתוכנית</h3><div class="detail-grid">
      <p><b>הוצגה תוכנית:</b> ${val(fb.planPresented)}</p><p><b>המיקום ברור:</b> ${val(fb.planClear)}</p><p><b>נדרש הסבר:</b> ${val(fb.needsExplanation)}</p><p><b>קישור תוכנית:</b> ${fb.planUrl?`<a href="${A.esc(fb.planUrl)}" target="_blank">פתיחה</a>`:'—'}</p>
    </div></section>
    <section class="detail-section"><h3>סוגי התייחסות ונושאים</h3><div class="detail-tags">${splitList(fb.feedbackTypes)}</div><h4>נושאים ספציפיים</h4><div class="detail-tags">${splitList(fb.relatedTopics)}</div></section>
    <section class="detail-section"><h3>פירוט הדייר</h3>
      <p><b>תיאור ההתייחסות:</b></p><div class="text-box">${A.esc(fb.description||'')}</div>
      <p><b>איפה נמצאת הבעיה / ההערה:</b></p><div class="text-box">${A.esc(fb.locationDescription||'')}</div>
      <div class="detail-grid"><p><b>משפיע על תכנון:</b> ${val(fb.planningImpactResident)}</p><p><b>משפיע על ביצוע:</b> ${val(fb.executionImpactResident)}</p><p><b>בעיה בטיחותית:</b> ${val(fb.safetyImpactResident)}</p><p><b>מהותיות:</b> ${val(fb.importance)}</p></div>
    </section>
    <section class="detail-section"><h3>טיפול צוות</h3><div class="detail-grid">
      <p><b>סיווג צוות:</b> ${val(fb.teamClassification)}</p><p><b>סטטוס:</b> ${val(fb.status)}</p><p><b>אחראי:</b> ${val(fb.owner)}</p><p><b>תאריך יעד:</b> ${val(fb.dueDate)}</p>
      <p><b>השפעה על תכנון:</b> ${val(fb.planningImpactTeam)}</p><p><b>השפעה על ביצוע:</b> ${val(fb.executionImpactTeam)}</p><p><b>השפעה בטיחותית:</b> ${val(fb.safetyImpactTeam)}</p><p><b>דורש ועדת תכנון:</b> ${val(fb.requiresPlanningCommittee)}</p>
      <p><b>דורש עדכון תוכנית:</b> ${val(fb.requiresPlanUpdate)}</p><p><b>דורש סיור שטח:</b> ${val(fb.requiresSiteVisit)}</p><p><b>דורש שיחה עם דייר:</b> ${val(fb.requiresResidentCall)}</p>
    </div><p><b>החלטה / מענה לדייר:</b></p><div class="text-box">${A.esc(fb.responseToResident||'')}</div></section>
    <section class="detail-section"><h3>קבצים ותמונות שצורפו (${files.length})</h3><div class="details-files">${files.length?files.map(filePreview).join(''):'<p class="muted">לא צורפו קבצים.</p>'}</div></section>
    <div class="form-actions"><button class="btn secondary" onclick="document.getElementById('detailsDialog').close()">סגירה</button><button class="btn primary" onclick="document.getElementById('detailsDialog').close(); openEdit('${A.escAttr(id)}')">פתיחה לטיפול</button></div>
  `;
  A.qs('#detailsDialog').showModal();
}

function openEdit(id){ const fb=adminState.feedback.find(x=>x.feedbackId===id); if(!fb) return; const form=A.qs('#editForm'); Object.entries(fb).forEach(([k,v])=>{ if(form.elements[k]) form.elements[k].value=v||''; }); form.elements.feedbackId.value=id; A.qs('#editDialog').showModal(); }
async function saveTreatment(ev){ ev.preventDefault(); const payload=Object.fromEntries(new FormData(A.qs('#editForm')).entries()); payload.adminToken=adminState.token; try{ await A.post('updateTreatment',payload); A.toast('הטיפול עודכן'); A.qs('#editDialog').close(); await loadAdminData(); }catch(e){ A.toast(e.message); } }
function showAdminView(v){ A.qsa('.admin-view').forEach(x=>x.classList.toggle('active',x.id===`${v}View`)); A.qsa('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v)); A.qs('#adminTitle').textContent={dashboard:'Dashboard',table:'טבלת התייחסויות',files:'קבצים ותמונות',settings:'חיבור'}[v]||''; }
function badge(v){ return `<span class="badge">${A.esc(v||'')}</span>`; }
function exportCsv(){ const headers=['feedbackId','timestamp','buildingNumber','unitNumber','area','submitterName','phone','feedbackTypes','description','teamClassification','status','owner','dueDate','responseToResident']; const rows=[headers].concat(filtered().map(x=>headers.map(h=>x[h]||''))); A.download(`resident-feedback-${new Date().toISOString().slice(0,10)}.csv`,A.csv(rows)); }
window.openEdit=openEdit;
window.openDetails=openDetails;
