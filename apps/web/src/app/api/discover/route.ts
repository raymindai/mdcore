import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TrendingRepo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  todayStars: number;
  language: string;
  url: string;
  readmeUrl: string;
}

// Cache trending data for 1 hour
let cache: { data: TrendingRepo[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchTrending(period: string = "daily"): Promise<TrendingRepo[]> {
  // Use GitHub search API — repos created/updated recently, sorted by stars
  const since = period === "weekly"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const queries = [
    `stars:>100 pushed:>${since} sort:stars`,
    `stars:>50 created:>${since} sort:stars`,
  ];

  const allRepos: TrendingRepo[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "mdfy-cc-discover",
            ...(process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {}),
          },
        }
      );

      if (!res.ok) continue;
      const data = await res.json();

      for (const repo of data.items || []) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);

        allRepos.push({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || "",
          stars: repo.stargazers_count,
          todayStars: repo.stargazers_count, // approximate
          language: repo.language || "Unknown",
          url: repo.html_url,
          readmeUrl: `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch || "main"}/README.md`,
        });
      }
    } catch {
      // API failure — skip
    }
  }

  // Sort by stars descending, take top 30
  allRepos.sort((a, b) => b.stars - a.stars);
  return allRepos.slice(0, 30);
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "daily";
  const cacheKey = `${period}`;

  // Return cached if fresh
  if (cache && cache.timestamp > Date.now() - CACHE_TTL) {
    return NextResponse.json({ repos: cache.data, cached: true });
  }

  try {
    const repos = await fetchTrending(period);
    cache = { data: repos, timestamp: Date.now() };
    return NextResponse.json({ repos, cached: false });
  } catch {
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 502 });
  }
}
