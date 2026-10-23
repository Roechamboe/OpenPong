/**
 * Pusun Dora Smart Pro TT wire protocol (15-byte AA...A5 frames).
 *
 * Independently implemented from observed HCI captures and JADX-derived
 * TableSmartFragment.java behaviour. No Bluetooth/UI dependencies.
 * The caller is responsible for ordering writes and enforcing session timeouts.
 *
 * Important: UI values are discretized. decode(encode(x)) is reliable for
 * supported UI settings, but encode(decode(raw)) need not preserve arbitrary
 * intermediate raw values captured while dragging a slider.
 */
export const DORA_BLE = Object.freeze({
  service: '0000fff0-0000-1000-8000-00805f9b34fb',
  notify: '0000fff1-0000-1000-8000-00805f9b34fb',
  write: '0000fff2-0000-1000-8000-00805f9b34fb',
  launchNotification: Uint8Array.of(0xBB, 0x10, 0, 0, 0x10, 0xB5)
});

export const DORA = Object.freeze({
  START: 0xAA, END: 0xA5,
  BALL_FIRST: 0x24, BALL_LAST: 0x55,
  SEQUENCE: 0x6D, START_TRAINING: 0x6A,
  STOP_TRAINING: 0x6B, FOLLOW_UP: 0x66,
  BRIGHTNESS: 0x82, VOLUME: 0x83,
  MAX_SEQUENCE_STEPS: 28, SEQUENCE_PAGES: 6
});

function integer(value, min, max, name) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
}
function bytes(input, length = 15) {
  const a = input instanceof Uint8Array ? input : Uint8Array.from(input);
  if (a.length !== length) throw new RangeError(`Expected ${length} bytes`);
  return a;
}
function frame(command) {
  const b = new Uint8Array(15);
  b[0] = DORA.START;
  b[1] = command;
  b[14] = DORA.END;
  return b;
}
function validateFrame(data) {
  const b = bytes(data);
  if (b[0] !== DORA.START || b[14] !== DORA.END)
    throw new Error('Invalid Dora AA...A5 frame');
  return b;
}
function put16(b, offset, value) {
  integer(value, 0, 65535, 'raw field');
  b[offset] = value >> 8;
  b[offset + 1] = value & 255;
}
function get16(b, offset) { return (b[offset] << 8) | b[offset + 1]; }

/**
 * Exact integer formulas from TableSmartFragment's updatePointSelect()
 * and initPointDefault(); intervalMs is the real wire value.
 * Direction 0..90, speed 20..100, spin 0..60, arc -65..65,
 * frequencyLevel 20..170 and angle 0..359.
 */
export function encodeParameters({ direction, speed, spin, arc, frequencyLevel, angle }) {
  integer(direction, 0, 90, 'direction');
  integer(speed, 20, 100, 'speed');
  integer(spin, 0, 60, 'spin');
  integer(arc, -65, 65, 'arc');
  integer(frequencyLevel, 20, 170, 'frequencyLevel');
  integer(angle, 0, 359, 'angle');
  const intervalMs = frequencyLevel < 30
    ? (30 - frequencyLevel) * 100 + 2000
    : (230 - frequencyLevel) * 10;
  return {
    directionRaw: (direction + 30) * 10,
    arcRaw: 1301 - (arc + 65) * 10,
    speedRaw: (speed + 3) * 5,
    intervalMs,
    spinRaw: spin * 5,
    angleRaw: angle
  };
}

export function decodeParameters({ directionRaw, arcRaw, speedRaw, intervalMs, spinRaw, angleRaw }) {
  for (const [key, val] of Object.entries({ directionRaw, arcRaw, speedRaw, intervalMs, spinRaw, angleRaw }))
    integer(val, 0, 65535, key);
  return {
    direction: Math.trunc(directionRaw / 10) - 30,
    speed: Math.trunc(speedRaw / 5) - 3,
    spin: Math.trunc(spinRaw / 5),
    arc: Math.trunc((1301 - arcRaw) / 10) - 65,
    frequencyLevel: intervalMs > 2000
      ? 30 - Math.trunc((intervalMs - 2000) / 100)
      : 230 - Math.trunc(intervalMs / 10),
    intervalSeconds: intervalMs / 1000,
    angle: angleRaw
  };
}

