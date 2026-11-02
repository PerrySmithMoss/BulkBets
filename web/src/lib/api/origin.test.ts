import { test, expect } from "@jest/globals";
import { getApiOrigin } from "./origin";

test("local API defaults work and a trailing slash is normalised", () => {
  expect(getApiOrigin({})).toBe("http://localhost:8080");
  expect(
    getApiOrigin({ API_URL: "https://api.example.com/", VERCEL: "1" }),
  ).toBe("https://api.example.com");
});

test("Vercel cannot silently use a missing or insecure API URL", () => {
  expect(() => getApiOrigin({ VERCEL: "1" })).toThrow("Set API_URL");
  expect(() =>
    getApiOrigin({ VERCEL: "1", API_URL: "http://localhost:8080" }),
  ).toThrow("HTTPS");
});

test.each([
  "https://api.example.com/api/v1",
  "https://user:password@api.example.com",
  "https://api.example.com?key=1",
  "https://api.example.com#fragment",
  "ftp://api.example.com",
])("API origin rejects paths and embedded credentials: %s", (value) => {
  expect(() => getApiOrigin({ API_URL: value })).toThrow();
});
