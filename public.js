const RF = ResidentFeedbackShared;
let currentStep = 1;
let bootstrap = { areas: [], residents: [] };
let selectedPlan = null;

document.addEventListener('DOMContentLoaded', async () => {
  bind();
  updateStep();
  try {
    bootstrap = await RF.jsonp('publicBootstrap');
    bootstrap.residents = bootstrap.residents || [];
    fillAreas(bootstrap.areas || []);
    fillBuildings();
  } catch(e) {
    RF.showAlert('#alert', e.message, 'error');
  }
});

function bind(){
  RF.qs('#nextBtn').addEventListener('click', nextStep);
  RF.qs('#prevBtn').addEventListener('click', prevStep);
  RF.qs('#feedbackForm').addEventListener('submit', submitFeedback);
  RF.qs('#filesInput').addEventListener('change', previewFiles);
  RF.qs('#loadPlanBtn').addEventListener('click', loadPlan);
  RF.qs('#areaSelect').addEventListener('change', () => { fillBuildings(); clearPlan(); });
  RF.qs('#buildingNumber').addEventListener('change', () => { fillUnits(); clearPlan(); });
  RF.qs('#unitNumber').addEventListener('change', () => { clearPlan(); autoLoadPlanIfReady(); });
  RF.qs('[name="needsExplanation"]').addEventListener('change', autoExplanationType);
}

function fillAreas(areas){
  RF.qs('#areaSelect').innerHTML='<option value="">בחר</option>'+areas.map(a=>`<option>${RF.esc(a)}</option>`).join('');
}

function fillBuildings(){
  const area = RF.qs('#areaSelect').value;
  const buildings = unique((bootstrap.residents || [])
    .filter(r => !area || String(r.area) === String(area))
    .map(r => r.buildingNumber));
  RF.qs('#buildingNumber').innerHTML = '<option value="">בחר מבנה</option>' + buildings.map(b => `<option value="${RF.esc(b)}">${RF.esc(b)}</option>`).join('');
  fillUnits();
}

function fillUnits(){
  const area = RF.qs('#areaSelect').value;
  const building = RF.qs('#buildingNumber').value;
  const units = unique((bootstrap.residents || [])
    .filter(r => (!area || String(r.area) === String(area)) && (!building || String(r.buildingNumber) === String(building)))
    .map(r => r.unitNumber));
  RF.qs('#unitNumber').innerHTML = '<option value="">בחר דירה / יחידה</option>' + units.map(u => `<option value="${RF.esc(u)}">${RF.esc(u)}</option>`).join('');
}

function unique(arr){
  return [...new Set(arr.filter(v => v !== undefined && v !== null && String(v).trim() !== '').map(v => String(v).trim()))]
    .sort((a,b)=>String(a).localeCompare(String(b),'he',{numeric:true}));
}

function clearPlan(){
  selectedPlan = null;
  RF.qs('#planResult').innerHTML = '';
}

function autoLoadPlanIfReady(){
  const b = RF.qs('#buildingNumber').value;
  const u = RF.qs('#unitNumber').value;
  if (b && u) loadPlan();
}

function updateStep(){ RF.qsa('.step').forEach(s=>s.classList.toggle('active', Number(s.dataset.step)===currentStep)); RF.qs('#stepLabel').textContent=`שלב ${currentStep} מתוך 8`; RF.qs('#progressBar').style.width=`${currentStep/8*100}%`; RF.qs('#prevBtn').disabled=currentStep===1; RF.qs('#nextBtn').classList.toggle('hidden', currentStep===8); RF.qs('#submitBtn').classList.toggle('hidden', currentStep!==8); if(currentStep===8) renderSummary(); }
function validateStep(){ const section=RF.qs(`.step[data-step="${currentStep}"]`); const fields=[...section.querySelectorAll('input,select,textarea')]; for(const f of fields){ if(!f.checkValidity()){ f.reportValidity(); return false; } } if(currentStep===3 && checked('feedbackTypes').length===0){ RF.toast('חובה לבחור לפחות סוג התייחסות אחד'); return false; } return true; }
function nextStep(){ if(!validateStep()) return; currentStep=Math.min(8,currentStep+1); updateStep(); window.scrollTo({top:0,behavior:'smooth'}); }
function prevStep(){ currentStep=Math.max(1,currentStep-1); updateStep(); window.scrollTo({top:0,behavior:'smooth'}); }
function checked(name){ return RF.qsa(`.checks[data-name="${name}"] input:checked`).map(x=>x.value); }
function autoExplanationType(){ if(this.value==='כן'){ const cb=[...RF.qsa('.checks[data-name="feedbackTypes"] input')].find(x=>x.value==='בקשה להבהרה / הסבר'); if(cb) cb.checked=true; } }

