export const KINDS = ['bar', 'chip', 'text', 'tag', 'list', 'check'];

const FS_BLOCK_RE = /```fs[ \t]*\r?\n([\s\S]*?)```/g;

export function parseStatusBlock(text) {
    if (typeof text !== 'string' || !text) {
        return null;
    }
    const re = new RegExp(FS_BLOCK_RE.source, 'g');
    let match;
    let last = null;
    while ((match = re.exec(text)) !== null) {
        last = match[1];
    }
    if (last === null) {
        return null;
    }
    let obj;
    try {
        obj = JSON.parse(last.trim());
    } catch {
        return null;
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return null;
    }
    const meta = {};
    const values = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('_')) {
            meta[key] = value;
        } else {
            values[key] = value;
        }
    }
    return { meta, values };
}

export function inferKind(value) {
    if (typeof value === 'number') {
        return 'bar';
    }
    if (typeof value === 'boolean') {
        return 'check';
    }
    if (Array.isArray(value)) {
        return 'list';
    }
    if (value && typeof value === 'object') {
        return 'tag';
    }
    return String(value).length <= 24 ? 'chip' : 'text';
}

export function coerceValue(field, raw) {
    const kind = field.kind;
    const min = Number.isFinite(field.min) ? field.min : 0;
    const max = Number.isFinite(field.max) ? field.max : 100;
    switch (kind) {
        case 'bar': {
            const n = typeof raw === 'number' ? raw : Number(raw);
            if (!Number.isFinite(n)) {
                return Number.isFinite(field.default) ? field.default : min;
            }
            return Math.min(max, Math.max(min, n));
        }
        case 'check': {
            if (typeof raw === 'boolean') {
                return raw;
            }
            return Boolean(field.default);
        }
        case 'tag': {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
                return {};
            }
            const out = {};
            for (const [k, v] of Object.entries(raw)) {
                if (typeof v === 'number' && Number.isFinite(v)) {
                    out[k] = Math.min(max, Math.max(min, v));
                } else if (typeof v === 'boolean') {
                    out[k] = v;
                } else {
                    out[k] = String(v).slice(0, 40);
                }
            }
            return out;
        }
        case 'list': {
            const arr = Array.isArray(raw) ? raw : [raw];
            const seen = new Set();
            const out = [];
            for (const item of arr) {
                const s = String(item).slice(0, 40);
                if (!s || seen.has(s)) {
                    continue;
                }
                seen.add(s);
                out.push(s);
                if (out.length >= 20) {
                    break;
                }
            }
            return out;
        }
        case 'chip':
            return String(raw ?? field.default ?? '').slice(0, 24);
        case 'text':
            return String(raw ?? field.default ?? '').slice(0, 2000);
        default:
            return raw;
    }
}

export function emptyValue(field) {
    switch (field.kind) {
        case 'bar':
            return Number.isFinite(field.default) ? field.default : 0;
        case 'check':
            return Boolean(field.default);
        case 'tag':
            return {};
        case 'list':
            return [];
        default:
            return '';
    }
}

export function mergeState(prevValues, incoming, fields, locks = {}) {
    const values = { ...prevValues };
    const byKey = new Map(fields.map(f => [f.key, f]));
    const unknown = [];
    for (const [key, raw] of Object.entries(incoming)) {
        if (locks[key]) {
            continue;
        }
        const field = byKey.get(key);
        if (field) {
            values[key] = coerceValue(field, raw);
        } else {
            const kind = inferKind(raw);
            values[key] = coerceValue({ kind, min: 0, max: 100 }, raw);
            unknown.push(key);
        }
    }
    for (const field of fields) {
        if (!(field.key in values)) {
            values[field.key] = emptyValue(field);
        }
    }
    return { values, unknown };
}
