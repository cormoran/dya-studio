import * as Tabs from "@radix-ui/react-tabs";
import { useState, type ReactNode } from "react";
import { TabActiveContext } from "../contexts/TabActiveContext";
import { PageTransition } from "./PageTransition";
import "./TabNavigation.css";

export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  // A tab stays mounted once it has been visited, so switching away and back
  // keeps everything the page was holding (loaded device data, in-progress
  // edits, selected layer, scroll position) instead of tearing it down and
  // re-reading from the keyboard. Tabs that were never opened are not mounted
  // at all, so we still don't fire every page's device RPCs up front.
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<string>>(
    () => new Set([activeTab]),
  );
  // Adjusted during render (React's "adjust state when props change" pattern)
  // rather than in an effect, so the newly-selected tab is mounted in this same
  // render instead of one frame later.
  if (!visitedTabs.has(activeTab)) {
    setVisitedTabs(new Set(visitedTabs).add(activeTab));
  }

  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={onTabChange}
      className="flex flex-col h-full"
    >
      {/* Tab List */}
      <Tabs.List className="app-tab-list flex shrink-0 items-center gap-1 px-2 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-sm overflow-x-auto scrollbar-none transition-colors duration-300">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            aria-label={tab.label}
            title={tab.label}
            className="tab-trigger flex shrink-0 first:ml-auto last:mr-auto items-center gap-2 whitespace-nowrap"
          >
            <span className="app-tab-icon">{tab.icon}</span>
            <span className="hidden tablet:inline">{tab.label}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs
          .filter((tab) => visitedTabs.has(tab.id))
          .map((tab) => (
            <Tabs.Content
              key={tab.id}
              value={tab.id}
              className="h-full outline-none data-[state=inactive]:hidden"
              forceMount
            >
              <TabActiveContext.Provider value={activeTab === tab.id}>
                <PageTransition isActive={activeTab === tab.id}>
                  {tab.content}
                </PageTransition>
              </TabActiveContext.Provider>
            </Tabs.Content>
          ))}
      </div>
    </Tabs.Root>
  );
}
