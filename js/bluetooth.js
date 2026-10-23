// Robot-independent BLE facade. Device-specific packets live in adapters.
import {getActiveAdapter} from './core/robot-manager.js';
export const bleState=new Proxy({},{get(_t,key){return getActiveAdapter().bleState[key];}});
export const connectDevice=(...args)=>getActiveAdapter().connectDevice(...args);
export const disconnectDevice=(...args)=>getActiveAdapter().disconnectDevice(...args);
export const sendPacket=(...args)=>getActiveAdapter().sendPacket(...args);
