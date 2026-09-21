import { describe, expect, it } from "vite-plus/test";
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
  it("serves the stats page on the stats subdomain", async () => {
    expect(await serve("https://stats.baisenousroman.tv/")).toBe("asset /stats");
  });

  it("serves every other path as a plain asset", async () => {
    expect(await serve("https://baisenousroman.tv/")).toBe("asset /");
    expect(await serve("https://stats.baisenousroman.tv/login")).toBe("asset /login");
  });
});
