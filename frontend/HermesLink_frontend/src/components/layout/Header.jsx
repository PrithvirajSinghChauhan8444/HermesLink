import React from "react";

const Header = () => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="breadcrumbs">
          <span className="crumb">Queues</span>
          <span className="separator">/</span>
          <span className="crumb active">Background</span>
        </div>
      </div>

      <div className="header-right">
        <button className="btn-icon">
          <span>●</span> {/* Theme toggle placeholder */}
        </button>
        <button className="btn-icon">
          <span>↻</span> {/* Refresh placeholder */}
        </button>
        <button className="btn-panic">STOP ALL</button>
      </div>
    </header>
  );
};

export default Header;
