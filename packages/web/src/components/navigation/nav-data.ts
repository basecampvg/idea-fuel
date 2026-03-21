import {
  FileText,
  Search,
  MessageSquare,
  TrendingUp,
  BookOpen,
  Flame,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface FeaturedCard {
  badge: string;
  title: string;
  href: string;
}

// ── Product Dropdown ────────────────────────────────────────────────
export const productFeatures: NavSection = {
  label: 'Features',
  items: [
    {
      title: 'AI Business Plan Generator',
      description: 'Generate investor-ready plans in minutes',
      href: '/product/reports',
      icon: FileText,
    },
    {
      title: 'Market Research & Analysis',
      description: 'Competitors, sizing, trends — automated',
      href: '/product/research',
      icon: Search,
    },
    {
      title: 'AI Interviews',
      description: 'Structured validation that uncovers blind spots',
      href: '/product/interviews',
      icon: MessageSquare,
    },
    {
      title: 'Financial Projections',
      description: 'Unit economics, revenue models, runway',
      href: '/product/financials',
      icon: TrendingUp,
    },
  ],
};

export const productFeatured: FeaturedCard = {
  badge: 'Sample report',
  title: 'See an AI-Generated Business Plan',
  href: '/demo-report',
};

// ── Resources Dropdown ──────────────────────────────────────────────
export const resourcesLearn: NavSection = {
  label: 'Learn',
  items: [
    {
      title: 'Documentation',
      description: 'Guides and tutorials',
      href: '/docs',
      icon: BookOpen,
    },
    {
      title: 'Daily Trend Picks',
      description: 'AI-curated business opportunities',
      href: '/trends',
      icon: Flame,
    },
  ],
};

export const resourcesCompany: NavSection = {
  label: 'Company',
  items: [
    {
      title: 'Changelog',
      description: "What's new in IdeaFuel",
      href: '/changelog',
      icon: RefreshCw,
    },
    {
      title: 'About',
      description: 'The story behind IdeaFuel',
      href: '/about',
      icon: Users,
    },
  ],
};

// ── Direct Links ────────────────────────────────────────────────────
export const directLinks = [
  { title: 'Pricing', href: '/plans' },
  { title: 'Blog', href: '/blog' },
] as const;
