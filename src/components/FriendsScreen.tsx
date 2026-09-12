import type { FriendsScreenProps } from "../screenProps";
import type { Friend } from "../types";
import { formatDistance } from "../lib/geo";

/** "Walked to Phipps Conservatory · today" style label. */
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
 * Friends leaderboard. Walkable has no backend, so every row here comes from
 * local seed data (src/data/friends.ts). The banner says so up front, sits
 * directly under the title, and has no dismiss control - it is not a toast.
 */
export default function FriendsScreen({ rows, friends }: FriendsScreenProps) {
  return (
    <div className="screen">
      <div className="screen__pad">
        <h1>Friends</h1>

        <div className="banner banner--warn">
          <span>
            Demo data — Walkable has no server yet, so these friends are simulated. Your
            own stats are real.
          </span>
        </div>

        <h2>Leaderboard</h2>
        {rows.length === 0 ? (
          <div className="empty">
            <p className="empty__mark">No leaderboard yet.</p>
          </div>
        ) : (
          <ul className="rows">
            {rows.map((row) => (
              <li key={row.id}>
                <div className={`row row--static${row.isYou ? " row--you" : ""}`}>
                  <span className="row__rank">{row.rank}</span>
                  <span className="row__emoji" aria-hidden="true">
                    {row.emoji}
                  </span>
                  <div className="row__main">
                    <span className="row__title">{row.name}</span>
                    <span className="faint">
                      {row.points} pts · {formatDistance(row.totalMeters)}
                    </span>
                  </div>
                  {row.isYou && (
                    <span
                      className="badge badge--new badge--upper"
                      aria-label="This is your row"
                    >
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
            <p className="empty__mark">No friends yet.</p>
          </div>
        ) : (
          <ul className="rows">
            {friends.map((friend) => (
              <li key={friend.id}>
                <div className="row row--static">
                  <span className="row__emoji" aria-hidden="true">
                    {friend.emoji}
                  </span>
                  <div className="row__main">
                    <span className="row__title">{friend.name}</span>
                    <span className="faint">{lastWalkLabel(friend)}</span>
                  </div>
                  <span className="badge badge--visited">
                    {friend.currentStreakDays}d streak
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
