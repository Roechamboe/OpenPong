// Run: node --experimental-default-type=module --test tests/dora-protocol.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeBall, encodeBall, encodeBallRaw, encodeSequence,
  encodeStart, encodeStop, encodeFollowUp, encodeBrightness, encodeVolume, isLaunchNotification
} from '../js/robots/dora/protocol.js';
const hex = value => [...value].map(x => x.toString(16).padStart(2, '0')).join(' ');
const fromHex = value => Uint8Array.from(value.split(' ').map(x => parseInt(x, 16)));

test('blind capture: all six display values match known screenshot', () => {
  const data = fromHex('aa 24 03 2b 02 63 00 fe 06 4a 00 dc 00 46 a5');
  const parsed = decodeBall(data);
  assert.equal(parsed.slot, 0x24);
  assert.deepEqual(
    [parsed.direction, parsed.speed, parsed.spin, parsed.frequencyLevel, parsed.arc, parsed.angle],
    [51, 47, 44, 69, 4, 70]
  );
  assert.equal(parsed.intervalSeconds, 1.61);
  assert.deepEqual(encodeBallRaw(0x24, parsed.raw), data);
});

test('minimum frequency setting is 3000 ms/ball', () => {
  const data = encodeBall(0x24, {
    direction: 45, arc: 0, speed: 20,
    spin: 0, frequencyLevel: 20, angle: 180
  });
  assert.equal(decodeBall(data).raw.intervalMs, 3000);
});

test('a single-ball sequence references slot 0x24 and clears five remaining pages', () => {
  const pages = encodeSequence([0x24]);
  assert.equal(pages.length, 6);
  assert.equal(hex(pages[0]), 'aa 6d 01 24 00 00 00 00 00 00 00 00 00 00 a5');
  for (const [i, page] of pages.entries()) {
    assert.equal(page.length, 15);
    assert.equal(page[2], i + 1);
    assert.equal(page[14], 0xa5);
  }
  assert.throws(() => encodeSequence(Array(29).fill(0x24)), RangeError);
});

test('four-ball sequence matches captured command', () => {
  assert.equal(hex(encodeSequence([0x24, 0x25, 0x26, 0x27])[0]),
    'aa 6d 01 24 25 26 27 00 00 00 00 00 00 00 a5');
});

test('start, test, stop and follow-up have correct framing', () => {
  assert.equal(hex(encodeStart()),
    'aa 6a 06 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.equal(encodeStart({ test: true })[13], 1);
  assert.equal(hex(encodeStop()),
    'aa 6b 00 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.equal(encodeStart({ byte8: 0x6f })[8], 0x6f);
  assert.equal(encodeStop({ byte8: 0x6f })[8], 0x6f);
  assert.equal(encodeFollowUp()[1], 0x66);
});

test('physical launch notification from HCI capture', () => {
  assert.equal(isLaunchNotification(fromHex('bb 10 00 00 10 b5')), true);
  assert.equal(isLaunchNotification(fromHex('bb 10 00 00 11 b5')), false);
});

test('Dora audio volume and light brightness are exact 15-byte commands', () => {
  assert.equal(hex(encodeVolume(0)), 'aa 83 00 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.equal(hex(encodeVolume(6)), 'aa 83 06 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.equal(hex(encodeBrightness(4)), 'aa 82 04 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.equal(hex(encodeBrightness(10)), 'aa 82 0a 00 00 00 00 00 00 00 00 00 00 00 a5');
  assert.throws(() => encodeVolume(7), RangeError);
  assert.throws(() => encodeBrightness(3), RangeError);
});
