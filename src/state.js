import { defaultSettings } from './templates.js';

const SETTINGS_KEY = 'freestatus';
const META_KEY = 'freestatus';

function ctx() {
    return SillyTavern.getContext();
}

export function getSettings() {
    const { extensionSettings } = ctx();
    if (!extensionSettings[SETTINGS_KEY]) {
        extensionSettings[SETTINGS_KEY] = defaultSettings();
    }
    const s = extensionSettings[SETTINGS_KEY];
    const d = defaultSettings();
    for (const [k, v] of Object.entries(d)) {
        if (!(k in s)) {
            s[k] = v;
        }
    }
    return s;
}

export function saveSettings() {
    ctx().saveSettingsDebounced();
}

export function getChatState() {
    const { chatMetadata } = ctx();
    if (!chatMetadata[META_KEY]) {
        chatMetadata[META_KEY] = { templateId: null, chars: {}, collapsed: {}, ignoredKeys: [] };
    }
    const s = chatMetadata[META_KEY];
    s.chars ??= {};
    s.collapsed ??= {};
    s.ignoredKeys ??= [];
    return s;
}

export function saveChatState() {
    ctx().saveMetadata();
}

export function getActiveTemplate() {
    const settings = getSettings();
    const chatState = getChatState();
    const id = chatState.templateId ?? settings.activeTemplateId;
    return settings.templates.find(t => t.id === id) ?? settings.templates[0];
}

export function getCharState(charName) {
    const chatState = getChatState();
    if (!chatState.chars[charName]) {
        chatState.chars[charName] = { values: {}, locks: {}, updated: 0 };
    }
    return chatState.chars[charName];
}

export function updateCharValues(charName, values) {
    const charState = getCharState(charName);
    charState.values = values;
    charState.updated = Date.now();
    saveChatState();
}

export function setCharLock(charName, key, locked) {
    const charState = getCharState(charName);
    charState.locks[key] = locked;
    saveChatState();
}

export function writeToCard() {
    const { characterId } = ctx();
    if (characterId === undefined || characterId === null) {
        return false;
    }
    const settings = getSettings();
    const chatState = getChatState();
    return ctx().writeExtensionField(characterId, SETTINGS_KEY, {
        templates: settings.templates,
        activeTemplateId: chatState.templateId ?? settings.activeTemplateId,
        chars: chatState.chars,
    }).then(() => true);
}

export function readFromCard() {
    const { characterId, characters } = ctx();
    if (characterId === undefined || characterId === null) {
        return null;
    }
    const data = characters[characterId]?.data?.extensions?.[SETTINGS_KEY];
    return data ?? null;
}
