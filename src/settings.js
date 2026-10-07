import { KINDS } from './parser.js';
import { getSettings, saveSettings, getActiveTemplate, getChatState, saveChatState, writeToCard, readFromCard } from './state.js';
import { buildProtocolPrompt } from './templates.js';
import { buildInjectionText } from './prompt.js';
import { renderSidebar } from './ui.js';

export let failCount = 0;

export function bumpFailCount() {
    failCount += 1;
    const el = document.querySelector('#fs_fail_count');
    if (el) {
        el.textContent = String(failCount);
    }
}

function $(sel) {
    return document.querySelector(sel);
}

function renderTemplateSelect() {
    const settings = getSettings();
    const select = $('#fs_template_select');
    if (!select) {
        return;
    }
    select.innerHTML = '';
    for (const t of settings.templates) {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        if (t.id === getActiveTemplate().id) {
            opt.selected = true;
        }
        select.appendChild(opt);
    }
}

function renderFieldTable() {
    const table = $('#fs_field_table');
    if (!table) {
        return;
    }
    const template = getActiveTemplate();
    table.innerHTML = '';
    for (const field of template.fields) {
        const row = document.createElement('div');
        row.className = 'fs-field-row';
        const key = document.createElement('input');
        key.value = field.key;
        key.title = 'key';
        key.addEventListener('change', () => {
            field.key = key.value.trim();
            saveSettings();
        });
        const label = document.createElement('input');
        label.value = field.label;
        label.title = 'label';
        label.addEventListener('change', () => {
            field.label = label.value;
            saveSettings();
            renderSidebar();
        });
        const kind = document.createElement('select');
        for (const k of KINDS) {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            if (k === field.kind) {
                opt.selected = true;
            }
            kind.appendChild(opt);
        }
        kind.addEventListener('change', () => {
            field.kind = kind.value;
            saveSettings();
        });
        const max = document.createElement('input');
        max.type = 'number';
        max.value = field.max ?? 100;
        max.title = 'max';
        max.addEventListener('change', () => {
            field.max = Number(max.value);
            saveSettings();
        });
        const inject = document.createElement('input');
        inject.type = 'checkbox';
        inject.checked = !!field.inject;
        inject.title = '回注';
        inject.addEventListener('change', () => {
            field.inject = inject.checked;
            saveSettings();
        });
        const del = document.createElement('button');
        del.textContent = '✕';
        del.className = 'menu_button';
        del.addEventListener('click', () => {
            template.fields = template.fields.filter(f => f !== field);
            saveSettings();
            renderFieldTable();
            renderSidebar();
        });
        const up = document.createElement('button');
        up.textContent = '↑';
        up.className = 'menu_button';
        up.addEventListener('click', () => {
            const idx = template.fields.indexOf(field);
            if (idx > 0) {
                template.fields.splice(idx, 1);
                template.fields.splice(idx - 1, 0, field);
                saveSettings();
                renderFieldTable();
                renderSidebar();
            }
        });
        row.append(key, label, kind, max, inject, up, del);
        table.appendChild(row);
    }
}

function refreshPreviews() {
    const template = getActiveTemplate();
    const promptBox = $('#fs_prompt_preview');
    if (promptBox) {
        promptBox.value = buildProtocolPrompt(template);
    }
    const injBox = $('#fs_injection_preview');
    if (injBox) {
        const settings = getSettings();
        const chatState = getChatState();
        const state = buildInjectionText(chatState.chars, template);
        let text;
        if (settings.injection === 'interceptor' && (settings.injectProtocol ?? true)) {
            const charName = SillyTavern.getContext().name2 || '{{char}}';
            text = buildProtocolPrompt(template, { char: charName, stateText: state || '（暂无，请结合剧情与输出示例初始化各字段）' });
        } else {
            text = state || '（暂无状态）';
        }
        injBox.value = text;
    }
}

function bindSectionToggles() {
    const settings = getSettings();
    settings.collapsedSections ??= [];
    for (const section of document.querySelectorAll('.freestatus_settings_section')) {
        const id = section.dataset.section;
        const head = section.querySelector('.fs-section-head');
        if (!id || !head) {
            continue;
        }
        const apply = () => {
            const collapsed = settings.collapsedSections.includes(id);
            section.classList.toggle('collapsed', collapsed);
            const caret = head.querySelector('.fs-caret');
            if (caret) {
                caret.classList.toggle('open', !collapsed);
            }
        };
        apply();
        head.addEventListener('click', () => {
            const index = settings.collapsedSections.indexOf(id);
            if (index >= 0) {
                settings.collapsedSections.splice(index, 1);
            } else {
                settings.collapsedSections.push(id);
            }
            saveSettings();
            apply();
        });
    }
}

