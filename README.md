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

The factory drills use **six fundamental Dora-native shots**. Four Push/Loop vectors are based on your physically tuned settings. The two Drive vectors are now deliberately softened to Speed 40, Spin 4, Arc 15, while preserving the original directions, Frequency 65 and SpinAngle 0.

The vector order is exactly **Dir:Speed:Spin:Arc:Freq:SpinAngle**. Arc is the fourth field and Frequency is the fifth.

| Shot | Level 1 parameter vector | Status |
| --- | --- | --- |
| Forehand Push | `11:28:10:15:35:180` | Hardware-tuned baseline |
| Backhand Push | `71:28:10:15:35:180` | Hardware-tuned baseline |
| Forehand Drive | `16:40:4:15:65:0` | Softer Drive candidate, awaiting test |
| Backhand Drive | `66:40:4:15:65:0` | Softer Drive candidate, awaiting test |
| Forehand Loop | `5:40:20:40:35:0` | Hardware-tuned baseline |
| Backhand Loop | `76:40:20:40:35:0` | Hardware-tuned baseline |

Push spin angle 180 represents the tested backspin configuration; Loop spin angle 0 represents topspin. Direction is calibrated separately for forehand/backhand. These exact four parameter vectors are **not generated from the no-spin placement estimator**; the original five-point no-spin model remains available for independent placement work.

The **Basic Level 1** Push and Loop vectors are reproduced exactly. Because only one tuned vector per stroke was supplied, **Basic Levels 2 and 3 are provisional progressions**: respectively +3/+6 Speed, +3/+6 Spin, and +10/+20 Frequency relative to Level 1, with Direction, Arc, and SpinAngle unchanged. Drives use the same provisional +3/+6 Speed, +3/+6 Spin, +10/+20 Frequency progression as Push/Loop, while retaining Direction, Arc and SpinAngle. Combined and Complex factory drills use the Level 1 versions of their constituent shots at all difficulty settings, as before.

Factory preset **version 11** updates recognized *untouched* stored legacy factory levels while preserving user-edited levels and custom drills. This update does **not** purge historical migration code or older saved records; cleanup can happen after the complete baseline is validated and backed up. Calibration Engine measurements remain separate from the factory drill library and are not automatically applied to drills.

**Correction in v10:** Dora vectors always use **Dir:Speed:Spin:Arc:Freq:SpinAngle**. Four tuned presets are now internally stored as Arc 15 / Frequency 35 for both Push shots, and Arc 40 / Frequency 35 for both Loop shots. A v9 bug left both backhand shots reversed internally; v10 migrates untouched affected presets while preserving edited levels. The frequency range remains 20–170.

**Drive adjustment in v11:** Both Level 1 Drive shots now use Speed 40 / Spin 4 / Arc 15, rather than the prior Speed 48 or 47 / Spin 10 / Arc 12. Direction 16 (FH), 66 (BH), Frequency 65 and SpinAngle 0 are unchanged. These changes also affect Drive steps within Combined and Complex factory drills. Untouched v10 factory levels are migrated; manually edited levels stay intact. The revised Drives require a new physical test.

### Validation status

Your tests found that the earlier Push had appropriate backspin but excessive pace; Drive was faster/flatter, Loop had more arc, less pace, stronger topspin, and both Drive and Loop landed comfortably. The four updated Push/Loop vectors are your selected tuned baselines. Live testing of their saved factory sequences and their Level 2/3 progressions is still needed. Keep the robot's physical stop accessible when verifying settings.

## Testing unsaved Dora drills

The **Edit Dora Drill** dialog offers **▶ Test** beside each ball variant and **Test drill** in its footer. The ball test uploads the selected variant only, requests one ball, and stops after one launch notification (with a 15-second safety timeout). **Test drill** uploads the current unsaved editor draft and uses the configured Reps or Time limit, including enabled steps, variants, scatter, and shuffle. Neither action saves editor changes or increments the regular training statistics. You must be connected to the Dora robot. The red **STOP ROBOT** button remains available; a successful Bluetooth stop write is not proof of a physical stop. The compact trash icon deletes the entire drill only after confirmation. Save is still required to persist edits.

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
