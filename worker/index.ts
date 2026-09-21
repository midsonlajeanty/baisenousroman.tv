type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

const STATS_HOST = "stats.";
const STATS_PAGE = "/stats";

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname.startsWith(STATS_HOST)) url.pathname = STATS_PAGE;
    return env.ASSETS.fetch(new Request(url, request));
  },
};
