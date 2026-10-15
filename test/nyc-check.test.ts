import { describe, expect, it } from "vitest";
import { isNycAddress, nycStatus, zipStatus } from "../src/nyc-check";

describe("zipStatus", () => {
  it.each([
    ["10001", "nyc"], // Manhattan
    ["10301", "nyc"], // Staten Island
    ["10451", "nyc"], // Bronx
    ["11201", "nyc"], // Brooklyn
    ["11375", "nyc"], // Queens
    ["11004", "nyc"], // Queens, inside the 110xx band
    ["11005", "nyc"],
    ["11001", "outside"], // Floral Park, Nassau County
    ["12401", "outside"], // Kingston
    ["13501", "outside"], // Utica
  ])("%s -> %s", (zip, expected) => {
    expect(zipStatus(zip)).toBe(expected);
  });

  it("is unknown for incomplete input", () => {
    expect(zipStatus("124")).toBe("unknown");
    expect(zipStatus("")).toBe("unknown");
    expect(zipStatus(null)).toBe("unknown");
  });

  it("uses only the first five digits of ZIP+4", () => {
    expect(zipStatus("12401-1234")).toBe("outside");
  });
});

describe("nycStatus", () => {
  it("flags a Brooklyn city name with no ZIP", () => {
    expect(nycStatus({ city: "Brooklyn" })).toBe("nyc");
  });

  it("flags a borough county with no ZIP", () => {
    expect(nycStatus({ county: "Kings County" })).toBe("nyc");
    expect(nycStatus({ county: "Bronx" })).toBe("nyc");
  });

  it("lets a valid outside ZIP override a misleading county", () => {
    expect(nycStatus({ county: "New York", zip: "13501" })).toBe("outside");
  });

  it("treats a Nassau ZIP in the 110xx band as outside", () => {
    expect(nycStatus({ city: "Floral Park", zip: "11001" })).toBe("outside");
  });

  it("is outside for an upstate city with no ZIP", () => {
    expect(nycStatus({ city: "Kingston", county: "Ulster" })).toBe("outside");
  });

  it("is unknown when nothing usable is given, and never blocks", () => {
    expect(nycStatus({})).toBe("unknown");
    expect(isNycAddress({})).toBe(false);
  });
});
