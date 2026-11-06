import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classifyClientRegion, OVERSEAS_REGION_CODE, resolveRegionCode } from './ipRegion.js';

// ip2region 的 xdb 是本地数据文件（.gitignore 排除），缺失时跳过而不是报错。
const geoReady = fs.existsSync(
  fileURLToPath(new URL('../data/geo/ip2region_v4.xdb', import.meta.url))
);

describe.skipIf(!geoReady)('classifyClientRegion', () => {
  it('中国大陆 IPv4 / IPv6 解析为城市代码', async () => {
    expect(await classifyClientRegion('114.114.114.114')).toMatchObject({
      code: '320100',
      kind: 'cn-city',
    });
    // 线上真实访客样本（教育网 IPv6），此前因地区统计丢数据而暴露出来的那条
    expect(await classifyClientRegion('2001:da8:8006:942:c0d4:4133:7970:9daa')).toMatchObject({
      code: '110000',
      kind: 'cn-city',
    });
  });

  it('海外 IP 归为 OVERSEAS，而不是空值', async () => {
    expect(await classifyClientRegion('8.8.8.8')).toEqual({
      code: OVERSEAS_REGION_CODE,
      kind: 'overseas',
    });
  });

  it('内网与非法输入归为 unknown', async () => {
    expect(await classifyClientRegion('127.0.0.1')).toEqual({ code: '', kind: 'unknown' });
    expect(await classifyClientRegion('unknown-ip')).toEqual({ code: '', kind: 'unknown' });
  });

  it('resolveRegionCode 保持旧口径：海外与未知都返回空串', async () => {
    expect(await resolveRegionCode('8.8.8.8')).toBe('');
    expect(await resolveRegionCode('114.114.114.114')).toBe('320100');
  });
});
