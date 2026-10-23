// Dora drill UI mirrors the Nova workflow while using Dora-native values.
// All data lives in the independent openpong_dora_drills_v1 store.
import { getActiveRobotId, selectRobot, onRobotEvent } from './core/robot-manager.js';
import { appStats } from './state.js';
import { updateStatsUI } from './ui.js';
import * as robot from './robots/dora/adapter.js';
import { runMode } from './state.js';
import { CATEGORIES, DEFAULT_BALL, loadDrills, saveDrills, compileDrill,
  exportDrills, importDrills, newDrill } from './robots/dora/drills.js';

let drills=loadDrills(), category='basic', level=1, editing=null, draft=null;
let stopTimer=null, running=false, busy=false, token=0, launches=0;
let activeMode='time', activeTarget=0;
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function saveStats(){localStorage.setItem('nova_stats',JSON.stringify(appStats));updateStatsUI();}
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(s){$('dora-status').textContent=s;}
function setting(id,label,min,max,step=1){
 return `<label class="editor-field" style="min-width:0;display:flex;flex-direction:column;gap:4px"><span>${label}</span><input type="number" data-field="${id}" min="${min}" max="${max}" step="${step}" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"></label>`;
}
const fields=[['direction','Direction',0,90],['speed','Speed',20,100],['spin','Spin',0,60],['arc','Arc',-65,65],['frequencyLevel','Frequency',20,170],['angle','Spin angle',0,359]];
function persist(){saveDrills(drills);renderCards();}
function refresh(){
 const dora=getActiveRobotId()==='dora';
 $('dora-panel').hidden=!dora;
 // Remove controls injected by older Dora builds if any remain.
 for (const id of ['dora-mode','dora-duration','dora-reps']) {
  const legacy=document.getElementById(id);
  if (legacy) legacy.closest('label')?.remove();
 }
 document.querySelectorAll('.container > .section-label, .container > .tabs-container, .container > .drill-list').forEach(el=>el.style.display=dora?'none':'');
 $('grp-difficulty').style.display=dora?'none':'';
 // The shared Nova-style Reps/Time switch controls Dora too.
 $('ui-reps').parentElement.style.display='';
 $('input-pause').closest('.control-pill').style.display=dora?'none':'';
 $('ui-reps').querySelector('label').textContent=dora?'Balls':'Count';
 $('robot-select').value=getActiveRobotId();
 document.querySelector('header h1').textContent=dora?'OpenPong — Dora':'Nova Drill Control';
}
function renderCards(){
 const categoryLabel=c=>c.startsWith('custom-')?'Custom '+c.slice(-1).toUpperCase():c[0].toUpperCase()+c.slice(1);
 const iconGrid='<div class="icon-grid"><div class="icon-dot"></div><div class="icon-dot"></div><div class="icon-dot"></div><div class="icon-dot"></div></div>';
 $('dora-tabs').innerHTML=CATEGORIES.map(c=>`<div role="tab" tabindex="0" aria-selected="${category===c}" class="tab-btn ${category===c?'active':''}" data-cat="${c}">${iconGrid} ${categoryLabel(c)}</div>`).join('');
 $('dora-levels').innerHTML=[1,2,3].map(i=>`<button class="lvl-dot ${level===i?'active':''}" data-level="${i}" type="button">${i}</button>`).join('');
 $('dora-cards').innerHTML=drills.filter(d=>d.category===category).map(d=>`
 <div style="display:flex;align-items:stretch;gap:8px;margin:7px 0">
  <button class="btn-drill" type="button" data-run="${escapeHtml(d.id)}" style="flex:1;min-width:0">
   <div class="drill-icon"><div class="d-dot"></div><div class="d-dot"></div><div class="d-dot"></div><div class="d-dot"></div></div>
   <span>${escapeHtml(d.name)}</span>${d.shuffle?'<div class="mark-random">R</div>':''}
  </button>
  <button class="btn-swap" type="button" data-edit="${escapeHtml(d.id)}" title="Edit drill" aria-label="Edit ${escapeHtml(d.name)}">✎</button>
 </div>`).join('')+
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
    <button type="button" data-action="duplicate" data-step="${i}">⧉</button>
    <button type="button" data-action="remove" data-step="${i}">×</button>
   </div>
  </div>
  <label><input type="checkbox" data-step="${i}" data-enabled ${options[0].inactive?'':'checked'}> Enabled</label>
  <div style="margin:6px 0"><label>Direction scatter (± degrees) <input data-step="${i}" data-scatter type="number" min="0" max="30" value="${options[0].scatter||0}" style="width:70px"></label></div>
  ${options.map((b,j)=>`<div class="option-card" style="padding:10px;margin:8px 0;border:1px solid var(--border);border-radius:8px">
   <div style="display:flex;justify-content:space-between"><b>Variant ${j+1}</b>
   ${options.length>1?`<button data-action="remove-option" data-step="${i}" data-opt="${j}" type="button">Remove</button>`:''}</div>
   <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px">
   ${fields.map(([key,label,min,max])=>`<label class="editor-field" style="display:flex;flex-direction:column"><span>${label}</span><input data-step="${i}" data-opt="${j}" data-param="${key}" type="number" step="1" min="${min}" max="${max}" value="${b[key]}" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"></label>`).join('')}
   </div>
  </div>`).join('')}
  <button type="button" class="btn-swap" data-action="variant" data-step="${i}">+ Variant</button>
 </div>`).join('');
 $('dora-add-step').disabled=steps.length>=28;
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
 $('dora-stop').disabled=true;
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
 $('dora-stop').disabled=false;
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
 } finally{busy=false; if(!running)$('dora-stop').disabled=true;}
}
function download(text,name){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function initDoraPanel(){
 const selector=document.createElement('label');
 selector.style.cssText='display:block;padding:10px 0;font-size:13px;font-weight:700';
 if (!document.getElementById('dora-hidden-style')) {
  const style=document.createElement('style');style.id='dora-hidden-style';
  style.textContent='#dora-panel[hidden], #dora-editor[hidden] { display:none !important; }';
  document.head.appendChild(style);
 }
 selector.innerHTML='ROBOT <select id="robot-select" style="margin-left:10px;padding:8px;border-radius:8px"><option value="nova">Pongbot Nova</option><option value="dora">Pusun Dora</option></select>';
 document.querySelector('.settings-card').prepend(selector);
 const panel=document.createElement('section');panel.id='dora-panel';panel.hidden=true;
 panel.innerHTML=`
 <div class="settings-card" style="margin:14px 0">
  <h2 style="margin:0 0 10px">Dora Drill Control</h2>
  <small style="color:var(--text-light)">Build: dora-controls-v2 · uses Reps / Time above</small>
  <div style="display:flex;gap:10px;margin-top:12px">
   <button id="dora-stop" class="btn-connect" type="button" style="background:#be3636;color:white" disabled>STOP</button>

  </div>
  <p id="dora-status" role="status" aria-live="polite">Connect to Dora to start</p>
 </div>
 <div class="section-label">Difficulty Level</div>
 <div id="dora-levels" class="level-select" style="display:flex;gap:12px;justify-content:center;margin:12px"></div>
 <div class="section-label">Drill Selection</div>
 <div id="dora-tabs" class="tabs-container"></div>
 <div id="dora-cards" class="drill-list"></div>
 <div style="display:flex;gap:9px;margin:16px 0">
  <button id="dora-export" class="btn-modal" type="button">Export</button>
  <button id="dora-import" class="btn-modal" type="button">Import</button>
  <input id="dora-import-file" type="file" accept=".json" hidden>
 </div>
 <section id="dora-editor" class="modal" hidden style="position:relative;width:100%;max-width:none;padding:14px;margin:14px 0;background:var(--card,var(--bg));border:1px solid var(--border)">
  <h2>Edit Dora drill</h2>
  <label>Drill name <input id="dora-editor-name" maxlength="40" style="width:100%;padding:8px"></label>
  <label><input id="dora-editor-shuffle" type="checkbox"> Shuffle ball order each run</label>
  <p style="font-size:12px">Variants are selected randomly per shot. Scatter is applied to direction.</p>
  <div id="dora-steps"></div>
  <button id="dora-add-step" class="btn-swap" type="button">+ Ball</button>
  <div style="display:flex;gap:8px;margin:12px 0">
   <button id="dora-save" class="btn-modal btn-save" type="button">Save</button>
   <button id="dora-cancel" class="btn-modal" type="button">Cancel</button>
   <button id="dora-delete" class="btn-modal" type="button">Delete</button>
  </div>
 </section>
 <p style="font-size:12px">Dora uses an autonomous ball cycle. In Balls mode the controller stops after the requested number of launch notifications. Pause/resume is not yet supported. Keep the robot's physical stop accessible.</p>`;
 panel.style.display = 'block';
 document.querySelector('.settings-card').after(panel);
 $('robot-select').onchange=e=>{try{selectRobot(e.target.value);refresh();}catch(err){alert(err.message);refresh();}};
 $('dora-tabs').onclick=e=>{const cat=e.target.closest('[data-cat]');if(cat){category=cat.dataset.cat;closeEditor();renderCards();}};
 $('dora-tabs').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const cat=e.target.closest('[data-cat]');if(cat){e.preventDefault();cat.click();}}};
 $('dora-levels').onclick=e=>{const b=e.target.closest('[data-level]');if(b){level=Number(b.dataset.level);closeEditor();renderCards();}};
 $('dora-cards').onclick=e=>{
  const run=e.target.closest('[data-run]'),edit=e.target.closest('[data-edit]');
  if(run)void startDrill(run.dataset.run);
  if(edit)openEditor(edit.dataset.edit);
  if(e.target.closest('#dora-add-drill')){
   const name=prompt('Name of new Dora drill');if(!name?.trim())return;
   const d=newDrill(name.trim().slice(0,40),category);drills.push(d);persist();openEditor(d.id);
  }
 };
 $('dora-stop').onclick=()=>void stop();
 $('dora-editor').onchange=modifyEditor;
 $('dora-steps').onclick=e=>{
  const btn=e.target.closest('[data-action]');if(!btn)return;
  const i=Number(btn.dataset.step),j=Number(btn.dataset.opt),steps=draft.levels[level-1];
  switch(btn.dataset.action){
   case 'up': if(i>0)[steps[i-1],steps[i]]=[steps[i],steps[i-1]];break;
   case 'down':if(i<steps.length-1)[steps[i+1],steps[i]]=[steps[i],steps[i+1]];break;
   case 'duplicate':if(steps.length<28)steps.splice(i+1,0,clone(steps[i]));break;
   case 'remove':if(steps.length>1)steps.splice(i,1);break;
   case 'variant':if(steps[i].length<12)steps[i].push(clone(steps[i][0]));break;
   case 'remove-option':if(steps[i].length>1)steps[i].splice(j,1);break;
  }editor();
 };
 $('dora-add-step').onclick=()=>{if(draft.levels[level-1].length<28){draft.levels[level-1].push([clone(DEFAULT_BALL)]);editor();}};
 $('dora-save').onclick=()=>{try{commitEditor();status('Drill saved');}catch(err){alert(err.message);}};
 $('dora-cancel').onclick=closeEditor;
 $('dora-delete').onclick=()=>{
  if(!editing||!confirm('Delete this Dora drill?'))return;
  drills=drills.filter(d=>d.id!==editing);persist();closeEditor();
 };
 $('dora-export').onclick=()=>download(exportDrills(drills),'openpong-dora-drills.json');
 $('dora-import').onclick=()=>$('dora-import-file').click();
 $('dora-import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{drills=importDrills(await file.text());persist();closeEditor();status('Imported Dora drills');}
  catch(err){alert('Import failed: '+err.message);}
  e.target.value='';
 };
 onRobotEvent(event=>{
  if(getActiveRobotId()!=='dora')return;
  if(event.type==='ballLaunched'){
   launches++;
   if(running){appStats.balls+=1;saveStats();}
   if(running&&activeMode==='reps'&&launches>=activeTarget)void stop();
  }
  if(event.type==='ready')status('Connected — select a drill');
  if(event.type==='disconnected'){token++;clearTimeout(stopTimer);stopTimer=null;running=false;$('dora-stop').disabled=true;status('Disconnected — verify robot has stopped');}
 });
 renderCards();refresh();
}
