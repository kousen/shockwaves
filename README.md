# Shock Wave Formation Simulator

An interactive visualization demonstrating how shock waves (Mach cones) form when an object moves through a medium faster than the speed of sound.

## Overview

This simulation shows circular pressure waves emanating from a source point. As the source velocity increases past Mach 1, the waves pile up and form the characteristic cone shape that produces sonic booms.

## Running the Simulation

Simply open `index.html` in any modern web browser. No server or build process required.

## Features

### Core Simulation
- **Circular wave propagation** - Waves expand outward at the speed of sound (normalized to 1)
- **Mach number control** - Adjust source velocity from M = 0 to M = 3
- **Two reference frames**:
  - *Wind mode* - Stationary source with medium flowing past (like a wind tunnel)
  - *Moving Source mode* - Source travels through stationary medium (like an aircraft)

### Visual Elements
- **Mach cone lines** - Yellow lines showing the shock wave envelope when supersonic
- **Doppler color shift** - Waves show blue shift (approaching/compressed) and red shift (receding/stretched)
- **Geometry diagram** - Upper-right triangle showing the sin(θ) = 1/M relationship
- **Sound barrier flash** - Screen flashes when crossing M = 1
- **Color-coded status** - Green (subsonic), yellow (sonic), red (supersonic)

### Controls
| Control | Function |
|---------|----------|
| Mach Number slider | Adjust source velocity (0 - 3) |
| Pulse Rate slider | Control wave emission frequency |
| Pause/Play | Freeze simulation to examine wave patterns |
| Reset | Clear all waves and restart |
| Mode | Toggle between Wind and Moving Source modes |
| Sound | Enable/disable audio pulses |

### Presets
Quick-access buttons for real-world examples:
- **Subsonic Jet** - M = 0.85 (typical commercial aircraft)
- **Sound Barrier** - M = 1.0
- **Supersonic** - M = 1.5
- **Concorde** - M = 2.04 (retired supersonic airliner)
- **SR-71** - M = 2.8 (Blackbird reconnaissance aircraft)

### Audio
- Each wave emission plays a tone
- Frequency increases with Mach number (200 Hz at M=0 → 800 Hz at M=3)
- Demonstrates how source speed affects perceived pitch

## The Physics

### Mach Number
The Mach number (M) is the ratio of an object's velocity to the speed of sound:

```
M = v / c
```

Where:
- `v` = velocity of the source
- `c` = speed of sound (~343 m/s or ~767 mph at sea level)

### Subsonic (M < 1)
Waves expand faster than the source moves. All waves propagate outward in every direction, with the source remaining inside its own wavefronts.

### Sonic (M = 1)
The source moves exactly at the speed of sound. Waves pile up directly in front, creating intense pressure.

### Supersonic (M > 1)
The source outruns its own waves. Wavefronts accumulate along a cone (the "Mach cone") whose half-angle θ is given by:

```
sin(θ) = 1/M
```

This cone is the shock wave - when it passes an observer, they hear the sonic boom.

### Doppler Effect
The simulation visualizes the Doppler effect through color:
- **Blue shift** - Waves are compressed on the side where source approaches (higher frequency)
- **Red shift** - Waves are stretched on the side where source recedes (lower frequency)

## Technical Details

### Built With
- [p5.js](https://p5js.org/) - Creative coding library for visualization
- Web Audio API - For generating audio tones

### Files
```
shockwaves/
├── index.html    # Main HTML page
├── sketch.js     # p5.js simulation code
└── README.md     # This file
```

### Browser Compatibility
Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires JavaScript enabled.

## Background

This project recreates a classic physics demonstration originally implemented as a Java applet. The visualization makes abstract concepts like shock wave formation and the Doppler effect intuitive by showing them in real-time.

## License

MIT License - Feel free to use, modify, and share.
