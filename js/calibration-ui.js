import {loadCalibration,saveCalibration,DEFAULT_PROFILE} from './calibration-engine.js?v=1';
const byId=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initCalibrationEditor(){
 const page=byId('calibration-page'),rows=byId('calibration-rows'),status=byId('calibration-status');
 let points=loadCalibration().points.map(p=>({...p}));
 function draw(){
  rows.innerHTML=points.map((p,i)=>'<div class="calibration-row" data-row="'+i+'">'+
  [['x',0,12],['y',0,11],['direction',0,90],['speed',20,100],['arc',-65,65]].map(([key,min,max])=>
  '<label>'+esc(key.toUpperCase())+'<input type="number" step="1" min="'+min+'" max="'+max+'" data-key="'+key+'" value="'+p[key]+'"></label>').join('')+
  '<button type="button" data-remove="'+i+'" aria-label="Remove calibration point '+(i+1)+'">×</button></div>').join('');
  byId('calibration-count').textContent=points.length+' calibration points';
 }
 rows.addEventListener('input',e=>{
  const input=e.target.closest('input[data-key]');if(!input)return;
  const index=Number(input.closest('[data-row]').dataset.row);
  points[index][input.dataset.key]=Number(input.value);
 });
 rows.addEventListener('click',e=>{
  const btn=e.target.closest('[data-remove]');if(!btn)return;
  if(points.length<=3){status.textContent='At least 3 points are needed.';return;}
  points.splice(Number(btn.dataset.remove),1);draw();
 });
 byId('calibration-add').onclick=()=>{
  if(points.length>=100){status.textContent='Maximum 100 points.';return;}
  const taken=new Set(points.map(p=>p.x+':'+p.y));
  const next=[[3,5],[9,5],[6,3],[6,7],...Array.from({length:156},(_,i)=>[i%13,Math.floor(i/13)])].find(([x,y])=>!taken.has(x+':'+y));
  if(!next)return;
  points.push({x:next[0],y:next[1],direction:42,speed:38,arc:15});draw();
  status.textContent='New target added with placeholder parameters. Physically calibrate before saving.';
 };
 byId('calibration-save').onclick=()=>{
  try{saveCalibration({version:1,robot:{...DEFAULT_PROFILE.robot},points:points.map(p=>({...p}))});status.textContent='Calibration saved. Estimator updated.';draw();}
  catch(e){status.textContent=e.message;}
 };
 byId('calibration-reset').onclick=()=>{
  if(!confirm('Reset calibration measurements to original five points?'))return;
  points=DEFAULT_PROFILE.points.map(p=>({...p}));draw();status.textContent='Original measurements loaded. Press Save to apply.';
 };
 window.openCalibrationEngine=()=>{byId('theme-menu').classList.remove('open');points=loadCalibration().points.map(p=>({...p}));draw();page.hidden=false;document.body.style.overflow='hidden';byId('calibration-close').focus();};
 window.closeCalibrationEngine=()=>{page.hidden=true;document.body.style.overflow='';document.querySelector('.menu-btn')?.focus();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!page.hidden)window.closeCalibrationEngine();});
 draw();
}
