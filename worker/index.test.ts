import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import worker from "./index.ts";

const env = {
  ASSETS: {
    fetch: async (request: Request) => new Response(`asset ${new URL(request.url).pathname}`),
  },
};

function serve(url: string): Promise<string> {
  return worker.fetch(new Request(url), env).then((response) => response.text());
}

describe("worker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serves the stats page on the stats subdomain", async () => {
    expect(await serve("https://stats.baisenousroman.tv/")).toBe("asset /stats");
  });

  it("leaves the channel untouched", async () => {
    expect(await serve("https://baisenousroman.tv/")).toBe("asset /");
    expect(await serve("https://baisenousroman.tv/_next/x.js")).toBe("asset /_next/x.js");
  });

  it("relays the shared dashboard to umami", async () => {
    vi.stubGlobal("fetch", async (request: Request) => new Response(`umami ${request.url}`));
    expect(await serve("https://stats.baisenousroman.tv/share/mf19zrjsN2KkVFfM")).toBe(
      "umami https://analytics.karakoapps.online/share/mf19zrjsN2KkVFfM",
    );
    expect(
      await serve(
        "https://stats.baisenousroman.tv/api/websites/169ac663-4dfc-4c8d-8fcf-8ef1138c0150/stats?unit=day",
      ),
    ).toBe(
      "umami https://analytics.karakoapps.online/api/websites/169ac663-4dfc-4c8d-8fcf-8ef1138c0150/stats?unit=day",
    );
  });

  it("keeps the rest of umami out of reach", async () => {
    vi.stubGlobal("fetch", async () => new Response("umami"));
    expect(await serve("https://stats.baisenousroman.tv/login")).toBe("asset /login");
    expect(await serve("https://stats.baisenousroman.tv/api/users")).toBe("asset /api/users");
    expect(await serve("https://stats.baisenousroman.tv/api/websites/other-id/stats")).toBe(
      "asset /api/websites/other-id/stats",
    );
  });
});
