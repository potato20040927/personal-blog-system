export type BenchmarkResult = {
  label: string;
  avgTime: number;
  runs: number;
};

export async function benchmark(
  label: string,
  fn: () => void,
  runs = 100
): Promise<BenchmarkResult> {
  let total = 0;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    total += end - start;
  }

  return {
    label,
    avgTime: total / runs,
    runs,
  };
}