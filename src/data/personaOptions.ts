export interface OptionItem {
  id: string;
  label: string;
}

export const OCCUPATIONS: OptionItem[] = [
  { id: 'teacher', label: '教师' },
  { id: 'student', label: '学生' },
  { id: 'doctor', label: '医师 / 护士' },
  { id: 'designer', label: '设计师' },
  { id: 'coder', label: '程序员 / IT' },
  { id: 'finance', label: '金融 / 财会' },
  { id: 'public_servant', label: '公务员 / 体制内' },
  { id: 'freelance', label: '自由职业' },
  { id: 'sales', label: '销售 / 商务' },
  { id: 'hr', label: 'HR / 行政' },
  { id: 'media', label: '自媒体 / 运营' },
  { id: 'service', label: '服务业 / 创业者' },
];
