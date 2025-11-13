import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';

/**
 * Main App Component
 * 
 * Handles routing for the entire application.
 * Currently has just the HomePage which includes:
 * - Landing/Hero section
 * - Features section
 * - How it works section
 * - Registration section
 * 
 * All on one scrollable page!
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Main page - scrollable landing + registration */}
        <Route path="/" element={<HomePage />} />
        
        {/* Fallback - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;