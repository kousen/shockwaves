// Shock Wave Formation Simulation
// Demonstrates how shock waves form at supersonic speeds

let pulses = [];
let mach = 0.5;
let previousMach = 0.5;
let machSlider;
let emissionSlider;
let emissionInterval = 20;
let frameCounter = 0;
let speedOfSound = 2;

// Source position
let sourceX, sourceY;
let sourceStartX;

// State
let paused = false;
let movingSourceMode = false;

// UI elements
let pauseButton, resetButton, modeButton;
let presetButtons = [];

// Sound barrier effect
let barrierFlash = 0;

// Audio
let audioContext = null;
let audioEnabled = false;
let audioButton;

// Observer point
let observerX, observerY;
let draggingObserver = false;
let observerFlash = 0;
let observerWaveHits = [];      // Timestamps of wave arrivals
let observedFrequency = 0;
let lastPulseDistances = new Map();  // Track each pulse's distance to observer
let sonicBoomFlash = 0;

function setup() {
    let canvas = createCanvas(900, 500);
    canvas.parent('container');

    sourceStartX = 150;
    sourceX = sourceStartX;
    sourceY = height / 2;

    // Initialize observer position (right side of canvas)
    observerX = width - 200;
    observerY = height / 2;

    // Create controls container
    let controls = createDiv('');
    controls.parent('container');
    controls.style('margin-top', '15px');
    controls.style('display', 'flex');
    controls.style('flex-wrap', 'wrap');
    controls.style('gap', '20px');
    controls.style('justify-content', 'center');
    controls.style('align-items', 'flex-start');

    // Mach slider group
    let machGroup = createDiv('');
    machGroup.parent(controls);
    machGroup.style('text-align', 'center');

    createSpan('Mach Number: ').style('color', '#eee').parent(machGroup);
    machSlider = createSlider(0, 3, 0.5, 0.05);
    machSlider.parent(machGroup);
    machSlider.style('width', '200px');
    machSlider.style('vertical-align', 'middle');

    // Emission rate slider group
    let emissionGroup = createDiv('');
    emissionGroup.parent(controls);
    emissionGroup.style('text-align', 'center');

    createSpan('Pulse Rate: ').style('color', '#eee').parent(emissionGroup);
    emissionSlider = createSlider(5, 60, 20, 5);
    emissionSlider.parent(emissionGroup);
    emissionSlider.style('width', '150px');
    emissionSlider.style('vertical-align', 'middle');

    // Buttons row
    let buttonRow = createDiv('');
    buttonRow.parent('container');
    buttonRow.style('margin-top', '10px');
    buttonRow.style('display', 'flex');
    buttonRow.style('gap', '10px');
    buttonRow.style('justify-content', 'center');
    buttonRow.style('flex-wrap', 'wrap');

    pauseButton = createButton('Pause');
    pauseButton.parent(buttonRow);
    pauseButton.mousePressed(togglePause);
    styleButton(pauseButton);

    resetButton = createButton('Reset');
    resetButton.parent(buttonRow);
    resetButton.mousePressed(resetSimulation);
    styleButton(resetButton);

    modeButton = createButton('Mode: Wind');
    modeButton.parent(buttonRow);
    modeButton.mousePressed(toggleMode);
    styleButton(modeButton);

    audioButton = createButton('Sound: Off');
    audioButton.parent(buttonRow);
    audioButton.mousePressed(toggleAudio);
    styleButton(audioButton);

    // Presets row
    let presetRow = createDiv('');
    presetRow.parent('container');
    presetRow.style('margin-top', '10px');
    presetRow.style('display', 'flex');
    presetRow.style('gap', '8px');
    presetRow.style('justify-content', 'center');
    presetRow.style('flex-wrap', 'wrap');

    createSpan('Presets: ').style('color', '#aaa').style('align-self', 'center').parent(presetRow);

    let presets = [
        { name: 'Subsonic Jet', mach: 0.85 },
        { name: 'Sound Barrier', mach: 1.0 },
        { name: 'Supersonic', mach: 1.5 },
        { name: 'Concorde', mach: 2.04 },
        { name: 'SR-71', mach: 2.8 }
    ];

    for (let preset of presets) {
        let btn = createButton(preset.name);
        btn.parent(presetRow);
        btn.mousePressed(() => {
            machSlider.value(preset.mach);
        });
        styleButton(btn, true);
    }
}

