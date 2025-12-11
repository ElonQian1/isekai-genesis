import React, { useState } from 'react';
import { Profession, Organization, ORGANIZATION_INFO } from 'shared';

// 职业中文名称映射
const PROFESSION_NAMES: Record<Profession, { name: string; desc: string }> = {
  [Profession.KNIGHT]: { name: '骑士', desc: '坦克型，高防御' },
  [Profession.SWORDSMAN]: { name: '剑士', desc: '近战输出' },
  [Profession.SORCERER]: { name: '术士', desc: '魔法输出' },
  [Profession.GUNNER]: { name: '枪手', desc: '远程输出' },
  [Profession.ASSASSIN]: { name: '刺客', desc: '爆发输出' },
};

interface LoginScreenProps {
  onRegister: (username: string, profession: Profession, organization: Organization) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onRegister }) => {
  const [username, setUsername] = useState('');
  const [profession, setProfession] = useState<Profession>(Profession.KNIGHT);
  const [organization, setOrganization] = useState<Organization>(Organization.IRON_FORTRESS);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onRegister(username, profession, organization);
    }
  };

  return (
    <div className="login-screen">
      <h1>末日生存 - 幸存者登记</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>代号 (用户名)</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="输入你的代号..."
            required
          />
        </div>

        <div className="form-group">
          <label>选择职业</label>
          <div className="profession-grid">
            {Object.values(Profession).map((p) => (
              <div 
                key={p}
                className={`option-card ${profession === p ? 'selected' : ''}`}
                onClick={() => setProfession(p)}
              >
                <div className="option-name">{PROFESSION_NAMES[p].name}</div>
                <div className="option-desc">{PROFESSION_NAMES[p].desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>选择所属组织</label>
          <div className="organization-grid">
            {Object.values(Organization).map((org) => {
              const info = ORGANIZATION_INFO[org];
              return (
                <div 
                  key={org}
                  className={`option-card ${organization === org ? 'selected' : ''}`}
                  onClick={() => setOrganization(org)}
                  style={{ borderColor: organization === org ? info.color : '#444' }}
                >
                  <div className="org-icon">{info.emblem}</div>
                  <div className="option-name" style={{ color: info.color }}>{info.name}</div>
                  <div className="option-desc">{info.description}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" className="start-btn">进入避难所</button>
      </form>
    </div>
  );
};
