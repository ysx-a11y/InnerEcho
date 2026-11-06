import { db } from '../server/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const email = 'test@innerecho.com';
  const plainPassword = 'password123';
  let user = await db.findUserByEmail(email);
  if (!user) {
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    user = await db.createUser(email, passwordHash);
    console.log('User created:', user);
  } else {
    console.log('User already exists:', user);
  }

  // Clear previous dossiers to reset cleanly
  const deleted = await db.deleteDossiersByUserId(user.id);
  console.log(`Cleared ${deleted} existing dossiers for user.`);

  const dossierData = {
    chapter1: {
      nickname: '神秘探索者',
      occupation: '心理医生',
      // 不设置外部图片 URL：海报 html2canvas 导出时无 CORS 的远程图会污染 canvas。
      personaTrait: '高冷精英',
      age: '28',
      maritalStatus: '未婚',
      hasBoyfriend: '单身',
      surfaceTrait: '高冷严谨',
      innerDesire: '渴望彻底卸下身上沉重的主控与责任包袱，体验一次完全被动臣服与安全交付的反差',
    },
    chapter2: {
      boundaryText: '完全交付主导权',
      fantasyText: '在绝对安全的契约下体验一次没有任何反抗与思考的提线木偶状态',
      relationPreference: '温柔支配',
      awakeningMoment: '独自一人在安静诊疗室里关掉灯光的那一刻',
    },
    chapter3: {
      secretWords: '请把我系紧',
      secretRule: '每次开口说话之前，必须先自称是主人的玩具',
    },
    selectedShadowTags: ['角色互换', '反差情绪', '深度交付', '感官唤醒'],
    depthRating: 'deep' as const,
    selectedBankIds: ['explore_shadow_bank'], // Mark this bank as completed!
  };

  const diagnosticResult = {
    credibilityScore: 92,
    credibilityLevel: 'high' as const,
    archetypeTitle: '幽蓝夜行者',
    archetypeSubtitle: '游走于坚硬理智与温柔陷落边缘的引路人',
    disparityScore: 88,
    dominanceIndex: 32,
    submissionIndex: 90,
    restraintIndex: 82,
    sensoryThreshold: 75,
    personaDeconstruction: '作为一名在日常社会中担任【心理医生】的专业人士，你在人群中展现出“高冷严谨”的完美精英特质，这构成了你最坚固的人格面具（Persona）。你在世人眼中是理智的化身和坚强的后盾。',
    shadowDeconstruction: '但在潜意识的深层阴影中，由于白天承受了过载的精神重担和决策压力，无人时你的内心产生了强烈的代偿反差——你真正渴望的是“彻底卸下身上沉重的主控与责任包袱，体验一次完全被动臣服与安全交付的反差”。被束缚或命令低头，对你而言并非屈辱，而是一种难得的释压与精神救赎。',
    psychologicalSublimation: '高强度的表意识【高冷严谨】与深层被动【渴望被完全接管】是你心理能量的完美能量守恒。接纳你的反差面，并在契约保障的私密场域中合理释放它，会让你的心理防御机制更加柔韧和健康。',
    resonanceKeywords: ['身份反差', '心理补偿', '主动缴械', '感官解放', '灵魂交付'],
  };

  const saved = await db.saveDossier(user.id, 'device_seed_123', dossierData, diagnosticResult);
  console.log('Dossier saved:', saved);
}

seed()
  .then(() => {
    console.log('Seeding finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
