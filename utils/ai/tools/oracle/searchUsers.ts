import type { Guild } from "discord.js";
import { fuzzySearch } from "./fuzzy";
import { type SerializedUser, type UserSearchResult, serializeUser } from "./types";

export interface SearchUsersParams {
  guild: Guild;
  query?: string;
  limit?: number;
}

export async function searchUsers({
  guild,
  query,
  limit = 100,
}: SearchUsersParams): Promise<UserSearchResult[]> {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);

  try {
    await guild.members.fetch();
  } catch {
    // no-op
  }

  const members = guild.members.cache;

  const serializedUsers: SerializedUser[] = [...members.values()].map(serializeUser);

  if (!query?.trim()) {
    const sorted = serializedUsers
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, clampedLimit);

    return sorted.map((user) => ({
      user,
      score: 1,
    }));
  }

  const searchResults = fuzzySearch({
    items: serializedUsers,
    keys: ["username", "displayName", "nickname", "roles"],
    query,
    limit: clampedLimit,
  });

  return searchResults.map((r) => ({
    user: r.item,
    score: r.score,
  }));
}
