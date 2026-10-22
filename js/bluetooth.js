// Backward-compatible entry point. Existing Nova UI and runner can keep using
// this module while the device-specific implementation lives in robots/nova.
import { getActiveAdapter, onRobotEvent } from './core/robot-manager.js';
import { handleDone } from './runner.js';

onRobotEvent(event => {
    if (event.type === 'drillCompleted') handleDone();
});

// Legacy callers may retain bleState while the active adapter changes.
// Resolve state properties on demand instead of capturing the initial Nova object.
export const bleState = new Proxy({}, {
    get(_target, key) { return getActiveAdapter().bleState[key]; },
    set(_target, key, value) { getActiveAdapter().bleState[key] = value; return true; },
    has(_target, key) { return key in getActiveAdapter().bleState; }
});
export const connectDevice = (...args) => getActiveAdapter().connectDevice(...args);
export const disconnectDevice = (...args) => getActiveAdapter().disconnectDevice(...args);
export const sendPacket = (...args) => getActiveAdapter().sendPacket(...args);
export const packBall = (...args) => getActiveAdapter().packBall(...args);
