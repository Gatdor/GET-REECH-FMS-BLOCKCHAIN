// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './src/App';
import Register from './src/pages/Register';
import CatchLog from './src/components/CatchEntry/CatchLog';
import Market from './src/components/MarketListings/Market';
import AdminDashboard from './src/components/Dashboard/AdminDashboard';
import Feedback from './src/pages/Feedback';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Register />} />
        <Route path="register" element={<Register />} />
        <Route path="log-catch" element={<CatchLog />} />
        <Route path="market" element={<Market />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="feedback" element={<Feedback />} />
      </Route>
    </Routes>
  </BrowserRouter>
);