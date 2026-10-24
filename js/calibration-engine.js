// Empirical, no-spin, level-one calibration profile. Receiver view: X grows left to right,
// Y grows from receiver end line to net. Robot is centered at the opposite end line.
export const DEFAULT_PROFILE={
 version:1,robot:{x:6,y:22,description:'Center line at opponent end line'},
 points:[
 {x:1,y:1,direction:80,speed:48,arc:15},
 {x:11,y:1,direction:0,speed:50,arc:15},
 {x:3,y:9,direction:81,speed:29,arc:20},
 {x:9,y:9,direction:0,speed:28,arc:40},
 {x:6,y:5,direction:42,speed:38,arc:15}
 ]};
const KEY='openpong_placement_calibration_v1';
const copy=o=>JSON.parse(JSON.stringify(o));
export function validateProfile(p){
 return !!p&&p.version===1&&p.robot?.x===6&&p.robot?.y===22&&Array.isArray(p.points)&&p.points.length>=3&&p.points.length<=100&&
 p.points.every(v=>[['x',0,12],['y',0,11],['direction',0,90],['speed',20,100],['arc',-65,65]].every(([k,a,b])=>Number.isInteger(v[k])&&v[k]>=a&&v[k]<=b))&&
 new Set(p.points.map(v=>v.x+':'+v.y)).size===p.points.length;
}
export function loadCalibration(){
 try{const p=JSON.parse(localStorage.getItem(KEY));if(validateProfile(p))return p;}catch{}
 return copy(DEFAULT_PROFILE);
}
export function saveCalibration(p){
 if(!validateProfile(p))throw new Error('Use at least 3 unique integer grid points and valid Dora parameters (max 100 points).');
 localStorage.setItem(KEY,JSON.stringify(p));
 document.dispatchEvent(new Event('placement-calibration-updated'));
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function hull(points){
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y);
 const lower=[],upper=[];
 for(const p of sorted){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...sorted].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
function barycentric(a,b,c,x,y){
 const det=cross(a,b,c);if(Math.abs(det)<1e-9)return null;
 const p={x,y},wA=cross(b,c,p)/det,wB=cross(c,a,p)/det,wC=cross(a,b,p)/det;
 return [wA,wB,wC];
}
export function estimatePlacement(x,y,profile=loadCalibration()){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>12||y<0||y>11)return {valid:false,reason:'Target outside table grid.'};
 if(!validateProfile(profile))return {valid:false,reason:'Invalid calibration profile.'};
 const ps=profile.points;
 const exact=ps.find(p=>p.x===x&&p.y===y);
 if(exact)return {valid:true,direction:exact.direction,speed:exact.speed,arc:exact.arc,reference:exact,exact:true};
 const boundary=hull(ps);
 if(boundary.length<3)return {valid:false,reason:'Need three non-collinear calibration targets.'};
 // Require target inside measured convex hull: never extrapolate.
 const sign=cross(boundary[0],boundary[1],boundary[2]);
 if(boundary.some((a,i)=>cross(a,boundary[(i+1)%boundary.length],{x,y})*sign< -1e-8))
  return {valid:false,reason:'Outside calibrated convex hull.'};
 // Empty circumcircle triangle search (Delaunay). Favor compact triangles.
 let best=null;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)for(let k=j+1;k<ps.length;k++){
  const a=ps[i],b=ps[j],c=ps[k],weights=barycentric(a,b,c,x,y);
  if(!weights||weights.some(w=>w < -1e-8))continue;
  const ax=b.x-a.x,ay=b.y-a.y,bx=c.x-a.x,by=c.y-a.y,det=2*(ax*by-ay*bx);
  if(Math.abs(det)<1e-9)continue;
  const u=(ax*ax+ay*ay),v=(bx*bx+by*by);
  const cx=a.x+(u*by-v*ay)/det,cy=a.y+(v*ax-u*bx)/det,r2=(a.x-cx)**2+(a.y-cy)**2;
  if(ps.some((p,m)=>m!==i&&m!==j&&m!==k&&(p.x-cx)**2+(p.y-cy)**2<r2-1e-7))continue;
  if(!best||r2<best.r2)best={a,b,c,weights,r2};
 }
 if(!best)return {valid:false,reason:'Unable to triangulate this position.'};
 const {a,b,c,weights}=best;
 const blend=key=>weights[0]*a[key]+weights[1]*b[key]+weights[2]*c[key];
 // Arc values are mechanically coupled to trajectory. Keep nearest measured arc.
 const nearest=ps.reduce((p,q)=>(p.x-x)**2+(p.y-y)**2<=(q.x-x)**2+(q.y-y)**2?p:q);
 return {valid:true,direction:blend('direction'),speed:blend('speed'),arc:nearest.arc,reference:nearest,exact:false};
}
