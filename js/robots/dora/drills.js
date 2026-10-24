// Dora-native drill model. Never mix these values with Nova wheel-RPM arrays.
const KEY = 'openpong_dora_drills_v1';
export const CATEGORIES = Object.freeze(['basic','combined','complex','custom-a','custom-b','custom-c']);
export const DEFAULT_BALL = Object.freeze({ direction:15, speed:30, spin:10, arc:15, frequencyLevel:35, angle:180 });
const clone = value => JSON.parse(JSON.stringify(value));
const ball = overrides => ({ ...DEFAULT_BALL, ...overrides });
function drill(name, steps, category='basic') {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g,'-'), name, category, levels: [steps,clone(steps),clone(steps)], shuffle:false };
}
// Derived from Nova's js/constants.js names and ordered sequences.
// Dora speed/spin/arc values are approximate starting points, NOT RPM equivalents.
export const FACTORY_PRESET_VERSION=5;
const LEGACY_STARTER_IDS=new Set(['center-drive','left-drive','right-drive','backspin','topspin','left-right','center-left-right','alternating-spin','wide-placement']);
const LAYOUT={
 basic:['push(b)','push(f)','drive(b)','drive(f)','loop(b)','loop(f)'],
 combined:['loop(b)-drive(b)','loop(f)-drive(f)','drive(f)-drive(b)','push(f)-drive(f)','push(b)-loop(b)','loop(f)-drive(b)','push(f)-loop(b)','drive(f)-drive(f)','push(b)-loop(f)','push(f)-loop(f)','loop(f)-loop(f)','loop(b)-drive(f)'],
 complex:['push(b)-loop(f)-drive(b)','push(f)-loop(b)-drive(f)','loop(f)-drive(f)-drive(b)','loop(b)-drive(f)-drive(b)','drive(f)-drive(f)-drive(f)','push(f)-loop(f)-drive(f)','push(b)-loop(b)-drive(b)','push(f)-loop(b)-drive(b)','loop(f)-drive(b)-drive(f)','loop(b)-drive(b)-drive(f)','push(b)-loop(f)-drive(f)','push(b)-loop(b)-drive(f)','drive(b)-drive(f)-drive(f)','random-drive','23-random-drive','all-random']
};
// One physically observed anchor: forehand PUSH, half-long, center.
// No other stroke, direction or depth has been physically calibrated.
export const CALIBRATED_FOREHAND_PUSH=Object.freeze({
 direction:15,speed:30,spin:10,arc:15,frequencyLevel:35,angle:180
});
// Preserve the earlier public name for consumers of this module.
export const CALIBRATED_FOREHAND=CALIBRATED_FOREHAND_PUSH;

// Source descriptors transcribed from main/js/constants.js DEFAULT_DRILLS.
// These are *reference measurements*, not instructions for Nova hardware:
// top/bottom are relative wheel values, frequency is the source pattern tempo.
// The original presets all use height=50, forehand drop=+5, backhand drop=-5.
// Combo/complex drills reuse the level-one source shot at every difficulty.
const SOURCE_SHOTS=Object.freeze({
 push:{wheelPairs:[[1547,2915],[1205,3257],[863,3599]],tempos:[10,20,30]},
 drive:{wheelPairs:[[3545,2177],[3545,2177],[3545,2177]],tempos:[40,50,70]},
 loop:{wheelPairs:[[1520,3572],[1178,3914],[836,4256]],tempos:[10,20,30]}
});
const PUSH_REFERENCE_AVG=(1547+2915)/2;
const PUSH_REFERENCE_DIFF=Math.abs(1547-2915);
// Provisional trajectories. Source height is the same (50) across the
// source presets; stroke-specific Dora arcs therefore remain an inference.
const DORA_ARC={push:15,drive:12,loop:21};

