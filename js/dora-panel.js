// Temporary Dora testing panel. Keeps Nova drill data and editor untouched.
// This panel deliberately exposes only Dora-native fields (no RPM conversion).
import { getActiveRobotId, selectRobot, onRobotEvent } from './core/robot-manager.js';
import * as dora from './robots/dora/adapter.js';

let stopTimer = null;
let launched = 0;
let busy = false;
function field(id, name, min, max, val) {
  return `<label style="display:flex;flex-direction:column;gap:4px;font-size:13px">${name}
    <input id="dora-${id}" type="number" min="${min}" max="${max}" step="1" value="${val}"
    style="width:100%;padding:8px;border:1px solid #999;border-radius:7px"></label>`;
}
function value(id) { return Number(document.getElementById('dora-' + id).value); }
function setStatus(message) { document.getElementById('dora-status').textContent = message; }
function refresh() {
  const selected = getActiveRobotId() === 'dora';
  document.getElementById('dora-panel').hidden = !selected;
  document.querySelectorAll('.container > .section-label, .container > .tabs-container').forEach(el => {
    el.style.display = selected ? 'none' : '';
  });
  document.getElementById('grp-difficulty').style.display = selected ? 'none' : '';
  document.getElementById('ui-reps').parentElement.parentElement.style.display = selected ? 'none' : '';
  document.getElementById('robot-select').value = getActiveRobotId();
  document.querySelector('header h1').textContent = selected ? 'OpenPong — Dora' : 'Nova Drill Control';
}
async function stop() {
  clearTimeout(stopTimer); stopTimer = null;
  try {
    await dora.stopTraining();
    setStatus('Stopped — ' + launched + ' launch events');
  } catch (err) { setStatus('STOP FAILED: ' + err.message); }
}
export function initDoraPanel() {
  const selector = document.createElement('label');
  selector.style.cssText = 'display:block;padding:10px 0;font-size:13px;font-weight:700';
  selector.innerHTML = 'ROBOT <select id="robot-select" style="margin-left:10px;padding:8px;border-radius:8px"><option value="nova">Pongbot Nova</option><option value="dora">Pusun Dora</option></select>';
  document.querySelector('.settings-card').prepend(selector);
  const panel = document.createElement('section');
  panel.id = 'dora-panel';
  panel.hidden = true;
  panel.style.cssText = 'margin:16px 0;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--card,#fff);color:var(--text)';
  panel.innerHTML = `
    <h2 style="margin:0 0 10px">Dora — single-ball test</h2>
    <p style="font-size:12px">Set a slow frequency first. Use Stop to halt the launcher. The original Nova editor is not yet translated to Dora parameters.</p>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      ${field('direction','Direction (0–90)',0,90,45)}
      ${field('speed','Speed (20–100)',20,100,20)}
      ${field('spin','Spin (0–60)',0,60,0)}
      ${field('arc','Arc (−65–65)',-65,65,0)}
      ${field('frequency','Frequency level (20–170)',20,170,20)}
      ${field('angle','Spin angle (0–359°)',0,359,0)}
      ${field('duration','Duration (seconds)',1,3600,15)}
    </div>
    <div style="display:flex;gap:10px;margin-top:16px">
      <button id="dora-start" type="button" style="padding:13px;flex:1;background:#137a48;color:white;border:0;border-radius:8px">Start Dora</button>
      <button id="dora-stop" type="button" style="padding:13px;flex:1;background:#bb3030;color:white;border:0;border-radius:8px">STOP</button>
    </div>
    <p id="dora-status" role="status" aria-live="polite">Disconnected</p>
    <p>Launch notifications: <strong id="dora-count">0</strong></p>
    <p style="font-size:12px">If Bluetooth disconnects while the robot is running, use the robot's physical stop control.</p>`;
  document.querySelector('.settings-card').after(panel);
  document.getElementById('robot-select').onchange = e => {
    try { selectRobot(e.target.value); refresh(); }
    catch (err) { alert(err.message); refresh(); }
  };
  document.getElementById('dora-start').onclick = async () => {
    if (busy || dora.isRunning()) return;
    if (!dora.bleState.isConnected) { setStatus('Connect to Dora first'); return; }
    busy = true;
    document.getElementById('dora-start').disabled = true;
    try {
      const parameters = {
        direction: value('direction'), speed: value('speed'), spin: value('spin'),
        arc: value('arc'), frequencyLevel: value('frequency'), angle: value('angle')
      };
      const duration = value('duration');
      if (!Number.isInteger(duration) || duration < 1 || duration > 3600) throw new Error('Invalid duration');
      setStatus('Uploading configuration...');
      launched = 0; document.getElementById('dora-count').textContent = '0';
      await dora.prepareDrill([parameters]);
      setStatus('Starting...');
      await dora.startTraining();
      stopTimer = setTimeout(stop, duration * 1000);
      setStatus('Running — automatic stop after ' + duration + ' s');
    } catch (err) {
      setStatus('Start failed: ' + err.message);
      if (dora.isRunning()) await stop();
    } finally {
      busy = false;
      document.getElementById('dora-start').disabled = false;
    }
  };
  document.getElementById('dora-stop').onclick = stop;
  onRobotEvent(event => {
    if (getActiveRobotId() !== 'dora') return;
    if (event.type === 'ballLaunched') {
      launched++;
      document.getElementById('dora-count').textContent = String(launched);
    }
    if (event.type === 'disconnected') {
      clearTimeout(stopTimer); stopTimer = null;
      setStatus('Disconnected — verify that the robot has stopped');
    }
    if (event.type === 'ready') setStatus('Connected — ready');
  });
  refresh();
}
