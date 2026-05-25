import React, { useContext, useState } from 'react';
import { PostsContext } from '../components/Layout';
import { runBenchmark } from '../benchmark/runBenchmark';
import PostList from './PostList';

const BenchmarkPage: React.FC = () => {
  const context = useContext(PostsContext);

  if (!context) {
    throw new Error('PostsContext 未提供');
  }

  const { posts } = context;

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleRunBenchmark = () => {
    if (!query.trim()) return;

    const benchmarkResult = runBenchmark(posts, query);

    setResult(benchmarkResult);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Benchmark Search</h1>

      {/* Dataset Info */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p>Total Posts: {posts.length}</p>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="輸入搜尋關鍵字（例如：天 / 今天 / 天氣）"
          style={{
            padding: '0.5rem',
            width: '300px',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        />

        <button
          onClick={handleRunBenchmark}
          style={{
            marginLeft: '1rem',
            padding: '0.5rem 1rem',
          }}
        >
          Run Benchmark
        </button>
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: '2rem' }}>

          <p>
            Linear Search:
            {' '}
            {result.linearTime.toFixed(3)}
            ms
          </p>

          <p>
            Bigram Search:
            {' '}
            {result.bigramTime.toFixed(3)}
            ms
          </p>

          <h3>
            Speedup:
            {' '}
            {Number.isFinite(result.speedup)
              ? result.speedup.toFixed(2)
              : 'N/A'}
            x
          </h3>

          <hr style={{ margin: '1.5rem 0' }} />

          <p>Total Posts: {result.totalPosts}</p>

          <p>Total Bigrams in Index: {result.totalBigrams}</p>

          <p>
            Found Posts:
            {' '}
            {result.bigramResults.length}
          </p>

          <hr style={{ margin: '1.5rem 0' }} />

          <h2>Matched Articles</h2>

          <PostList posts={result.bigramResults} />

        </div>
      )}
    </div>
  );
};

export default BenchmarkPage;