function styleButton(btn, small = false) {
    btn.style('background', '#3a3a5a');
    btn.style('color', '#eee');
    btn.style('border', 'none');
    btn.style('padding', small ? '5px 10px' : '8px 16px');
    btn.style('border-radius', '4px');
    btn.style('cursor', 'pointer');
    btn.style('font-size', small ? '12px' : '14px');
}

function togglePause() {
    paused = !paused;
    pauseButton.html(paused ? 'Play' : 'Pause');
}

function resetSimulation() {
    pulses = [];
    sourceX = sourceStartX;
    frameCounter = 0;
    barrierFlash = 0;
}

function toggleMode() {
    movingSourceMode = !movingSourceMode;
    modeButton.html(movingSourceMode ? 'Mode: Moving Source' : 'Mode: Wind');
    resetSimulation();
}

function toggleAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioEnabled = !audioEnabled;
    audioButton.html(audioEnabled ? 'Sound: On' : 'Sound: Off');
}

// Mouse handling for dragging observer
function mousePressed() {
    let d = dist(mouseX, mouseY, observerX, observerY);
    if (d < 20) {
        draggingObserver = true;
    }
}

function mouseDragged() {
    if (draggingObserver) {
        observerX = constrain(mouseX, 20, width - 20);
        observerY = constrain(mouseY, 20, height - 20);
    }
}

function mouseReleased() {
    draggingObserver = false;
}

