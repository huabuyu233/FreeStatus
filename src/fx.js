/**
 * FreeStatus 字段动效系统
 *
 * 设计：6 个动效 id 内置在此，任何模板/预设的字段只需写 `"fx": "id"` 调用。
 * fx 是稳定 API：未知 id 静默无效果；不进协议、不进解析，纯渲染层。
 */

export const FX = [
    { id: 'hearts', label: '爱心', kind: ['bar', 'chip'], desc: '♥ 从条上缓缓升起、摇曳、渐隐' },
    { id: 'sparkle', label: '星光', kind: ['bar', 'tag', 'text'], desc: '✦✧ 交替闪烁' },
    { id: 'shiver', label: '震颤', kind: ['text', 'chip', 'tag'], desc: 'x 轴微抖' },
    { id: 'sway', label: '摇摆', kind: ['chip', 'list'], desc: '轻微旋转摆动' },
    { id: 'stars', label: '星环', kind: ['check'], desc: '✦ 绕徽章环绕旋转' },
    { id: 'wave', label: '波浪', kind: ['bar', 'tag', 'text'], desc: '液面正弦晃动' },
];

/** 动效 id 集合（查重 / 下拉生成用） */
export const FX_IDS = new Set(FX.map(f => f.id));

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