export function bindSettingsPanel() {
    renderTemplateSelect();
    renderFieldTable();
    refreshPreviews();
    bindSectionToggles();

    const settings = getSettings();
    const enabledBox = $('#fs_enabled');
    if (enabledBox) {
        enabledBox.checked = settings.enabled;
        enabledBox.addEventListener('change', e => {
            getSettings().enabled = e.target.checked;
            saveSettings();
        });
    }
    const hideBox = $('#fs_hide_blocks');
    if (hideBox) {
        hideBox.checked = settings.hideBlocks;
        hideBox.addEventListener('change', e => {
            getSettings().hideBlocks = e.target.checked;
            saveSettings();
        });
    }
    const protocolBox = $('#fs_inject_protocol');
    if (protocolBox) {
        protocolBox.checked = settings.injectProtocol ?? true;
        protocolBox.addEventListener('change', e => {
            getSettings().injectProtocol = e.target.checked;
            saveSettings();
        });
    }
    $('#fs_template_select')?.addEventListener('change', e => {
        const chatState = getChatState();
        chatState.templateId = e.target.value;
        saveChatState();
        renderFieldTable();
        refreshPreviews();
        renderSidebar();
    });
    $('#fs_template_new')?.addEventListener('click', () => {
        const settings = getSettings();
        const id = `template-${Date.now()}`;
        settings.templates.push({ id, name: '新模板', version: 1, fields: [] });
        settings.activeTemplateId = id;
        getChatState().templateId = id;
        saveSettings();
        saveChatState();
        renderTemplateSelect();
        renderFieldTable();
        refreshPreviews();
    });
    $('#fs_template_copy')?.addEventListener('click', () => {
        const settings = getSettings();
        const src = getActiveTemplate();
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = `template-${Date.now()}`;
        copy.name = `${src.name} 副本`;
        settings.templates.push(copy);
        saveSettings();
        renderTemplateSelect();
    });
    $('#fs_template_delete')?.addEventListener('click', () => {
        const settings = getSettings();
        if (settings.templates.length <= 1) {
            return;
        }
        const id = getActiveTemplate().id;
        settings.templates = settings.templates.filter(t => t.id !== id);
        settings.activeTemplateId = settings.templates[0].id;
        getChatState().templateId = settings.activeTemplateId;
        saveSettings();
        saveChatState();
        renderTemplateSelect();
        renderFieldTable();
        refreshPreviews();
        renderSidebar();
    });
    $('#fs_template_export')?.addEventListener('click', () => {
        const json = JSON.stringify(getActiveTemplate(), null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = `${getActiveTemplate().id}.json`;
        a.click();
    });
    $('#fs_template_import')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) {
                return;
            }
            try {
                const parsed = JSON.parse(await file.text());
                if (parsed?.id && Array.isArray(parsed?.fields)) {
                    const settings = getSettings();
                    parsed.id = `template-${Date.now()}`;
                    settings.templates.push(parsed);
                    saveSettings();
                    renderTemplateSelect();
                }
            } catch {
                /* invalid file */
            }
        });
        input.click();
    });
    $('#fs_write_card')?.addEventListener('click', async () => {
        await writeToCard();
    });
    $('#fs_read_card')?.addEventListener('click', () => {
        const data = readFromCard();
        if (!data) {
            return;
        }
        const settings = getSettings();
        for (const t of data.templates ?? []) {
            if (!settings.templates.some(x => x.id === t.id)) {
                settings.templates.push(t);
            }
        }
        if (data.activeTemplateId) {
            getChatState().templateId = data.activeTemplateId;
        }
        if (data.chars) {
            Object.assign(getChatState().chars, data.chars);
        }
        saveSettings();
        saveChatState();
        renderTemplateSelect();
        renderFieldTable();
        refreshPreviews();
        renderSidebar();
    });
    $('#fs_field_add')?.addEventListener('click', () => {
        const template = getActiveTemplate();
        template.fields.push({
            key: `field_${template.fields.length + 1}`,
            label: '新字段',
            kind: 'bar',
            min: 0,
            max: 100,
            default: 0,
            inject: true,
            locked: false,
        });
        saveSettings();
        renderFieldTable();
    });
    $('#fs_copy_prompt')?.addEventListener('click', () => {
        const text = buildProtocolPrompt(getActiveTemplate());
        navigator.clipboard?.writeText(text);
    });
    $('#fs_injection')?.addEventListener('change', e => {
        getSettings().injection = e.target.value;
        saveSettings();
    });
    $('#fs_clear_state')?.addEventListener('click', () => {
        const chatState = getChatState();
        chatState.chars = {};
        saveChatState();
        refreshPreviews();
        renderSidebar();
    });

    const injSelect = $('#fs_injection');
    if (injSelect) {
        injSelect.value = getSettings().injection ?? 'interceptor';
    }
}
