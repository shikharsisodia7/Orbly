import {
  LayoutDashboard,
  UserX,
  UserMinus,
  Users,
  UserPlus,
  Heart,
  History,
  ListChecks,
  HelpCircle,
  Settings,
  Bot,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showQueueBadge?: boolean;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/app/chat", label: "Ask Orbly", icon: Bot },
  { href: "/app/nonfollowers", label: "Don't Follow Back", icon: UserX },
  { href: "/app/unfollowers", label: "Recent Unfollowers", icon: UserMinus },
  { href: "/app/followers", label: "Followers", icon: Users },
  { href: "/app/following", label: "Following", icon: UserPlus },
  { href: "/app/mutuals", label: "Mutuals", icon: Heart },
  { href: "/app/snapshots", label: "Snapshots", icon: History },
  { href: "/app/queue", label: "Unfollow Queue", icon: ListChecks, showQueueBadge: true },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
