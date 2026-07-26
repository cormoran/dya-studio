import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { PageTransition } from "./PageTransition";

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
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={onTabChange}
      className="flex flex-col h-full"
    >
      {/* Tab List */}
      <Tabs.List className="flex items-center justify-center gap-1 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 backdrop-blur-sm overflow-x-auto scrollbar-none transition-colors duration-300">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            className="tab-trigger flex items-center gap-2 whitespace-nowrap"
          >
            <span className="opacity-70">{tab.icon}</span>
            <span className="hidden tablet:inline">{tab.label}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <Tabs.Content
            key={tab.id}
            value={tab.id}
            className="h-full outline-none data-[state=inactive]:hidden"
            forceMount
          >
            {/*
              Mount the transition only while the tab is active.

              Previously this rendered a PageTransition for every tab, flipping
              its key between "" and the tab id. `AnimatePresence mode="wait"`
              holds the outgoing child until its exit animation finishes — and
              inside a `display: none` panel that never happens, so the incoming
              child never mounted. The tab looked blank until a reload, and the
              stale subtree left behind still rendered DOM whose event handlers
              updated a fiber React had discarded: clicks fired but setState did
              nothing.

              Rendering nothing when inactive means each tab's AnimatePresence
              only ever holds one key, with no exit to wait on.
            */}
            {activeTab === tab.id && (
              <PageTransition transitionKey={tab.id}>
                {tab.content}
              </PageTransition>
            )}
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
