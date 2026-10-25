# OpenPong · Dora Drill Control

A browser-based Web Bluetooth drill controller for the **Pusun Dora Smart Pro TT** table-tennis robot.

This standalone fork keeps a **modular robot adapter API** so contributors can add support for other robots later. It does not ship Nova BLE commands, RPM conversions, or Nova-specific training logic.

**Launch OpenPong:** [https://roechamboe.github.io/OpenPong/](https://roechamboe.github.io/OpenPong/)

## Running

- Serve this directory over HTTPS (GitHub Pages works), or locally from `localhost` with a static HTTP server.
- Open it in a Chromium-based browser with Web Bluetooth support and select **Connect**.
- Choose a drill, difficulty 1–3, and either a ball count or duration.
- Tap a drill to start; long-press or tap the ≡ grip to edit; drag the grip to reorder.
- To stop early, disconnect from the UI or use the robot's physical stop button.

**Hardware safety:** A prominent **■ STOP ROBOT** button is always displayed in the Connect / Reps / Time card. It cancels the current app session and requests the Dora stop sequence over BLE, even during drill setup. The status reports that a command was sent or failed, **not proof of a physical stop**. If Bluetooth is disconnected, stalled or the robot continues feeding, use the robot's **physical stop**. Always keep it accessible, especially while testing unfamiliar shot parameters.

## Fundamental shot baseline (factory v11)

The factory drills use **six fundamental Dora-native shots**. Four Push/Loop vectors are based on your physically tuned settings.

| Shot | parameter vector [Dir:Speed:Spin:Arc:Freq:SpinAngle] | Status |
| --- | --- | --- |
| Forehand Push | `11:28:10:15:35:180` | Hardware-tuned baseline |
| Backhand Push | `71:28:10:15:35:180` | Hardware-tuned baseline |
| Forehand Drive | `16:40:4:15:65:0` | Hardware-tuned baseline |
| Backhand Drive | `66:40:4:15:65:0` | Hardware-tuned baseline |
| Forehand Loop | `5:40:20:40:35:0` | Hardware-tuned baseline |
| Backhand Loop | `76:40:20:40:35:0` | Hardware-tuned baseline |

Push spin angle 180 represents the tested backspin configuration; Loop spin angle 0 represents topspin. Direction is calibrated separately for forehand/backhand.

The **Basic Level 1** Push and Loop vectors are reproduced exactly. Because only one tuned vector per stroke was supplied, **Basic Levels 2 and 3 are provisional progressions**: respectively +3/+6 Speed, +3/+6 Spin, and +10/+20 Frequency relative to Level 1, with Direction, Arc, and SpinAngle unchanged. Drives use the same provisional +3/+6 Speed, +3/+6 Spin, +10/+20 Frequency progression as Push/Loop, while retaining Direction, Arc and SpinAngle. Combined and Complex factory drills use the Level 1 versions of their constituent shots at all difficulty settings, as before.

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
