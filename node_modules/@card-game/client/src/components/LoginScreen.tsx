import React, { useState } from 'react';
import { Profession, Organization, ORGANIZATION_INFO } from '@card-game/shared';
import '../styles/pixel.css';

// 职业名称、描述和像素图标
const PROFESSION_INFO: Record<Profession, { name: string; desc: string; icon: string; color: string }> = {
  [Profession.KNIGHT]: { 
    name: '骑士', 
    desc: '坦克型，高防御，保护队友', 
    icon: '🛡️',
    color: '#3b82f6'
  },
  [Profession.SWORDSMAN]: { 
    name: '剑士', 
    desc: '近战输出，平衡攻防', 
    icon: '⚔️',
    color: '#ef4444'
  },
  [Profession.SORCERER]: { 
    name: '术士', 
    desc: '魔法输出，群体伤害', 
    icon: '🔮',
    color: '#8b5cf6'
  },
  [Profession.GUNNER]: { 
    name: '枪手', 
    desc: '远程输出，稳定伤害', 
    icon: '🔫',
    color: '#f59e0b'
  },
  [Profession.ASSASSIN]: { 
    name: '刺客', 
    desc: '爆发输出，暴击专家', 
    icon: '🗡️',
    color: '#10b981'
  },
};

interface LoginScreenProps {
  onRegister: (username: string, profession: Profession, organization: Organization) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [profession, setProfession] = useState<Profession>(Profession.KNIGHT);
  const [organization, setOrganization] = useState<Organization>(Organization.IRON_FORTRESS);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleSubmit = () => {
    if (username.trim()) {
      onRegister(username, profession, organization);
    }
  };

  return (
    <div className="pixel-login-screen pixel-grid-bg">
      {/* 标题区域 */}
      <div className="pixel-login-header">
        <div className="pixel-logo animate-float">
          <span className="logo-icon">☠️</span>
        </div>
        <h1 className="pixel-title">末日生存</h1>
        <p className="pixel-subtitle">DOOMSDAY SURVIVAL</p>
        <div className="pixel-divider"></div>
      </div>

      {/* 步骤指示器 */}
      <div className="pixel-steps">
        <div className={`pixel-step ${step >= 1 ? 'active' : ''}`}>
          <span className="step-num">1</span>
          <span className="step-text">代号</span>
        </div>
        <div className="step-line"></div>
        <div className={`pixel-step ${step >= 2 ? 'active' : ''}`}>
          <span className="step-num">2</span>
          <span className="step-text">职业</span>
        </div>
        <div className="step-line"></div>
        <div className={`pixel-step ${step >= 3 ? 'active' : ''}`}>
          <span className="step-num">3</span>
          <span className="step-text">组织</span>
        </div>
      </div>

      {/* 主面板 */}
      <div className="pixel-panel pixel-login-panel">
        {/* 步骤1: 输入代号 */}
        {step === 1 && (
          <div className="login-step">
            <h2 className="pixel-subtitle">幸存者登记</h2>
            <p className="pixel-text">请输入你的代号，这将是你在废土的身份标识</p>
            
            <div className="pixel-input-group">
              <label className="pixel-text-small">代号 / CODENAME</label>
              <input
                type="text"
                className="pixel-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入代号..."
                maxLength={12}
              />
            </div>

            <div className="pixel-btn-group">
              <button 
                className="pixel-btn pixel-btn-gold"
                onClick={() => username.trim() && setStep(2)}
                disabled={!username.trim()}
              >
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* 步骤2: 选择职业 */}
        {step === 2 && (
          <div className="login-step">
            <h2 className="pixel-subtitle">选择职业</h2>
            <p className="pixel-text">每个职业都有独特的能力和专属卡牌</p>
            
            <div className="pixel-profession-grid">
              {(Object.values(Profession) as Profession[]).map((p) => {
                const info = PROFESSION_INFO[p];
                return (
                  <div 
                    key={p}
                    className={`pixel-select-card ${profession === p ? 'selected' : ''}`}
                    onClick={() => setProfession(p)}
                  >
                    <div className="profession-icon" style={{ borderColor: info.color }}>
                      {info.icon}
                    </div>
                    <div className="profession-name" style={{ color: info.color }}>
                      {info.name}
                    </div>
                    <div className="profession-desc pixel-text-small">
                      {info.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pixel-btn-group">
              <button className="pixel-btn" onClick={() => setStep(1)}>
                ← 返回
              </button>
              <button className="pixel-btn pixel-btn-gold" onClick={() => setStep(3)}>
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* 步骤3: 选择组织 */}
        {step === 3 && (
          <div className="login-step">
            <h2 className="pixel-subtitle">选择阵营</h2>
            <p className="pixel-text">加入一个组织，与同伴一起对抗末日Boss</p>
            
            <div className="pixel-org-grid">
              {(Object.values(Organization) as Organization[]).map((org) => {
                const info = ORGANIZATION_INFO[org];
                return (
                  <div 
                    key={org}
                    className={`pixel-select-card pixel-org-card ${organization === org ? 'selected' : ''}`}
                    onClick={() => setOrganization(org)}
                    style={{ 
                      borderColor: organization === org ? info.color : undefined,
                      boxShadow: organization === org ? `0 0 20px ${info.color}40` : undefined
                    }}
                  >
                    <div className="org-emblem" style={{ background: info.color }}>
                      {info.emblem}
                    </div>
                    <div className="org-info">
                      <div className="org-name" style={{ color: info.color }}>
                        {info.name}
                      </div>
                      <div className="org-desc pixel-text-small">
                        {info.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pixel-btn-group">
              <button className="pixel-btn" onClick={() => setStep(2)}>
                ← 返回
              </button>
              <button className="pixel-btn pixel-btn-gold" onClick={handleSubmit}>
                ⚔️ 进入废土 ⚔️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="pixel-login-footer">
        <p className="pixel-text-small">
          {username && `欢迎, ${username}`}
          {username && profession && ` | ${PROFESSION_INFO[profession].name}`}
          {username && organization && ` | ${ORGANIZATION_INFO[organization].name}`}
        </p>
      </div>
    </div>
  );
};
