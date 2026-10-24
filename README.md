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

**Hardware safety:** Session stopping is sent over BLE. Always keep the robot's physical stop accessible, especially while testing unfamiliar shot parameters.

## Preset calibration and limitations

The factory library preserves the 34 drill names and each source drill's sequence from `main`. The **only hardware-tested shot** so far is **forehand push, half-long**: Direction 15, Speed 30, Spin 10, Arc 15, Frequency 35, Spin Angle 180. Dora's backhand placement and the drive/loop variants are provisional estimates derived from the source presets' placement, wheel-speed relationship and relative frequency. **They are not verified equivalents** and should be tested individually. The basic drills reflect their three source difficulty levels; combined and complex drills retain the source level-one ball values at each difficulty.

Upgrades update untouched factory levels while preserving levels previously edited by the user. Back up custom configurations with Export Drills before physical calibration.

## Dora functions

- Native 15-byte BLE messages over service FFF0, with notifications on FFF1 and writes on FFF2.
- 34 Nova-inspired factory *patterns* mapped to Dora-native direction, speed, spin, arc, frequency, and spin angle. These are approximate starting values, **not hardware-calibrated shot equivalences**.
- Basic, Combined, Complex and Custom A/B/C libraries.
- Three difficulty levels, ball variants, shuffle, scatter and reorder.
- Reps (launch notifications) and Time limits; saved cumulative ball/drill counters.
- Native Dora volume and brightness controls.
- JSON drill import/export; data saved in browser local storage.

**Not yet validated:** All drill presets, multi-ball operation, and volume/brightness commands require further physical testing. Pause/resume is not supported.

## Modular calibration engine

Open **☰ → Calibration Engine**, above **Ball Placement Estimator**. The calibration editor uses the same shared receiver-view table visualization as the placement estimator. Tap a numbered marker to edit that point's X, Y, Direction, Speed, and Arc; tap an empty grid intersection to add a new point using provisional nearest-point parameters. Unsaved changes remain in a draft until **Save calibration**. You can remove, edit, and add targets to expand from five to nine or more, then **Save calibration**. All changes are local to the browser (`openpong_placement_calibration_v1`); existing drills are not modified. New targets carry *placeholder* robot values, so physically measure and replace them before saving. Reset restores the original five observed points. There must be at least 3 non-collinear points for predictions.

**Machine placement assumption:** robot centered on the center line at the *opponent's end line*, represented by **X=6, Y=22** if the receiver's end line is Y=0, receiver's net is Y=11, and the opponent end line is Y=22. The machine location is stored as profile metadata, not inferred from ball flight. This first version does **not** automatically compensate for moving or rotating the robot; measurements must be taken again if its position changes.

`js/calibration-engine.js` exports `DEFAULT_PROFILE`, `validateProfile`, `loadCalibration`, `saveCalibration`, and `estimatePlacement(x,y,profile)`. Measurements are assembled into non-overlapping local triangles using an empty-circumcircle (Delaunay) criterion. Inside a containing triangle, Direction and Speed are **barycentrically interpolated**:

```text
P = w1 P1 + w2 P2 + w3 P3
w1 + w2 + w3 = 1
Direction(P) = w1 D1 + w2 D2 + w3 D3
Speed(P) = w1 S1 + w2 S2 + w3 S3
```

Known targets reproduce their exact measurements. Predictions are restricted to the convex hull of the measurements; no extrapolation outside the hull. Arc still uses the nearest measured target, since a smoothly interpolated arc has not been physically validated. Nine-point calibration means adding four new measured targets; no equation edits are required. Both screens share `js/placement-map.js` for the receiver-perspective grid, convex-hull overlay, and measured-point markers.

## Experimental ball placement estimator

From the top-right menu, choose **Ball Placement Estimator** (between **Calibration Engine** and **Device Settings**). This is a reference calculator: it **does not send BLE commands, update drills or apply settings**. Its assumptions are **No Spin** and **Difficulty Level 1**.

### Measured calibration procedure

