import type { AdminDossier } from '../../adminTypes';

export interface UserGroupData {
  userKey: string;
  userId?: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
  deviceId?: string;
  gender?: string;
  occupation?: string;
  personaTrait?: string;
  age?: string;
  maritalStatus?: string;
  hasBoyfriend?: string;
  dossiers: AdminDossier[];
  guestDossierCount: number;
  userDossierCount: number;
  isPureGuest: boolean;
}

export function groupDossiersByUser(
  dossiers: AdminDossier[],
  deviceUserMap: Record<string, string>
): UserGroupData[] {
  const deviceToUserKey = new Map<string, string>();
  for (const [deviceId, userId] of Object.entries(deviceUserMap)) {
    if (deviceId && userId) deviceToUserKey.set(deviceId, `user-${userId}`);
  }

  dossiers.forEach((d) => {
    if (d.userId && d.deviceId) {
      deviceToUserKey.set(d.deviceId, `user-${d.userId}`);
    } else if (d.email && d.deviceId && !deviceToUserKey.has(d.deviceId)) {
      deviceToUserKey.set(d.deviceId, `email-${d.email}`);
    }
  });

  const groupsMap = new Map<string, UserGroupData>();

  dossiers.forEach((d) => {
    let groupKey = '';
    if (d.userId) {
      groupKey = `user-${d.userId}`;
    } else if (d.email) {
      groupKey = `email-${d.email}`;
    } else if (d.deviceId) {
      groupKey = deviceToUserKey.get(d.deviceId) || `device-${d.deviceId}`;
    } else {
      groupKey = `guest-${d.nickname || 'anonymous'}-${d.id}`;
    }

    let existing = groupsMap.get(groupKey);
    if (!existing) {
      existing = {
        userKey: groupKey,
        userId: d.userId || undefined,
        nickname: d.nickname || '匿名访客',
        avatarUrl: d.avatarUrls?.[0],
        email: d.email || undefined,
        deviceId: d.deviceId || undefined,
        gender: d.gender || undefined,
        occupation: d.occupation || undefined,
        personaTrait: d.personaTrait || undefined,
        age: d.age || undefined,
        maritalStatus: d.maritalStatus || undefined,
        hasBoyfriend: d.hasBoyfriend || undefined,
        dossiers: [],
        guestDossierCount: 0,
        userDossierCount: 0,
        isPureGuest: !d.userId && !d.email,
      };
      groupsMap.set(groupKey, existing);
    }

    if (d.userId && !existing.userId) existing.userId = d.userId;
    if (d.email && !existing.email) existing.email = d.email;
    if (d.avatarUrls?.[0] && !existing.avatarUrl)
      existing.avatarUrl = d.avatarUrls[0];
    if (d.occupation && !existing.occupation)
      existing.occupation = d.occupation;
    if (d.personaTrait && !existing.personaTrait)
      existing.personaTrait = d.personaTrait;

    existing.dossiers.push(d);
    if (d.userId) {
      existing.userDossierCount++;
    } else {
      existing.guestDossierCount++;
    }
    existing.isPureGuest = !existing.userId && !existing.email;
  });

  return Array.from(groupsMap.values());
}
