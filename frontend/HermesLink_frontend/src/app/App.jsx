import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import LandingPage from "../pages/LandingPage";
import ActiveJobs from "../pages/ActiveJobs";
import QueueManagement from "../pages/QueueManagement";
import History from "../pages/History";
import Settings from "../pages/Settings";
import About from "../pages/About";

function App() {
  return (
    <BrowserRouter>
      {/* 
         Wrap EVERYTHING in MainLayout so the Title/Nav persists 
         and transitions smoothly across routes.
      */}
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/active" element={<ActiveJobs />} />
          <Route path="/queue" element={<QueueManagement />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
