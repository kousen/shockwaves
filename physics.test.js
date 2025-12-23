import { describe, it, expect } from 'vitest';
import {
    SPEED_OF_SOUND,
    AIRCRAFT_PRESETS,
    calculateMachAngle,
    calculateMachAngleDegrees,
    getFlightRegime,
    isSupersonic,
    machToSpeed,
    speedToMach,
    calculateDopplerShift,
    hasWaveCrossedObserver,
    distance,
    calculateObservedFrequency,
    isSonicBoom,
    calculatePulseFrequency,
    calculateDopplerFrequency
} from './physics.js';

describe('SPEED_OF_SOUND constants', () => {
    it('should have correct speed of sound in mph', () => {
        expect(SPEED_OF_SOUND.MPH).toBe(767);
    });

    it('should have correct speed of sound in km/h', () => {
        expect(SPEED_OF_SOUND.KMH).toBe(1235);
    });

    it('should have correct speed of sound in m/s', () => {
        expect(SPEED_OF_SOUND.MS).toBe(343);
    });
});

describe('calculateMachAngle', () => {
    it('should return NaN for subsonic speeds (mach < 1)', () => {
        expect(calculateMachAngle(0.5)).toBeNaN();
        expect(calculateMachAngle(0.99)).toBeNaN();
    });

    it('should return NaN for sonic speed (mach = 1)', () => {
        expect(calculateMachAngle(1)).toBeNaN();
    });

    it('should return angle approaching PI/2 (90°) as mach approaches 1', () => {
        // As mach approaches 1 from above, angle approaches 90°
        // At mach = 1.001, sin(θ) = 1/1.001 ≈ 0.999, so θ ≈ 87.4°
        const angle = calculateMachAngle(1.001);
        expect(angle).toBeGreaterThan(Math.PI / 2 - 0.1); // > ~80°
        expect(angle).toBeLessThan(Math.PI / 2); // < 90°
    });

    it('should return correct angle for mach = 2', () => {
        // sin(θ) = 1/2, so θ = 30° = PI/6
        const angle = calculateMachAngle(2);
        expect(angle).toBeCloseTo(Math.PI / 6, 10);
    });

    it('should return smaller angles for higher mach numbers', () => {
        const angle2 = calculateMachAngle(2);
        const angle3 = calculateMachAngle(3);
        expect(angle3).toBeLessThan(angle2);
    });
});

describe('calculateMachAngleDegrees', () => {
    it('should return NaN for subsonic speeds', () => {
        expect(calculateMachAngleDegrees(0.5)).toBeNaN();
    });

    it('should return 30° for mach = 2', () => {
        expect(calculateMachAngleDegrees(2)).toBeCloseTo(30, 5);
    });

    it('should return approximately 19.47° for mach = 3', () => {
        // sin(θ) = 1/3, θ ≈ 19.47°
        expect(calculateMachAngleDegrees(3)).toBeCloseTo(19.47, 1);
    });
});

describe('getFlightRegime', () => {
    it('should return "subsonic" for mach < 1', () => {
        expect(getFlightRegime(0)).toBe('subsonic');
        expect(getFlightRegime(0.5)).toBe('subsonic');
        expect(getFlightRegime(0.99)).toBe('subsonic');
    });

    it('should return "sonic" for mach = 1', () => {
        expect(getFlightRegime(1)).toBe('sonic');
    });

    it('should return "supersonic" for mach > 1', () => {
        expect(getFlightRegime(1.01)).toBe('supersonic');
        expect(getFlightRegime(2)).toBe('supersonic');
        expect(getFlightRegime(3)).toBe('supersonic');
    });
});

describe('isSupersonic', () => {
    it('should return false for subsonic and sonic speeds', () => {
        expect(isSupersonic(0)).toBe(false);
        expect(isSupersonic(0.5)).toBe(false);
        expect(isSupersonic(1)).toBe(false);
    });

    it('should return true for supersonic speeds', () => {
        expect(isSupersonic(1.01)).toBe(true);
        expect(isSupersonic(2)).toBe(true);
    });
});

