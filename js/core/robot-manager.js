// Device selection and shared adapter API. Nova remains the default and
// only registered device until Dora Web Bluetooth support is validated.
import * as nova from '../robots/nova/adapter.js';
import * as dora from '../robots/dora/adapter.js';

const adapters = new Map([['nova', nova], ['dora', dora]]);
let activeId = 'nova';
const eventHandlers = new Set();
function emit(event) { for (const handler of eventHandlers) handler(event); }

export function registerAdapter(id, adapter) {
    if (!id || adapters.has(id)) throw new Error('Duplicate or missing robot ID');
    for (const method of ['connectDevice', 'disconnectDevice', 'sendPacket', 'setEventHandler']) {
        if (typeof adapter[method] !== 'function') throw new TypeError('Adapter missing ' + method);
    }
    if (!adapter.bleState) throw new TypeError('Adapter missing bleState');
    adapters.set(id, adapter);
    adapter.setEventHandler(event => { if (activeId === id) emit(event); });
}
export function getActiveRobotId() { return activeId; }
export function getRobotIds() { return [...adapters.keys()]; }
export function getActiveAdapter() { return adapters.get(activeId); }
export function selectRobot(id) {
    if (!adapters.has(id)) throw new Error('Unknown robot: ' + id);
    if (getActiveAdapter().bleState.isConnected || getActiveAdapter().bleState.device?.gatt?.connected)
        throw new Error('Disconnect the current robot before switching');
    activeId = id;
    document.dispatchEvent(new CustomEvent('connection-changed'));
}
export function onRobotEvent(handler) { eventHandlers.add(handler); return () => eventHandlers.delete(handler); }
nova.setEventHandler(event => { if (activeId === 'nova') emit(event); });
dora.setEventHandler(event => { if (activeId === 'dora') emit(event); });
