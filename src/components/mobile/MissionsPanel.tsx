import React from 'react';
import { Mission, Achievement } from '../../types';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Tag } from '../ui/Tag';

interface MissionsPanelProps {
  missions: Mission[];
  achievements: Achievement[];
  level: number;
  experience: number;
  expToNext: number;
  title: string;
}

export const MissionsPanel: React.FC<MissionsPanelProps> = ({
  missions,
  achievements,
  level,
  experience,
  expToNext,
  title
}) => {
  const completedMissions = missions.filter(m => m.completed).length;
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const levelProgress = expToNext > 0 ? ((experience % 1000) / expToNext) * 100 : 100;

  return (
    <div className="missions-panel">
      <Card className="missions-panel__level">
        <div className="missions-panel__level-header">
          <div>
            <div className="text-secondary mb-sm">Уровень {level}</div>
            <div className="missions-panel__level-title">{title}</div>
          </div>
          <div className="missions-panel__level-icon">⭐</div>
        </div>
        <ProgressBar
          value={levelProgress}
          label={`Опыт: ${experience.toLocaleString('ru-RU')} / ${(experience + expToNext).toLocaleString('ru-RU')}`}
          variant="default"
          showValue
        />
      </Card>

      <Card className="missions-panel__missions">
        <h3 className="missions-panel__section-title">
          Миссии ({completedMissions}/{missions.length})
        </h3>
        <div className="missions-panel__missions-list">
          {missions.map(mission => (
            <div
              key={mission.id}
              className={`mission-item ${mission.completed ? 'mission-item--completed' : ''}`}
            >
              <div className="mission-item__header">
                <h4 className="mission-item__title">{mission.title}</h4>
                {mission.completed && <Tag variant="success">✓ Выполнено</Tag>}
              </div>
              <p className="mission-item__description">{mission.description}</p>
              {!mission.completed && (
                <div className="mission-item__progress">
                  <ProgressBar
                    value={(mission.current / mission.target) * 100}
                    label={`${mission.current.toLocaleString('ru-RU')} / ${mission.target.toLocaleString('ru-RU')}`}
                    variant="default"
                  />
                </div>
              )}
              <div className="mission-item__reward">
                Награда: +{mission.reward} опыта
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="missions-panel__achievements">
        <h3 className="missions-panel__section-title">
          Достижения ({unlockedAchievements}/{achievements.length})
        </h3>
        <div className="missions-panel__achievements-grid">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className={`achievement-item ${achievement.unlocked ? 'achievement-item--unlocked' : 'achievement-item--locked'}`}
            >
              <div className="achievement-item__icon">{achievement.icon}</div>
              <div className="achievement-item__info">
                <h4 className="achievement-item__title">{achievement.title}</h4>
                <p className="achievement-item__description">{achievement.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

