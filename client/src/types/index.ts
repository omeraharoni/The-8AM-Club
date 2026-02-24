export interface User {
  id: string;
  username: string;
  weeklyPoints: number;
  workoutCount: number;
  wakeupCount: number;
}

export interface ActivityLog {
  id: string;
  type: string;
  value: number;
  note?: string;
  isShared?: boolean;
  points: number;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  fromUsername: string;
}

export interface LeaderboardItem {
  username: string;
  weeklyPoints: number;
  workouts: number;
  wakeups: number;
  sleep: number;
  steps: number;
}
