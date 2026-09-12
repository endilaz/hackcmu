import type { AchievementsScreenProps } from "../screenProps";
import { formatDistance } from "../lib/geo";
import WalkBadge from "./WalkBadge";
import PinboardRoom from "./PinboardRoom";

/** Badges measured in meters - their progress is rendered with formatDistance, not raw numbers. */
const DISTANCE_BADGE_IDS = new Set(["5km-total", "10km-total"]);

/**
 * Points, streaks and the full badge shelf.
 *
 * Locked badges stay on the shelf, muted but fully legible - seeing what you
 * haven't earned yet is the point. There is no XP or level system here: the
 * only numbers shown are ones achievements.ts actually computes.
 */
export default function AchievementsScreen({
  stats,
  badges,
  walks,
  destinationsById,
}: AchievementsScreenProps) {
  const earnedCount = badges.filter((b) => b.earned).length;
  const collectedWalks = walks.filter((walk) => walk.status !== "active").reverse();

  return (
    <div className="screen">
      <div className="screen__pad">
        <h1>Progress</h1>

        <div className="facts facts--rule">
          <div className="fact">
            <span className="fact__value">{stats.points}</span>
            <span className="overline">Points</span>
          </div>
          <div className="fact">
            <span className="fact__value">{stats.currentStreakDays}</span>
            <span className="overline">Day streak</span>
          </div>
          <div className="fact">
            <span className="fact__value">{formatDistance(stats.totalMeters)}</span>
            <span className="overline">Total</span>
          </div>
        </div>

        <p className="faint">
          {stats.totalWalks} {stats.totalWalks === 1 ? "walk" : "walks"} ·{" "}
          {stats.uniqueDestinations} places discovered · longest streak{" "}
          {stats.longestStreakDays} {stats.longestStreakDays === 1 ? "day" : "days"}
        </p>

        <PinboardRoom walks={walks} destinationsById={destinationsById} />

        <div className="collection-heading">
          <div>
            <h2>Walk collection</h2>
            <p className="faint">A route-shaped keepsake for every finished walk.</p>
          </div>
          <span className="faint">{collectedWalks.length} collected</span>
        </div>

        {collectedWalks.length === 0 ? (
          <div className="empty collection-empty">
            <p className="empty__mark">Your first badge is waiting.</p>
            <p className="faint">Finish a walk and its route becomes a little keepsake here.</p>
          </div>
        ) : (
          <ul className="walk-collection" aria-label="Collected walk badges">
            {collectedWalks.map((walk) => {
              const destination = destinationsById[walk.destinationId];
              const name = destination?.name ?? "Mystery stroll";
              return (
                <li key={walk.id} className="walk-collection__item">
                  <WalkBadge walk={walk} compact label={`${name} walk badge`} />
                  <span className="walk-collection__name">{name}</span>
                  <span className="walk-collection__meta">
                    {walk.arrived ? "Arrived" : "Stroll"} · {formatDistance(walk.distanceMeters)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <h2>Badges</h2>
          <span className="faint">
            {earnedCount} of {badges.length}
          </span>
        </div>

        {badges.length === 0 ? (
          <div className="empty">
            <p className="empty__mark">No badges yet.</p>
            <p className="faint">Take a walk to start earning them.</p>
          </div>
        ) : (
          <ul className="shelf">
            {badges.map((badge) => (
              <li
                key={badge.id}
                className={`shelf__item${badge.earned ? "" : " shelf__item--locked"}`}
              >
                <span className="shelf__emoji" aria-hidden="true">
                  {badge.emoji}
                </span>
                <span className="shelf__name">{badge.name}</span>
                <span className="shelf__desc">{badge.description}</span>
                {badge.earned ? (
                  <span className="shelf__progress">Earned</span>
                ) : (
                  badge.progress && (
                    <span className="shelf__progress">
                      {DISTANCE_BADGE_IDS.has(badge.id)
                        ? `${formatDistance(badge.progress.current)} / ${formatDistance(badge.progress.target)}`
                        : `${badge.progress.current} / ${badge.progress.target}`}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