function playPulseSound() {
    if (!audioEnabled || !audioContext) return;

    // Frequency increases with Mach number: 200Hz at M=0, 800Hz at M=3
    let frequency = map(mach, 0, 3, 200, 800);

    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Quick envelope for a "ping" sound
    let now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

function playObserverSound(dopplerShift) {
    if (!audioEnabled || !audioContext) return;

    // Base frequency modified by Doppler shift
    // dopplerShift > 1 means approaching (higher pitch), < 1 means receding (lower pitch)
    let baseFreq = 400;
    let frequency = baseFreq * dopplerShift;
    frequency = constrain(frequency, 100, 1200);

    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    let now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
}

function playSonicBoom() {
    if (!audioEnabled || !audioContext) return;

    // Create a "boom" sound - low frequency burst
    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 80;
    oscillator.type = 'sawtooth';

    let now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
}

function calculateDopplerShift(pulseX, pulseY) {
    // Calculate Doppler shift based on relative position of observer to source motion
    // Returns a multiplier: >1 = approaching (higher freq), <1 = receding (lower freq)

    if (mach < 0.01) return 1; // No shift at rest

    // Vector from pulse center to observer
    let dx = observerX - pulseX;
    let dy = observerY - pulseY;

    // Normalize
    let d = sqrt(dx * dx + dy * dy);
    if (d < 1) return 1;

    dx /= d;
    dy /= d;

    // Motion direction (source moving right in moving mode, waves drifting right in wind mode)
    let motionDirX = 1;

    // Dot product gives how much observer is in direction of motion
    // Positive = observer ahead (approaching), negative = observer behind (receding)
    let alignment = dx * motionDirX;

    // Doppler formula: f_observed = f_source * c / (c - v_source * cos(theta))
    // Where theta is angle between source velocity and direction to observer
    // Simplified: shift = 1 / (1 - M * alignment)
    let shift;
    if (movingSourceMode) {
        // Source approaching observer
        shift = 1 / (1 - mach * alignment * 0.5);
    } else {
        // Wind mode: observer in moving medium
        shift = 1 + mach * alignment * 0.3;
    }

    return constrain(shift, 0.3, 3);
}

function draw() {
    // Background with flash effects
    let bgR = 26, bgG = 26, bgB = 46;

    if (barrierFlash > 0) {
        bgR += barrierFlash * 50;
        bgG += barrierFlash * 50;
        bgB += barrierFlash * 100;
        barrierFlash *= 0.9;
        if (barrierFlash < 0.01) barrierFlash = 0;
    }

    if (sonicBoomFlash > 0) {
        bgR += sonicBoomFlash * 100;
        bgG += sonicBoomFlash * 50;
        bgB += sonicBoomFlash * 20;
        sonicBoomFlash *= 0.85;
        if (sonicBoomFlash < 0.01) sonicBoomFlash = 0;
    }

    background(bgR, bgG, bgB);

    // Decay observer flash
    if (observerFlash > 0) {
        observerFlash *= 0.8;
        if (observerFlash < 0.01) observerFlash = 0;
    }

    // Update values from sliders
    previousMach = mach;
    mach = machSlider.value();
    emissionInterval = emissionSlider.value();

    // Detect sound barrier crossing
    if ((previousMach < 1 && mach >= 1) || (previousMach > 1 && mach <= 1)) {
        barrierFlash = 1;
    }

    if (!paused) {
        // Emit new pulse periodically
        frameCounter++;
        if (frameCounter >= emissionInterval) {
            pulses.push({
                x: sourceX,
                y: sourceY,
                radius: 0,
                birthX: sourceX
            });
            playPulseSound();
            frameCounter = 0;
        }

        // In moving source mode, move the source
        if (movingSourceMode) {
            sourceX += mach * speedOfSound;
            // Wrap around
            if (sourceX > width + 50) {
                sourceX = sourceStartX;
                pulses = [];
            }
        }

        // Update pulses and detect observer crossings
        let wavesHitThisFrame = 0;

        for (let i = pulses.length - 1; i >= 0; i--) {
            let p = pulses[i];

            // Calculate distance to observer before update
            let distBefore = dist(p.x, p.y, observerX, observerY);

            p.radius += speedOfSound;

            // In wind mode, drift the pulses
            if (!movingSourceMode) {
                p.x += mach * speedOfSound;
            }

            // Calculate distance to observer after update
            let distAfter = dist(p.x, p.y, observerX, observerY);

            // Check if wave crossed observer (radius passed through observer distance)
            let radiusBefore = p.radius - speedOfSound;
            let radiusAfter = p.radius;

            if (radiusBefore < distBefore && radiusAfter >= distAfter &&
                distAfter <= radiusAfter && distBefore >= radiusBefore) {
                // Wave crossed the observer!
                wavesHitThisFrame++;
                observerWaveHits.push(millis());
                observerFlash = 1;

                // Calculate Doppler shift based on observer position relative to source motion
                let dopplerShift = calculateDopplerShift(p.x, p.y);
                playObserverSound(dopplerShift);
            }

            // Remove pulses that are too large or off screen
            if (p.radius > 600 || p.x - p.radius > width + 100) {
                pulses.splice(i, 1);
            }
        }

        // Sonic boom: multiple waves hitting at once in supersonic mode
        if (wavesHitThisFrame >= 3 && mach > 1) {
            sonicBoomFlash = 1;
            playSonicBoom();
        }

        // Calculate observed frequency (waves per second over last 2 seconds)
        let now = millis();
        observerWaveHits = observerWaveHits.filter(t => now - t < 2000);
        if (observerWaveHits.length > 1) {
            observedFrequency = observerWaveHits.length / 2; // waves per second
        } else {
            observedFrequency = 0;
        }
    }

    // Draw pulses with Doppler coloring
    for (let p of pulses) {
        let alpha = map(p.radius, 0, 400, 255, 0);
        drawDopplerCircle(p.x, p.y, p.radius, alpha);
    }

    // Draw Mach cone when supersonic
    if (mach > 1 && pulses.length > 2) {
        drawMachCone();
    }

    // Draw source point
    fill(255, 100, 100);
    noStroke();
    circle(sourceX, sourceY, 14);

    // Draw observer point
    drawObserver();

    // Draw geometry explanation when supersonic
    if (mach > 1) {
        drawGeometry();
    }

    // Display info
    drawInfo();
}

function drawObserver() {
    // Draw observer with flash effect when wave hits
    let baseSize = 16;
    let flashSize = baseSize + observerFlash * 20;

    // Glow effect when hit
    if (observerFlash > 0.1) {
        noStroke();
        fill(100, 255, 100, observerFlash * 150);
        circle(observerX, observerY, flashSize + 20);
    }

    // Observer point (green)
    stroke(50, 200, 50);
    strokeWeight(2);
    fill(100, 255, 100, 200);
    circle(observerX, observerY, flashSize);

    // Crosshair
    stroke(50, 200, 50);
    strokeWeight(1);
    line(observerX - 12, observerY, observerX + 12, observerY);
    line(observerX, observerY - 12, observerX, observerY + 12);

    // Label
    fill(100, 255, 100);
    noStroke();
    textSize(11);
    textAlign(CENTER);
    text('OBSERVER', observerX, observerY - 20);
    textSize(10);
    fill(200);
    text('(drag to move)', observerX, observerY + 28);

    // Frequency display near observer
    if (observedFrequency > 0 || observerWaveHits.length > 0) {
        textAlign(LEFT);
        textSize(12);

        // Calculate current Doppler shift for display
        let currentShift = calculateDopplerShift(sourceX, sourceY);

        fill(100, 255, 100);
        text(`Observed: ${observedFrequency.toFixed(1)} waves/sec`, observerX + 25, observerY - 5);

        // Show shift direction
        if (currentShift > 1.05) {
            fill(100, 150, 255);
            text(`Shift: +${((currentShift - 1) * 100).toFixed(0)}% (blue)`, observerX + 25, observerY + 10);
        } else if (currentShift < 0.95) {
            fill(255, 100, 100);
            text(`Shift: ${((currentShift - 1) * 100).toFixed(0)}% (red)`, observerX + 25, observerY + 10);
        } else {
            fill(200);
            text('Shift: ~0% (neutral)', observerX + 25, observerY + 10);
        }
    }
}

function drawDopplerCircle(cx, cy, radius, alpha) {
    // Draw circle with Doppler color shift
    // Blue = compressed (approaching), Red = stretched (receding)

    noFill();
    strokeWeight(2);

    let segments = 60;

    // Direction of motion determines color orientation:
    // - Moving Source mode: source moves RIGHT, so RIGHT side (angle 0) is blue (approaching)
    // - Wind mode: medium moves RIGHT, so LEFT side (angle PI) is blue (waves compressed there)
    let blueAngle = movingSourceMode ? 0 : PI;

    // Scale the effect by Mach number (no shift at M=0, full shift at high M)
    let shiftIntensity = min(mach / 2, 1);

    for (let i = 0; i < segments; i++) {
        let angle1 = (i / segments) * TWO_PI;
        let angle2 = ((i + 1) / segments) * TWO_PI;

        // Calculate how "blue" or "red" this segment is
        // based on angle relative to direction of motion
        let midAngle = (angle1 + angle2) / 2;
        let dopplerFactor = cos(midAngle - blueAngle); // +1 = blue side, -1 = red side

        // Interpolate color: blue (approaching) <-> neutral <-> red (receding)
        let r, g, b;
        if (dopplerFactor > 0) {
            // Blue shift (approaching) - compress toward blue/white
            r = lerp(100, 50, dopplerFactor * shiftIntensity);
            g = lerp(200, 150, dopplerFactor * shiftIntensity);
            b = lerp(255, 255, dopplerFactor * shiftIntensity);
        } else {
            // Red shift (receding) - stretch toward red
            r = lerp(100, 255, -dopplerFactor * shiftIntensity);
            g = lerp(200, 80, -dopplerFactor * shiftIntensity);
            b = lerp(255, 80, -dopplerFactor * shiftIntensity);
        }

        stroke(r, g, b, alpha);

        let x1 = cx + radius * cos(angle1);
        let y1 = cy + radius * sin(angle1);
        let x2 = cx + radius * cos(angle2);
        let y2 = cy + radius * sin(angle2);

        line(x1, y1, x2, y2);
    }
}

function drawMachCone() {
    let machAngle = asin(1 / mach);

    // Draw cone lines from source
    stroke(255, 200, 50, 200);
    strokeWeight(2);

    let lineLength = 800;

    // Direction depends on mode:
    // - Moving Source: cone trails behind (points left, negative x)
    // - Wind mode: cone points downstream (points right, positive x)
    let direction = movingSourceMode ? -1 : 1;

    // Upper cone line
    let x1 = sourceX + direction * lineLength * cos(machAngle);
    let y1 = sourceY - lineLength * sin(machAngle);
    line(sourceX, sourceY, x1, y1);

    // Lower cone line
    let x2 = sourceX + direction * lineLength * cos(machAngle);
    let y2 = sourceY + lineLength * sin(machAngle);
    line(sourceX, sourceY, x2, y2);
}

function drawGeometry() {
    // Draw explanatory triangle in corner
    let triX = width - 150;
    let triY = 60;
    let triSize = 80;

    let machAngle = asin(1 / mach);

    // Draw triangle
    stroke(255, 200, 50, 150);
    strokeWeight(1);
    noFill();

    // Horizontal line (source velocity = M)
    line(triX, triY, triX + triSize, triY);

    // Vertical line (speed of sound = 1)
    line(triX + triSize, triY, triX + triSize, triY + triSize * tan(machAngle));

    // Hypotenuse (Mach cone edge)
    line(triX, triY, triX + triSize, triY + triSize * tan(machAngle));

    // Right angle marker
    let markerSize = 8;
    line(triX + triSize - markerSize, triY, triX + triSize - markerSize, triY + markerSize);
    line(triX + triSize - markerSize, triY + markerSize, triX + triSize, triY + markerSize);

    // Labels
    fill(255, 200, 50);
    noStroke();
    textSize(11);
    textAlign(CENTER);
    text('v = M', triX + triSize/2, triY - 8);

    textAlign(LEFT);
    text('c = 1', triX + triSize + 5, triY + triSize * tan(machAngle) / 2);

    // Angle arc
    noFill();
    stroke(255, 200, 50, 150);
    arc(triX, triY, 30, 30, 0, machAngle);

    fill(255, 200, 50);
    noStroke();
    textAlign(LEFT);
    text('θ', triX + 18, triY + 15);

    // Formula
    textSize(12);
    text(`sin(θ) = 1/M = ${(1/mach).toFixed(2)}`, triX - 30, triY + triSize * tan(machAngle) + 25);
}

function drawInfo() {
    fill(255);
    noStroke();
    textSize(18);
    textAlign(LEFT);

    // Mach number with color coding
    if (mach < 1) {
        fill(100, 200, 100);
    } else if (mach === 1) {
        fill(255, 255, 100);
    } else {
        fill(255, 100, 100);
    }
    text(`M = ${mach.toFixed(2)}`, 20, 30);

    fill(255);
    textSize(14);

    if (mach < 1) {
        fill(100, 200, 100);
        text('SUBSONIC', 20, 52);
        fill(200);
        textSize(12);
        text('Waves outrun the source', 20, 70);
    } else if (mach === 1) {
        fill(255, 255, 100);
        text('SONIC (M = 1)', 20, 52);
        fill(200);
        textSize(12);
        text('Source matches wave speed', 20, 70);
    } else {
        fill(255, 100, 100);
        text('SUPERSONIC', 20, 52);
        let angle = degrees(asin(1 / mach));
        fill(200);
        textSize(12);
        text(`Mach angle: ${angle.toFixed(1)}°`, 20, 70);
        text('Source outruns waves → shock cone', 20, 88);
    }

    // Mode indicator
    fill(150);
    textSize(11);
    textAlign(RIGHT);
    text(movingSourceMode ? 'Source moving through medium' : 'Medium flowing past source', width - 20, height - 15);

    // Doppler effect legend (bottom left)
    if (mach > 0.1) {
        textAlign(LEFT);
        textSize(11);

        // Blue indicator
        fill(50, 150, 255);
        text('● Blue shift (approaching)', 20, height - 35);

        // Red indicator
        fill(255, 80, 80);
        text('● Red shift (receding)', 20, height - 18);
    }
}
