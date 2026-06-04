import { FireExtinguisher, HouseSimple, Lifebuoy, Door } from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import './ResidentBottomNav.css';

const navItems = [
  { label: 'Home', to: '/resident/home', Icon: HouseSimple },
  { label: 'Lối thoát', to: '/resident/escape', Icon: Door },
  { label: 'Thiết bị', to: '/resident/devices', Icon: FireExtinguisher },
  { label: 'Hướng dẫn', to: '/resident/guidance', Icon: Lifebuoy }
];

function ResidentBottomNav() {
  return (
    <nav className="resident-bottom-nav" aria-label="Điều hướng cư dân">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `resident-nav-item typo-label ${isActive ? 'is-active' : ''}`
          }
        >
          <span aria-hidden="true" className="resident-nav-icon">
            <item.Icon size={18} weight="duotone" />
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default ResidentBottomNav;