/** Estimate one Dora-native ball from a source preset's individual shot. */
function shot(symbol,difficulty=1){
 const match=/^(push|drive|loop)\((b|f)\)$/.exec(symbol);
 if(!match)throw new Error('Unknown factory preset token '+symbol);
 const [,type,side]=match;
 const source=SOURCE_SHOTS[type],index=difficulty-1;
 if(index<0||index>2)throw new RangeError('Invalid difficulty');
 const [top,bottom]=source.wheelPairs[index];
 const average=(top+bottom)/2;
 const sourceDrop=side==='f'?5:-5; // main's forehand/backhand values
 return ball({
  // Mirror the tested +5 forehand placement to the -5 backhand placement.
  // Direction 75 is an estimate, NOT a calibrated backhand reference.
  direction:CALIBRATED_FOREHAND_PUSH.direction+(5-sourceDrop)*6,
  speed:Math.max(20,Math.min(100,Math.round(
    CALIBRATED_FOREHAND_PUSH.speed+(average-PUSH_REFERENCE_AVG)/75
  ))),
  spin:Math.max(0,Math.min(60,Math.round(
    CALIBRATED_FOREHAND_PUSH.spin*Math.abs(top-bottom)/PUSH_REFERENCE_DIFF
  ))),
  arc:DORA_ARC[type],
  // Preserve different main tempos instead of a generic difficulty ramp.
  frequencyLevel:CALIBRATED_FOREHAND_PUSH.frequencyLevel+
    (source.tempos[index]-SOURCE_SHOTS.push.tempos[0]),
  // Drive reverses wheel-spin polarity relative to the observed push;
  // this Dora orientation mapping is a hypothesis, not physically verified.
  angle:(top-bottom)*(1547-2915)>=0?180:0
 });
}
// Snapshot of the prior *uncalibrated* factory generator, used only to
// migrate untouched presets. Modified user data must never be overwritten.
function previousShot(symbol,difficulty=1){
 const [,type,side]=/^(push|drive|loop)\((b|f)\)$/.exec(symbol);
 const i=difficulty-1;
 return ball({
  direction:side==='b'?30:60,
  speed:{push:[25,30,35],drive:[40,45,50],loop:[38,43,48]}[type][i],
  spin:{push:[18,22,26],drive:[10,13,16],loop:[23,27,31]}[type][i],
  arc:{push:0,drive:3,loop:12}[type],
  frequencyLevel:{push:[35,45,55],drive:[65,75,85],loop:[35,45,55]}[type][i],
  angle:type==='push'?180:0
 });
}
// Version 4 generated one generic profile per name and difficulty; retain a
// snapshot so we can update untouched stored factory levels, not user's edits.
function legacyV4Shot(symbol,difficulty=1){
 const [,type,side]=/^(push|drive|loop)\((b|f)\)$/.exec(symbol);
 const i=difficulty-1;
 return ball({
  direction:side==='f'?15:75,
  speed:{push:[25,29,33],drive:[30,35,40],loop:[34,39,44]}[type][i],
  spin:{push:[8,11,14],drive:[10,13,16],loop:[17,21,25]}[type][i],
  arc:{push:10,drive:15,loop:23}[type],
  frequencyLevel:[35,45,55][i],
  angle:type==='push'?0:180
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
  levels:[1,2,3].map(level=>segments(name).map(segment=>[shot(segment,category==='basic'?level:1)])),
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
      const byId=new Map(stored.map(d=>[d.id,d]));
      // Match the exact factory names/categories from main, but preserve
      // edited Dora-native parameters. Previously shipped Dora starter drills
      // remain editable under Custom A rather than appearing among factory drills.
      const merged=[
        ...factory.map(d=>{
          const saved=byId.get(d.id);
          if(!saved)return d;
          // Preserve any user-modified difficulty level. Only exact untouched
          // legacy factory levels (v3 and v4) are eligible for replacement.
          const unchanged=v=>[1,2,3].map(i=>segments(d.name).map(s=>[v(s,i)]));
          const oldVersions=[unchanged(previousShot),unchanged(legacyV4Shot)];
          const levels=d.levels.map((fresh,i)=>
            oldVersions.some(version=>
              JSON.stringify(saved.levels?.[i])===JSON.stringify(version[i]))
                ?fresh:clone(saved.levels[i]));
          return {...saved,name:d.name,category:d.category,factory:true,levels};
        }),
        ...stored.filter(d=>!ids.has(d.id)).map(d=>
          LEGACY_STARTER_IDS.has(d.id) && !d.category.startsWith('custom-')
            ? {...d,category:'custom-a'} : d)
      ];
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
