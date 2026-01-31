import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "../pages/LandingPage/LandingPage";
import ActiveJobs from "../pages/ActiveJobs/ActiveJobs";
import QueueManagement from "../pages/QueueManagement/QueueManagement";
import History from "../pages/History/History";
import Settings from "../pages/Settings/Settings";
import About from "../pages/About/About";

import Navbar from "../components/layout/Navbar";

function App() {
  return (
    <BrowserRouter>
      {/* 
         MainLayout has been removed as requested.
         Routes are now top-level.
      */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/active" element={<ActiveJobs />} />
        <Route path="/queue" element={<QueueManagement />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
