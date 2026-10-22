// Backward-compatible entry point. Existing Nova UI and runner can keep using
// this module while the device-specific implementation lives in robots/nova.
import { getActiveAdapter, onRobotEvent } from './core/robot-manager.js';
import { handleDone } from './runner.js';

onRobotEvent(event => {
    if (event.type === 'drillCompleted') handleDone();
});

// Current legacy consumers read this object directly. It is the Nova state
// object until the UI is migrated to select adapters dynamically.
export const bleState = getActiveAdapter().bleState;
export const connectDevice = (...args) => getActiveAdapter().connectDevice(...args);
export const disconnectDevice = (...args) => getActiveAdapter().disconnectDevice(...args);
export const sendPacket = (...args) => getActiveAdapter().sendPacket(...args);
export const packBall = (...args) => getActiveAdapter().packBall(...args);
