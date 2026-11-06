import React from 'react';
import { PieChart, Users, Award, Crown, Globe, Compass, MapPin } from 'lucide-react';
import type { AdminOverview } from '../../adminTypes';

interface DashboardDistributionProps {
  overview: AdminOverview | null;
}

export const DashboardDistribution: React.FC<DashboardDistributionProps> = ({ overview }) => {
  // Psychological Depth Donut Chart
  const depthData = overview?.depthDistribution || [];
  const totalDepth = depthData.reduce((sum: number, item: { rating: string; count: number }) => sum + item.count, 0);

  const radius = 38;
  const circum = 2 * Math.PI * radius;
  let currentOffset = 0;

  const ratingLabels: Record<string, string> = {
    light: '浅度探索',
    medium: '中度剖析',
    deep: '深度回响',
  };
  const ratingColors: Record<string, string> = {
    light: '#80f3ff',
    medium: '#ff70a6',
    deep: '#c084fc',
  };

  // Age group distribution
  const ageData = overview?.ageDistribution || [];
  const totalAge = ageData.reduce((sum: number, item: { group: string; count: number }) => sum + item.count, 0);
  const maxAgeCount = Math.max(...ageData.map((item: { group: string; count: number }) => item.count), 1);
  const ageOrder = ['18-25', '26-30', '31-40', '41-50', '50+', '未填/其他'];
  const sortedAgeData = [...ageData].sort((a: { group: string; count: number }, b: { group: string; count: number }) => ageOrder.indexOf(a.group) - ageOrder.indexOf(b.group));

  // Occupations ranked
  const occupationData = overview?.occupationDistribution || [];
  const maxOccCount = Math.max(...occupationData.map((item: { occupation: string; count: number }) => item.count), 1);

  // Traffic Source & Referrer Distribution ("这个人从哪里来的")
  const sourceData = overview?.sourceDistribution || [];
  const totalSourceVisits = sourceData.reduce((sum: number, item: { source: string; count: number }) => sum + item.count, 0);
  const maxSourceCount = Math.max(...sourceData.map((item: { source: string; count: number }) => item.count), 1);

  // Region Distribution ("访客来自哪个省市")
  const regionData = overview?.regionDistribution || [];
  const totalRegionVisits = regionData.reduce((sum: number, item: { count: number }) => sum + item.count, 0);
  const maxRegionCount = Math.max(...regionData.map((item: { count: number }) => item.count), 1);
  // 「海外 / 代理」「未识别地区」「其他地区」是兜底分组，不算作已定位城市。
  const regionCityCount = regionData.filter(
    (item: { code: string }) => !['OVERSEAS', 'UNKNOWN', 'OTHER'].includes(item.code)
  ).length;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0.85rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Card 1: 心理分析深度分布 (Glowing Donut Ring) */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <PieChart size={15} color="#c084fc" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            心理分析深度分布
          </h4>
        </div>

        {totalDepth === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无深度分布数据
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            {/* Donut SVG */}
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg width="96" height="96" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {depthData.map((item) => {
                  const pct = item.count / totalDepth;
                  const strokeLength = pct * circum;
                  const strokeOffset = circum - strokeLength + currentOffset;
                  currentOffset -= strokeLength;
                  return (
                    <circle
                      key={item.rating}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="transparent"
                      stroke={ratingColors[item.rating] || '#80f3ff'}
                      strokeWidth="9"
                      strokeDasharray={`${strokeLength} ${circum - strokeLength}`}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'all 0.5s ease' }}
                    />
                  );
                })}
              </svg>
              {/* Center percentage label */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{totalDepth}</span>
                <span style={{ fontSize: '0.58rem', color: 'var(--admin-text-muted)' }}>份卷宗</span>
              </div>
            </div>

            {/* Legend list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
              {depthData.map((item) => {
                const pct = Math.round((item.count / totalDepth) * 100);
                const color = ratingColors[item.rating] || '#80f3ff';
                return (
                  <div key={item.rating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ color: 'var(--admin-text-secondary)' }}>{ratingLabels[item.rating] || item.rating}</span>
                    </div>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {item.count}人 <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Card 2: 填答者年龄段分布 */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Users size={15} color="#ffd180" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            填答者年龄段剖析
          </h4>
        </div>

        {totalAge === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无年龄段数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {sortedAgeData.map((item) => {
              const pct = Math.round((item.count / totalAge) * 100);
              const barWidth = (item.count / maxAgeCount) * 100;
              return (
                <div key={item.group} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--admin-text-secondary)' }}>{item.group} 岁</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {item.count}人 <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ff70a6 0%, #ffd180 100%)',
                        borderRadius: 3,
                        boxShadow: '0 0 8px rgba(255, 112, 166, 0.3)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card 3: 前五高频真实职业排行 */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 112, 166, 0.2)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 51, 119, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Crown size={15} color="#ff70a6" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            高频真实职业反差排行
          </h4>
        </div>

        {occupationData.length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无职业分布数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {occupationData.slice(0, 5).map((item, index) => {
              const barWidth = (item.count / maxOccCount) * 100;
              const badgeColors = ['#ffd180', '#e2e8f0', '#ff70a6'];
              const isTop3 = index < 3;
              return (
                <div key={item.occupation} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: isTop3 ? `${badgeColors[index]}25` : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isTop3 ? badgeColors[index] : 'rgba(255, 255, 255, 0.1)'}`,
                      color: isTop3 ? badgeColors[index] : 'var(--admin-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{item.occupation}</span>
                      <span style={{ color: 'var(--admin-text-muted)' }}>{item.count}人</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 2, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          background: isTop3 ? 'linear-gradient(90deg, #ff70a6, #ffd180)' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: 2,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card 4: 访客入口渠道与流量来源（这个人从哪里来的） */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(128, 243, 255, 0.25)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(128, 243, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Compass size={15} color="#80f3ff" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              访客入口渠道与流量来源
            </h4>
          </div>
          {totalSourceVisits > 0 && (
            <span style={{ fontSize: '0.68rem', color: '#80f3ff', fontWeight: 700, background: 'rgba(128, 243, 255, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
              共 {totalSourceVisits} 次访问
            </span>
          )}
        </div>

        {sourceData.length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无访客来源数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {sourceData.slice(0, 6).map((item) => {
              const pct = totalSourceVisits > 0 ? Math.round((item.count / totalSourceVisits) * 100) : 0;
              const barWidth = (item.count / maxSourceCount) * 100;
              return (
                <div key={item.source} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={11} color="#80f3ff" />
                      <span>{item.source}</span>
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {item.count}次 <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #80f3ff 0%, #c084fc 100%)',
                        borderRadius: 3,
                        boxShadow: '0 0 8px rgba(128, 243, 255, 0.3)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Card 5: 访客来源地区分布 (省市分布) */}
      <div
        className="glass-card"
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(28, 14, 38, 0.7) 0%, rgba(16, 8, 22, 0.85) 100%)',
          border: '1px solid rgba(255, 209, 128, 0.25)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 209, 128, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <MapPin size={15} color="#ffd180" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              访客来源地区分布
            </h4>
          </div>
          {totalRegionVisits > 0 && (
            <span style={{ fontSize: '0.68rem', color: '#ffd180', fontWeight: 700, background: 'rgba(255, 209, 128, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
              {regionCityCount} 个地区 · 共 {totalRegionVisits} 次访问
            </span>
          )}
        </div>

        {regionData.length === 0 ? (
          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.78rem', textAlign: 'center', padding: '2rem 0' }}>
            暂无地区分布数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {regionData.map((item) => {
              const pct = totalRegionVisits > 0 ? Math.round((item.count / totalRegionVisits) * 100) : 0;
              const barWidth = (item.count / maxRegionCount) * 100;
              return (
                <div key={item.code} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} color="#ffd180" />
                      <span>{item.city}</span>
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {item.count}次 <span style={{ color: 'var(--admin-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.04)', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #ffd180 0%, #ff70a6 100%)',
                        borderRadius: 3,
                        boxShadow: '0 0 8px rgba(255, 209, 128, 0.3)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
