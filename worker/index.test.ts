import { describe, expect, it } from "vite-plus/test";
import worker from "./index.ts";

function servedPath(url: string): Promise<string> {
  const env = {
    ASSETS: { fetch: async (request: Request) => new Response(new URL(request.url).pathname) },
  };
  return worker.fetch(new Request(url), env).then((response) => response.text());
}

describe("worker", () => {
  it("serves the stats page on the stats subdomain", async () => {
    expect(await servedPath("https://stats.baisenousroman.tv/")).toBe("/stats");
  });

  it("leaves the channel untouched", async () => {
    expect(await servedPath("https://baisenousroman.tv/")).toBe("/");
  });
});
