import { describe, expect, it } from "vite-plus/test";
import { nextIndex, shuffle, upcoming } from "./schedule.ts";

const catalog = ["a", "b", "c", "d"].map((id) => ({ id, title: id.toUpperCase() }));

describe("shuffle", () => {
  it("keeps every video exactly once", () => {
    const order = shuffle(catalog);
    expect(order.map((v) => v.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("never opens on the video to avoid", () => {
    for (let run = 0; run < 50; run++) {
      expect(shuffle(catalog, (v) => v.id === "a")[0]!.id).not.toBe("a");
    }
  });

  it("returns a single video as is", () => {
    expect(shuffle(catalog.slice(0, 1), () => true)).toEqual(catalog.slice(0, 1));
  });
});

describe("programme", () => {
  it("wraps around the end of the catalog", () => {
    expect(nextIndex(3, 4)).toBe(0);
    expect(upcoming(catalog, 3).map((slot) => slot.video.id)).toEqual(["d", "a", "b"]);
  });
});
