// Stable, extensible robot adapter registry. The UI defaults to Dora.
// Future integrations register adapters here without modifying presentation code.
import * as dora from '../robots/dora/adapter.js';
const adapters=new Map();
const subscribers=new Set();
let activeId='dora';
function emit(event){for(const cb of subscribers)cb(event);}
export function registerAdapter(id,adapter){
 if(!id||adapters.has(id))throw new Error('Duplicate or missing robot ID');
 for(const name of ['connectDevice','disconnectDevice','sendPacket','setEventHandler'])
  if(typeof adapter[name]!=='function')throw new TypeError('Adapter missing '+name);
 if(!adapter.bleState)throw new TypeError('Adapter missing bleState');
 adapters.set(id,adapter);
 adapter.setEventHandler(event=>{if(activeId===id)emit(event);});
}
export function getActiveRobotId(){return activeId;}
export function getRobotIds(){return [...adapters.keys()];}
export function getActiveAdapter(){return adapters.get(activeId);}
export function selectRobot(id){
 if(!adapters.has(id))throw new Error('Unknown robot: '+id);
 if(getActiveAdapter()?.bleState.isConnected)throw new Error('Disconnect before switching robots');
 activeId=id;
 document.dispatchEvent(new Event('connection-changed'));
}
export function onRobotEvent(handler){subscribers.add(handler);return ()=>subscribers.delete(handler);}
registerAdapter('dora',dora);
