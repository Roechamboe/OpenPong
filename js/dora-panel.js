// Dora drill UI uses the reusable OpenPong design and Dora-native values.
// All data lives in the independent openpong_dora_drills_v1 store.
import { onRobotEvent, getActiveAdapter } from './core/robot-manager.js';
import { appStats } from './state.js';
import { updateStatsUI } from './ui.js';
const robot=getActiveAdapter();
import { runMode } from './state.js';
import { CATEGORIES, DEFAULT_BALL, loadDrills, saveDrills, compileDrill,
  exportDrills, importDrills, newDrill } from './robots/dora/drills.js';

let drills=loadDrills(), category='basic', level=1, editing=null, draft=null;
let stopTimer=null, running=false, busy=false, token=0, launches=0;
let holdTimer=null, holdStart=null, suppressRunClick=false;
let gripDrag=null;
let activeMode='time', activeTarget=0;
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function saveStats(){localStorage.setItem('openpong_stats',JSON.stringify(appStats));updateStatsUI();}
// Keep drill display capitalization independent from saved IDs and names.
const displayDrillName=name=>name.startsWith('cust_')?name:name.replace(/-/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(s){$('dora-status').textContent=s;}
function setting(id,label,min,max,step=1){
 return `<label class="editor-field" style="min-width:0;display:flex;flex-direction:column;gap:4px"><span>${label}</span><input type="number" data-field="${id}" min="${min}" max="${max}" step="${step}" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"></label>`;
}
const fields=[['direction','Direction',0,90],['speed','Speed',20,100],['spin','Spin',0,60],['arc','Arc',-65,65],['frequencyLevel','Frequency',20,170],['angle','Spin angle',0,359]];
function persist(){saveDrills(drills);renderCards();}
function refresh(){
 $('dora-panel').hidden=false;
 $('dora-device-settings').hidden=false;
 document.querySelector('header h1').textContent='Dora Drill Control';
}
function renderCards(){
 const categoryLabel=c=>c.startsWith('custom-')?'Custom '+c.slice(-1).toUpperCase():c[0].toUpperCase()+c.slice(1);
 const iconGrid='<div class="icon-grid"><div class="icon-dot"></div><div class="icon-dot"></div><div class="icon-dot"></div><div class="icon-dot"></div></div>';
 $('dora-tabs').innerHTML=CATEGORIES.map(c=>`<div role="tab" tabindex="0" aria-selected="${category===c}" class="tab-btn ${category===c?'active':''}" data-cat="${c}">${iconGrid} ${categoryLabel(c)}</div>`).join('');
 $('dora-levels').innerHTML=[1,2,3].map(i=>`<button class="lvl-dot ${level===i?'active':''}" data-level="${i}" type="button">${i}</button>`).join('');
 $('dora-cards').innerHTML=drills.filter(d=>d.category===category).map(d=>`
 <button class="btn-drill" type="button" data-run="${escapeHtml(d.id)}" style="width:100%">
  <div class="drill-icon"><div class="d-dot"></div><div class="d-dot"></div><div class="d-dot"></div><div class="d-dot"></div></div>
  <span>${escapeHtml(displayDrillName(d.name))}</span>${d.shuffle?'<div class="mark-random">R</div>':''}
  <div class="drill-grab-handle" data-edit="${escapeHtml(d.id)}" title="Drag to reorder; tap to edit" aria-label="Drag to reorder ${escapeHtml(d.name)}; tap to edit" role="button" tabindex="0">≡</div>
 </button>`).join('')+
 (category.startsWith('custom-')?'<div style="display:flex;justify-content:center;margin:15px 0"><button class="btn-swap" id="dora-add-drill" type="button" title="Create new drill" aria-label="Create new drill">＋</button></div>':'');
}
function editor(){
 $('dora-editor').hidden=false;
 $('dora-editor-name').value=draft.name;
 $('dora-editor-shuffle').checked=!!draft.shuffle;
 const steps=draft.levels[level-1];
 $('dora-steps').innerHTML=steps.map((options,i)=>`
 <div class="ball-group" style="margin-bottom:12px;padding:10px;border:1px solid var(--border);border-radius:10px">
  <div class="group-title" style="display:flex;align-items:center;justify-content:space-between">
   <strong>Ball ${i+1}</strong>
   <div style="display:flex;gap:5px">
    <button type="button" data-action="up" data-step="${i}">↑</button>
    <button type="button" data-action="down" data-step="${i}">↓</button>
    <button type="button" class="btn-add-opt" data-action="duplicate" data-step="${i}" title="Duplicate Ball" aria-label="Duplicate Ball ${i+1}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
    <button type="button" data-action="remove" data-step="${i}">×</button>
   </div>
  </div>
  <label><input type="checkbox" data-step="${i}" data-enabled ${options[0].inactive?'':'checked'}> Enabled</label>
  <div style="margin:6px 0"><label>Direction scatter (± degrees) <input data-step="${i}" data-scatter type="number" min="0" max="30" value="${options[0].scatter||0}" style="width:70px"></label></div>
  ${options.map((b,j)=>`<div class="option-card">
    ${options.length>1?`<span class="option-label">Variant ${j+1}</span>`:''}
    <div class="editor-grid">
     ${fields.map(([key,label,min,max])=>`<div class="editor-field">
       <div class="field-header"><label for="dora-${i}-${j}-${key}">${label}</label><span class="range-hint">${min}–${max}</span></div>
       <input id="dora-${i}-${j}-${key}" data-step="${i}" data-opt="${j}" data-param="${key}" type="number" inputmode="numeric" step="1" min="${min}" max="${max}" value="${b[key]}">
      </div>`).join('')}
    </div>
    <div class="card-actions">
     <button type="button" class="btn-action btn-act-clone" data-action="variant" data-step="${i}">+ Variant</button>
     <button type="button" class="btn-action btn-act-del" data-action="remove-option" data-step="${i}" data-opt="${j}" ${options.length===1?'disabled':''}>Delete</button>
    </div>
  </div>`).join('')}
 </div>`).join('')+`<div class="swap-zone" style="margin:-10px 0 20px"><button id="dora-add-step" class="btn-swap" type="button" data-action="add-step" title="Add New Ball" aria-label="Add New Ball" ${steps.length>=28?'disabled':''} style="color:var(--primary);border-color:var(--primary);width:32px;height:32px"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div>`;
}
function openEditor(id){
 const found=drills.find(d=>d.id===id);if(!found)return;
 editing=id;draft=clone(found);editor();
 $('dora-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function commitEditor(){
 draft.name=$('dora-editor-name').value.trim().slice(0,40);
 if(!draft.name)throw new Error('Drill name cannot be empty');
 draft.shuffle=$('dora-editor-shuffle').checked;
 // Validation occurs in saveDrills; never commit corrupted edits.
 const next=drills.map(d=>d.id===editing?draft:d);
 saveDrills(next);drills=next;closeEditor();renderCards();
}
function closeEditor(){editing=null;draft=null;$('dora-editor').hidden=true;}
function modifyEditor(event){
 const target=event.target;
 const i=Number(target.dataset.step),j=Number(target.dataset.opt);
 if(target.dataset.param){
  const [key,,min,max]=fields.find(x=>x[0]===target.dataset.param);
  const val=Number(target.value);
  if(!Number.isInteger(val)||val<min||val>max){target.setCustomValidity(`Enter ${min}–${max}`);target.reportValidity();return;}
  target.setCustomValidity('');draft.levels[level-1][i][j][key]=val;
 }
 if('enabled' in target.dataset) draft.levels[level-1][i].forEach(b=>b.inactive=!target.checked);
 if('scatter' in target.dataset){
  const val=Number(target.value);if(!Number.isInteger(val)||val<0||val>30)return;
  draft.levels[level-1][i].forEach(b=>b.scatter=val);
 }
}
async function stop(){
 token++;clearTimeout(stopTimer);stopTimer=null;running=false;
 if(!robot.bleState.isConnected){status('Disconnected. Verify physical stop.');return;}
 try{await robot.stopTraining();status('Stopped');}
 catch(e){status('STOP FAILED: '+e.message);}
}
async function startDrill(id){
 if(busy||running)return;
 if(!robot.bleState.isConnected){status('Connect to Dora first');return;}
 const drill=drills.find(d=>d.id===id);if(!drill)return;
 const mode=runMode;
 const duration=Number($('input-time').value);
 const repetitions=Number($('input-reps').value);
 if ((mode==='time' && (!Number.isInteger(duration)||duration<1||duration>3600)) ||
     (mode==='reps' && (!Number.isInteger(repetitions)||repetitions<1||repetitions>10000))) {
  status('Invalid '+(mode==='time'?'duration':'ball count'));return;
 }
 activeMode=mode;
 activeTarget=mode==='time'?duration:repetitions;
 const runId=++token;busy=true;launches=0;
 try {
  // Repetitions are counted from launch notifications; unlike Nova these are
  // not per-sequence completion callbacks. Hardware may emit fewer during a stop.
  const selected=compileDrill(drill,level,{shuffle:drill.shuffle});
  status(`Uploading ${selected.length} shots…`);
  await robot.prepareDrill(selected);
  if(runId!==token)return;
  await robot.startTraining();
  running=true;
  appStats.drills+=1;
  saveStats();
  status(`Running: ${escapeHtml(drill.name)}`);
  if(mode==='time')stopTimer=setTimeout(()=>{void stop();},duration*1000);
 } catch(err) {
  status('Start error: '+err.message);
  if(robot.isRunning())await stop();
 } finally{busy=false;}
}
function download(text,name){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function initDoraPanel(){
 if (!document.getElementById('dora-hidden-style')) {
  const style=document.createElement('style');style.id='dora-hidden-style';
  style.textContent=`
    #dora-panel[hidden], #dora-editor[hidden], #dora-device-settings[hidden] { display:none !important; }
    #dora-editor, #dora-editor * { box-sizing:border-box; }
    #dora-editor .editor-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
    #dora-editor .editor-field { min-width:0; }
    #dora-editor .editor-field input { min-width:0; max-width:100%; box-sizing:border-box; }
    #dora-editor .option-card { min-width:0; max-width:100%; }
    #dora-editor .dora-add-step-button { width:100%; max-width:180px; margin:12px auto; }
    #dora-editor .btn-action:disabled {opacity:.35;cursor:not-allowed;}
    #dora-editor .group-title button { flex:0 0 auto; min-width:30px; }
    #dora-cards .drill-grab-handle {touch-action:none; user-select:none;}
    #dora-cards .btn-drill.dragging {opacity:0.65;border-color:var(--primary);}
    @media(max-width:390px) { #dora-editor .editor-grid {grid-template-columns:repeat(2,minmax(0,1fr));} }
  `;
  document.head.appendChild(style);
 }
 // Dora-only controls live alongside shared settings, not in a duplicate drill card.
 const deviceSettings=document.createElement('div');
 deviceSettings.id='dora-device-settings';
 deviceSettings.hidden=true;
 deviceSettings.style.cssText='padding:10px 0;border-top:1px solid var(--border);margin-top:10px';
 deviceSettings.innerHTML=`
 <div class="section-label" style="margin:0 0 9px">Robot settings</div>
 <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
  <label class="control-pill" style="display:flex;flex-direction:column;gap:7px;min-width:0">
   <span>Audio volume <strong id="dora-volume-value">3</strong></span>
   <input id="dora-volume" type="range" min="0" max="6" step="1" value="3" aria-label="Dora volume" style="width:100%">
  </label>
  <label class="control-pill" style="display:flex;flex-direction:column;gap:7px;min-width:0">
   <span>Light brightness <strong id="dora-brightness-value">7</strong></span>
   <input id="dora-brightness" type="range" min="4" max="10" step="1" value="7" aria-label="Dora brightness" style="width:100%">
  </label>
 </div>
 <p id="dora-settings-status" role="status" aria-live="polite" style="font-size:0.75rem;color:var(--text-light);margin:6px 0 0">Connect Dora to adjust settings</p>`;
 document.getElementById('dora-device-settings-card').append(deviceSettings);
 // Do not send unverified saved preferences on connection automatically:
 // sliders show a neutral starting position until explicitly adjusted.
 for(const [name,min,max,send] of [
  ['volume',0,6,level=>robot.setVolume(level)],
  ['brightness',4,10,level=>robot.setBrightness(level)]
 ]){
  const input=$('dora-'+name),value=$('dora-'+name+'-value');
  input.addEventListener('input',()=>{value.textContent=input.value;});
  input.addEventListener('change',async()=>{
   const level=Number(input.value);
   if(!Number.isInteger(level)||level<min||level>max)return;
   if(!robot.bleState.isConnected){
    $('dora-settings-status').textContent='Connect Dora before applying settings';
    return;
   }
   input.disabled=true;
   try{await send(level);$('dora-settings-status').textContent=name+' set to '+level;}
   catch(error){$('dora-settings-status').textContent='Could not set '+name+': '+error.message;}
   finally{input.disabled=false;}
  });
 }
 const panel=document.createElement('section');panel.id='dora-panel';panel.hidden=true;
 panel.innerHTML=`
 <p id="dora-status" role="status" aria-live="polite" style="margin:8px 0;color:var(--text-light);font-size:0.8rem">Connect to Dora to start</p>
 <div class="section-label">Difficulty Level</div>
 <div id="dora-levels" class="level-select" style="display:flex;gap:12px;justify-content:center;margin:12px"></div>
 <div class="section-label">Drill Selection</div>
 <div id="dora-tabs" class="tabs-container"></div>
 <div id="dora-cards" class="drill-list"></div>

 <section id="dora-editor" class="modal" hidden style="position:relative;width:100%;max-width:none;padding:14px;margin:14px 0;background:var(--card,var(--bg));border:1px solid var(--border)">
  <h2>Edit Dora drill</h2>
  <label>Drill name <input id="dora-editor-name" maxlength="40" style="width:100%;padding:8px"></label>
  <label><input id="dora-editor-shuffle" type="checkbox"> Shuffle ball order each run</label>
  <p style="font-size:12px">Variants are selected randomly per shot. Scatter is applied to direction.</p>
  <div id="dora-steps"></div>
  <div style="display:flex;gap:8px;margin:12px 0">
   <button id="dora-save" class="btn-modal btn-save" type="button">Save</button>
   <button id="dora-cancel" class="btn-modal" type="button">Cancel</button>
   <button id="dora-delete" class="btn-modal" type="button">Delete</button>
  </div>
 </section>
 <p style="font-size:12px">Dora stops automatically when the selected Time or Reps limit is reached. To stop early, use Disconnect or the robot's physical stop control. Pause/resume is not yet supported.</p>`;
 panel.style.display = 'block';
 document.getElementById('training-settings-card').after(panel);
 $('dora-tabs').onclick=e=>{const cat=e.target.closest('[data-cat]');if(cat){category=cat.dataset.cat;closeEditor();renderCards();}};
 $('dora-tabs').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const cat=e.target.closest('[data-cat]');if(cat){e.preventDefault();cat.click();}}};
 $('dora-levels').onclick=e=>{const b=e.target.closest('[data-level]');if(b){level=Number(b.dataset.level);closeEditor();renderCards();}};
 $('dora-cards').onclick=e=>{
  const run=e.target.closest('[data-run]'),edit=e.target.closest('[data-edit]');
  if(edit){e.stopPropagation();if(suppressRunClick){suppressRunClick=false;return;}openEditor(edit.dataset.edit);return;}
  if(run){if(suppressRunClick){suppressRunClick=false;return;}void startDrill(run.dataset.run);}
  if(e.target.closest('#dora-add-drill')){
   const name=prompt('Name of new Dora drill');if(!name?.trim())return;
   const d=newDrill(name.trim().slice(0,40),category);drills.push(d);persist();openEditor(d.id);
  }
 };
 // The grip supports mouse, pen and touch pointer dragging.
 // Store order in the existing Dora drill array, preserving all fields.
 const list=$('dora-cards');
 const finishGripDrag=event=>{
  if(!gripDrag||event.pointerId!==gripDrag.pointerId)return;
  const {grip,row,moved}=gripDrag;
  if(grip.hasPointerCapture?.(event.pointerId))grip.releasePointerCapture(event.pointerId);
  row.classList.remove('dragging');
  gripDrag=null;
  if(moved){
   suppressRunClick=true;
   const ids=[...list.querySelectorAll('.btn-drill[data-run]')].map(el=>el.dataset.run);
   const reordered=ids.map(id=>drills.find(d=>d.id===id));
   const positions=drills.map((d,i)=>d.category===category?i:-1).filter(i=>i!==-1);
   if(reordered.length!==positions.length||reordered.some(d=>!d))return;
   positions.forEach((position,i)=>{drills[position]=reordered[i];});
   saveDrills(drills);
   // Allow a subsequent normal click immediately after the pointer gesture.
   setTimeout(()=>{suppressRunClick=false;},0);
  }
 };
 list.addEventListener('pointerdown',event=>{
  const grip=event.target.closest('.drill-grab-handle');
  if(!grip||event.button!==0)return;
  const row=grip.closest('.btn-drill[data-run]');
  if(!row)return;
  clearTimeout(holdTimer);holdStart=null;
  gripDrag={grip,row,pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  grip.setPointerCapture(event.pointerId);
 });
 list.addEventListener('pointermove',event=>{
  if(!gripDrag||gripDrag.pointerId!==event.pointerId)return;
  const d=gripDrag;
  if(!d.moved && Math.hypot(event.clientX-d.x,event.clientY-d.y)<7)return;
  if(!d.moved){d.moved=true;d.row.classList.add('dragging');}
  const rows=[...list.querySelectorAll('.btn-drill[data-run]')].filter(row=>row!==d.row);
  // Compare the pointer to the center of each row. This works for touch too.
  const destination=rows.find(row=>event.clientY<row.getBoundingClientRect().top+row.offsetHeight/2);
  if(destination)list.insertBefore(d.row,destination);
  else{
   const last=rows.at(-1);
   if(last)list.insertBefore(d.row,last.nextSibling);
  }
 });
 list.addEventListener('pointerup',finishGripDrag);
 list.addEventListener('pointercancel',finishGripDrag);
 // Match Nova: a sustained press edits, a quick tap runs.
 $('dora-cards').addEventListener('pointerdown',e=>{
  if(e.target.closest('.drill-grab-handle'))return;
  const row=e.target.closest('[data-run]');if(!row)return;
  holdStart={id:row.dataset.run,x:e.clientX,y:e.clientY};
  clearTimeout(holdTimer);
  holdTimer=setTimeout(()=>{if(!holdStart)return;suppressRunClick=true;openEditor(holdStart.id);holdStart=null;},600);
 });
 $('dora-cards').addEventListener('pointermove',e=>{
  if(holdStart&&(Math.abs(e.clientX-holdStart.x)>10||Math.abs(e.clientY-holdStart.y)>10)){
   clearTimeout(holdTimer);holdStart=null;
  }
 });
 for(const name of ['pointerup','pointercancel','pointerleave']){
  $('dora-cards').addEventListener(name,()=>{clearTimeout(holdTimer);holdStart=null;});
 }
 $('dora-cards').addEventListener('keydown',e=>{
  const grip=e.target.closest('.drill-grab-handle');
  if(grip&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openEditor(grip.dataset.edit);}
 });
 $('dora-editor').onchange=modifyEditor;
 $('dora-steps').onclick=e=>{
  const btn=e.target.closest('[data-action]');if(!btn)return;
  const i=Number(btn.dataset.step),j=Number(btn.dataset.opt),steps=draft.levels[level-1];
  switch(btn.dataset.action){
   case 'up': if(i>0)[steps[i-1],steps[i]]=[steps[i],steps[i-1]];break;
   case 'down':if(i<steps.length-1)[steps[i+1],steps[i]]=[steps[i],steps[i+1]];break;
   case 'duplicate':if(steps.length<28)steps.splice(i+1,0,clone(steps[i]));break;
   case 'add-step':if(steps.length<28)steps.push(clone(steps[steps.length-1]||[DEFAULT_BALL]));break;
   case 'remove':if(steps.length>1)steps.splice(i,1);break;
   case 'variant':if(steps[i].length<12)steps[i].push(clone(steps[i][0]));break;
   case 'remove-option':if(steps[i].length>1)steps[i].splice(j,1);break;
  }editor();
 };
 $('dora-save').onclick=()=>{try{commitEditor();status('Drill saved');}catch(err){alert(err.message);}};
 $('dora-cancel').onclick=closeEditor;
 $('dora-delete').onclick=()=>{
  if(!editing||!confirm('Delete this Dora drill?'))return;
  drills=drills.filter(d=>d.id!==editing);persist();closeEditor();
 };
 $('dora-export').onclick=()=>{download(exportDrills(drills),'openpong-dora-drills.json');document.getElementById('theme-menu').classList.remove('open');};
 $('dora-import').onclick=()=>{document.getElementById('theme-menu').classList.remove('open');$('dora-import-file').click();};
 $('dora-import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{drills=importDrills(await file.text());persist();closeEditor();status('Imported Dora drills');}
  catch(err){alert('Import failed: '+err.message);}
  e.target.value='';
 };
 onRobotEvent(event=>{
  if(event.type==='ballLaunched'){
   launches++;
   if(running){appStats.balls+=1;saveStats();}
   if(running&&activeMode==='reps'&&launches>=activeTarget)void stop();
  }
  if(event.type==='ready')status('Connected — select a drill');
  if(event.type==='disconnected'){token++;clearTimeout(stopTimer);stopTimer=null;running=false;status('Disconnected — verify robot has stopped');}
 });
 renderCards();refresh();
}
