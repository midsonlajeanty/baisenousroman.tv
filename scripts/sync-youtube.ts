import { writeFile } from "node:fs/promises";
import { cleanTitle } from "./clean-title.ts";

type Video = {
  id: string;
  title: string;
};

type PlaylistItem = {
  snippet?: {
    title?: string;
    resourceId?: { videoId?: string };
  };
  status?: {
    privacyStatus?: string;
  };
};

type PlaylistItemsPage = {
  items?: PlaylistItem[];
  nextPageToken?: string;
};

const ENDPOINT = "https://www.googleapis.com/youtube/v3/playlistItems";
const OUTPUT = new URL("../src/data/videos.json", import.meta.url);
const PLAYABLE = new Set(["public", "unlisted"]);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

async function fetchPage(
  apiKey: string,
  playlistId: string,
  pageToken?: string,
): Promise<PlaylistItemsPage> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("part", "snippet,status");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set(
    "fields",
    "nextPageToken,items(snippet(title,resourceId/videoId),status/privacyStatus)",
  );
  url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await fetch(url);
  if (!response.ok) {
    // The body carries Google's reason (quotaExceeded, playlistNotFound...);
    // the URL is left out because it contains the key.
    throw new Error(`YouTube API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as PlaylistItemsPage;
}

function toVideo(item: PlaylistItem): Video | null {
  const id = item.snippet?.resourceId?.videoId;
  const title = item.snippet?.title?.trim();
  // Deleted and private entries stay in a playlist with a placeholder title
  // and a non-public status; the embed cannot play them.
  if (!id || !title || !PLAYABLE.has(item.status?.privacyStatus ?? "")) return null;
  return { id, title: cleanTitle(title) };
}

async function fetchPlaylist(apiKey: string, playlistId: string): Promise<Video[]> {
  const videos: Video[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  do {
    const page = await fetchPage(apiKey, playlistId, pageToken);
    for (const item of page.items ?? []) {
      const video = toVideo(item);
      if (video && !seen.has(video.id)) {
        seen.add(video.id);
        videos.push(video);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return videos;
}

async function main(): Promise<void> {
  const apiKey = requireEnv("YOUTUBE_API_KEY");
  const playlistId = requireEnv("YOUTUBE_PLAYLIST_ID");

  const videos = await fetchPlaylist(apiKey, playlistId);
  // Never replace a working catalog with an empty one: an empty result is far
  // more likely a wrong playlist id than a channel that stopped broadcasting.
  if (videos.length === 0) {
    throw new Error(`Playlist ${playlistId} has no playable video, catalog left unchanged`);
  }

  await writeFile(OUTPUT, `${JSON.stringify(videos, null, 2)}\n`);
  console.log(`Wrote ${videos.length} videos to src/data/videos.json`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
