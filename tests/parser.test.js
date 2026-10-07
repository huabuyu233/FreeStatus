import { describe, it, expect } from 'vitest';
import { parseStatusBlock, coerceValue, inferKind, mergeState, emptyValue } from '../src/parser.js';

const fields = [
    { key: 'affection', label: '好感', kind: 'bar', min: 0, max: 100 },
    { key: 'mood', label: '心情', kind: 'chip' },
    { key: 'injured', label: '受伤', kind: 'check' },
    { key: 'impressions', label: '印象', kind: 'tag', min: 0, max: 100 },
    { key: 'items', label: '随身物品', kind: 'list' },
];

describe('parseStatusBlock', () => {
    it('parses a complete block and splits meta', () => {
        const text = '正文……\n```fs\n{"_char":"玲","affection":72,"mood":"平静"}\n```';
        const parsed = parseStatusBlock(text);
        expect(parsed.meta._char).toBe('玲');
        expect(parsed.values.affection).toBe(72);
        expect(parsed.values.mood).toBe('平静');
    });

    it('returns null on truncated JSON', () => {
        const text = '```fs\n{"affection":72,"mood":';
        expect(parseStatusBlock(text)).toBeNull();
    });

    it('returns null when no block present', () => {
        expect(parseStatusBlock('普通正文')).toBeNull();
    });

    it('takes the last block when several exist', () => {
        const text = '```fs\n{"affection":1}\n```\n中间\n```fs\n{"affection":9}\n```';
        expect(parseStatusBlock(text).values.affection).toBe(9);
    });

    it('rejects non-object JSON', () => {
        expect(parseStatusBlock('```fs\n[1,2]\n```')).toBeNull();
    });

    it('ignores inline mentions of the marker and parses the real block', () => {
        const text = '按协议输出一个 ```fs 代码块，内容如下：\n```fs\n{"affection":72}\n```';
        const parsed = parseStatusBlock(text);
        expect(parsed.values.affection).toBe(72);
    });

    it('requires a line break after the opening fence', () => {
        expect(parseStatusBlock('```fs {"affection":72} ```')).toBeNull();
    });
});

describe('coerceValue', () => {
    it('clamps bar into range', () => {
        expect(coerceValue({ kind: 'bar', min: 0, max: 100 }, 250)).toBe(100);
        expect(coerceValue({ kind: 'bar', min: 0, max: 100 }, -5)).toBe(0);
    });

    it('falls back to default on non-numeric bar', () => {
        expect(coerceValue({ kind: 'bar', min: 0, max: 100, default: 10 }, 'abc')).toBe(10);
    });

    it('accepts strict booleans for check', () => {
        expect(coerceValue({ kind: 'check' }, true)).toBe(true);
        expect(coerceValue({ kind: 'check' }, 'true')).toBe(false);
    });

    it('dedupes and caps list', () => {
        const out = coerceValue({ kind: 'list' }, ['a', 'a', 'b']);
        expect(out).toEqual(['a', 'b']);
    });

    it('keeps tag as object', () => {
        expect(coerceValue({ kind: 'tag', min: 0, max: 100 }, { 老师: 50 })).toEqual({ 老师: 50 });
    });
});

describe('inferKind', () => {
    it('maps value shapes to kinds', () => {
        expect(inferKind(5)).toBe('bar');
        expect(inferKind(true)).toBe('check');
        expect(inferKind(['a'])).toBe('list');
        expect(inferKind({ a: 1 })).toBe('tag');
        expect(inferKind('短')).toBe('chip');
        expect(inferKind('这是一段超过二十四个字符的长文本内容用来测试类型推断')).toBe('text');
    });
});

describe('mergeState', () => {
    it('merges incoming values and fills missing with defaults', () => {
        const { values, unknown } = mergeState({}, { affection: 55, extra: 3 }, fields, {});
        expect(values.affection).toBe(55);
        expect(values.extra).toBe(3);
        expect(unknown).toEqual(['extra']);
        expect(values.mood).toBe('');
        expect(values.injured).toBe(false);
    });

    it('respects locks', () => {
        const prev = { affection: 10, mood: '平静' };
        const { values } = mergeState(prev, { affection: 99, mood: '兴奋' }, fields, { affection: true });
        expect(values.affection).toBe(10);
        expect(values.mood).toBe('兴奋');
    });

    it('preserves values not present in incoming', () => {
        const prev = { affection: 30, mood: '平静' };
        const { values } = mergeState(prev, { affection: 40 }, fields, {});
        expect(values.mood).toBe('平静');
    });
});

describe('emptyValue', () => {
    it('gives type-appropriate empties', () => {
        expect(emptyValue({ kind: 'bar', default: 5 })).toBe(5);
        expect(emptyValue({ kind: 'check' })).toBe(false);
        expect(emptyValue({ kind: 'tag' })).toEqual({});
        expect(emptyValue({ kind: 'list' })).toEqual([]);
        expect(emptyValue({ kind: 'chip' })).toBe('');
    });
});
