/**
 * 全局浮层层级表。
 *
 * 历史上各处浮层散落硬编码 z-index（9999 / 99999 / 100000 / 1000000），
 * 已经造成过"大图预览被卷宗详情弹窗遮挡"这类回归。新增浮层请复用这里的
 * 命名层级，不要直接写魔数。
 *
 * 注意：src/admin/admin.css 中的 .admin-zoomed-overlay 无法 import TS 常量，
 * 其数值必须与 adminLightbox 保持同步（见该处注释）。
 */
export const Z_LAYER = {
  /** 用户端全屏业务弹窗（登录、极速身份校准、绝密封缄、3D 卡工作室等）。 */
  userModal: 99999,
  /** 需要盖在普通业务弹窗之上的全屏浮层（如独立排行榜 / 回声放映）。 */
  overlay: 100000,
  /** 管理端确认框、Toast 等临界提示。 */
  adminCritical: 100000,
  /** 管理端全屏大图预览：必须高于一切业务弹窗与顶部导航。 */
  adminLightbox: 1000000,
  /** Lightbox 自身控件（关闭按钮），需高于其容器。 */
  adminLightboxControl: 1000001,
} as const;
