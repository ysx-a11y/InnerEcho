export interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  category: 'subconscious' | 'dream' | 'shadow' | 'persona';
  requireAudio?: boolean;
}

export const STATIC_TASKS: TaskDefinition[] = [
  // ==================== 高耻感 · 深度自白与现实侵入 ====================
  {
    id: 'task_secret_wear_1',
    title: '贴身穿戴一件“违禁私物”度过半天',
    description: '在面对长辈、同事或伴侣的白天，你在正经服装内部，贴身穿戴一件完全不符合人前身份的私密物品（如情趣蕾丝开档内裤、隐蔽颈圈、特定乳夹或束缚绑带）。写下今天在与熟人谈笑风生时，贴身物体摩擦皮肤带给你的窃喜、羞耻与做贼般的恐慌心跳。（可附领口/裙摆暗影照片）',
    category: 'shadow',
  },
  {
    id: 'task_object_manual_1',
    title: '撰写一份《专属母犬/肉便器使用说明书》',
    description: '假定你的社会身份被法律与契约彻底注销，你只是一件被主人全款买断、随意摆弄的私人物件。全文严禁出现第一人称“我”，只能使用“该物品 / 此玩具 / 该雌性奴役”。列出核心用途、允许惩戒部位与玩腻时的报废处理方式。（不少于 120 字）',
    category: 'subconscious',
  },
  {
    id: 'task_mirror_vow_1',
    title: '跪姿凝视镜中赤裸的自己，录下一段服从自白',
    description: '在深夜完全独处的房间内，褪去所有衣物，以双膝跪地、挺直腰背的姿态直视镜中自己的双眼 2 分钟。录制一段 15~30 秒语音：“我是表面体面的（填真实职业），但镜子里的我只是一只渴望被……支配的……”。文字栏记录你说完后的胸口起伏与生理潮热。',
    category: 'dream',
    requireAudio: true,
  },
  {
    id: 'task_blackbox_shame_1',
    title: '写下一件“一旦曝光就会彻底社死”的真实经历或幻想',
    description: '每个人心底都有一件如果被现实朋友圈、父母或伴侣知道，足以让自己名誉扫地、体面崩塌的秘密。详细叙述那次让你至今想起来依然会头皮发麻、心跳骤停的隐秘瞬间（如背德越轨、公共暴露、私密照被存、或不堪的受虐自慰习惯），封存入你的专属绝密档案。',
    category: 'shadow',
  },
  {
    id: 'task_skin_mark_1',
    title: '在绝对私密处手写耻辱印记，并带其度过整整一天',
    description: '在深夜独处时，用不易脱色的深色眼线笔或笔，在自己身体最私密的隐蔽处（大腿内侧根部、小腹耻骨上方或臀线下方），端正写下 4~8 个耻辱/归属字样的烙印（如“专属母狗”、“已认主玩具”、“廉价母畜”）。带着这行印记正常穿上职业装或便服度过一天。提交 120 字自白：记录这一整天里，每一次坐下、迈步、上洗手间低头瞥见字迹时，布料摩擦皮肤带来的心跳加速与下体湿热发烫的真实感受。（其他如局部暗部拍照均为可选）',
    category: 'shadow',
  },

  // ==================== 日常记录 ====================
  {
    id: 'task_subconscious_1',
    title: '记录今天最想卸下防备的瞬间',
    description: '在今天的工作、人际或独处中，哪一个瞬间让你感到紧绷或不得不强撑？写下当时的场景，以及你内心最真实的疲惫或释怀。',
    category: 'subconscious',
  },
  {
    id: 'task_persona_1',
    title: '撕掉今天的一层社交面具',
    description: '今天在哪个场合你说了违心的话、做出了迎合他人的反应？写下你当时人前维持的形象，以及内心真实的抵触与想法。',
    category: 'subconscious',
  },

  // ==================== 隐秘想法 ====================
  {
    id: 'task_dream_1',
    title: '捕捉一个脑海中闪现过的隐秘念头',
    description: '捕捉一个曾偶尔闪过你脑海但从未对人说起过的幻想或渴望（关于掌控、被照顾、反差或逃离），写下其中最让你心动的细节。',
    category: 'dream',
  },
  {
    id: 'task_shadow_2',
    title: '写下一句绝不告诉熟人的真实渴望',
    description: '如果没有任何现实评判、不必顾及任何社会身份，你内心深处最渴望经历怎样的一种体验？诚实写下具体情境与感受。',
    category: 'dream',
  },
  {
    id: 'task_dream_2',
    title: '重构一次印象深刻的梦境片段',
    description: '记录一个曾让你心跳加速、充满情绪张力或奇异感受的梦境或白日梦片段，写下当时的情境以及留在你心底的余波。',
    category: 'dream',
  },
  {
    id: 'task_subconscious_3',
    title: '给完全懂你反差的人写三行自白',
    description: '假设有一个能完全理解你所有表里反差、接纳你全部脆弱与欲望的人，写下3句话：① 我的软肋；② 我最渴望被怎样对待；③ 我最想交付什么。',
    category: 'dream',
  },
  {
    id: 'task_shadow_voice_1',
    title: '语音说出：我真实的渴望是……',
    description: '录一段语音，真诚说出“我真实的渴望是……”，并接上你此刻脑海中冒出的第一个词或一句话。文字栏写下你说完后的心跳与情绪变化。',
    category: 'dream',
    requireAudio: true,
  },
];
