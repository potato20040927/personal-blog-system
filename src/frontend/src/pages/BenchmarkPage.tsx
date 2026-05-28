import React, { useContext, useState } from 'react';
import { PostsContext } from '../components/Layout';
import { runBenchmark, runSortBenchmark } from '../benchmark/runBenchmark';
import PostList from './PostList';
import { runTopKBenchmark } from '../benchmark/runTopKBenchmark';

const BenchmarkPage: React.FC = () => {
  const context = useContext(PostsContext);
  if (!context) throw new Error('PostsContext 未提供');
  const { posts } = context;

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [sortResult, setSortResult] = useState<any>(null);

  const [topKResult, setTopKResult] = useState<any>(null);

  const handleRunSearchBenchmark = () => {
    if (!query.trim()) return;
    setSearchResult(runBenchmark(posts, query));
  };

  const handleRunSortBenchmark = () => {
    setSortResult(runSortBenchmark(posts));
  };

  const handleRunTopKBenchmark = () => {
    setTopKResult(runTopKBenchmark(posts));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>System Performance Benchmark</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        
        {/* 左側：搜尋效能 (Bigram Index) */}
        <section style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>1. Search Performance</h2>
          <p>Linear Scan vs. Bigram Index</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="關鍵字..."
            style={{ padding: '0.5rem', width: '150px' }}
          />
          <button onClick={handleRunSearchBenchmark} style={{ marginLeft: '0.5rem' }}>Run</button>

          {searchResult && (
            <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem' }}>
              <p>Total Posts: {searchResult.totalPosts}</p>
              <p>Linear Matches: {searchResult.linearResults.length}</p>
              <p>Bigram Matches: {searchResult.bigramResults.length}</p>

              <hr />
              <p>Linear: {searchResult.linearTime.toFixed(4)} ms</p>
              <p>Bigram Index: {searchResult.bigramTime.toFixed(4)} ms</p>
              <h3 style={{ color: '#2c7be5' }}>Speedup: {searchResult.speedup.toFixed(2)}x</h3>
            </div>
          )}
        </section>

        {/* 中間：排序效能 (AVL Tree) */}
        <section style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>2. Sort Performance</h2>
          <p>Array.sort vs. AVL Tree Traversal</p>
          <button onClick={handleRunSortBenchmark} style={{ width: '100%' }}>Run Sort Benchmark</button>

          {sortResult && (
            <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem' }}>
              <p>Array.sort (Standard): {sortResult.legacySortTime.toFixed(4)} ms</p>
              <p>AVL Tree (Indexed): {sortResult.avlSortTime.toFixed(4)} ms</p>
              <h3 style={{ color: '#2c7be5' }}>Speedup: {sortResult.sortSpeedup.toFixed(2)}x</h3>
            </div>
          )}
        </section>

        {/* 右側：Top-K 按讚文章排序效能 (Heap) */}
        <section style={{ border: '1px solid #ddd', padding: '1.5rem', borderRadius: '12px' }}>
          <h2>3. Top-K Likes</h2>
          <p>Full Re-sort vs. Heap Update</p>
          <button onClick={handleRunTopKBenchmark} style={{ width: '100%' }}>Run Top-K</button>

          {topKResult && (
            <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem' }}>
              <p>Full Re-sort (1000 likes): {topKResult.legacyTime.toFixed(4)} ms</p>
              <p>Heap Update (1000 likes): {topKResult.heapTime.toFixed(4)} ms</p>
              <p>Top-K Heap Size: {topKResult.heapSize}</p>
              <p>Candidate Heap Size: {topKResult.candidateSize}</p>
              <h3 style={{ color: '#2c7be5' }}>Speedup: {topKResult.speedup.toFixed(2)}x</h3>
            </div>
          )}
        </section>
      </div>

      {searchResult && (
        <div style={{ marginTop: '2rem' }}>
          <hr />
          <h2>Matched Articles ({searchResult.bigramResults.length})</h2>
          <PostList posts={searchResult.bigramResults} />
        </div>
      )}
    </div>
  );
};

export default BenchmarkPage;
