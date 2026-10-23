// Dora-native drill model. Never mix these values with Nova wheel-RPM arrays.
const KEY = 'openpong_dora_drills_v1';
export const CATEGORIES = Object.freeze(['basic','combined','complex','custom-a','custom-b','custom-c']);
export const DEFAULT_BALL = Object.freeze({ direction:45, speed:20, spin:0, arc:0, frequencyLevel:20, angle:0 });
const clone = value => JSON.parse(JSON.stringify(value));
const ball = overrides => ({ ...DEFAULT_BALL, ...overrides });
function drill(name, steps, category='basic') {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), name, category, levels: [steps,clone(steps),clone(steps)], shuffle:false };
}
// Derived from Nova's js/constants.js names and ordered sequences.
// Dora speed/spin/arc values are approximate starting points, NOT RPM equivalents.
export const FACTORY_PRESET_VERSION=2;
const LAYOUT={
 basic:['push(b)','push(f)','drive(b)','drive(f)','loop(b)','loop(f)'],
 combined:['loop(b)-drive(b)','loop(f)-drive(f)','drive(f)-drive(b)','push(f)-drive(f)','push(b)-loop(b)','loop(f)-drive(b)','push(f)-loop(b)','drive(f)-drive(f)','push(b)-loop(f)','push(f)-loop(f)','loop(f)-loop(f)','loop(b)-drive(f)'],
 complex:['push(b)-loop(f)-drive(b)','push(f)-loop(b)-drive(f)','loop(f)-drive(f)-drive(b)','loop(b)-drive(f)-drive(b)','drive(f)-drive(f)-drive(f)','push(f)-loop(f)-drive(f)','push(b)-loop(b)-drive(b)','push(f)-loop(b)-drive(b)','loop(f)-drive(b)-drive(f)','loop(b)-drive(b)-drive(f)','push(b)-loop(f)-drive(f)','push(b)-loop(b)-drive(f)','drive(b)-drive(f)-drive(f)','random-drive','23-random-drive','all-random']
};
function shot(symbol,difficulty=1){
 const m=/^(push|drive|loop)\((b|f)\)$/.exec(symbol);
 if(!m)throw new Error('Unknown Nova preset token '+symbol);
 const [,type,side]=m,level=difficulty-1;
 return ball({
  direction:side==='b'?30:60,
  speed:{push:[25,30,35],drive:[40,45,50],loop:[38,43,48]}[type][level],
  spin:{push:[18,22,26],drive:[10,13,16],loop:[23,27,31]}[type][level],
  arc:{push:0,drive:3,loop:12}[type],
  frequencyLevel:{push:[35,45,55],drive:[65,75,85],loop:[35,45,55]}[type][level],
  angle:type==='push'?180:0
 });
}
function segments(name){
 if(name==='random-drive')return ['drive(f)','drive(b)'];
 if(name==='23-random-drive')return ['drive(f)','drive(b)','drive(f)'];
 if(name==='all-random')return ['push(f)','push(b)','drive(f)','drive(b)'];
 return name.split('-');
}
export function defaults(){
 return Object.entries(LAYOUT).flatMap(([category,names])=>names.map(name=>({
  id:name,name,category,
  levels:[1,2,3].map(level=>segments(name).map(segment=>[shot(segment,level)])),
  shuffle:name.includes('random'),factory:true
 })));
}

function validBall(b) {
  if (!b || typeof b !== 'object') return false;
  return [['direction',0,90],['speed',20,100],['spin',0,60],['arc',-65,65],
    ['frequencyLevel',20,170],['angle',0,359]].every(([k,min,max]) =>
      Number.isInteger(b[k]) && b[k]>=min && b[k]<=max);
}
export function validateDrill(d) {
  if (!d || typeof d.id !== 'string' || !d.id || typeof d.name !== 'string'
    || !CATEGORIES.includes(d.category) || !Array.isArray(d.levels)
    || d.levels.length !== 3) return false;
  return d.levels.every(steps => Array.isArray(steps) && steps.length <= 28
    && steps.every(step => Array.isArray(step) && step.length >= 1 && step.length <= 12
      && step.every(validBall)));
}
export function loadDrills() {
  const factory=defaults();
  try {
    const stored=JSON.parse(localStorage.getItem(KEY));
    if(Array.isArray(stored) && stored.every(validateDrill)) {
      const marker='openpong_dora_factory_version';
      if(Number(localStorage.getItem(marker))>=FACTORY_PRESET_VERSION)return stored;
      const ids=new Set(factory.map(d=>d.id));
      // Preserve the user's existing Dora custom drills, edits and ordering.
      const merged=[...factory.map(d=>stored.find(old=>old.id===d.id)||d),
        ...stored.filter(d=>!ids.has(d.id))];
      saveDrills(merged);
      localStorage.setItem(marker,String(FACTORY_PRESET_VERSION));
      return merged;
    }
  } catch(error){console.warn('Invalid Dora drill storage',error);}
  return factory;
}
export function saveDrills(drills) {
  if (!Array.isArray(drills) || !drills.every(validateDrill)) throw new Error('Invalid Dora drill configuration');
  localStorage.setItem(KEY, JSON.stringify(drills));
}
export function exportDrills(drills) {
  return JSON.stringify({format:'openpong-dora',version:1,drills},null,2);
}
export function importDrills(text) {
  const parsed=JSON.parse(text);
  if (parsed.format !== 'openpong-dora' || parsed.version !== 1
    || !Array.isArray(parsed.drills) || !parsed.drills.every(validateDrill))
    throw new Error('Not a valid OpenPong Dora drill export');
  const ids=new Set(parsed.drills.map(d=>d.id));
  if (ids.size!==parsed.drills.length) throw new Error('Duplicate drill IDs');
  return clone(parsed.drills);
}
// The firmware's sequence is finite; repeating steps means reuploading a new
// sequence after a stop. Shuffle and variants are chosen once per run.
export function compileDrill(drill, level, {shuffle=false}={}) {
  if (!validateDrill(drill)) throw new Error('Invalid Dora drill');
  if (!Number.isInteger(level) || level < 1 || level > 3) throw new RangeError('Level must be 1–3');
  const steps=drill.levels[level-1].filter(step=>step.length && !step[0].inactive);
  if (!steps.length) throw new Error('No active balls');
  const selected=steps.map(step=>clone(step[Math.floor(Math.random()*step.length)]));
  if (shuffle) {
    for(let i=selected.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
  }
  return selected.map(({inactive,scatter=0,...b})=>{
    if (scatter) {
      const offset=Math.round((Math.random()*2-1)*scatter);
      b.direction=Math.max(0,Math.min(90,b.direction+offset));
    }
    return b;
  });
}
export function newDrill(name,category='custom-a') {
  if (!CATEGORIES.includes(category)) throw new Error('Invalid category');
  const d=drill(name,[[clone(DEFAULT_BALL)]],category);
  d.id='dora-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e6).toString(36);
  return d;
}
