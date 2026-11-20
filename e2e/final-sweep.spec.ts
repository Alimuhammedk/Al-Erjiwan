import { expect, test } from "@playwright/test";

// Every public page, in Arabic and English, at phone, tablet and desktop width: nothing sideways, no errors, one main
// heading. Pictures go to e2e/screenshots/sweep for a look by eye.
const WIDTHS = [375, 768, 1280];

for (const lang of ["ar", "en"]) {
  for (const width of WIDTHS) {
    test(`all pages are sound in ${lang} at ${width}px`, async ({ page, request }) => {
      test.setTimeout(180_000);
      await page.context().addCookies([{ name: "lang", value: lang, url: "http://localhost:3000" }]);
      await page.setViewportSize({ width, height: 900 });
      const xml = await (await request.get("/sitemap.xml")).text();
      const paths = ["/", "/shop", "/calculator", "/about", "/faq", "/returns", "/cart", "/checkout", "/track"];
      for (const kind of ["shop", "articles"]) {
        const found = xml.match(new RegExp(`<loc>[^<]*?(/${kind}/[^<]+)</loc>`))?.[1];
        if (found) paths.push(found);
      }
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const path of paths) {
        const res = await page.goto(path);
        expect(res?.status(), path).toBeLessThan(400);
        await page.waitForLoadState("networkidle");
        expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `${path} sideways`).toBe(false);
        await expect(page.locator("html"), path).toHaveAttribute("lang", lang);
        await expect(page.getByRole("heading", { level: 1 }), `${path} headings`).toHaveCount(1);
        const name = path === "/" ? "home" : path.slice(1).replace(/[^a-z]+/gi, "-").slice(0, 30);
        await page.screenshot({ path: `e2e/screenshots/sweep/${lang}-${width}-${name}.png`, fullPage: true });
      }
      expect(errors).toEqual([]);
    });
  }
}
