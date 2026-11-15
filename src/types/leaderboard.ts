/** The full allowlist for public ranking data. No UUID, age, XP totals or contact fields. */
export interface PublicLeaderboardEntry {
  position: number;
  codename: string;
  level: number;
  rank: string;
  badge: string | null;
}
export interface LeaderboardResponse { entries: PublicLeaderboardEntry[]; self: PublicLeaderboardEntry | null }
