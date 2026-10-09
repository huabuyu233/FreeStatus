export const DEFAULT_TEMPLATE = {
    id: 'default',
    name: '通用状态模板',
    version: 1,
    fields: [
        { key: 'affection', label: '好感', kind: 'bar', min: 0, max: 100, color: '#e8577a', default: 0, inject: true, locked: false, fx: 'hearts', sample: 45 },
        { key: 'trust', label: '信任', kind: 'bar', min: 0, max: 100, color: '#57b8e8', default: 0, inject: true, locked: false, fx: 'wave', sample: 30 },
        { key: 'mood', label: '心情', kind: 'chip', default: '', inject: true, locked: false, fx: 'sparkle', sample: '平静' },
        { key: 'condition', label: '状态', kind: 'text', default: '', inject: true, locked: false, sample: '一切正常' },
        { key: 'impressions', label: '印象', kind: 'tag', min: 0, max: 100, default: 0, inject: true, locked: false, fx: 'sparkle', note: '键=对象，值=0-100 程度', sample: { 老师: 50 } },
        { key: 'items', label: '随身物品', kind: 'list', default: '', inject: true, locked: false, sample: ['手机', '钥匙'] },
        { key: 'injured', label: '受伤', kind: 'check', default: false, inject: true, locked: false, fx: 'stars', sample: true },
    ],
};

export function defaultSettings() {
    return {
        enabled: true,
        sidebarOpen: false,
        hideBlocks: true,
        injection: 'interceptor',
        injectProtocol: true,
        showEmptyFields: false,
        animations: true,
        collapsedSections: [],
        templates: [DEFAULT_TEMPLATE],
        activeTemplateId: DEFAULT_TEMPLATE.id,
        ignoredKeys: [],
    };
}

const KIND_DESC = {
    bar: f => `0-${f.max ?? 100} 整数${f.note ? `，${f.note}` : ''}（无该状态时省略，不要用 0 占位）`,
    chip: f => f.note || '2-4 字短语',
    text: f => f.note || '一句话',
    tag: f => f.note ? `对象，${f.note}` : '对象，键=名称，值=0-100 整数',
    list: f => f.note ? `字符串数组，${f.note}` : '字符串数组',
    check: f => `${f.note || 'true/false'}（仅成立时输出）`,
};

function exampleValue(f) {
    return f.sample !== undefined
        ? f.sample
        : (f.kind === 'tag' ? {} : f.kind === 'list' ? [] : f.kind === 'check' ? Boolean(f.default) : f.kind === 'bar' ? (f.default ?? 0) : (f.default ?? '示例'));
}

export function buildExampleJson(template, char = '{{char}}') {
    const seenKinds = new Set();
    const example = {};
    for (const f of template.fields) {
        if (!seenKinds.has(f.kind)) {
            seenKinds.add(f.kind);
            example[f.key] = exampleValue(f);
        }
    }
    return JSON.stringify({ _char: char, ...example });
}

export function buildProtocolPrompt(template, { char = '{{char}}', withStateMacro = true, stateText } = {}) {
    const lines = template.fields.map(f =>
        `- "${f.key}"：${f.label}，${KIND_DESC[f.kind]?.(f) ?? ''}`,
    );
    const exampleJson = buildExampleJson(template, char);
    const body = `【FreeStatus 状态协议】
每条回复的最末尾必须输出一个 \`\`\`fs 代码块，内容只含一个 JSON 对象（不要解释、不要 markdown 说明），描述 ${char} 当前状态。只输出当前有值的字段，字段与键名如下：

${lines.join('\n')}

规则：
1. 宁缺勿滥：状态栏只反映角色当前真正有的状态，不要为了凑满而输出。没有的状态（例如角色并不恐惧、不疲劳）就不要输出对应字段，也不要用 0 或空值占位。
2. 只输出当前有值的字段：没有值、不适用或剧情未涉及的字段省略该键；上轮有值但本轮已无值的字段也必须省略该键（省略即清空）。数值字段只在明显存在该状态时给出，处于基准或无明显变化的状态不输出；布尔字段只在成立时输出。
3. 上轮已有值且本轮仍有意义的字段继续输出，禁止无故丢弃；数值变化必须有正文情节依据，正文没体现的变化沿用下方「当前状态」里的值。
4. 输出示例（仅示意格式与省略方式，实际键集合按当前有值字段而定）：
\`\`\`fs
${exampleJson}
\`\`\`
5. 严格合法 JSON：双引号、无注释、无单引号、无尾逗号。`;
    if (stateText !== undefined) {
        return `${body}\n\n当前状态：\n${stateText}`;
    }
    if (withStateMacro) {
        return `${body}\n\n当前状态：\n{{fs_state}}`;
    }
    return body;
}

export function getTemplate(settings, templateId) {
    return settings.templates.find(t => t.id === templateId) ?? settings.templates[0];
}
