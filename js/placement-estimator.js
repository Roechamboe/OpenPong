import {createPlacementMap} from './placement-map.js?v=1';
import {estimatePlacement,loadCalibration} from './calibration-engine.js?v=1';
const el=id=>document.getElementById(id),round=n=>Math.round(n*10)/10;
export function initPlacementEstimator(){
 const page=el('placement-estimator-page'),x=el('placement-x'),y=el('placement-y'),status=el('placement-status'),copy=el('placement-copy');
 const map=createPlacementMap(el('placement-map-container'));
 function render(){
  const X=Number(x.value),Y=Number(y.value),p=estimatePlacement(X,Y);
  el('placement-x-label').textContent=X;el('placement-y-label').textContent=Y;
  map.render({points:loadCalibration().points,selected:{x:X,y:Y}});
  el('placement-output').hidden=!p.valid;copy.disabled=!p.valid;
  if(!p.valid){status.textContent=p.reason;return;}
  el('placement-direction').textContent=round(p.direction);
  el('placement-speed').textContent=round(p.speed);
  el('placement-arc').textContent=p.arc;
  status.textContent=(p.exact?'Measured calibration point. ':'Triangulated prediction. ')+'Arc from nearest point ('+p.reference.x+','+p.reference.y+'). Robot assumed at center of opposite end line; verify physically.';
 }
 x.addEventListener('input',render);y.addEventListener('input',render);
 copy.addEventListener('click',async()=>{
  const p=estimatePlacement(+x.value,+y.value);if(!p.valid)return;
  const value=[Math.round(p.direction),Math.round(p.speed),0,p.arc,35,180].join(':');
  try{await navigator.clipboard.writeText(value);status.textContent='Settings copied. Verify on the table.';}
  catch{status.textContent='Clipboard unavailable; use the displayed values.';}
 });
 window.openPlacementEstimator=()=>{el('theme-menu').classList.remove('open');page.hidden=false;document.body.style.overflow='hidden';render();el('placement-close').focus();};
 window.closePlacementEstimator=()=>{page.hidden=true;document.body.style.overflow='';document.querySelector('.menu-btn')?.focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!page.hidden)window.closePlacementEstimator();});
 document.addEventListener('placement-calibration-updated',render);
 render();
}
