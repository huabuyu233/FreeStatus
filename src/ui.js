import { coerceValue, emptyValue, inferKind } from './parser.js';
import { getActiveTemplate, getSettings, getChatState, getCharState, setCharLock, updateCharValues, saveChatState, saveSettings } from './state.js';
import { FX_IDS, iconState, particleStep } from './fx.js';

let rootEl = null;
let toggleEl = null;
let lastRenderedValues = new Map(); // charName -> JSON.stringify(values)

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) {
        node.className = cls;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

/** 注入粒子层（4 个 <i>，交错延迟） */
function injectParticles(container, id) {
    const step = particleStep(id);
    if (!step) {
        return;
    }
    const layer = el('span', 'fs-fx-particles');
    for (let i = 0; i < 4; i++) {
        const p = el('i');
        p.style.animationDelay = `${-i * step}ms`;
        layer.appendChild(p);
    }
    container.appendChild(layer);
}

/** 值变化时的一次性反馈类 */
function markChanged(box, charName, fieldKey) {
    const last = lastRenderedValues.get(charName);
    if (!last) {
        return; // 首次渲染不闪
    }
    const prev = JSON.parse(last)[fieldKey];
    const curr = getCharState(charName).values[fieldKey];
    if (JSON.stringify(prev) !== JSON.stringify(curr)) {
        box.classList.add('fs-changed');
    }
}

function renderValueNode(field, value, onChange, fxId) {
    const kind = field.kind;

    // milk 状态图标：值不显示文字，只显示图标 + 三态动画（优先于 kind 分支）
    if (fxId === 'milk') {
        const iconWrap = el('div', 'fs-milk-icon');
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" class="fs-milk-svg">
            <path d="M4 16c0-5 3.5-9 8-9s8 4 8 9c-2.5 2-5.5 3-8 3s-5.5-1-8-3z" />
            <circle class="fs-milk-nipple" cx="12" cy="12.2" r="1.4" />
        </svg>`;
        iconWrap.title = Object.entries(value && typeof value === 'object' ? value : {}).map(([k, v]) => `${k}:${v}`).join(', ') || '无';
        const state = iconState(field, value);
        iconWrap.classList.add(`fs-milk-${state}`);
        iconWrap.addEventListener('click', () => editTag(value && typeof value === 'object' ? value : {}, onChange));
        return iconWrap;
    }

    if (kind === 'bar') {
        const wrap = el('div', 'fs-bar');
        const fill = el('div', 'fs-bar-fill');
        const max = field.max ?? 100;
        const min = field.min ?? 0;
        const cur = Number.isFinite(value) ? value : min;
        const pct = Math.round(((cur - min) / Math.max(1, max - min)) * 100);
        fill.style.width = `${pct}%`;
        fill.style.background = field.color || 'var(--fs-accent)';
        wrap.appendChild(fill);
        wrap.addEventListener('click', e => {
            const rect = wrap.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            onChange(Math.round(min + ratio * (max - min)));
        });
        return wrap;
    }
    if (kind === 'check') {
        const badge = el('button', `fs-check${value ? ' on' : ''}`, value ? '✓' : '—');
        badge.addEventListener('click', () => onChange(!value));
        return badge;
    }
    if (kind === 'tag') {
        const wrap = el('div', 'fs-tag');
        const entries = value && typeof value === 'object' ? value : {};
        for (const [k, v] of Object.entries(entries)) {
            const row = el('div', 'fs-tag-row');
            row.appendChild(el('span', 'fs-tag-key', k));
            row.appendChild(el('span', 'fs-tag-val', String(v)));
            wrap.appendChild(row);
        }
        if (!Object.keys(entries).length) {
            wrap.appendChild(el('span', 'fs-empty', '无'));
        }
        wrap.addEventListener('click', () => editTag(entries, onChange));
        return wrap;
    }
    if (kind === 'list') {
        const wrap = el('div', 'fs-list');
        const items = Array.isArray(value) ? value : [];
        for (const item of items) {
            wrap.appendChild(el('span', 'fs-chip', item));
        }
        if (!items.length) {
            wrap.appendChild(el('span', 'fs-empty', '无'));
        }
        wrap.addEventListener('click', () => editList(items, onChange));
        return wrap;
    }
    const chip = el('span', kind === 'chip' ? 'fs-chip' : 'fs-text', value || '—');
    chip.addEventListener('click', () => editText(value, onChange, chip));
    return chip;
}

function editText(value, onChange, anchor) {
    const input = el('input', 'fs-inline-input');
    input.value = value ?? '';
    const parent = anchor.closest('.fs-row-value');
    if (parent) {
        parent.innerHTML = '';
        parent.appendChild(input);
        input.focus();
        input.select();
        const commit = () => onChange(input.value);
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                commit();
            }
            if (e.key === 'Escape') {
                onChange(value, true);
            }
        });
    }
}

function editList(value, onChange) {
    const next = prompt('每行一条（部位:衣物(状态)）', value.join('\n'));
    if (next === null) {
        return;
    }
    onChange(next.split('\n').map(s => s.trim()).filter(Boolean));
}

function editTag(value, onChange) {
    const next = prompt('每行「键:值」', Object.entries(value).map(([k, v]) => `${k}:${v}`).join('\n'));
    if (next === null) {
        return;
    }
    const out = {};
    for (const line of next.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
            out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
    }
    onChange(out);
}

function renderRow(charName, field, value, isUnknown) {
    const template = getActiveTemplate();
    const charState = getCharState(charName);
    const row = el('div', 'fs-row');
    if (isUnknown) {
        row.classList.add('fs-unknown');
    }
    const label = el('div', 'fs-row-label', field.label);
    row.appendChild(label);
    const valueBox = el('div', 'fs-row-value');
    const settings = getSettings();
    const fxId = !isUnknown && settings.animations !== false && field.fx && FX_IDS.has(field.fx)
        ? field.fx
        : null;
    const effective = isUnknown ? { kind: inferKind(value), min: 0, max: 100 } : field;
    const node = renderValueNode(effective, value, (next, revert) => {
        const values = { ...getCharState(charName).values };
        if (revert) {
            renderSidebar();
            return;
        }
        values[field.key] = coerceValue(effective, next);
        updateCharValues(charName, values);
        if (!isUnknown) {
            setCharLock(charName, field.key, true);
        }
        renderSidebar();
    }, fxId);
    valueBox.appendChild(node);
    if (fxId) {
        valueBox.classList.add('fs-fx', `fs-fx-${fxId}`);
        valueBox.style.setProperty('--fs-fx-color', field.color || 'var(--fs-accent)');
        injectParticles(valueBox, fxId);
        markChanged(valueBox, charName, field.key);
    }
    row.appendChild(valueBox);
    if (!isUnknown) {
        const lockBtn = el('button', `fs-lock${charState.locks[field.key] ? ' on' : ''}`, '🔒');
        lockBtn.title = '锁定后忽略 AI 更新';
        lockBtn.addEventListener('click', () => {
            setCharLock(charName, field.key, !charState.locks[field.key]);
            renderSidebar();
        });
        row.appendChild(lockBtn);
    } else {
        const adopt = el('button', 'fs-adopt', '收编');
        adopt.title = '加入当前模板';
        adopt.addEventListener('click', () => {
            template.fields.push({
                key: field.key,
                label: field.key,
                kind: inferKind(value),
                min: 0,
                max: 100,
                default: emptyValue(effective),
                inject: true,
                locked: false,
            });
            saveSettings();
            renderSidebar();
        });
        const ignore = el('button', 'fs-ignore', '忽略');
        ignore.addEventListener('click', () => {
            const settings = getSettings();
            settings.ignoredKeys = settings.ignoredKeys || [];
            if (!settings.ignoredKeys.includes(field.key)) {
                settings.ignoredKeys.push(field.key);
            }
            saveSettings();
            renderSidebar();
        });
        row.appendChild(adopt);
        row.appendChild(ignore);
    }
    return row;
}

function renderCard(charName) {
    const template = getActiveTemplate();
    const chatState = getChatState();
    const charState = getCharState(charName);
    const collapsed = !!chatState.collapsed[charName];
    const card = el('div', 'fs-card');
    const head = el('div', 'fs-card-head');
    head.appendChild(el('span', `fs-caret${collapsed ? '' : ' open'}`, '▸'));
    head.appendChild(el('span', 'fs-char-name', charName));
    const summary = el('span', 'fs-summary');
    const moodField = template.fields.find(f => f.kind === 'chip' && charState.values[f.key]);
    if (moodField) {
        summary.appendChild(el('span', 'fs-chip mini', charState.values[moodField.key]));
    }
    const barField = template.fields.find(f => f.kind === 'bar' && charState.values[f.key] !== undefined);
    if (barField) {
        summary.appendChild(el('span', 'fs-mini-val', `${barField.label} ${charState.values[barField.key]}`));
    }
    head.appendChild(summary);
    head.addEventListener('click', () => {
        chatState.collapsed[charName] = !collapsed;
        saveChatState();
        renderSidebar();
    });
    card.appendChild(head);
    if (!collapsed) {
        const body = el('div', 'fs-card-body');
        const showEmpty = !!getSettings().showEmptyFields;
        let hidden = 0;
        let rendered = 0;
        for (const field of template.fields) {
            const value = charState.values[field.key];
            if (value === undefined) {
                hidden += 1;
                if (!showEmpty) {
                    continue;
                }
                body.appendChild(renderRow(charName, field, emptyValue(field), false));
            } else {
                body.appendChild(renderRow(charName, field, value, false));
            }
            rendered += 1;
        }
        if (!rendered) {
            body.appendChild(el('div', 'fs-empty-state', '暂无有值字段'));
        }
        if (hidden > 0) {
            const btn = el('button', 'fs-empty-toggle', showEmpty ? '− 隐藏空字段' : `＋ 显示空字段 (${hidden})`);
            btn.addEventListener('click', () => {
                const s = getSettings();
                s.showEmptyFields = !s.showEmptyFields;
                saveSettings();
                renderSidebar();
            });
            body.appendChild(btn);
        }
        const ignored = getSettings().ignoredKeys ?? [];
        const unknownKeys = Object.keys(charState.values).filter(k =>
            !template.fields.some(f => f.key === k) && !ignored.includes(k),
        );
        if (unknownKeys.length) {
            body.appendChild(el('div', 'fs-group-title', '其他'));
            for (const key of unknownKeys) {
                body.appendChild(renderRow(charName, { key, label: key }, charState.values[key], true));
            }
        }
        card.appendChild(body);
    }
    return card;
}

export function renderSidebar() {
    if (!rootEl) {
        return;
    }
    const chatState = getChatState();
    rootEl.innerHTML = '';
    const names = Object.keys(chatState.chars);
    if (!names.length) {
        rootEl.appendChild(el('div', 'fs-empty-state', '等待第一条状态输出'));
        lastRenderedValues.clear();
        return;
    }
    for (const name of names) {
        rootEl.appendChild(renderCard(name));
        lastRenderedValues.set(name, JSON.stringify(getCharState(name).values));
    }
}

export function mountSidebar() {
    if (rootEl) {
        return;
    }
    rootEl = el('div', 'freestatus-sidebar');
    rootEl.id = 'freestatus-sidebar';
    const settings = getSettings();
    rootEl.classList.toggle('open', settings.sidebarOpen);
    document.body.appendChild(rootEl);
    toggleEl = el('button', 'freestatus-toggle', 'FS');
    toggleEl.title = 'FreeStatus 自由状态栏';
    toggleEl.classList.toggle('active', settings.sidebarOpen);
    toggleEl.addEventListener('click', () => {
        const s = getSettings();
        s.sidebarOpen = !s.sidebarOpen;
        saveSettings();
        rootEl.classList.toggle('open', s.sidebarOpen);
        toggleEl.classList.toggle('active', s.sidebarOpen);
    });
    document.body.appendChild(toggleEl);
    renderSidebar();
}

export function hideAllStatusBlocks() {
    for (const mesEl of document.querySelectorAll('#chat .mes')) {
        const id = mesEl.getAttribute('mesid');
        if (id !== null) {
            hideStatusBlocks(id);
        }
    }
}

export function hideStatusBlocks(messageId) {
    const settings = getSettings();
    if (!settings.hideBlocks) {
        return;
    }
    const mesEl = document.querySelector(`#chat .mes[mesid="${messageId}"] .mes_text`);
    if (!mesEl) {
        return;
    }
    const template = getActiveTemplate();
    const templateKeys = new Set(template.fields.map(f => f.key));
    for (const pre of mesEl.querySelectorAll('pre')) {
        const text = pre.textContent.trim();
        if (!text.startsWith('{') || !text.endsWith('}')) {
            continue;
        }
        try {
            const obj = JSON.parse(text);
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
                continue;
            }
            const keys = Object.keys(obj);
            const isStatus = keys.includes('_char') || keys.some(k => templateKeys.has(k));
            if (isStatus) {
                pre.style.display = 'none';
            }
        } catch {
            /* not a status block */
        }
    }
}
