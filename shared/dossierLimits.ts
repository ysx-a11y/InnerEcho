/**
 * 卷宗照片数量上限。
 *
 * 前端（ChapterOneView / DossierSealModal / ImageUploader）与服务端
 * (server/schemas.ts 的 avatarUrls) 共用同一个常量，避免再次出现
 * "前端允许 9 张、服务端只收 10 张"这类两侧漂移。
 */
export const MAX_DOSSIER_IMAGES = 9;
