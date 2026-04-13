// @/lib/utils/redis.ts

import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

function isValidUpstashUrl(u: string) {
  return typeof u === "string" && u.startsWith("https://");
}

let redisClient: any;

if (isValidUpstashUrl(url)) {
  redisClient = new Redis({ url, token });
} else {
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL is not set or invalid. Falling back to in-memory mock.",
  );

  const store = new Map<string, any>();

  redisClient = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: any, _opts?: { ex?: number }) {
      store.set(key, value);
      return "OK";
    },
    async keys(pattern: string) {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
      }
      return Array.from(store.keys()).filter((k) => k === pattern);
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
  } as unknown as Redis;
}

export default redisClient as Redis;
