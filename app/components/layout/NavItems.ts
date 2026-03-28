import { Calendar, Route, MapPin, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Kalender", href: "/", icon: Calendar },
  { label: "Wochenplan", href: "/route", icon: Route },
  { label: "Adressen", href: "/addresses", icon: MapPin },
  { label: "Einstellungen", href: "/settings", icon: Settings },
];
