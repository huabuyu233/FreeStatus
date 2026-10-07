export function buildStateLine(values, template) {
    const parts = [];
    for (const field of template.fields) {
        if (!field.inject) {
            continue;
        }
        const v = values[field.key];
        if (v === undefined || v === null || v === '') {
            continue;
        }
        switch (field.kind) {
            case 'tag': {
                if (typeof v !== 'object' || !Object.keys(v).length) {
                    continue;
                }
                const entries = Object.entries(v);
                parts.push(`${field.label}={${entries.map(([k, x]) => `${k}:${x}`).join(',')}}`);
                break;
            }
            case 'list': {
                if (!Array.isArray(v) || !v.length) {
                    continue;
                }
                parts.push(`${field.label}=[${v.join(',')}]`);
                break;
            }
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
