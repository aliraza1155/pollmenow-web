// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';  // Change from HashRouter
import App from './App';
import './index.css';

console.log('main.jsx loaded');
const rootElement = document.getElementById('root');
console.log('root element:', rootElement);
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>  {/* Use BrowserRouter */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
console.log('render called');