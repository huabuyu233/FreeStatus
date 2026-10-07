export function buildStateLine(values, template) {
    const parts = [];
    for (const field of template.fields) {
        if (!field.inject) {
            continue;
        }
        const v = values[field.key];
        if (v === undefined) {
            continue;
        }
        switch (field.kind) {
            case 'tag': {
                const entries = Object.entries(v);
                parts.push(`${field.label}={${entries.map(([k, x]) => `${k}:${x}`).join(',')}}`);
                break;
            }
            case 'list':
                parts.push(`${field.label}=[${v.join(',')}]`);
                break;
            case 'check':
                parts.push(`${field.label}=${v ? '是' : '否'}`);
                break;
            default:
                parts.push(`${field.label}=${v}`);
        }
    }
    return parts.length ? `当前状态：${parts.join('，')}` : '';
}

export function buildInjectionText(chars, template) {
    const lines = [];
    for (const [name, charState] of Object.entries(chars)) {
        const line = buildStateLine(charState.values, template);
        if (line) {
            lines.push(`【${name}】${line}`);
        }
    }
    return lines.join('\n');
}
