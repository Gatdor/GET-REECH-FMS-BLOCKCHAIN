import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const menu = [
    { name: "Register", path: "/register" },
    { name: "Catch Log", path: "/log-catch" },
    { name: "Market", path: "/market" },
    { name: "Dashboard", path: "/dashboard" },
    { name: "Feedback", path: "/feedback" },
    { name: "Profile", path: "/profile" },
  ];

  return (
    <aside className="sidebar">
      <h2 className="logo">FMS</h2>
      <nav>
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
