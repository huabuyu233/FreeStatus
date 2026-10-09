import { describe, it, expect } from 'vitest';
import { FX, FX_IDS, fxIntensity, particleStep } from '../src/fx.js';
import { buildProtocolPrompt, DEFAULT_TEMPLATE } from '../src/templates.js';

describe('fx registry', () => {
    it('has 6 unique ids', () => {
        expect(FX.length).toBe(6);
        expect(FX_IDS.size).toBe(6);
        const ids = FX.map(f => f.id);
        expect(new Set(ids).size).toBe(6);
    });

    it('keeps only the approved ids', () => {
        expect([...FX_IDS].sort()).toEqual(['hearts', 'shiver', 'sparkle', 'stars', 'sway', 'wave']);
    });

    it('every fx has id, label, desc, kinds', () => {
        for (const f of FX) {
            expect(f.id).toBeTruthy();
            expect(f.label).toBeTruthy();
            expect(f.desc).toBeTruthy();
            expect(Array.isArray(f.kind)).toBe(true);
        }
    });
});

describe('fxIntensity', () => {
    it('hearts and sparkle scale with value', () => {
        const h = fxIntensity('hearts');
        expect(h).toBeTruthy();
        expect(h.max).toBeGreaterThan(h.min);
        expect(h.dur[0]).toBeGreaterThan(h.dur[1]);
        expect(fxIntensity('sparkle')).toBeTruthy();
    });

    it('other ids have no intensity config', () => {
        expect(fxIntensity('wave')).toBeNull();
        expect(fxIntensity('shiver')).toBeNull();
        expect(fxIntensity('stars')).toBeNull();
    });
});

describe('particleStep', () => {
    it('particle ids have positive step', () => {
        expect(particleStep('hearts')).toBeGreaterThan(0);
        expect(particleStep('sparkle')).toBeGreaterThan(0);
        expect(particleStep('stars')).toBeGreaterThan(0);
    });

    it('non-particle ids have step 0', () => {
        expect(particleStep('shiver')).toBe(0);
        expect(particleStep('sway')).toBe(0);
        expect(particleStep('wave')).toBe(0);
    });

    it('unknown id -> 0', () => {
        expect(particleStep('nonexistent')).toBe(0);
    });
});

describe('fx 不泄漏进协议', () => {
    it('buildProtocolPrompt does not contain fx ids', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE);
        for (const id of FX_IDS) {
            expect(text).not.toContain(`fx`);
            expect(text).not.toContain(id);
        }
    });

    it('protocol prompt contains only field metadata', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE);
        expect(text).toContain('affection');
        expect(text).toContain('好感');
        expect(text).toContain('0-100 整数');
    });
});
