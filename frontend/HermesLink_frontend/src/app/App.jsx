import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "../hooks/ThemeContext";
import MainLayout from "../components/layout/MainLayout";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
