// Physics calculations for shock wave simulation
// Pure functions that can be tested independently

/**
 * Speed of sound at sea level in various units
 */
export const SPEED_OF_SOUND = {
    MPH: 767,
    KMH: 1235,
    MS: 343
};

/**
 * Calculate the Mach cone half-angle (theta)
 * Only valid for supersonic speeds (mach > 1)
 * @param {number} mach - Mach number (must be > 1)
 * @returns {number} Angle in radians, or NaN if mach <= 1
 */
export function calculateMachAngle(mach) {
    if (mach <= 1) {
        return NaN;
    }
    return Math.asin(1 / mach);
}

/**
 * Convert Mach angle from radians to degrees
 * @param {number} mach - Mach number (must be > 1)
 * @returns {number} Angle in degrees, or NaN if mach <= 1
 */
export function calculateMachAngleDegrees(mach) {
    const radians = calculateMachAngle(mach);
    return radians * (180 / Math.PI);
}

/**
 * Determine flight regime based on Mach number
 * @param {number} mach - Mach number
 * @returns {'subsonic' | 'sonic' | 'supersonic'} Flight regime
 */
export function getFlightRegime(mach) {
    if (mach < 1) return 'subsonic';
    if (mach === 1) return 'sonic';
    return 'supersonic';
}

/**
 * Check if speed is supersonic
 * @param {number} mach - Mach number
 * @returns {boolean} True if mach > 1
 */
export function isSupersonic(mach) {
    return mach > 1;
}

/**
 * Convert Mach number to real-world speeds
 * @param {number} mach - Mach number
 * @returns {{mph: number, kmh: number, ms: number}} Speed in various units
 */
export function machToSpeed(mach) {
    return {
        mph: Math.round(mach * SPEED_OF_SOUND.MPH),
        kmh: Math.round(mach * SPEED_OF_SOUND.KMH),
        ms: Math.round(mach * SPEED_OF_SOUND.MS)
    };
}

/**
 * Convert speed to Mach number
 * @param {number} speed - Speed value
 * @param {'mph' | 'kmh' | 'ms'} unit - Unit of the speed
 * @returns {number} Mach number
 */
export function speedToMach(speed, unit = 'mph') {
    const divisors = {
        mph: SPEED_OF_SOUND.MPH,
        kmh: SPEED_OF_SOUND.KMH,
        ms: SPEED_OF_SOUND.MS
    };
    return speed / divisors[unit];
}

/**
 * Calculate Doppler shift factor
 * @param {number} mach - Mach number of source
 * @param {number} observerX - Observer X position
 * @param {number} observerY - Observer Y position
 * @param {number} sourceX - Source X position
 * @param {number} sourceY - Source Y position
 * @param {boolean} movingSourceMode - True if source moves, false if medium moves (wind mode)
 * @returns {number} Doppler shift multiplier (>1 = blue shift/approaching, <1 = red shift/receding)
 */
export function calculateDopplerShift(mach, observerX, observerY, sourceX, sourceY, movingSourceMode) {
    if (mach < 0.01) return 1; // No shift at rest

    // Vector from source to observer
    const dx = observerX - sourceX;
    const dy = observerY - sourceY;

    // Distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 1) return 1;

    // Normalize direction vector
    const dirX = dx / distance;

    // Motion direction (source moving right)
    const motionDirX = 1;

    // Dot product: how much observer is in direction of motion
    // Positive = observer ahead (approaching), negative = observer behind (receding)
    const alignment = dirX * motionDirX;

    // Calculate shift based on mode
    let shift;
    if (movingSourceMode) {
        // Source approaching observer: f_observed = f_source / (1 - M * cos(theta))
        shift = 1 / (1 - mach * alignment * 0.5);
    } else {
        // Wind mode: observer in moving medium
        shift = 1 + mach * alignment * 0.3;
    }

    // Clamp to reasonable range
    return Math.max(0.3, Math.min(3, shift));
}

/**
 * Check if a wave has crossed the observer position
 * @param {number} radiusBefore - Wave radius before update
 * @param {number} radiusAfter - Wave radius after update
 * @param {number} distanceToObserver - Distance from wave center to observer
 * @returns {boolean} True if wave crossed observer this frame
 */
export function hasWaveCrossedObserver(radiusBefore, radiusAfter, distanceToObserver) {
    // Wave crosses observer when radius passes through the observer distance
    return radiusBefore < distanceToObserver && radiusAfter >= distanceToObserver;
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Euclidean distance
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate observed frequency from wave hit timestamps
 * @param {number[]} waveHitTimes - Array of timestamps (in ms) when waves hit observer
 * @param {number} currentTime - Current time in ms
 * @param {number} windowMs - Time window to consider (default 2000ms)
 * @returns {number} Waves per second
 */
export function calculateObservedFrequency(waveHitTimes, currentTime, windowMs = 2000) {
    const recentHits = waveHitTimes.filter(t => currentTime - t < windowMs);
    if (recentHits.length <= 1) return 0;
    return recentHits.length / (windowMs / 1000);
}

/**
 * Determine if multiple waves hitting at once constitutes a sonic boom
 * @param {number} wavesHitThisFrame - Number of waves that hit observer this frame
 * @param {number} mach - Current Mach number
 * @param {number} threshold - Minimum waves for boom (default 3)
 * @returns {boolean} True if sonic boom should occur
 */
export function isSonicBoom(wavesHitThisFrame, mach, threshold = 3) {
    return wavesHitThisFrame >= threshold && mach > 1;
}

/**
 * Calculate pulse tone frequency based on Mach number
 * Maps M=0 to 200Hz, M=3 to 800Hz
 * @param {number} mach - Mach number (0-3)
 * @returns {number} Frequency in Hz
 */
export function calculatePulseFrequency(mach) {
    // Linear interpolation: 200Hz at M=0, 800Hz at M=3
    return 200 + (mach / 3) * 600;
}

/**
 * Calculate observer tone frequency with Doppler shift applied
 * @param {number} baseFrequency - Base frequency in Hz
 * @param {number} dopplerShift - Doppler shift multiplier
 * @param {number} minFreq - Minimum frequency (default 100)
 * @param {number} maxFreq - Maximum frequency (default 1200)
 * @returns {number} Shifted frequency, clamped to range
 */
export function calculateDopplerFrequency(baseFrequency, dopplerShift, minFreq = 100, maxFreq = 1200) {
    const shifted = baseFrequency * dopplerShift;
    return Math.max(minFreq, Math.min(maxFreq, shifted));
}

/**
 * Aircraft presets with their typical Mach numbers
 */
export const AIRCRAFT_PRESETS = {
    'Subsonic Jet': 0.85,
    'Sound Barrier': 1.0,
    'Supersonic': 1.5,
    'Concorde': 2.04,
    'SR-71': 2.8
};

