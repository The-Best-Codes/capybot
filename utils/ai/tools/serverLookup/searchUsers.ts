import type { Guild } from "discord.js";
import { fuzzySearch } from "./fuzzy";
import { type SerializedUser, serializeUser } from "./types";

export interface SearchUsersParams {
  guild: Guild;
  query?: string;
  limit?: number;
}

export interface UserSearchResult {
  user: SerializedUser;
  score: number;
}

export interface SearchUsersResult {
  results: UserSearchResult[];
  totalMembers: number;
  truncated: boolean;
  warning?: string;
}

export async function searchUsers({
  guild,
  query,
  limit = 100,
}: SearchUsersParams): Promise<SearchUsersResult> {
  const clampedLimit = Math.min(Math.max(limit, 1), 100);

  let fetchWarning: string | undefined;
  try {
    await guild.members.fetch();
  } catch {
    fetchWarning =
      "Could not fetch all members. Results may be incomplete for large guilds (1000+ members).";
  }

  const members = guild.members.cache;
  const totalMembers = members.size;

  const serializedUsers: SerializedUser[] = [...members.values()].map(serializeUser);

  let searchResults: UserSearchResult[];

  if (!query?.trim()) {
    const sorted = serializedUsers
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, clampedLimit);

    searchResults = sorted.map((user) => ({
      user,
      score: -1,
    }));
  } else {
    const fuzzyResults = fuzzySearch({
      items: serializedUsers,
      keys: ["username", "displayName", "nickname", "rolesString"],
      query,
      limit: clampedLimit,
    });

    searchResults = fuzzyResults.map((r) => ({
      user: r.item,
      score: r.score,
    }));
  }

  const truncated = totalMembers > clampedLimit;

  return {
    results: searchResults,
    totalMembers,
    truncated,
    warning: fetchWarning,
  };
}
