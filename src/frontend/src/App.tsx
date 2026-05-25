import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BenchmarkPage from './pages/BenchmarkPage';

const App: React.FC = () => {
  return (
    <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
    </Routes>
  );
};

export default App;