// UI state shared by robot-specific panels; legacy statistics migrate once.
export let runMode='reps';
export const appStats=(()=>{
 const stored=localStorage.getItem('openpong_stats')||localStorage.getItem('nova_stats');
 try{const v=JSON.parse(stored);return {balls:Number(v?.balls)||0,drills:Number(v?.drills)||0};}catch{return {balls:0,drills:0};}
})();
export function setMode(value){if(value!=='reps'&&value!=='time')throw new Error('Invalid mode');runMode=value;}
export function resetStats(){appStats.balls=0;appStats.drills=0;localStorage.setItem('openpong_stats',JSON.stringify(appStats));document.dispatchEvent(new Event('stats-updated'));}
