/**
 * FreeStatus 字段动效系统
 *
 * 设计：22 个动效 id 内置在此，任何模板/预设的字段只需写 `"fx": "id"` 调用。
 * fx 是稳定 API：未知 id 静默无效果；不进协议、不进解析，纯渲染层。
 */

export const FX = [
    { id: 'hearts', label: '爱心', kind: ['bar', 'chip'], desc: '♥ 从条上缓缓升起、摇曳、渐隐，填充微光' },
    { id: 'sigil', label: '符印', kind: ['bar', 'tag'], desc: '字型光影循环 + 外扩光环（本体不动）' },
    { id: 'sparkle', label: '星光', kind: ['bar', 'tag', 'text'], desc: '✦✧ 交替闪烁，变化瞬间加密' },
    { id: 'smoke', label: '暗影', kind: ['bar'], desc: '深色颗粒上升 + 填充暗纹上移' },
    { id: 'hypno', label: '催眠', kind: ['bar'], desc: '背景低速旋转螺旋' },
    { id: 'sheen', label: '流光', kind: ['bar', 'chip', 'list'], desc: '斜向高光扫过' },
    { id: 'breathe', label: '呼吸', kind: ['bar', 'text'], desc: '柔光 box-shadow 脉动' },
    { id: 'shiver', label: '震颤', kind: ['text', 'chip', 'tag'], desc: 'x 轴微抖' },
    { id: 'zzz', label: '困意', kind: ['bar'], desc: 'z 字母上升渐隐' },
    { id: 'pulse', label: '脉动', kind: ['chip', 'text', 'tag'], desc: '值周围扩散光环' },
    { id: 'sway', label: '摇摆', kind: ['chip', 'list'], desc: '轻微旋转摆动' },
    { id: 'pop', label: '跳动', kind: ['check', 'bar', 'tag', 'chip'], desc: '变化时 scale 弹跳' },
    { id: 'wave', label: '波浪', kind: ['bar', 'tag', 'text'], desc: '液面正弦晃动' },
    { id: 'bubbles', label: '气泡', kind: ['bar', 'tag'], desc: '○ 颗粒上升' },
    { id: 'drip', label: '滴落', kind: ['bar', 'tag'], desc: '周期性凝滴坠落' },
    { id: 'heat', label: '热浪', kind: ['check', 'bar'], desc: '≈ 波纹上升 + 暖光' },
    { id: 'stars', label: '星环', kind: ['check'], desc: '✦ 绕徽章环绕旋转' },
    { id: 'milk', label: '状态图标', kind: ['tag'], desc: '三态自动切换（见 iconState）' },
    { id: 'engorge', label: '态-扩散', kind: ['tag', 'bar'], desc: '膨胀脉动扩散，可单独调用' },
    { id: 'spray', label: '态-流出', kind: ['tag', 'bar'], desc: '出液粒子流，可单独调用' },
    { id: 'uterus', label: '容器图标', kind: ['tag'], desc: '容器液位四态（见 liquidState）' },
    { id: 'gloss', label: '湿光', kind: ['bar', 'tag', 'text'], desc: '高光沿字形缓慢游走' },
    { id: 'flow', label: '缓淌', kind: ['bar', 'tag'], desc: '细流向下爬行 + 液滴坠落' },
];

/** 动效 id 集合（查重 / 下拉生成用） */
export const FX_IDS = new Set(FX.map(f => f.id));

/**
 * 状态图标（milk）三态判定
 * @param {object} field 字段定义
 * @param {*} value 当前值
 * @returns {'idle'|'engorge'|'spray'} 状态
 */
export function iconState(field, value) {
    if (!value || typeof value !== 'object') {
        return 'idle';
    }
    const entries = Object.entries(value);
    if (!entries.length) {
        return 'idle';
    }
    // 取第一个值文本判定
    const text = String(entries[0][1] ?? '');
    if (text.includes('没涨') || text.includes('不涨')) {
        return 'idle';
    }
    if (text.includes('溢') || text.includes('喷')) {
        return 'spray';
    }
    if (text.includes('涨') || text.includes('肿')) {
        return 'engorge';
    }
    return 'idle';
}

/**
 * 容器图标（uterus）液位四态判定
 * @param {object} field 字段定义
 * @param {*} value 当前值（tag 对象）
 * @returns {'empty'|'half'|'full'|'overflow'} 液位状态
 */
export function liquidState(field, value) {
    if (!value || typeof value !== 'object') {
        return 'empty';
    }
    const entries = Object.entries(value);
    if (!entries.length) {
        return 'empty';
    }
    // 取第一个值文本判定
    const text = String(entries[0][1] ?? '');
    if (text.includes('溢') || text.includes('喷')) {
        return 'overflow';
    }
    if (text.includes('半') || text.includes('部分') || text.includes('少量')) {
        return 'half';
    }
    if (text.includes('灌满') || text.includes('满')) {
        return 'full';
    }
    if (text.includes('空') || text.includes('没有') || text.includes('排空')) {
        return 'empty';
    }
    return 'half';
}

/**
 * 动效粒子配置（ui.js 注入用）
 * key: id -> 生成 4 个粒子的延迟步进（ms）；0 表示无粒子
 */
const PARTICLE_STEP = {
    hearts: 600, sparkle: 450, smoke: 700, zzz: 800,
    bubbles: 500, drip: 900, heat: 600, flow: 700,
    milk: 0, engorge: 0, spray: 450,
    gloss: 0, sigil: 0, hypno: 0, sheen: 0,
    breathe: 0, shiver: 0, pulse: 0, sway: 0,
    pop: 0, wave: 0, stars: 900, uterus: 0,
};

/**
 * 获取动效的粒子延迟配置
 * @param {string} id
 * @returns {number} 延迟步进 ms，0 表示无粒子
 */
export function particleStep(id) {
    return PARTICLE_STEP[id] ?? 0;
}