describe('machToSpeed', () => {
    it('should return 0 for mach = 0', () => {
        const speed = machToSpeed(0);
        expect(speed.mph).toBe(0);
        expect(speed.kmh).toBe(0);
        expect(speed.ms).toBe(0);
    });

    it('should return speed of sound values for mach = 1', () => {
        const speed = machToSpeed(1);
        expect(speed.mph).toBe(767);
        expect(speed.kmh).toBe(1235);
        expect(speed.ms).toBe(343);
    });

    it('should return doubled values for mach = 2', () => {
        const speed = machToSpeed(2);
        expect(speed.mph).toBe(1534);
        expect(speed.kmh).toBe(2470);
        expect(speed.ms).toBe(686);
    });
});

describe('speedToMach', () => {
    it('should convert mph to mach correctly', () => {
        expect(speedToMach(767, 'mph')).toBeCloseTo(1, 5);
        expect(speedToMach(1534, 'mph')).toBeCloseTo(2, 5);
    });

    it('should convert km/h to mach correctly', () => {
        expect(speedToMach(1235, 'kmh')).toBeCloseTo(1, 5);
    });

    it('should convert m/s to mach correctly', () => {
        expect(speedToMach(343, 'ms')).toBeCloseTo(1, 5);
    });

    it('should default to mph if no unit specified', () => {
        expect(speedToMach(767)).toBeCloseTo(1, 5);
    });
});

describe('calculateDopplerShift', () => {
    it('should return 1 (no shift) when source is at rest', () => {
        const shift = calculateDopplerShift(0, 100, 50, 50, 50, true);
        expect(shift).toBe(1);
    });

    it('should return 1 for very low mach numbers', () => {
        const shift = calculateDopplerShift(0.005, 100, 50, 50, 50, true);
        expect(shift).toBe(1);
    });

    it('should return > 1 (blue shift) when observer is ahead in moving source mode', () => {
        // Observer at x=200, source at x=100, moving right
        const shift = calculateDopplerShift(0.5, 200, 50, 100, 50, true);
        expect(shift).toBeGreaterThan(1);
    });

    it('should return < 1 (red shift) when observer is behind in moving source mode', () => {
        // Observer at x=50, source at x=100, moving right
        const shift = calculateDopplerShift(0.5, 50, 50, 100, 50, true);
        expect(shift).toBeLessThan(1);
    });

    it('should clamp shift to range [0.3, 3]', () => {
        // Extreme case - should be clamped
        const shift = calculateDopplerShift(3, 1000, 50, 50, 50, true);
        expect(shift).toBeLessThanOrEqual(3);
        expect(shift).toBeGreaterThanOrEqual(0.3);
    });

    it('should return 1 when observer is at same position as source', () => {
        const shift = calculateDopplerShift(1, 100, 100, 100, 100, true);
        expect(shift).toBe(1);
    });
});

describe('hasWaveCrossedObserver', () => {
    it('should return true when wave crosses observer', () => {
        // Wave was at radius 50, now at 60, observer at distance 55
        expect(hasWaveCrossedObserver(50, 60, 55)).toBe(true);
    });

    it('should return false when wave has not reached observer', () => {
        // Wave at radius 50, now 60, observer at distance 70
        expect(hasWaveCrossedObserver(50, 60, 70)).toBe(false);
    });

    it('should return false when wave already passed observer', () => {
        // Wave was at radius 60, now 70, observer at distance 55
        expect(hasWaveCrossedObserver(60, 70, 55)).toBe(false);
    });

    it('should return true at exact boundary', () => {
        // Wave exactly reaches observer
        expect(hasWaveCrossedObserver(50, 60, 60)).toBe(true);
    });
});

describe('distance', () => {
    it('should return 0 for same point', () => {
        expect(distance(10, 20, 10, 20)).toBe(0);
    });

    it('should calculate horizontal distance correctly', () => {
        expect(distance(0, 0, 10, 0)).toBe(10);
    });

    it('should calculate vertical distance correctly', () => {
        expect(distance(0, 0, 0, 10)).toBe(10);
    });

    it('should calculate diagonal distance correctly (3-4-5 triangle)', () => {
        expect(distance(0, 0, 3, 4)).toBe(5);
    });

    it('should work with negative coordinates', () => {
        expect(distance(-5, -5, 5, 5)).toBeCloseTo(Math.sqrt(200), 10);
    });
});

