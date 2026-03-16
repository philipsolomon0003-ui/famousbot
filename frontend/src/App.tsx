import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import GroupsList from './pages/GroupsList';
import Composer from './pages/Composer';
import ActivityLog from './pages/ActivityLog';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      axios.defaults.headers.common['x-admin-token'] = token;
      setIsAuthenticated(true);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/" />} 
        />
        
        <Route element={isAuthenticated ? <DashboardLayout setAuth={setIsAuthenticated} /> : <Navigate to="/login" />}>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<GroupsList />} />
          <Route path="/composer" element={<Composer />} />
          <Route path="/activity" element={<ActivityLog />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