async function loadPlan(){
  const b=RF.qs('#buildingNumber').value.trim(), u=RF.qs('#unitNumber').value.trim();
  if(!b||!u){ RF.toast('יש לבחור מספר מבנה ומספר דירה'); return; }
  try{
    selectedPlan=await RF.jsonp('getPlan',{buildingNumber:b,unitNumber:u});
    RF.qs('#planResult').innerHTML=selectedPlan.planUrl
      ? `<div class="success-box">נמצאה תוכנית למבנה. <a href="${RF.esc(selectedPlan.planUrl)}" target="_blank">פתיחת התוכנית</a></div>`
      : `<div class="warn-box">לא נמצאה תוכנית מקושרת למבנה זה. אפשר להמשיך למלא את הטופס.</div>`;
    if(selectedPlan.area && !RF.qs('#areaSelect').value) RF.qs('#areaSelect').value=selectedPlan.area;
  }catch(e){ RF.qs('#planResult').innerHTML=`<div class="warn-box">${RF.esc(e.message)}</div>`; }
}

function previewFiles(){ const files=[...RF.qs('#filesInput').files]; const max=(window.RESIDENT_FEEDBACK_CONFIG||{}).MAX_FILE_SIZE_BYTES || 10*1024*1024; if(files.length>5){ RF.qs('#filesInput').value=''; RF.toast('ניתן להעלות עד 5 קבצים'); return; } const bad=files.find(f=>f.size>max); if(bad){ RF.qs('#filesInput').value=''; RF.toast(`קובץ גדול מהמותר: ${bad.name}`); return; } RF.qs('#filePreview').innerHTML=files.map(f=>`<span class="file-chip">${RF.esc(f.name)} · ${(f.size/1024/1024).toFixed(2)}MB</span>`).join(''); }
function formDataObj(){ const obj=Object.fromEntries(new FormData(RF.qs('#feedbackForm')).entries()); obj.feedbackTypes=checked('feedbackTypes'); obj.relatedTopics=checked('relatedTopics'); obj.fileCategory=RF.qs('#fileCategory').value; obj.planUrl=selectedPlan?.planUrl || ''; return obj; }
function renderSummary(){ const p=formDataObj(); RF.qs('#summaryBox').innerHTML=`<b>מבנה ${RF.esc(p.buildingNumber)} / דירה ${RF.esc(p.unitNumber)}</b><br>${RF.esc(p.description||'')}<br><span class="muted">סוגי התייחסות: ${RF.esc((p.feedbackTypes||[]).join(', '))}</span>`; }

function makeFeedbackId(){
  const d=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `RF-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.random().toString(36).slice(2,8)}`;
}

async function verifySaved(feedbackId){
  try{ const st=await RF.jsonp('feedbackStatus',{feedbackId}); return !!st.exists; }
  catch(e){ return false; }
}

async function safeUploadFiles(feedbackId,payload){
  try{ await uploadFiles(feedbackId,payload); return true; }
  catch(e){
    const exists=await verifySaved(feedbackId);
    if(exists){ RF.toast('ההתייחסות נשמרה. ייתכן שחלק מהקבצים לא נקלטו — צוות הפרויקט יבדוק בדשבורד.'); return false; }
    throw e;
  }
}

function showSuccess(feedbackId){
  RF.qs('#saveState').textContent='נשלח בהצלחה';
  RF.qs('#feedbackForm').innerHTML=`<div class="thanks"><h2>ההתייחסות התקבלה</h2><p>תודה. מספר פנייה: <b>${RF.esc(feedbackId)}</b></p><p>צוות הפרויקט יסווג ויטפל בהתייחסות בהתאם להשפעה תכנונית, ביצועית, בטיחותית או בקשה להבהרה.</p></div>`;
}

async function submitFeedback(ev){
  ev.preventDefault();
  if(!validateStep()) return;
  const payload=formDataObj();
  payload.feedbackId = payload.feedbackId || makeFeedbackId();
  RF.qs('#submitBtn').disabled=true;
  RF.qs('#saveState').textContent='שולח...';
  try{
    let saved;
    try{
      saved=await RF.post('submitFeedback', payload);
    }catch(postError){
      const exists=await verifySaved(payload.feedbackId);
      if(!exists) throw postError;
      saved={feedbackId:payload.feedbackId, verifiedAfterTimeout:true};
    }
    RF.qs('#saveState').textContent='מעלה קבצים...';
    await safeUploadFiles(saved.feedbackId, payload);
    showSuccess(saved.feedbackId);
  }catch(e){
    RF.showAlert('#alert', e.message, 'error');
    RF.qs('#saveState').textContent='שגיאה בשליחה';
    RF.qs('#submitBtn').disabled=false;
  }
}
async function uploadFiles(feedbackId,payload){ const files=[...RF.qs('#filesInput').files]; if(!files.length) return; const encoded=await Promise.all(files.map(fileToDataUrl)); return RF.post('uploadFiles',{feedbackId,buildingNumber:payload.buildingNumber,unitNumber:payload.unitNumber,submitterName:payload.submitterName,fileCategory:payload.fileCategory,files:encoded}); }
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve({name:file.name,size:file.size,type:file.type,dataUrl:r.result}); r.onerror=reject; r.readAsDataURL(file); }); }
