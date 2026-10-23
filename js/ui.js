// Shared, robot-independent presentation utilities.
import {appStats} from './state.js';
export function updateStatsUI(){
 const el=document.getElementById('stats-display');
 if(el){el.textContent=`Balls: ${appStats.balls} | Drills: ${appStats.drills}`;}
}
export function setTheme(theme){
 if(!['standard','ocean','forest','night'].includes(theme))return;
 document.documentElement.setAttribute('data-theme',theme);
 localStorage.setItem('openpong_theme',theme);
}
export function toggleMenu(){document.getElementById('theme-menu')?.classList.toggle('open');}
