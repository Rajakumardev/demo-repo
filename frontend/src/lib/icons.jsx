import {
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Gift,
  HeartPulse,
  Home,
  Music,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Zap,
} from 'lucide-react';

/**
 * Registry mapping the icon names stored on categories to lucide components.
 * Keeps the persisted value tiny while still rendering a real icon.
 */
export const ICONS = {
  utensils: Utensils,
  car: Car,
  receipt: Receipt,
  'shopping-bag': ShoppingBag,
  film: Film,
  'heart-pulse': HeartPulse,
  plane: Plane,
  tag: Tag,
  coffee: Coffee,
  home: Home,
  gift: Gift,
  book: BookOpen,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  music: Music,
  bus: Bus,
  smartphone: Smartphone,
  zap: Zap,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({ name, size = 18 }) {
  const Icon = ICONS[name] || Tag;
  return <Icon size={size} />;
}

export default CategoryIcon;
