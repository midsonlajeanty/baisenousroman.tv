import { describe, expect, it } from "vite-plus/test";
import { markWatched, nextIndex, programmeOrder, shuffle, upcoming } from "./schedule.ts";

const catalog = ["a", "b", "c", "d"].map((id) => ({ id, title: id.toUpperCase() }));
const ids = (videos: readonly { id: string }[]) => videos.map((video) => video.id);

describe("shuffle", () => {
  it("keeps every video exactly once", () => {
    expect(ids(shuffle(catalog)).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("programmeOrder", () => {
  it("puts every unwatched video before any watched one", () => {
    for (let run = 0; run < 50; run++) {
      const order = ids(programmeOrder(catalog, new Set(["a", "c"])));
      expect(order.slice(0, 2).sort()).toEqual(["b", "d"]);
      expect(order.slice(2).sort()).toEqual(["a", "c"]);
    }
  });

  it("ignores watched ids that left the catalog", () => {
    expect(ids(programmeOrder(catalog, new Set(["gone"]))).sort()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("markWatched", () => {
  it("adds the video to the current cycle", () => {
    expect([...markWatched(new Set(["a"]), "b", catalog)].sort()).toEqual(["a", "b"]);
  });

  it("starts a new cycle once the whole catalog has been watched", () => {
    expect([...markWatched(new Set(["a", "b", "c"]), "d", catalog)]).toEqual(["d"]);
  });

  it("drops ids that left the catalog", () => {
    expect([...markWatched(new Set(["gone"]), "a", catalog)]).toEqual(["a"]);
  });
});

describe("programme", () => {
  it("wraps around the end of the catalog", () => {
    expect(nextIndex(3, 4)).toBe(0);
    expect(ids(upcoming(catalog, 3).map((slot) => slot.video))).toEqual(["d", "a", "b"]);
  });
});
