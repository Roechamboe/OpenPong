import {createPlacementMap} from './placement-map.js?v=1';
import {loadCalibration,saveCalibration,DEFAULT_PROFILE} from './calibration-engine.js?v=1';
const byId=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initCalibrationEditor(){
 const page=byId('calibration-page'),rows=byId('calibration-rows'),status=byId('calibration-status');
 let points=loadCalibration().points.map(p=>({...p}));
 let selected=0,unsaved=false;
 const map=createPlacementMap(byId('calibration-map'),{editable:true,onSelect:({x,y})=>{
  const i=points.findIndex(p=>p.x===x&&p.y===y);
  if(i>=0){selected=i;draw();return;}
  if(points.length>=100){status.textContent='Maximum 100 targets.';return;}
  const near=points.reduce((a,b)=>(a.x-x)**2+(a.y-y)**2<=(b.x-x)**2+(b.y-y)**2?a:b);
  points.push({x,y,direction:near.direction,speed:near.speed,arc:near.arc});
  selected=points.length-1;unsaved=true;draw();status.textContent='New target ('+x+','+y+') uses placeholder settings. Replace with measurements, then Save calibration.';
 }});
 function draw(){
  const p=points[selected]||points[0];
  map.render({points,selected:p});
  byId('calibration-count').textContent=points.length+' calibration points'+(unsaved?' · Unsaved changes':'');
  byId('calibration-selected').textContent='Point '+(selected+1)+' · ('+p.x+','+p.y+')';
  const f=byId('calibration-fields');
  f.innerHTML=[['x',0,12],['y',0,11],['direction',0,90],['speed',20,100],['arc',-65,65]].map(([key,min,max])=>
   '<label>'+key.toUpperCase()+'<input type="number" step="1" min="'+min+'" max="'+max+'" data-key="'+key+'" value="'+p[key]+'"></label>').join('');
  byId('calibration-delete').disabled=points.length<=3;
 }
 byId('calibration-fields').addEventListener('change',e=>{
  const input=e.target.closest('[data-key]');if(!input)return;
  const key=input.dataset.key,value=Number(input.value);
  const limits={x:[0,12],y:[0,11],direction:[0,90],speed:[20,100],arc:[-65,65]};
  if(!input.value.trim()||!Number.isInteger(value)||value<limits[key][0]||value>limits[key][1]){
   status.textContent='Invalid '+key+' value';draw();return;
  }
  if((key==='x'||key==='y')&&points.some((p,i)=>i!==selected&&p[key]===value&&p[key==='x'?'y':'x']===points[selected][key==='x'?'y':'x'])){
   status.textContent='A target already exists at those coordinates.';draw();return;
  }
  points[selected][key]=value;unsaved=true;draw();status.textContent='Unsaved calibration changes.';
 });
 byId('calibration-delete').onclick=()=>{
  if(points.length<=3)return;
  points.splice(selected,1);selected=Math.min(selected,points.length-1);unsaved=true;draw();
  status.textContent='Point removed locally. Save calibration to apply.';
 };
 byId('calibration-add').onclick=()=>{
  if(points.length>=100){status.textContent='Maximum 100 points.';return;}
  const taken=new Set(points.map(p=>p.x+':'+p.y));
  const next=[[3,5],[9,5],[6,3],[6,7],...Array.from({length:156},(_,i)=>[i%13,Math.floor(i/13)])].find(([x,y])=>!taken.has(x+':'+y));
  if(!next)return;
  points.push({x:next[0],y:next[1],direction:42,speed:38,arc:15});selected=points.length-1;unsaved=true;draw();
  status.textContent='New target added with placeholder parameters. Physically calibrate before saving.';
 };
 byId('calibration-save').onclick=()=>{
  try{saveCalibration({version:1,robot:{...DEFAULT_PROFILE.robot},points:points.map(p=>({...p}))});unsaved=false;status.textContent='Calibration saved. Estimator updated.';draw();}
  catch(e){status.textContent=e.message;}
 };
 byId('calibration-reset').onclick=()=>{
  if(!confirm('Reset calibration measurements to original five points?'))return;
  points=DEFAULT_PROFILE.points.map(p=>({...p}));selected=0;unsaved=true;draw();status.textContent='Original measurements loaded. Press Save to apply.';
 };
 window.openCalibrationEngine=()=>{byId('theme-menu').classList.remove('open');points=loadCalibration().points.map(p=>({...p}));selected=0;unsaved=false;draw();page.hidden=false;document.body.style.overflow='hidden';byId('calibration-close').focus();};
 window.closeCalibrationEngine=()=>{page.hidden=true;document.body.style.overflow='';document.querySelector('.menu-btn')?.focus();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!page.hidden)window.closeCalibrationEngine();});
 draw();
}
