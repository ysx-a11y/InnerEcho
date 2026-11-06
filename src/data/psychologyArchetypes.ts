export interface PsychologyArchetype {
  id: string;
  name: string;
  englishName: string;
  subtitle: string;
  jungianConcept: string; // 核心荣格理论（如：反向形成、人格面具解构、阴影升华）
  depthRating: 'light' | 'medium' | 'deep';
  depthRatingLabel: string;
  motto: string;
  accentColor: string;
  glowColor: string;
  personaAnalysis: string; // 表面面具解构
  shadowAnalysis: string;  // 潜意识阴影解构
  healingAdvice: string;   // 心理平衡建议
}

export const PSYCHOLOGY_ARCHETYPES: Record<string, PsychologyArchetype> = {
  light: {
    id: 'light_awakening',
    name: '暗光萌芽者',
    englishName: 'Shadow Awakening',
    subtitle: '面具初破 · 潜意识觉察 · 微小试探',
    jungianConcept: '人格面具弹性（Persona Elasticity）',
    depthRating: 'light',
    depthRatingLabel: '轻度觉醒',
    motto: '“规矩是世界的护栏，但偶尔越界是灵魂的呼吸。”',
    accentColor: '#ff70a6',
    glowColor: 'rgba(255, 112, 166, 0.4)',
    personaAnalysis: '你在日常生活中扮演着极其称职的角色。无论是端庄、听话还是冷静，你都展现出了高度的社会化面具。但这并不代表你麻木，相反你保留着敏锐的心理觉察力。',
    shadowAnalysis: '你的阴影渴望并不具有破坏性，而是一种对日常平庸与规训的轻微反抗。你渴望在安全、可控的前提下，体验一些不按常理出牌的微小惊喜与情绪涟漪。',
    healingAdvice: '不必为偶尔萌生的“反差想法”感到内疚。适度的心理宣泄与自我包容，能让你的面具保持健康弹性。',
  },
  medium: {
    id: 'medium_immersion',
    name: '双重奏弥散者',
    englishName: 'Dual Harmonic',
    subtitle: '表里张力 · 仪式感沉浸 · 心理补偿',
    jungianConcept: '心理补偿与反向形成（Reaction Formation）',
    depthRating: 'medium',
    depthRatingLabel: '中度沉浸',
    motto: '“白天把秩序还给世界，夜晚把真实交还给自己。”',
    accentColor: '#ff3377',
    glowColor: 'rgba(255, 51, 119, 0.45)',
    personaAnalysis: '你的人格面具构建得相当完美甚至严丝合缝（如端庄严谨的专业形象或温柔体贴的照顾者身份）。这种外在的高度规矩，为你积攒了巨大的内部心理势能。',
    shadowAnalysis: '正因为人前足够端庄与理智，你的潜意识极度向往在私密时空中进行“角色倒错”与“感官沉浸”。你追求安全边界明确的仪式感体验，在这种极致对比中释放心理压力。',
    healingAdvice: '承认并接纳这种双重性。建立属于你和信任伙伴之间的专属密道，让阴影能量得到健康的升华。',
  },
  deep: {
    id: 'deep_sublimation',
    name: '暗夜破局者',
    englishName: 'Abyssal Sublimator',
    subtitle: '绝对反差 · 禁忌升华 · 极致契合',
    jungianConcept: '阴影集粹与升华（Shadow Integration & Sublimation）',
    depthRating: 'deep',
    depthRatingLabel: '深度属性',
    motto: '“最深沉的黑暗里，藏着最纯粹的信任与绝对自由。”',
    accentColor: '#e100ff',
    glowColor: 'rgba(225, 0, 255, 0.45)',
    personaAnalysis: '在外界眼中，你可能是极度正经、绝对可靠甚至不可侵犯的标志性人物。你习惯于独自承担沉重的期待与责任。',
    shadowAnalysis: '你的潜意识深处蕴藏着强烈的反差能量——要么渴望彻底的掌控与重构规则，要么渴望完全的臣服与卸下一切防备。这种深度的属性是你灵魂中最真实、最具张力的核心部分。',
    healingAdvice: '真正的成熟不是消灭阴影，而是与它共舞。在彼此绝对尊重与信任的私密场域中，享受这种深度的羁绊与释放。',
  },
};
