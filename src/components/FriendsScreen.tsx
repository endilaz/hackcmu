import type { FriendsScreenProps } from "../screenProps";
import type { Friend } from "../types";
import { formatDistance } from "../lib/geo";

/** "Walked to Phipps Conservatory · today" style label (plan.md 9.x style). */
function lastWalkLabel(friend: Friend): string {
  const when =
    friend.lastWalkDaysAgo === 0
      ? "today"
      : friend.lastWalkDaysAgo === 1
        ? "yesterday"
        : `${friend.lastWalkDaysAgo} days ago`;
  return `Walked to ${friend.lastDestinationName} · ${when}`;
}

/**
 * Friends leaderboard. Spare Walk has no backend, so every row here comes
 * from local seed data (src/data/friends.ts) - the banner below says so up
 * front and stays visible, not tucked into a tooltip.
 */
export default function FriendsScreen({ rows, friends, onBack }: FriendsScreenProps) {
  return (
    <div className="screen">
      <div className="screen__pad">
        <button type="button" className="btn btn--icon" onClick={onBack} aria-label="Back">
          ←
        </button>

        <h1>Friends</h1>

        <div className="banner banner--warn">
          <span>
            Demo data — Spare Walk has no server yet, so these friends are simulated. Your own
            stats are real.
          </span>
        </div>

        <h2>Leaderboard</h2>
        {rows.length === 0 ? (
          <div className="empty">
            <p>No leaderboard yet.</p>
          </div>
        ) : (
          <ul className="list">
            {rows.map((row) => (
              <li key={row.id}>
                <div className="list__item">
                  <span aria-hidden="true">
                    #{row.rank} {row.emoji}
                  </span>
                  <div className="list__main">
                    <span className="list__title">{row.name}</span>
                    <span className="muted">
                      {row.points} pts · {formatDistance(row.totalMeters)}
                    </span>
                  </div>
                  {row.isYou && (
                    <span className="badge badge--new" aria-label="This is your row">
                      You
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2>Friend activity</h2>
        {friends.length === 0 ? (
          <div className="empty">
            <p>No friends yet.</p>
          </div>
        ) : (
          <ul className="list">
            {friends.map((friend) => (
              <li key={friend.id}>
                <div className="list__item">
                  <span aria-hidden="true">{friend.emoji}</span>
                  <div className="list__main">
                    <span className="list__title">{friend.name}</span>
                    <span className="muted">{lastWalkLabel(friend)}</span>
                  </div>
                  <span className="badge badge--visited">{friend.currentStreakDays}d streak</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