describe('calculateObservedFrequency', () => {
    it('should return 0 with no hits', () => {
        expect(calculateObservedFrequency([], 1000)).toBe(0);
    });

    it('should return 0 with only one hit', () => {
        expect(calculateObservedFrequency([500], 1000)).toBe(0);
    });

    it('should calculate frequency from multiple hits', () => {
        // 4 hits in 2 seconds = 2 waves/sec
        const hits = [100, 600, 1100, 1600];
        expect(calculateObservedFrequency(hits, 2000, 2000)).toBe(2);
    });

    it('should only count hits within the time window', () => {
        // Only 2 hits are within 2000ms of current time (5000)
        const hits = [1000, 2000, 4000, 4500];
        expect(calculateObservedFrequency(hits, 5000, 2000)).toBe(1);
    });
});

describe('isSonicBoom', () => {
    it('should return false for subsonic speeds', () => {
        expect(isSonicBoom(5, 0.9)).toBe(false);
    });

    it('should return false for sonic speed (mach = 1)', () => {
        expect(isSonicBoom(5, 1)).toBe(false);
    });

    it('should return false when not enough waves hit', () => {
        expect(isSonicBoom(2, 2)).toBe(false);
    });

    it('should return true when threshold waves hit at supersonic speed', () => {
        expect(isSonicBoom(3, 2)).toBe(true);
        expect(isSonicBoom(5, 1.5)).toBe(true);
    });

    it('should respect custom threshold', () => {
        expect(isSonicBoom(4, 2, 5)).toBe(false);
        expect(isSonicBoom(5, 2, 5)).toBe(true);
    });
});

describe('calculatePulseFrequency', () => {
    it('should return 200 Hz at mach = 0', () => {
        expect(calculatePulseFrequency(0)).toBe(200);
    });

    it('should return 800 Hz at mach = 3', () => {
        expect(calculatePulseFrequency(3)).toBe(800);
    });

    it('should return 500 Hz at mach = 1.5 (midpoint)', () => {
        expect(calculatePulseFrequency(1.5)).toBe(500);
    });

    it('should interpolate linearly', () => {
        expect(calculatePulseFrequency(1)).toBeCloseTo(400, 5);
        expect(calculatePulseFrequency(2)).toBeCloseTo(600, 5);
    });
});

describe('calculateDopplerFrequency', () => {
    it('should return base frequency when shift is 1', () => {
        expect(calculateDopplerFrequency(400, 1)).toBe(400);
    });

    it('should increase frequency for blue shift (> 1)', () => {
        expect(calculateDopplerFrequency(400, 1.5)).toBe(600);
    });

    it('should decrease frequency for red shift (< 1)', () => {
        expect(calculateDopplerFrequency(400, 0.5)).toBe(200);
    });

    it('should clamp to minimum frequency', () => {
        expect(calculateDopplerFrequency(400, 0.1)).toBe(100);
    });

    it('should clamp to maximum frequency', () => {
        expect(calculateDopplerFrequency(400, 10)).toBe(1200);
    });

    it('should respect custom min/max', () => {
        expect(calculateDopplerFrequency(400, 0.1, 50, 500)).toBe(50);
        expect(calculateDopplerFrequency(400, 10, 50, 500)).toBe(500);
    });
});

describe('AIRCRAFT_PRESETS', () => {
    it('should have correct preset values', () => {
        expect(AIRCRAFT_PRESETS['Subsonic Jet']).toBe(0.85);
        expect(AIRCRAFT_PRESETS['Sound Barrier']).toBe(1.0);
        expect(AIRCRAFT_PRESETS['Supersonic']).toBe(1.5);
        expect(AIRCRAFT_PRESETS['Concorde']).toBe(2.04);
        expect(AIRCRAFT_PRESETS['SR-71']).toBe(2.8);
    });

    it('should have 5 presets', () => {
        expect(Object.keys(AIRCRAFT_PRESETS)).toHaveLength(5);
    });
});

