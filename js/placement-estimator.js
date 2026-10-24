export const CALIBRATION=[
{x:1,y:1,direction:80,speed:48,arc:15},
{x:11,y:1,direction:0,speed:50,arc:15},
{x:3,y:9,direction:81,speed:29,arc:20},
{x:9,y:9,direction:0,speed:28,arc:40},
{x:6,y:5,direction:42,speed:38,arc:15}
];
export function estimatePlacement(x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>12||y<0||y>11)return {valid:false,reason:'Coordinates must lie within X 0–12 and Y 0–11.'};
 const t=(y-1)/8,left=1+2*t,right=11-2*t;
 if(y<1||y>9||x<left||x>right)return {valid:false,reason:'Outside the measured interpolation region. More measurements required.'};
 const direction=(80+t)*(right-x)/(right-left);
 const speed=51.5625-2.5625*y;
 const nearest=CALIBRATION.reduce((a,b)=>(a.x-x)**2+(a.y-y)**2<=(b.x-x)**2+(b.y-y)**2?a:b);
 return {valid:true,direction,speed,arc:nearest.arc,reference:nearest};
}
const el=id=>document.getElementById(id),round=n=>Math.round(n*10)/10;
export function initPlacementEstimator(){
 const page=el('placement-estimator-page'),x=el('placement-x'),y=el('placement-y'),status=el('placement-status'),copy=el('placement-copy');
 function render(){
  const X=Number(x.value),Y=Number(y.value),p=estimatePlacement(X,Y);
  el('placement-x-label').textContent=X;el('placement-y-label').textContent=Y;
  el('placement-marker').setAttribute('cx',24+X*24);
  el('placement-marker').setAttribute('cy',286-Y*24);
  el('placement-output').hidden=!p.valid;copy.disabled=!p.valid;
  if(!p.valid){status.textContent=p.reason;return;}
  el('placement-direction').textContent=round(p.direction);
  el('placement-speed').textContent=round(p.speed);
  el('placement-arc').textContent=p.arc;
  status.textContent='Experimental: Arc is from nearest measured target ('+p.reference.x+','+p.reference.y+'). Physically verify before using.';
 }
 x.addEventListener('input',render);y.addEventListener('input',render);
 copy.addEventListener('click',async()=>{
  const p=estimatePlacement(+x.value,+y.value);if(!p.valid)return;
  const value='X='+x.value+', Y='+y.value+', Direction='+round(p.direction)+', Speed='+round(p.speed)+', Arc='+p.arc+', Spin=No Spin, Difficulty=1';
  try{await navigator.clipboard.writeText(value);status.textContent='Settings copied. Verify on the table.';}
  catch{status.textContent='Clipboard unavailable; use the displayed values.';}
 });
 window.openPlacementEstimator=()=>{el('theme-menu').classList.remove('open');page.hidden=false;document.body.style.overflow='hidden';render();el('placement-close').focus();};
 window.closePlacementEstimator=()=>{page.hidden=true;document.body.style.overflow='';document.querySelector('.menu-btn')?.focus();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!page.hidden)window.closePlacementEstimator();});
 render();
}
