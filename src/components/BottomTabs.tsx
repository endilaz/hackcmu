import type { Tab } from "../screenProps";

const TABS: { id: Tab; label: string; icon: "walk" | "history" | "progress" | "friends" }[] = [
  { id: "walk", label: "Walk", icon: "walk" },
  { id: "history", label: "History", icon: "history" },
  { id: "progress", label: "Progress", icon: "progress" },
  { id: "friends", label: "Friends", icon: "friends" },
];

function TabIcon({ icon }: { icon: (typeof TABS)[number]["icon"] }) {
  const paths = {
    walk: <><path d="M9 4a2 2 0 1 0 0 .01" /><path d="m10 8 3 2 2 4M10 8l-2 5 3 2-2 5M11 15l5 4" /></>,
    history: <><path d="M4 6h16v13H4z" /><path d="M8 3v6M16 3v6M7 12h10M7 16h6" /></>,
    progress: <><circle cx="12" cy="12" r="8" /><path d="m12 7 1.5 3 3.5.5-2.5 2.4.6 3.5-3.1-1.7-3.1 1.7.6-3.5L7 10.5l3.5-.5Z" /></>,
    friends: <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c.5-4 3-6 6-6s5.5 2 6 6M15 15c3 0 5 2 5 5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[icon]}</svg>;
}

type Props = {
  active: Tab;
  onSelect: (tab: Tab) => void;
};

/**
 * The app's primary navigation. Before this existed, Heatmap, Progress and
 * Friends were reachable only by opening History first, which buried three of
 * the five screens two taps deep.
 *
 * Deliberately absent from the focused flows (suggestion, active walk,
 * summary, calendar import) - those are one-decision screens, not places.
 */
export default function BottomTabs({ active, onSelect }: Props) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tab${on ? " tab--on" : ""}`}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(tab.id)}
          >
            <span className="tab__icon" aria-hidden="true">
              <TabIcon icon={tab.icon} />
            </span>
            <span className="tab__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
