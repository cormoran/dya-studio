import type { ReactNode } from "react";

export interface DeveloperGuideNavigationItem {
  id: string;
  label: string;
  href?: string;
  items?: DeveloperGuideNavigationItem[];
}

export interface DeveloperGuideBreadcrumb {
  label: string;
  href?: string;
}

export interface DeveloperGuideLink {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface DeveloperGuideFeatureCard {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ReactNode;
}

export interface DeveloperGuideLevelCard {
  level: string;
  title: string;
  description: string;
  features: string[];
  current?: boolean;
}

export interface DeveloperGuideTable {
  headers: string[];
  rows: ReactNode[][];
}

export type DeveloperGuideSection =
  | { type: "paragraph"; content: ReactNode }
  | {
      type: "heading";
      id: string;
      title: string;
      number?: number;
      level?: 2 | 3;
    }
  | { type: "list"; items: ReactNode[]; ordered?: boolean }
  | {
      type: "callout";
      title?: string;
      content: ReactNode;
      tone?: "info" | "success" | "warning";
    }
  | { type: "code"; code: string; language?: string; title?: string }
  | { type: "table"; table: DeveloperGuideTable; caption?: string }
  | {
      type: "image";
      src?: string;
      alt: string;
      caption?: string;
      placeholderLabel?: string;
    }
  | {
      type: "flow";
      title?: string;
      steps: string[];
      description?: string;
    }
  | { type: "features"; cards: DeveloperGuideFeatureCard[] }
  | { type: "levels"; cards: DeveloperGuideLevelCard[] };

export interface DeveloperGuidePageDefinition {
  title: string;
  description: string;
  breadcrumbs?: DeveloperGuideBreadcrumb[];
  navigation: DeveloperGuideNavigationItem[];
  activeNavigationId?: string;
  sections: DeveloperGuideSection[];
  previous?: DeveloperGuideLink;
  next?: DeveloperGuideLink;
}
