import type { Achievement } from '../components/AchievementToast';

export interface UserProgress {
  cardsCreated: number;
  decksCreated: number;
  reviewsCompleted: number;
  currentStreak: number;
  maxStreak: number;
  perfectReviews: number;
  totalStudyTime: number; // minutes
  decksShared: number;
  decksImported: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // ─── Beginner (common) ───
  {
    id: 'first_card',
    title: 'First Steps',
    description: 'สร้างการ์ดแรกของคุณ',
    rarity: 'common',
    icon: 'seedling' // 🌱
  },
  {
    id: 'first_deck',
    title: 'Deck Builder',
    description: 'สร้างชุดการ์ดแรก',
    rarity: 'common',
    icon: 'stack' // 📦
  },
  {
    id: 'first_review',
    title: 'Memory Novice',
    description: 'ทบทวนการ์ดครั้งแรก',
    rarity: 'common',
    icon: 'eye' // 👁
  },
  {
    id: 'cards_10',
    title: 'Getting Started',
    description: 'สร้าง 10 การ์ด',
    rarity: 'common',
    icon: 'layers' // 📋
  },
  {
    id: 'reviews_10',
    title: 'Curious Mind',
    description: 'ทบทวน 10 การ์ด',
    rarity: 'common',
    icon: 'lightbulb' // 💡
  },
  {
    id: 'streak_3',
    title: 'Three-Peat',
    description: 'ทบทวน 3 วันติดต่อกัน',
    rarity: 'common',
    icon: 'calendar' // 📅
  },

  // ─── Intermediate (rare) ───
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'ทบทวน 7 วันติดต่อกัน',
    rarity: 'rare',
    icon: 'shield' // 🛡
  },
  {
    id: 'cards_50',
    title: 'Half Century',
    description: 'สร้าง 50 การ์ด',
    rarity: 'rare',
    icon: 'bookmark' // 🔖
  },
  {
    id: 'cards_100',
    title: 'Century Club',
    description: 'สร้าง 100 การ์ด',
    rarity: 'rare',
    icon: 'trophy' // 🏆
  },
  {
    id: 'reviews_50',
    title: 'Speed Demon',
    description: 'ทบทวนครบ 50 การ์ด (รวมทุกวัน)',
    rarity: 'rare',
    icon: 'bolt' // ⚡
  },
  {
    id: 'perfect_10',
    title: 'Perfectionist',
    description: 'ทบทวนได้คะแนนเต็ม 10 การ์ดติดต่อกัน',
    rarity: 'rare',
    icon: 'target' // 🎯
  },
  {
    id: 'decks_5',
    title: 'Multi-Tasker',
    description: 'สร้าง 5 ชุดการ์ด',
    rarity: 'rare',
    icon: 'grid' // 📊
  },

  // ─── Advanced (epic) ───
  {
    id: 'streak_30',
    title: 'Fire Streak',
    description: 'ทบทวน 30 วันติดต่อกัน',
    rarity: 'epic',
    icon: 'flame' // 🔥
  },
  {
    id: 'cards_500',
    title: 'Knowledge Vault',
    description: 'สร้าง 500 การ์ด',
    rarity: 'epic',
    icon: 'vault' // 🏛
  },
  {
    id: 'study_time_10h',
    title: 'Dedicated Scholar',
    description: 'ทบทวนรวม 10 ชั่วโมง',
    rarity: 'epic',
    icon: 'clock' // ⏰
  },
  {
    id: 'share_first',
    title: 'Community Helper',
    description: 'แชร์ชุดการ์ดแรกสู่ชุมชน',
    rarity: 'epic',
    icon: 'heart' // ❤️
  },
  {
    id: 'reviews_500',
    title: 'Knowledge Seeker',
    description: 'ทบทวนครบ 500 การ์ด',
    rarity: 'epic',
    icon: 'compass' // 🧭
  },
  {
    id: 'perfect_50',
    title: 'Sharp Shooter',
    description: 'ทบทวนได้คะแนนเต็ม 50 การ์ดติดต่อกัน',
    rarity: 'epic',
    icon: 'crosshair' // 🎯+
  },
  {
    id: 'streak_60',
    title: 'Diamond Habit',
    description: 'ทบทวน 60 วันติดต่อกัน',
    rarity: 'epic',
    icon: 'diamond' // 💎
  },

  // ─── Legendary ───
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'ทบทวน 100 วันติดต่อกัน',
    rarity: 'legendary',
    icon: 'crown' // 👑
  },
  {
    id: 'reviews_10000',
    title: 'Memory Master',
    description: 'ทบทวนครบ 10,000 การ์ด',
    rarity: 'legendary',
    icon: 'brain' // 🧠
  },
  {
    id: 'cards_1000',
    title: 'Encyclopedia',
    description: 'สร้าง 1,000 การ์ด',
    rarity: 'legendary',
    icon: 'book' // 📚
  },
  {
    id: 'perfect_100',
    title: 'Flawless Mind',
    description: 'ทบทวนได้คะแนนเต็ม 100 การ์ดติดต่อกัน',
    rarity: 'legendary',
    icon: 'sparkles' // ✨
  },
  {
    id: 'streak_365',
    title: 'Year of Mastery',
    description: 'ทบทวน 365 วันติดต่อกัน',
    rarity: 'legendary',
    icon: 'infinity' // ♾️
  },
  {
    id: 'study_time_100h',
    title: 'Sage',
    description: 'ทบทวนรวม 100 ชั่วโมง',
    rarity: 'legendary',
    icon: 'moon' // 🌙
  },
];

