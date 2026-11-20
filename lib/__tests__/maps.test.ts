import { describe, expect, it } from "vitest";
import { parseMapLocation } from "../maps";

const embedOf = (lat: string, lng: string) => `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
const openOf = (lat: string, lng: string) => `https://www.google.com/maps?q=${lat},${lng}`;

describe("parseMapLocation: plain coordinates", () => {
  it.each([
    ["32.2,44.3", "32.2", "44.3"],
    ["32.2 , 44.3", "32.2", "44.3"],
    ["  32.2  44.3 ", "32.2", "44.3"],
    ["٣٢.٢٠٤٥, ٤٤.٣٢١", "32.2045", "44.321"],
    ["-33.5,-70.6", "-33.5", "-70.6"],
    ["32.2،44.3", "32.2", "44.3"],
  ])("reads %j", (input, lat, lng) => {
    expect(parseMapLocation(input)).toEqual({ embedUrl: embedOf(lat, lng), openUrl: openOf(lat, lng) });
  });
  it.each(["91,44", "-91,44", "32,181", "32,-181", "32.2", "a,b", "32.2,44.3,5", "1e3,44"])("refuses impossible or odd coordinates %j", (input) => {
    expect(parseMapLocation(input)).toBeNull();
  });
});

describe("parseMapLocation: Google Maps addresses", () => {
  it("takes the coordinates after @ in a full address", () => {
    const r = parseMapLocation("https://www.google.com/maps/place/Al-Kifl/@32.2045,44.3321,15z/data=!3m1!4b1");
    expect(r).toEqual({ embedUrl: embedOf("32.2045", "44.3321"), openUrl: openOf("32.2045", "44.3321") });
  });
  it("takes them from ?q=, ?ll= and ?query=", () => {
    for (const q of ["q", "ll", "query"]) {
      expect(parseMapLocation(`https://www.google.com/maps?${q}=32.2045,44.3321`)?.embedUrl).toBe(embedOf("32.2045", "44.3321"));
      expect(parseMapLocation(`https://maps.google.com/?${q}=32.2045%2C44.3321`)?.embedUrl).toBe(embedOf("32.2045", "44.3321"));
    }
  });
  it("takes them from the !3d!4d pins of a shared place", () => {
    expect(parseMapLocation("https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x1:0x2!8m2!3d32.2045!4d44.3321")?.openUrl).toBe(openOf("32.2045", "44.3321"));
  });
  it("shows a place name from the address when there are no coordinates", () => {
    const r = parseMapLocation("https://www.google.com/maps/place/Al-Kifl+Babil/");
    expect(r?.embedUrl).toBe("https://maps.google.com/maps?q=Al-Kifl%20Babil&output=embed");
    expect(r?.openUrl).toBe("https://www.google.com/maps?q=Al-Kifl%20Babil");
    expect(parseMapLocation("https://www.google.com/maps?q=%D8%A7%D9%84%D9%83%D9%81%D9%84")?.embedUrl).toBe("https://maps.google.com/maps?q=%D8%A7%D9%84%D9%83%D9%81%D9%84&output=embed");
  });
  it("accepts google.com sub-sites and nothing that only looks like Google", () => {
    expect(parseMapLocation("https://maps.google.com/?q=32.2,44.3")).not.toBeNull();
    for (const bad of ["https://evil.com/maps?q=32.2,44.3", "https://google.com.evil.com/maps?q=1,2", "https://notgoogle.com/maps?q=1,2", "https://www.google.com.attacker.io/maps/@1,2,3z"]) {
      expect(parseMapLocation(bad), bad).toBeNull();
    }
  });
});

describe("parseMapLocation: the Embed code and short links", () => {
  const pb = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d44.3!3d32.2";
  it("uses the address inside the Embed a map code", () => {
    const r = parseMapLocation(`<iframe src="${pb}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`);
    expect(r?.embedUrl).toBe(pb);
  });
  it("accepts the embed address on its own, but only from Google", () => {
    expect(parseMapLocation(pb)?.embedUrl).toBe(pb);
    expect(parseMapLocation(`<iframe src="https://evil.com/maps/embed?pb=1"></iframe>`)).toBeNull();
    expect(parseMapLocation(`<iframe src="javascript:alert(1)"></iframe>`)).toBeNull();
  });
  it("a short link cannot be embedded: only the Open in Maps button is offered", () => {
    expect(parseMapLocation("https://maps.app.goo.gl/AbCdEf123")).toEqual({ embedUrl: null, openUrl: "https://maps.app.goo.gl/AbCdEf123" });
    expect(parseMapLocation("https://goo.gl/maps/AbCdEf123")).toEqual({ embedUrl: null, openUrl: "https://goo.gl/maps/AbCdEf123" });
    expect(parseMapLocation("https://goo.gl/somethingelse")).toBeNull();
  });
});

describe("parseMapLocation: never anything unsafe", () => {
  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://www.google.com/maps?q=1,2",
    "//evil.com/maps?q=1,2",
    "https://",
    "not a link at all",
    "<script>alert(1)</script>",
    "https://www.google.com/maps?q=1,2\"><script>",
    "ftp://maps.google.com/?q=1,2",
    "https://www.google.com/maps/place/%E0%A4%A/",
  ])("refuses %j", (input) => {
    expect(parseMapLocation(input)).toBeNull();
  });
  it("refuses very long text, and what it returns only ever points at Google", () => {
    expect(parseMapLocation("a".repeat(1001))).toBeNull();
    expect(parseMapLocation("https://www.google.com/maps?q=" + "x".repeat(2000))).toBeNull();
    const ok = parseMapLocation("https://www.google.com/maps/place/X/@32.2,44.3,15z")!;
    for (const url of [ok.embedUrl!, ok.openUrl]) expect(new URL(url).hostname).toMatch(/(^|\.)google\.com$/);
  });
  it("a place name is cleaned and cut", () => {
    const r = parseMapLocation("https://www.google.com/maps/place/" + encodeURIComponent("a".repeat(150)) + "/");
    expect(decodeURIComponent(new URL(r!.embedUrl!).searchParams.get("q")!).length).toBeLessThanOrEqual(100);
  });
});
