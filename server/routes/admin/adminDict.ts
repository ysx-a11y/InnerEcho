import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';

export const adminDictRouter = Router();

/** 查询全部字典大类 */
adminDictRouter.get('/types', (_req: Request, res: Response) => {
  const types = db.dict.listDictTypes();
  res.json({ success: true, types });
});

/** 查询指定字典下的数据项 */
adminDictRouter.get('/items/:typeCode', (req: Request, res: Response) => {
  const typeCode = Array.isArray(req.params.typeCode) ? req.params.typeCode[0] : req.params.typeCode;
  const showAll = req.query.all === '1' || req.query.all === 'true';
  const items = db.dict.listDictItems(typeCode, { activeOnly: !showAll });
  res.json({ success: true, items });
});

const upsertDictItemSchema = z.object({
  typeCode: z.string().min(1).max(64),
  value: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  badgeColor: z.string().max(32).optional(),
  badgeVariant: z.string().max(32).optional(),
  sortOrder: z.number().int().optional(),
  isDefault: z.number().int().min(0).max(1).optional(),
  isActive: z.number().int().min(0).max(1).optional(),
  remark: z.string().max(500).optional(),
});

/** 保存/更新字典项 */
adminDictRouter.post('/items', (req: Request, res: Response) => {
  const parseResult = upsertDictItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, message: '参数格式错误', errors: parseResult.error.format() });
    return;
  }
  const item = db.dict.upsertDictItem(parseResult.data);
  res.json({ success: true, item });
});

/** 查询状态流转规则列表 */
adminDictRouter.get('/transitions/:typeCode', (req: Request, res: Response) => {
  const typeCode = Array.isArray(req.params.typeCode) ? req.params.typeCode[0] : req.params.typeCode;
  const fromValue = typeof req.query.fromValue === 'string' ? req.query.fromValue : undefined;
  const transitions = db.dict.listTransitions(typeCode, fromValue);
  res.json({ success: true, transitions });
});

const checkTransitionSchema = z.object({
  typeCode: z.string().min(1),
  fromValue: z.string().min(1),
  toValue: z.string().min(1),
  role: z.string().optional(),
});

/** 校验状态流转是否合法 */
adminDictRouter.post('/check-transition', (req: Request, res: Response) => {
  const parseResult = checkTransitionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, message: '参数格式错误' });
    return;
  }
  const { typeCode, fromValue, toValue, role = 'admin' } = parseResult.data;
  const isAllowed = db.dict.isTransitionAllowed(typeCode, fromValue, toValue, role);
  res.json({ success: true, isAllowed });
});

const upsertTransitionSchema = z.object({
  typeCode: z.string().min(1).max(64),
  fromValue: z.string().min(1).max(64),
  toValue: z.string().min(1).max(64),
  actionName: z.string().min(1).max(64),
  requiredRole: z.enum(['user', 'admin', 'system']).optional(),
  isAllowed: z.number().int().min(0).max(1).optional(),
  remark: z.string().max(500).optional(),
});

/** 新增或更新状态流转规则 */
adminDictRouter.post('/transitions', (req: Request, res: Response) => {
  const parseResult = upsertTransitionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, message: '参数格式错误', errors: parseResult.error.format() });
    return;
  }
  const transition = db.dict.upsertTransition(parseResult.data);
  res.json({ success: true, transition });
});

const upsertDictTypeSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional(),
  remark: z.string().max(500).optional(),
});

/** 保存/更新字典大类 */
adminDictRouter.post('/types', (req: Request, res: Response) => {
  const parseResult = upsertDictTypeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, message: '参数格式错误', errors: parseResult.error.format() });
    return;
  }
  const type = db.dict.upsertDictType(parseResult.data);
  res.json({ success: true, type });
});

/** 删除非系统字典大类 */
adminDictRouter.delete('/types/:code', (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const deleted = db.dict.deleteDictType(code);
  if (!deleted) {
    res.status(400).json({ success: false, message: '系统内置字典不可删除，或字典不存在' });
    return;
  }
  res.json({ success: true, deleted: true });
});

/** 删除字典数据项 */
adminDictRouter.delete('/items/:typeCode/:value', (req: Request, res: Response) => {
  const typeCode = Array.isArray(req.params.typeCode) ? req.params.typeCode[0] : req.params.typeCode;
  const value = Array.isArray(req.params.value) ? req.params.value[0] : req.params.value;
  const deleted = db.dict.deleteDictItem(typeCode, value);
  res.json({ success: true, deleted });
});

/** 删除状态机规则 */
adminDictRouter.delete('/transitions/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = db.dict.deleteTransition(id);
  res.json({ success: true, deleted });
});
