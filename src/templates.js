export const DEFAULT_TEMPLATE = {
    id: 'default',
    name: '通用状态模板',
    version: 1,
    fields: [
        { key: 'affection', label: '好感', kind: 'bar', min: 0, max: 100, color: '#e8577a', default: 0, inject: true, locked: false, sample: 45 },
        { key: 'trust', label: '信任', kind: 'bar', min: 0, max: 100, color: '#57b8e8', default: 0, inject: true, locked: false, sample: 30 },
        { key: 'mood', label: '心情', kind: 'chip', default: '', inject: true, locked: false, sample: '平静' },
        { key: 'condition', label: '状态', kind: 'text', default: '', inject: true, locked: false, sample: '一切正常' },
        { key: 'impressions', label: '印象', kind: 'tag', min: 0, max: 100, default: 0, inject: true, locked: false, note: '键=对象，值=0-100 程度', sample: { 老师: 50 } },
        { key: 'items', label: '随身物品', kind: 'list', default: '', inject: true, locked: false, note: '每条一件物品', sample: ['手机', '钥匙'] },
        { key: 'injured', label: '受伤', kind: 'check', default: false, inject: true, locked: false, sample: false },
    ],
};

export function defaultSettings() {
    return {
        enabled: true,
        sidebarOpen: true,
        hideBlocks: true,
        injection: 'interceptor',
        injectProtocol: true,
        collapsedSections: [],
        templates: [DEFAULT_TEMPLATE],
        activeTemplateId: DEFAULT_TEMPLATE.id,
        ignoredKeys: [],
    };
}

const KIND_DESC = {
    bar: f => `0-${f.max ?? 100} 整数`,
    chip: () => '2-4 字短语',
    text: () => '一句话',
    tag: f => f.note ? `对象，${f.note}` : '对象，键=名称，值=0-100 整数',
    list: f => f.note ? `字符串数组，${f.note}` : '字符串数组',
    check: () => 'true/false',
};

export function buildProtocolPrompt(template, { char = '{{char}}', withStateMacro = true, stateText } = {}) {
    const lines = template.fields.map(f =>
        `- "${f.key}"：${f.label}，${KIND_DESC[f.kind]?.(f) ?? ''}`,
    );
    const example = {};
    for (const f of template.fields) {
        example[f.key] = f.sample !== undefined
            ? f.sample
            : (f.kind === 'tag' ? {} : f.kind === 'list' ? [] : f.kind === 'check' ? Boolean(f.default) : f.kind === 'bar' ? (f.default ?? 0) : (f.default ?? '示例'));
    }
    const exampleJson = JSON.stringify({ _char: char, ...example });
    const body = `【FreeStatus 状态协议】
每条回复的最末尾必须输出一个 \`\`\`fs 代码块，内容只含一个 JSON 对象（不要解释、不要 markdown 说明），描述 ${char} 当前状态。全量快照，字段与键名如下，一个都不能少：

${lines.join('\n')}

规则：
1. 数值变化必须有正文情节依据；正文没体现的变化沿用下方「当前状态」里的值，禁止无故大幅变动。
2. 输出示例（照此格式）：
\`\`\`fs
${exampleJson}
\`\`\`
3. 严格合法 JSON：双引号、无注释、无单引号、无尾逗号。`;
    if (stateText !== undefined) {
        return `${body}\n\n当前状态：\n${stateText}`;
    }
    if (withStateMacro) {
        return `${body}\n\n当前状态：\n{{fs_state}}`;
    }
    return body;
}

export function buildExampleJson(template, char = '{{char}}') {
    const example = {};
    for (const f of template.fields) {
        example[f.key] = f.sample !== undefined
            ? f.sample
            : (f.kind === 'tag' ? {} : f.kind === 'list' ? [] : f.kind === 'check' ? Boolean(f.default) : f.kind === 'bar' ? (f.default ?? 0) : (f.default ?? '示例'));
    }
    return JSON.stringify({ _char: char, ...example });
}

export function getTemplate(settings, templateId) {
    return settings.templates.find(t => t.id === templateId) ?? settings.templates[0];
}
