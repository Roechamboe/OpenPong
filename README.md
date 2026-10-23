# OpenPong · Dora Drill Control

A browser-based Web Bluetooth drill controller for the **Pusun Dora Smart Pro TT** table-tennis robot.

This standalone fork keeps a **modular robot adapter API** so contributors can add support for other robots later. It does not ship Nova BLE commands, RPM conversions, or Nova-specific training logic.

## Running

- Serve this directory over HTTPS (GitHub Pages works), or locally from `localhost` with a static HTTP server.
- Open it in a Chromium-based browser with Web Bluetooth support and select **Connect**.
- Choose a drill, difficulty 1–3, and either a ball count or duration.
- Tap a drill to start; long-press or tap the ≡ grip to edit; drag the grip to reorder.
- To stop early, disconnect from the UI or use the robot's physical stop button.

**Hardware safety:** Session stopping is sent over BLE. Always keep the robot's physical stop accessible, especially while testing unfamiliar shot parameters.

## Dora functions

- Native 15-byte BLE messages over service FFF0, with notifications on FFF1 and writes on FFF2.
- 34 Nova-inspired factory *patterns* mapped to Dora-native direction, speed, spin, arc, frequency, and spin angle. These are approximate starting values, **not hardware-calibrated shot equivalences**.
- Basic, Combined, Complex and Custom A/B/C libraries.
- Three difficulty levels, ball variants, shuffle, scatter and reorder.
- Reps (launch notifications) and Time limits; saved cumulative ball/drill counters.
- Native Dora volume and brightness controls.
- JSON drill import/export; data saved in browser local storage.

**Not yet validated:** All drill presets, multi-ball operation, and volume/brightness commands require further physical testing. Pause/resume is not supported.

## Extending the robot abstraction

`js/core/robot-manager.js` exports:

- `registerAdapter(id, adapter)`
- `getRobotIds()`, `getActiveRobotId()`, `getActiveAdapter()`
- `selectRobot(id)`, `onRobotEvent(listener)`

Every adapter must export `bleState`, `connectDevice`, `disconnectDevice`, `sendPacket`, and `setEventHandler`. Adapters emit structured events such as `ready`, `disconnected`, and `ballLaunched`.

The Dora adapter lives in `js/robots/dora/`. Future implementations can add a separate adapter and their own drill-model translator without coupling the UI to a second protocol. The standalone UI currently exposes Dora-native fields; abstracting editor parameter schemas for additional robots is future work.

## Data migration

Existing Dora drill storage (`openpong_dora_drills_v1`) remains unchanged. Aggregate statistics migrate from the legacy `nova_stats` key to `openpong_stats` when first saved. Theme preferences also accept the legacy key.

## Acknowledgements

Forked from [olanga/nova](https://github.com/olanga/nova), whose visual styling and drill patterns inspired the original OpenPong interface. Dora support and BLE serialization are independent of the Nova protocol.
