import type { RewardBadge } from './types';

export type RewardLevel = {
  level: number;
  label: string;
  minXp: number;
};

export type RewardCatalog = {
  xpRules: Record<string, number>;
  levels: RewardLevel[];
  badges: Array<Pick<RewardBadge, 'id' | 'title' | 'description' | 'icon' | 'category'> & { target?: number }>;
};
