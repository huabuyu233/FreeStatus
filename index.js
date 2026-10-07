import { parseStatusBlock, mergeState } from './src/parser.js';
import { getSettings, getChatState, getActiveTemplate, getCharState, updateCharValues } from './src/state.js';
import { buildInjectionText } from './src/prompt.js';
import { mountSidebar, renderSidebar, hideStatusBlocks, hideAllStatusBlocks } from './src/ui.js';
import { buildProtocolPrompt } from './src/templates.js';
import { bumpFailCount } from './src/settings.js';

const MODULE_NAME = 'freestatus';
let initialized = false;

function applyParsed(parsed, charName) {
    const template = getActiveTemplate();
    const charState = getCharState(charName);
    const { values, unknown } = mergeState(charState.values, parsed.values, template.fields, charState.locks);
    const ignored = getSettings().ignoredKeys ?? [];
    const unknownShown = unknown.filter(k => !ignored.includes(k));
    updateCharValues(charName, values);
    return unknownShown;
}

function charNameForMessage(messageId, parsed) {
    const { chat, name2 } = SillyTavern.getContext();
    const msg = chat[messageId];
    if (parsed?.meta?._char) {
        return String(parsed.meta._char);
    }
    return msg?.name || name2 || '角色';
}

function onMessageReceived(messageId) {
    const { chat } = SillyTavern.getContext();
    const msg = chat[messageId];
    if (!msg || msg.is_user || msg.is_system) {
        return;
    }
    const parsed = parseStatusBlock(msg.mes);
    if (!parsed) {
        if (msg.mes.includes('```fs')) {
            bumpFailCount();
        }
        return;
    }
    applyParsed(parsed, charNameForMessage(messageId, parsed));
    renderSidebar();
}

function onMessageRendered(messageId) {
    hideStatusBlocks(messageId);
    renderSidebar();
}

function onChatChanged() {
    hideAllStatusBlocks();
    renderSidebar();
}

function onMessageSwiped(messageId) {
    onMessageReceived(messageId);
}

function initInterceptor() {
    globalThis.freestatus_generate_interceptor = async (chat, contextSize, abort, type) => {
        const settings = getSettings();
        if (!settings.enabled || settings.injection !== 'interceptor') {
            return;
        }
        if (type === 'quiet') {
            return;
        }
        const template = getActiveTemplate();
        const chatState = getChatState();
        const state = buildInjectionText(chatState.chars, template);
        let text;
        if (settings.injectProtocol) {
            const { name2 } = SillyTavern.getContext();
            const stateText = state || '（暂无，请结合剧情与输出示例初始化各字段）';
            text = buildProtocolPrompt(template, { char: name2 || '{{char}}', stateText });
        } else {
            text = state;
        }
        if (text) {
            chat.push({ mes: `【FreeStatus】\n${text}`, is_user: true, name: 'FreeStatus', extra: {} });
        }
    };
}

function initMacro() {
    const register = () => {
        try {
            import('/scripts/macros/macro-system.js').then(({ macros }) => {
                macros.register('fs_state', {
                    description: 'FreeStatus 当前状态紧凑文本',
                    returns: 'string',
                    handler: () => {
                        const template = getActiveTemplate();
                        const chatState = getChatState();
                        return buildInjectionText(chatState.chars, template);
                    },
                });
            }).catch(() => {
                SillyTavern.getContext().registerMacro('fs_state', () => {
                    const template = getActiveTemplate();
                    const chatState = getChatState();
                    return buildInjectionText(chatState.chars, template);
                }, 'FreeStatus 当前状态紧凑文本');
            });
        } catch {
            /* macro registration is optional */
        }
    };
    register();
}

function initEvents() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.MESSAGE_RECEIVED, onMessageReceived);
    eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    eventSource.on(eventTypes.MESSAGE_SWIPED, onMessageSwiped);
    eventSource.on(eventTypes.MESSAGE_EDITED, onMessageSwiped);
    eventSource.on(eventTypes.CHAT_CHANGED, onChatChanged);
    eventSource.on(eventTypes.GENERATION_ENDED, renderSidebar);
}

async function initSettingsPanel() {
    try {
        const response = await fetch(new URL('./settings.html', import.meta.url));
        if (!response.ok) {
            throw new Error(`settings.html ${response.status}`);
        }
        const html = await response.text();
        const container = document.querySelector('#extensions_settings') ?? document.querySelector('#extensions_settings2');
        if (container) {
            container.insertAdjacentHTML('beforeend', html);
        }
        const { bindSettingsPanel } = await import('./src/settings.js');
        bindSettingsPanel();
    } catch (error) {
        console.error('[FreeStatus] 设置面板加载失败', error);
    }
}

function init() {
    if (initialized) {
        return;
    }
    if (!window.SillyTavern?.getContext) {
        setTimeout(init, 200);
        return;
    }
    initialized = true;
    mountSidebar();
    initEvents();
    initInterceptor();
    initMacro();
    initSettingsPanel();
}

window.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') {
    init();
}

export { buildProtocolPrompt, MODULE_NAME };