We divided the receiver's table half into **12 equal intervals across (grid lines X = 0–12)** and **11 intervals along its length (grid lines Y = 0–11)**. There are 13 × 12 grid intersections, not 12 × 11 points. The origin **(0,0) is the receiver's leftmost corner at their end line, from the receiver's own viewpoint**. X increases left-to-right across the receiver's table half; Y increases from the receiver's end line toward the net. No right-handedness or forehand/backhand convention is implied. We placed a Post-it note at each target and adjusted the robot's Direction, Speed and Arc until multiple shots out of ten hit each note. Actual hit counts were not recorded.

![Five numbered Post-it calibration targets, gridded receiver half, and quadrilateral interpolation region](images/placement-calibration-grid.svg)

| Target | (X, Y) | Direction | Speed | Arc |
| ---: | --- | ---: | ---: | ---: |
| 1 | (1,1) | 80 | 48 | 15 |
| 2 | (11,1) | 0 | 50 | 15 |
| 3 | (3,9) | 81 | 29 | 20 |
| 4 | (9,9) | 0 | 28 | 40 |
| 5 | (6,5) | 42 | 38 | 15 |

![Observed speed versus landing-depth grid coordinate with first-pass linear trend](images/placement-speed-depth.svg)

### Historical first-pass estimator (v0.1, superseded by triangulation)

At depth Y = 1, the two measured direction settings imply **D = 88 − 8X**. At depth Y = 9, they imply **D = 121.5 − 13.5X**. Linear interpolation between these *two calibrated endpoints at each depth* uses:

```text
t = (Y - 1)/8
leftX = 1 + 2t
rightX = 11 - 2t
leftDirection = 80 + t
Direction(X,Y) = leftDirection * (rightX - X)/(rightX - leftX)
```

At (6,5), direction interpolates to **40.25**, compared with measured **42** (difference 1.75). This is a sanity check, not an independent validation.

A least-squares fit of all five speed observations to depth gives:

```text
Speed(Y) = 51.5625 - 2.5625*Y
```

It predicts speed 49 at Y=1, 38.75 at Y=5, and 28.5 at Y=9; the observed speed pairs at Y=1 and Y=9 were 48/50 and 29/28 respectively. Direction, speed and arc can interact; this correlation does **not** prove speed independently sets depth.

**Arc is not modeled continuously:** the UI selects the arc value from the geographically closest of the five calibrated points, measured in squared grid-distance. In particular, at Y=9 the observed arcs differ substantially (20 at X=3 versus 40 at X=9). Using nearest-neighbor arc is only a provisional starting strategy.

The historical v0.1 UI predicted only within the quadrilateral connecting (1,1), (11,1), (9,9), (3,9):

```text
1 <= Y <= 9,  leftX <= X <= rightX
```

Outside this region it displays no prediction, rather than extrapolating. Slider steps are integers to match the Post-it coordinate system. Values are *experimental estimates* until physically checked.

### Validation and safety

Next, compare predicted and observed landings at additional positions (e.g. (3,5), (9,5), (6,7)), recording hit counts out of ten and actual landing coordinates; use those measurements to improve the two-dimensional direction model and arc handling. Keep the robot height, position and orientation fixed between tests. Use the robot's physical stop while testing unfamiliar parameters.

### Ball parameter clipboard format

The estimator's **Copy proposed settings** exports the six-field, colon-delimited Dora vector:

```text
Dir:Speed:Spin:Freq:Arc:SpinType
40:39:0:35:15:180
```

The estimator rounds predicted Direction and Speed to integers, sets **Spin = 0** (no spin), **Freq = 35** (provisional firing frequency), and **SpinType = 180** (Dora editor's native spin-angle field, not a separate spin mode). Those latter defaults have *not* been established by these placement measurements. In the drill editor, each ball variant has a **Paste parameters** control that reads the clipboard, validates all six values, and updates only that ball variant. Valid values are integer Direction 0–90, Speed 20–100, Spin 0–60, Freq 20–170, Arc -65–65, and SpinType/angle 0–359. Invalid vectors leave the ball unchanged. Save the drill to persist an imported vector. Clipboard access requires a supported browser and secure origin (HTTPS/localhost).

The X-axis is drawn increasing **left-to-right** from the receiver's viewpoint; **(0,0) is their leftmost end-line corner**. This correction changes display orientation, not the original calibration coordinates or fitted equations.

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
