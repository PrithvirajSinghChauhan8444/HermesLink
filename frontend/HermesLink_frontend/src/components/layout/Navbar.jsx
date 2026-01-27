import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar-centered">
      <div className="navbar-links">
        <NavLink
          to="/active"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          target="_blank"
          rel="noopener noreferrer">
          Active
        </NavLink>
        <NavLink
          to="/queue"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          target="_blank"
          rel="noopener noreferrer">
          Queue
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          target="_blank"
          rel="noopener noreferrer">
          History
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          target="_blank"
          rel="noopener noreferrer">
          Settings
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          target="_blank"
          rel="noopener noreferrer">
          About
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
