type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

const STATS_HOST = "stats.";
const STATS_PAGE = "/stats";
const UMAMI_ORIGIN = "https://analytics.karakoapps.online";
const SHARE_ID = "mf19zrjsN2KkVFfM";
const WEBSITE_ID = "169ac663-4dfc-4c8d-8fcf-8ef1138c0150";

const UMAMI_PREFIXES = ["/_next/", "/images/"];
const UMAMI_RESOURCES = [
  `/share/${SHARE_ID}`,
  `/api/share/${SHARE_ID}`,
  `/api/websites/${WEBSITE_ID}`,
  "/api/config",
  "/datamaps.world.json",
  "/favicon.ico",
  "/site.webmanifest",
];

function isUmamiPath(pathname: string): boolean {
  return (
    UMAMI_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    UMAMI_RESOURCES.some((resource) => pathname === resource || pathname.startsWith(`${resource}/`))
  );
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.hostname.startsWith(STATS_HOST)) return env.ASSETS.fetch(request);

    if (url.pathname === "/") {
      url.pathname = STATS_PAGE;
      return env.ASSETS.fetch(new Request(url, request));
    }

    if (isUmamiPath(url.pathname)) {
      return fetch(new Request(new URL(url.pathname + url.search, UMAMI_ORIGIN), request));
    }

    return env.ASSETS.fetch(request);
  },
};
