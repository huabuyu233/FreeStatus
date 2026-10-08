import { describe, it, expect } from 'vitest';
import { FX, FX_IDS, iconState, particleStep } from '../src/fx.js';
import { buildProtocolPrompt, DEFAULT_TEMPLATE } from '../src/templates.js';

describe('fx registry', () => {
    it('has 22 unique ids', () => {
        expect(FX.length).toBe(22);
        expect(FX_IDS.size).toBe(22);
        const ids = FX.map(f => f.id);
        expect(new Set(ids).size).toBe(22);
    });

    it('every fx has id, label, desc, kinds', () => {
        for (const f of FX) {
            expect(f.id).toBeTruthy();
            expect(f.label).toBeTruthy();
            expect(f.desc).toBeTruthy();
            expect(Array.isArray(f.kind)).toBe(true);
        }
    });

    it('includes milk/engorge/spray state ids', () => {
        expect(FX_IDS.has('milk')).toBe(true);
        expect(FX_IDS.has('engorge')).toBe(true);
        expect(FX_IDS.has('spray')).toBe(true);
    });
});

describe('iconState (milk 三态判定)', () => {
    it('empty / no value -> idle', () => {
        expect(iconState({}, null)).toBe('idle');
        expect(iconState({}, undefined)).toBe('idle');
        expect(iconState({}, '')).toBe('idle');
        expect(iconState({}, {})).toBe('idle');
    });

    it('没涨 -> idle', () => {
        expect(iconState({}, { 乳汁: '没涨' })).toBe('idle');
        expect(iconState({}, { 乳汁: '没涨，正常' })).toBe('idle');
    });

    it('涨 -> engorge', () => {
        expect(iconState({}, { 乳汁: '微涨' })).toBe('engorge');
        expect(iconState({}, { 乳汁: '涨硬' })).toBe('engorge');
        expect(iconState({}, { 乳汁: '涨到发痛' })).toBe('engorge');
    });

    it('溢/喷 -> spray', () => {
        expect(iconState({}, { 乳汁: '溢奶' })).toBe('spray');
        expect(iconState({}, { 乳汁: '正在溢出' })).toBe('spray');
        expect(iconState({}, { 乳汁: '喷出' })).toBe('spray');
    });

    it('uses first entry value', () => {
        expect(iconState({}, { a: '涨', b: '溢' })).toBe('engorge');
    });
});

describe('particleStep', () => {
    it('particle ids have positive step', () => {
        expect(particleStep('hearts')).toBeGreaterThan(0);
        expect(particleStep('sparkle')).toBeGreaterThan(0);
        expect(particleStep('spray')).toBeGreaterThan(0);
    });

    it('non-particle ids have step 0', () => {
        expect(particleStep('sigil')).toBe(0);
        expect(particleStep('hypno')).toBe(0);
        expect(particleStep('breathe')).toBe(0);
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