export function checkAchievements(progress: UserProgress, previousProgress: UserProgress): Achievement[] {
  const unlocked: Achievement[] = [];

  // First card
  if (progress.cardsCreated >= 1 && previousProgress.cardsCreated === 0) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_card')!);
  }

  // First deck
  if (progress.decksCreated >= 1 && previousProgress.decksCreated === 0) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_deck')!);
  }

  // First review
  if (progress.reviewsCompleted >= 1 && previousProgress.reviewsCompleted === 0) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_review')!);
  }

  // Cards 10
  if (progress.cardsCreated >= 10 && previousProgress.cardsCreated < 10) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'cards_10')!);
  }

  // Reviews 10
  if (progress.reviewsCompleted >= 10 && previousProgress.reviewsCompleted < 10) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'reviews_10')!);
  }

  // Streak achievements
  if (progress.currentStreak >= 3 && previousProgress.currentStreak < 3) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_3')!);
  }
  if (progress.currentStreak >= 7 && previousProgress.currentStreak < 7) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_7')!);
  }
  if (progress.currentStreak >= 30 && previousProgress.currentStreak < 30) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_30')!);
  }
  if (progress.currentStreak >= 60 && previousProgress.currentStreak < 60) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_60')!);
  }
  if (progress.currentStreak >= 100 && previousProgress.currentStreak < 100) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_100')!);
  }
  if (progress.currentStreak >= 365 && previousProgress.currentStreak < 365) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'streak_365')!);
  }

  // Card creation achievements
  if (progress.cardsCreated >= 50 && previousProgress.cardsCreated < 50) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'cards_50')!);
  }
  if (progress.cardsCreated >= 100 && previousProgress.cardsCreated < 100) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'cards_100')!);
  }
  if (progress.cardsCreated >= 500 && previousProgress.cardsCreated < 500) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'cards_500')!);
  }
  if (progress.cardsCreated >= 1000 && previousProgress.cardsCreated < 1000) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'cards_1000')!);
  }

  // Deck creation
  if (progress.decksCreated >= 5 && previousProgress.decksCreated < 5) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'decks_5')!);
  }

  // Review achievements
  if (progress.reviewsCompleted >= 500 && previousProgress.reviewsCompleted < 500) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'reviews_500')!);
  }
  if (progress.reviewsCompleted >= 10000 && previousProgress.reviewsCompleted < 10000) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'reviews_10000')!);
  }

  // Perfect review achievements
  if (progress.perfectReviews >= 10 && previousProgress.perfectReviews < 10) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_10')!);
  }
  if (progress.perfectReviews >= 50 && previousProgress.perfectReviews < 50) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_50')!);
  }
  if (progress.perfectReviews >= 100 && previousProgress.perfectReviews < 100) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_100')!);
  }

  // Study time achievements
  if (progress.totalStudyTime >= 600 && previousProgress.totalStudyTime < 600) { // 10 hours
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'study_time_10h')!);
  }
  if (progress.totalStudyTime >= 6000 && previousProgress.totalStudyTime < 6000) { // 100 hours
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'study_time_100h')!);
  }

  // Community achievements
  if (progress.decksShared >= 1 && previousProgress.decksShared === 0) {
    unlocked.push(ACHIEVEMENTS.find(a => a.id === 'share_first')!);
  }

  return unlocked.filter(Boolean);
}

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function getAchievementProgress(progress: UserProgress): { [key: string]: boolean } {
  const completed: { [key: string]: boolean } = {};

  completed['first_card'] = progress.cardsCreated >= 1;
  completed['first_deck'] = progress.decksCreated >= 1;
  completed['first_review'] = progress.reviewsCompleted >= 1;
  completed['cards_10'] = progress.cardsCreated >= 10;
  completed['reviews_10'] = progress.reviewsCompleted >= 10;
  completed['streak_3'] = progress.maxStreak >= 3;
  completed['streak_7'] = progress.maxStreak >= 7;
  completed['cards_50'] = progress.cardsCreated >= 50;
  completed['cards_100'] = progress.cardsCreated >= 100;
  completed['reviews_50'] = progress.reviewsCompleted >= 50;
  completed['perfect_10'] = progress.perfectReviews >= 10;
  completed['decks_5'] = progress.decksCreated >= 5;
  completed['streak_30'] = progress.maxStreak >= 30;
  completed['cards_500'] = progress.cardsCreated >= 500;
  completed['study_time_10h'] = progress.totalStudyTime >= 600;
  completed['share_first'] = progress.decksShared >= 1;
  completed['reviews_500'] = progress.reviewsCompleted >= 500;
  completed['perfect_50'] = progress.perfectReviews >= 50;
  completed['streak_60'] = progress.maxStreak >= 60;
  completed['streak_100'] = progress.maxStreak >= 100;
  completed['reviews_10000'] = progress.reviewsCompleted >= 10000;
  completed['cards_1000'] = progress.cardsCreated >= 1000;
  completed['perfect_100'] = progress.perfectReviews >= 100;
  completed['streak_365'] = progress.maxStreak >= 365;
  completed['study_time_100h'] = progress.totalStudyTime >= 6000;

  return completed;
}
