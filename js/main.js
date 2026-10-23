import {setMode,resetStats} from './state.js';
import {setTheme,toggleMenu,updateStatsUI} from './ui.js';
import {connectDevice,disconnectDevice,bleState} from './bluetooth.js';
import {onRobotEvent} from './core/robot-manager.js';
import {initDoraPanel} from './dora-panel.js?v=dora-standalone-v5';
function updateConnection(){
 const connected=bleState.isConnected;
 document.getElementById('btn-connect').textContent=connected?'Disconnect':'Connect';
 document.getElementById('status-text').textContent=connected?'Connected':'Disconnected';
}
window.setMode=(mode,btn)=>{
 setMode(mode);
 document.querySelectorAll('.mode-option').forEach(el=>el.classList.toggle('active',el===btn));
 document.getElementById('ui-reps').classList.toggle('hidden',mode!=='reps');
 document.getElementById('ui-time').classList.toggle('hidden',mode!=='time');
};
window.setTheme=setTheme;
window.toggleMenu=toggleMenu;
window.openDoraSettings=()=>{
 document.getElementById('theme-menu').classList.remove('open');
 const page=document.getElementById('dora-settings-page');
 page.hidden=false;
 document.body.style.overflow='hidden';
 page.querySelector('button').focus();
};
window.closeDoraSettings=()=>{
 document.getElementById('dora-settings-page').hidden=true;
 document.body.style.overflow='';
 document.querySelector('.menu-btn')?.focus();
};
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!document.getElementById('dora-settings-page').hidden)window.closeDoraSettings();
});

window.resetStats=()=>{
 if(!confirm('Reset training statistics?'))return;
 resetStats();updateStatsUI();toggleMenu();
};
document.addEventListener('DOMContentLoaded',()=>{
 const savedTheme=localStorage.getItem('openpong_theme')||localStorage.getItem('nova_theme_pref');
 if(savedTheme)setTheme(savedTheme);
 initDoraPanel();updateStatsUI();updateConnection();
 document.getElementById('btn-connect').addEventListener('click',async()=>{
  const btn=document.getElementById('btn-connect');btn.disabled=true;
  try{if(bleState.isConnected)await disconnectDevice();else await connectDevice();}
  catch(err){document.getElementById('status-text').textContent='Bluetooth: '+err.message;}
  finally{btn.disabled=false;updateConnection();}
 });
 document.addEventListener('connection-changed',updateConnection);
 document.addEventListener('stats-updated',updateStatsUI);
 onRobotEvent(event=>{if(event.type==='ready'||event.type==='disconnected')updateConnection();});
 document.addEventListener('click',event=>{
  const menu=document.getElementById('theme-menu');
  if(menu&&!menu.contains(event.target)&&!event.target.closest('.menu-btn'))menu.classList.remove('open');
 });
});
