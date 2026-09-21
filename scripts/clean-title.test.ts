import { describe, expect, it } from "vite-plus/test";
import { cleanTitle } from "./clean-title.ts";

describe("cleanTitle", () => {
  it.each([
    ["Roman Frayssinet est en forme - Clique - CANAL+", "Roman est en forme"],
    ["Roman Frayssinet prend des risques - CANAL+", "Roman prend des risques"],
    ["Roman Frayssinet a mûri - CANAL+", "Roman a mûri"],
    ["ROMAN FRAYSSINET - Ô DEDANS - SPECTACLE COMPLET", "Ô dedans"],
    ['ROMAN FRAYSSINET, SPECTACLE "ALORS"', "Alors"],
    ['Roman Frayssinet - "L\'intelligence" des animaux', '"L\'intelligence" des animaux'],
    ["Roman Frayssinet - Je déteste mon corps", "Je déteste mon corps"],
    ["Roman Frayssinet – La plainte", "La plainte"],
    ["Roman Frayssinet - CEUX QUI VENDENT DE L'ARGENT - KS", "Ceux qui vendent de l'argent"],
    ["Roman Frayssinet - Le choc culturel au Québec - SF2", "Le choc culturel au Québec"],
    [
      "Roman Frayssinet - Les animaux sont-ils intelligents ? - SF2",
      "Les animaux sont-ils intelligents ?",
    ],
    ["Le sexto | Roman Frayssinet", "Le sexto"],
  ])("%s", (raw, expected) => {
    expect(cleanTitle(raw)).toBe(expected);
  });

  it("keeps the raw title when nothing would be left", () => {
    expect(cleanTitle("Roman Frayssinet - CANAL+")).toBe("Roman Frayssinet - CANAL+");
  });
});
