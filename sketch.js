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

function setup() {
    let canvas = createCanvas(900, 500);
    canvas.parent('container');

    sourceStartX = 150;
    sourceX = sourceStartX;
    sourceY = height / 2;

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

function draw() {
    // Background with flash effect for sound barrier
    if (barrierFlash > 0) {
        background(26 + barrierFlash * 50, 26 + barrierFlash * 50, 46 + barrierFlash * 100);
        barrierFlash *= 0.9;
        if (barrierFlash < 0.01) barrierFlash = 0;
    } else {
        background(26, 26, 46);
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

        // Update pulses
        for (let i = pulses.length - 1; i >= 0; i--) {
            let p = pulses[i];
            p.radius += speedOfSound;

            // In wind mode, drift the pulses
            if (!movingSourceMode) {
                p.x += mach * speedOfSound;
            }

            // Remove pulses that are too large or off screen
            if (p.radius > 600 || p.x - p.radius > width + 100) {
                pulses.splice(i, 1);
            }
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

    // Draw geometry explanation when supersonic
    if (mach > 1) {
        drawGeometry();
    }

    // Display info
    drawInfo();
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
