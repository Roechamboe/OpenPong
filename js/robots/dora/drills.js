// Dora-native drill model. Never mix these values with Nova wheel-RPM arrays.
const KEY = 'openpong_dora_drills_v1';
export const CATEGORIES = Object.freeze(['basic','combined','complex','custom-a','custom-b','custom-c']);
export const DEFAULT_BALL = Object.freeze({ direction:45, speed:20, spin:0, arc:0, frequencyLevel:20, angle:0 });
const clone = value => JSON.parse(JSON.stringify(value));
const ball = overrides => ({ ...DEFAULT_BALL, ...overrides });
function drill(name, steps, category='basic') {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), name, category, levels: [steps,clone(steps),clone(steps)], shuffle:false };
}
export function defaults() {
  const center = ball({ direction:45, speed:45, frequencyLevel:65 });
  const left = ball({ direction:25, speed:45, frequencyLevel:65 });
  const right = ball({ direction:65, speed:45, frequencyLevel:65 });
  const backspin = ball({ direction:45, speed:40, spin:20, angle:180, frequencyLevel:65 });
  const topspin = ball({ direction:45, speed:40, spin:20, angle:0, frequencyLevel:65 });
  return [
    drill('Center drive',[[center]]),
    drill('Left drive',[[left]]),
    drill('Right drive',[[right]]),
    drill('Backspin',[[backspin]]),
    drill('Topspin',[[topspin]]),
    drill('Left–right',[[left],[right]],'combined'),
    drill('Center–left–right',[[center],[left],[right]],'combined'),
    drill('Alternating spin',[[topspin],[backspin]],'complex'),
    drill('Wide placement',[[left],[center],[right],[center]],'complex')
  ];
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
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(stored) && stored.every(validateDrill)) return stored;
  } catch (error) { console.warn('Invalid Dora drill storage',error); }
  return defaults();
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
