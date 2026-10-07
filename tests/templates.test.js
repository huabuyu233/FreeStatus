import { describe, it, expect } from 'vitest';
import { buildProtocolPrompt, DEFAULT_TEMPLATE, defaultSettings } from '../src/templates.js';
import { parseStatusBlock } from '../src/parser.js';

describe('buildProtocolPrompt', () => {
    it('includes field list, one-shot example and macro tail by default', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE);
        expect(text).toContain('【FreeStatus 状态协议】');
        expect(text).toContain('只输出当前有值的字段');
        expect(text).toContain('- "affection"：好感，0-100 整数');
        expect(text).toContain('```fs');
        expect(text).toContain('当前状态：\n{{fs_state}}');
    });

    it('uses field notes in the protocol lines', () => {
        const template = {
            id: 'x', name: 'x', version: 1,
            fields: [
                { key: 'inner', label: '内心', kind: 'text', note: '一句话真心话；角色卡或预设已有内心独白输出时省略此字段' },
            ],
        };
        const text = buildProtocolPrompt(template);
        expect(text).toContain('一句话真心话；角色卡或预设已有内心独白输出时省略此字段');
    });

    it('appends given state text when provided', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE, { char: '玲', stateText: '当前状态：好感=45' });
        expect(text).toContain('描述 玲 当前状态');
        expect(text).toContain('当前状态：\n当前状态：好感=45');
        expect(text).not.toContain('{{fs_state}}');
    });

    it('drops the state tail when macro disabled and no state given', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE, { withStateMacro: false });
        expect(text).not.toContain('{{fs_state}}');
        expect(text.trim().endsWith('无尾逗号。')).toBe(true);
    });

    it('produces a parseable example block', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE, { char: '玲' });
        const parsed = parseStatusBlock(text);
        expect(parsed).not.toBeNull();
        expect(parsed.meta._char).toBe('玲');
        expect(parsed.values.affection).toBe(45);
    });

    it('builds a sparse example with one field per kind', () => {
        const text = buildProtocolPrompt(DEFAULT_TEMPLATE, { char: '玲' });
        const parsed = parseStatusBlock(text);
        expect(Object.keys(parsed.values)).toHaveLength(6);
        expect(parsed.values.trust).toBeUndefined();
    });
});

describe('defaultSettings', () => {
    it('ships default template and protocol injection on', () => {
        const s = defaultSettings();
        expect(s.injection).toBe('interceptor');
        expect(s.injectProtocol).toBe(true);
        expect(s.showEmptyFields).toBe(false);
        expect(s.collapsedSections).toEqual([]);
        expect(s.templates[0].id).toBe('default');
        expect(s.templates[0].fields.length).toBeGreaterThan(0);
    });
});
