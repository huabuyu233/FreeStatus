/**
 * FreeStatus 字段动效系统
 *
 * 设计：6 个动效 id 内置在此，任何模板/预设的字段只需写 `"fx": "id"` 调用。
 * fx 是稳定 API：未知 id 静默无效果；不进协议、不进解析，纯渲染层。
 */

export const FX = [
    { id: 'hearts', label: '爱心', glyph: '♥', kind: ['bar', 'chip'], desc: '♥ 上升渐隐，数量随数值增多' },
    { id: 'sparkle', label: '星光', glyph: '✦', kind: ['bar', 'tag', 'text'], desc: '✦✧ 交替闪烁，密度随数值增强' },
    { id: 'shiver', label: '震颤', glyph: '~', kind: ['text', 'chip', 'tag'], desc: 'x 轴微抖' },
    { id: 'sway', label: '摇摆', glyph: '↔', kind: ['chip', 'list'], desc: '轻微旋转摆动' },
    { id: 'stars', label: '星环', glyph: '✧', kind: ['check'], desc: '✦ 绕徽章环绕旋转' },
    { id: 'wave', label: '波浪', glyph: '≈', kind: ['bar', 'tag', 'text'], desc: '液面正弦晃动' },
];

/** 动效 id 集合（查重 / 下拉生成用） */
export const FX_IDS = new Set(FX.map(f => f.id));

/** 取得动效的标记字形（用于字段名前缀），未知 id 返回圆点 */
export function fxGlyph(id) {
    return FX.find(f => f.id === id)?.glyph ?? '•';
}

/**
 * 前缀标记数量范围：爱心/星光的数量随数值变化（值越高，字段名前越多）
 * 未配置的动效固定 1 个
 */
const PREFIX = {
    hearts: { min: 1, max: 4 },
    sparkle: { min: 1, max: 4 },
};

/** 取得动效前缀标记的数量范围 */
export function fxPrefix(id) {
    return PREFIX[id] ?? { min: 1, max: 1 };
}

/**
 * 强度配置：粒子数量与速度随数值（bar 的 0~1 比例）变化
 * min/max = 粒子数范围；dur = [慢, 快] 动画周期（秒）
 */
const INTENSITY = {
    hearts: { min: 1, max: 9, dur: [3.0, 1.1] },
    sparkle: { min: 2, max: 10, dur: [2.4, 1.0] },
};

/**
 * 取得动效的强度配置
 * @param {string} id
 * @returns {{min:number,max:number,dur:number[]}|null} 无则为 null（固定密度）
 */
export function fxIntensity(id) {
    return INTENSITY[id] ?? null;
}

/**
 * 动效粒子配置（ui.js 注入用）
 * key: id -> 生成 4 个粒子的延迟步进（ms）；0 表示无粒子
 */
const PARTICLE_STEP = {
    hearts: 600,
    sparkle: 450,
    stars: 900,
};

/**
 * 获取动效的粒子延迟配置
 * @param {string} id
 * @returns {number} 延迟步进 ms，0 表示无粒子
 */
export function particleStep(id) {
    return PARTICLE_STEP[id] ?? 0;
}