/** A numbered ball slot, sent over GATT as a single 15-byte write. */
export function encodeBallRaw(slot, fields) {
  integer(slot, DORA.BALL_FIRST, DORA.BALL_LAST, 'ball slot');
  const b = frame(slot);
  const names = ['directionRaw', 'arcRaw', 'speedRaw', 'intervalMs', 'spinRaw', 'angleRaw'];
  names.forEach((name, i) => put16(b, 2 + i * 2, fields[name]));
  return b;
}
export function encodeBall(slot, parameters) {
  return encodeBallRaw(slot, encodeParameters(parameters));
}
export function decodeBall(data) {
  const b = validateFrame(data);
  integer(b[1], DORA.BALL_FIRST, DORA.BALL_LAST, 'ball slot');
  const fields = {
    directionRaw: get16(b, 2), arcRaw: get16(b, 4),
    speedRaw: get16(b, 6), intervalMs: get16(b, 8),
    spinRaw: get16(b, 10), angleRaw: get16(b, 12)
  };
  return { slot: b[1], raw: fields, ...decodeParameters(fields) };
}

/**
 * Six 0x6D pages: five sequence slots per page, except page 6 (three).
 * Empty steps are zero. Slot IDs are 0x24..0x55.
 * Always emit all six pages to clear old sequence entries.
 */
export function encodeSequence(slots) {
  if (!Array.isArray(slots) || slots.length > DORA.MAX_SEQUENCE_STEPS)
    throw new RangeError('Sequence must be an array of at most 28 slots');
  slots.forEach(slot => integer(slot, DORA.BALL_FIRST, DORA.BALL_LAST, 'sequence slot'));
  return Array.from({ length: DORA.SEQUENCE_PAGES }, (_, page) => {
    const b = frame(DORA.SEQUENCE);
    b[2] = page + 1;
    const count = page === 5 ? 3 : 5;
    for (let j = 0; j < count; j++) b[3 + j] = slots[page * 5 + j] || 0;
    return b;
  });
}
export function decodeSequencePage(data) {
  const b = validateFrame(data);
  if (b[1] !== DORA.SEQUENCE) throw new Error('Not a Dora sequence packet');
  integer(b[2], 1, 6, 'page');
  const count = b[2] === 6 ? 3 : 5;
  return { page: b[2], slots: Array.from(b.slice(3, 3 + count)).filter(Boolean) };
}

/**
 * The Android app uses 0x06 in start packets in both one- and four-ball
 * sessions. A single-ball *test* sets byte 13 to 1; normal training uses 0.
 * byte8 (sometimes 0x6F in captures) is not yet understood; caller may
 * explicitly supply it without assigning undocumented semantics.
 */
export function encodeStart({ test = false, byte8 = 0 } = {}) {
  integer(byte8, 0, 255, 'byte8');
  const b = frame(DORA.START_TRAINING);
  b[2] = 6; b[8] = byte8; b[13] = test ? 1 : 0;
  return b;
}
export function encodeStop({ byte8 = 0 } = {}) {
  integer(byte8, 0, 255, 'byte8');
  const b = frame(DORA.STOP_TRAINING);
  b[8] = byte8;
  return b;
}
export function encodeFollowUp({ byte8 = 0 } = {}) {
  integer(byte8, 0, 255, 'byte8');
  const b = frame(DORA.FOLLOW_UP);
  b[8] = byte8;
  return b;
}
/** Confirmed in the official Android application's BLE captures.
 * Brightness UI levels: 1–10; volume UI levels: 0–10.
 * Both values occupy byte 2 in a 15-byte AA ... A5 packet.
 */
export function encodeBrightness(level) {
  integer(level, 1, 10, 'brightness');
  const b = frame(DORA.BRIGHTNESS);
  b[2] = level;
  return b;
}
export function encodeVolume(level) {
  integer(level, 0, 10, 'volume');
  const b = frame(DORA.VOLUME);
  b[2] = level;
  return b;
}
/** Validated in a physical run: 15 notifications coincided with 15 launches. */
export function isLaunchNotification(data) {
  const b = data instanceof Uint8Array ? data : Uint8Array.from(data);
  return b.length === 6 && DORA_BLE.launchNotification.every((v, i) => b[i] === v);
}
