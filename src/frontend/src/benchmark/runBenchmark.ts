import { generatePosts } from "./datasets.ts";
import { linearSearch } from "./searchTests.ts";
import { benchmark } from "./benchmarkEngine.ts";

const POSTS = generatePosts(5000);
const KEYWORD = "react";

async function run() {
  console.log("Starting benchmark...\n");

  const result = await benchmark(
    "O(n) filter search",
    () => {
      linearSearch(POSTS, KEYWORD);
    },
    200
  );

  console.log("Benchmark result:");
  console.log(result);
}

run();