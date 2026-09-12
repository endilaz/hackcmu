import type { AchievementsScreenProps } from "../screenProps";
import { formatDistance } from "../lib/geo";

/** Badges measured in meters - their progress is rendered with formatDistance, not raw numbers. */
const DISTANCE_BADGE_IDS = new Set(["5km-total", "10km-total"]);

/** Points, streaks, and the full badge shelf (locked badges shown too - that's the point). */
export default function AchievementsScreen({ stats, badges, onBack }: AchievementsScreenProps) {
  return (
    <div className="screen">
      <div className="screen__pad">
        <button type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
          ←
        </button>

        <h1>Achievements</h1>

        <div className="stats">
          <div className="stat">
            <span className="stat__value">{stats.points}</span>
            <span className="stat__label">Points</span>
          </div>
          <div className="stat">
            <span className="stat__value">{stats.currentStreakDays}</span>
            <span className="stat__label">Streak</span>
          </div>
          <div className="stat">
            <span className="stat__value">{stats.uniqueDestinations}</span>
            <span className="stat__label">Places discovered</span>
          </div>
        </div>

        <p className="muted">
          {stats.totalWalks} walks completed · {formatDistance(stats.totalMeters)} total ·
          best streak {stats.longestStreakDays} {stats.longestStreakDays === 1 ? "day" : "days"}
        </p>

        {badges.length === 0 ? (
          <div className="empty">
            <p>No badges yet.</p>
            <p className="faint">Take a walk to start earning them.</p>
          </div>
        ) : (
          <ul className="list">
            {badges.map((badge) => (
              <li key={badge.id}>
                <div className="list__item">
                  <span aria-hidden="true">{badge.emoji}</span>
                  <div className="list__main">
                    <span className="list__title">{badge.name}</span>
                    <span className="muted">{badge.description}</span>
                  </div>
                  {badge.earned ? (
                    <span className="badge badge--arrived">Earned</span>
                  ) : (
                    badge.progress && (
                      <span className="faint">
                        {DISTANCE_BADGE_IDS.has(badge.id)
                          ? `${formatDistance(badge.progress.current)} / ${formatDistance(badge.progress.target)}`
                          : `${badge.progress.current} / ${badge.progress.target}`}
                      </span>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
