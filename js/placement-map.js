// Shared receiver-view half-table map for calibration and placement.
const NS='http://www.w3.org/2000/svg', left=24, top=22, step=24;
export const gridToPixel=(x,y)=>({x:left+x*step,y:286-y*step});
export function convexHull(points){
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
 const lo=[],hi=[];
 for(const p of sorted){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(const p of sorted.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
 return lo.slice(0,-1).concat(hi.slice(0,-1));
}
function node(tag,attributes={},text){
 const e=document.createElementNS(NS,tag);
 Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,String(v)));
 if(text!==undefined)e.textContent=String(text);
 return e;
}
export function createPlacementMap(container,{editable=false,onSelect=()=>{}}={}){
 const svg=node('svg',{viewBox:'0 0 336 314',class:'placement-map',role:'img','aria-label':editable?'Interactive receiver table calibration grid':'Receiver table ball placement grid'});
 container.replaceChildren(svg);
 const base=node('g');
 base.append(node('rect',{x:24,y:22,width:288,height:264,fill:'#136d8c',stroke:'#d4eef6','stroke-width':2}));
 for(let x=0;x<=12;x++)base.append(node('line',{x1:24+x*24,y1:22,x2:24+x*24,y2:286,stroke:'#e0f2f7','stroke-opacity':'.22'}));
 for(let y=0;y<=11;y++)base.append(node('line',{x1:24,y1:286-y*24,x2:312,y2:286-y*24,stroke:'#e0f2f7','stroke-opacity':'.22'}));
 base.append(node('text',{x:24,y:304,fill:'currentColor','font-size':11},'X=0'));
 base.append(node('text',{x:281,y:304,fill:'currentColor','font-size':11},'X=12'));
 base.append(node('text',{x:24,y:15,fill:'currentColor','font-size':11},'Y=11'));
 base.append(node('text',{x:7,y:282,fill:'currentColor','font-size':11},'0'));
 svg.append(base);
 const overlay=node('g');svg.append(overlay);
 if(editable){
  svg.tabIndex=0;
  svg.style.cursor='crosshair';
  const pick=e=>{
   const box=svg.getBoundingClientRect();
   // viewBox uses meet, so account for letterboxing if the svg aspect differs.
   const scale=Math.min(box.width/336,box.height/314);
   const offsetX=(box.width-336*scale)/2,offsetY=(box.height-314*scale)/2;
   const vx=(e.clientX-box.left-offsetX)/scale,vy=(e.clientY-box.top-offsetY)/scale;
   if(vx<12||vx>324||vy<10||vy>298)return;
   const x=Math.max(0,Math.min(12,Math.round((vx-24)/24)));
   const y=Math.max(0,Math.min(11,Math.round((286-vy)/24)));
   onSelect({x,y});
  };
  svg.addEventListener('click',pick);
 }
 function render({points=[],selected=null,draft=null}={}){
  overlay.replaceChildren();
  const hull=convexHull(points);
  if(hull.length>=3)overlay.append(node('polygon',{points:hull.map(p=>{const q=gridToPixel(p.x,p.y);return q.x+','+q.y;}).join(' '),fill:'#f8d16d','fill-opacity':'.10',stroke:'#f8d16d','stroke-dasharray':'5 4','stroke-width':1.5}));
  for(const [i,p] of points.entries()){
   const q=gridToPixel(p.x,p.y),active=selected&&selected.x===p.x&&selected.y===p.y;
   overlay.append(node('circle',{cx:q.x,cy:q.y,r:active?11:8,fill:active?'#ef6655':'#f8d16d',stroke:'white','stroke-width':1.5}));
   overlay.append(node('text',{x:q.x,y:q.y+3.5,'text-anchor':'middle','font-size':10,'font-weight':'bold',fill:'#303039','pointer-events':'none'},i+1));
  }
  if(draft&&!points.some(p=>p.x===draft.x&&p.y===draft.y)){
   const q=gridToPixel(draft.x,draft.y);
   overlay.append(node('circle',{cx:q.x,cy:q.y,r:10,fill:'#ef6655','fill-opacity':'.45',stroke:'white','stroke-dasharray':'3 3','stroke-width':2}));
  }
  if(!editable&&selected){const q=gridToPixel(selected.x,selected.y);overlay.append(node('circle',{cx:q.x,cy:q.y,r:5,fill:'#ef6655',stroke:'white','stroke-width':1.5}));}
 }
 return {render,svg};
}
