import type { Tab } from "../screenProps";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "walk", label: "Walk", icon: "\u{1F6B6}" },
  { id: "history", label: "History", icon: "\u{1F5FA}" },
  { id: "progress", label: "Progress", icon: "\u{1F3C5}" },
  { id: "friends", label: "Friends", icon: "\u{1F465}" },
];

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
              {tab.icon}
            </span>
            <span className="tab__label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
