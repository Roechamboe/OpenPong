// Pusun Dora Smart Pro TT — Web Bluetooth device adapter.
// Protocol serialization lives in protocol.js; no Nova authentication is used.
import { DORA_BLE, DORA, encodeBall, encodeSequence, encodeStart, encodeStop,
  encodeFollowUp, encodeBrightness, encodeVolume, isLaunchNotification } from './protocol.js';

export const bleState = { isConnected: false, device: null, writeChar: null, notifyChar: null };
let eventHandler = null;
let writeLock = Promise.resolve();
let running = false;
export function setEventHandler(cb) { eventHandler = cb; }
const emit = event => eventHandler?.(event);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function notify(e) {
  const value = e.target.value;
  const data = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (isLaunchNotification(data)) emit({ type: 'ballLaunched' });
  else emit({ type: 'notification', data: new Uint8Array(data) });
}
function disconnected() {
  running = false;
  bleState.isConnected = false;
  bleState.writeChar = null;
  bleState.notifyChar = null;
  bleState.device = null;
  emit({ type: 'disconnected' });
  document.dispatchEvent(new CustomEvent('connection-changed'));
}
export async function connectDevice() {
  if (bleState.isConnected) return;
  // Some firmware does not advertise its 0xFFF0 service. Let users select
  // the robot from the Bluetooth picker and request the service explicitly.
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true, optionalServices: [DORA_BLE.service]
  });
  bleState.device = device;
  device.addEventListener('gattserverdisconnected', disconnected);
  try {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(DORA_BLE.service);
    const writeChar = await service.getCharacteristic(DORA_BLE.write);
    const notifyChar = await service.getCharacteristic(DORA_BLE.notify);
    await notifyChar.startNotifications();
    notifyChar.addEventListener('characteristicvaluechanged', notify);
    bleState.writeChar = writeChar;
    bleState.notifyChar = notifyChar;
    bleState.isConnected = true;
    emit({ type: 'ready' });
    document.dispatchEvent(new CustomEvent('connection-changed'));
  } catch (error) {
    if (device.gatt.connected) device.gatt.disconnect();
    disconnected();
    throw error;
  }
}
export function disconnectDevice() {
  if (running && bleState.writeChar) {
    // Best effort: stop before disconnecting, do not leave motors running.
    return stopTraining().finally(() => bleState.device?.gatt?.disconnect());
  }
  bleState.device?.gatt?.disconnect();
}
export function sendPacket(packet) {
  if (!bleState.writeChar) return Promise.reject(new Error('Dora not connected'));
  const bytes = Uint8Array.from(packet);
  if (bytes.length !== 15 || bytes[0] !== 0xAA || bytes[14] !== 0xA5)
    return Promise.reject(new Error('Refusing non-Dora BLE packet'));
  // Do not silently swallow write failures; queued writes must stay usable.
  const next = writeLock.catch(() => {}).then(async () => {
    if (!bleState.writeChar) throw new Error('Dora disconnected');
    const c = bleState.writeChar;
    if (typeof c.writeValueWithoutResponse === 'function')
      await c.writeValueWithoutResponse(bytes);
    else await c.writeValue(bytes);
  });
  writeLock = next;
  return next;
}
export async function prepareDrill(balls) {
  if (running) throw new Error('Stop the current training before reconfiguring');
  if (!Array.isArray(balls) || balls.length < 1 || balls.length > 28)
    throw new RangeError('Dora supports 1–28 sequence positions');
  if (balls.length > 28) throw new RangeError('Too many balls');
  const slotIds = balls.map((_, i) => DORA.BALL_FIRST + i);
  for (let i = 0; i < balls.length; i++) {
    await sendPacket(encodeBall(slotIds[i], balls[i]));
    await sleep(50);
  }
  for (const page of encodeSequence(slotIds)) {
    await sendPacket(page);
    await sleep(50);
  }
}
export async function startTraining({ test = false, byte8 = 0 } = {}) {
  if (running) throw new Error('Training already active');
  await sendPacket(encodeStart({ test, byte8 }));
  running = true;
  await sendPacket(encodeFollowUp({ byte8 }));
  emit({ type: 'running' });
}
export async function stopTraining({ byte8 = 0 } = {}) {
  // Stop immediately after outstanding serialized writes. Repeated stop is safe.
  try {
    await sendPacket(encodeStop({ byte8 }));
    await sendPacket(encodeFollowUp({ byte8 }));
  } finally {
    running = false;
    emit({ type: 'stopped' });
  }
}
export function setBrightness(level) { return sendPacket(encodeBrightness(level)); }
export function setVolume(level) { return sendPacket(encodeVolume(level)); }
export function isRunning() { return running; }
// Compatibility export only. Dora's 15-byte ball codec is not compatible with
// Nova's packBall(upperWheel,lowerWheel,...) format.
export function packBall() {
  throw new Error('Dora requires named parameters via prepareDrill');
}
