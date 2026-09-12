import ActiveWalkScreen from "./components/ActiveWalkScreen";
import HistoryScreen from "./components/HistoryScreen";
import SimulatorPanel from "./components/SimulatorPanel";
import SuggestionScreen from "./components/SuggestionScreen";
import SummaryScreen from "./components/SummaryScreen";
import TimeInputScreen from "./components/TimeInputScreen";
import { useWalkMachine } from "./useWalkMachine";

export default function App() {
  const m = useWalkMachine();
  const activeWalk = m.appState.activeWalk;

  function renderScreen() {
    switch (m.screen) {
      case "suggestion":
        // Guard: the picker only returns null if there are no usable
        // destinations at all, in which case fall back to the time input.
        if (!m.suggestion) break;
        return (
          <SuggestionScreen
            suggestion={m.suggestion}
            user={m.user}
            freeMinutes={m.minutes}
            onStart={m.startWalk}
            onReroll={m.reroll}
            onChangeTime={m.goTime}
          />
        );

      case "active":
        if (!activeWalk || !m.activeDestination) break;
        return (
          <ActiveWalkScreen
            walk={activeWalk}
            destination={m.activeDestination}
            user={m.user}
            elapsedMs={m.elapsedMs}
            remainingMeters={m.remainingMeters}
            onEndEarly={m.endWalkEarly}
          />
        );

      case "summary":
        if (!m.summaryWalk) break;
        return (
          <SummaryScreen
            walk={m.summaryWalk}
            destination={m.destinationsById[m.summaryWalk.destinationId]}
            onWalkAgain={m.goTime}
            onViewHistory={m.goHistory}
          />
        );

      case "historyDetail":
        if (!m.detailWalk) break;
        return (
          <SummaryScreen
            walk={m.detailWalk}
            destination={m.destinationsById[m.detailWalk.destinationId]}
            readOnly
            onBack={m.goBackFromHistory}
          />
        );

      case "history":
        return (
          <HistoryScreen
            walks={m.appState.walks}
            destinationsById={m.destinationsById}
            totalDestinations={m.totalDestinations}
            visitedCount={m.visitedCount}
            totalDistanceMeters={m.totalDistanceMeters}
            onSelectWalk={m.selectWalk}
            onBack={m.goBackFromHistory}
          />
        );
    }

    return (
      <TimeInputScreen
        minutes={m.minutes}
        onMinutesChange={m.setMinutes}
        onFind={m.findWalk}
        locating={m.locating}
        slowFix={m.slowFix}
        error={m.locError}
        onUseSimulator={() => m.toggleSim(true)}
        simEnabled={m.simEnabled}
      />
    );
  }

  const showHistoryButton = m.screen !== "history" && m.screen !== "historyDetail";

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="topbar__title">
          Spare Walk
          {m.simEnabled && (
            <span className="sim-badge" title="Simulated GPS is active">
              SIM
            </span>
          )}
        </h1>
        <div className="topbar__actions">
          {showHistoryButton && (
            <button
              type="button"
              className="btn btn--icon"
              onClick={m.goHistory}
              aria-label="View walk history"
              title="History"
            >
              🕘
            </button>
          )}
        </div>
      </header>

      {renderScreen()}

      {m.simEnabled && (
        <SimulatorPanel
          settings={m.simSettings}
          onSettingsChange={m.updateSimSettings}
          enabled={m.simEnabled}
          onToggleEnabled={m.toggleSim}
          paused={m.simPaused}
          onPauseToggle={m.toggleSimPause}
          walkActive={activeWalk !== null}
          onApplyStart={m.applySimStart}
          onJumpToArrival={m.jumpToArrival}
        />
      )}
    </div>
  );
}
