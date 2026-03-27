import {
	ClipboardText,
	FireExtinguisher,
	HouseSimple,
	WarningDiamond,
	Waves
} from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import './FireStaffBottomNav.css';

const navItems = [
	{ label: 'Home', to: '/firestaff/home', Icon: HouseSimple },
	{ label: 'Thiết bị', to: '/firestaff/devices', Icon: FireExtinguisher },
	{ label: 'Nhiệm vụ', to: '/firestaff/tasks', Icon: ClipboardText },
	{ label: 'Mô phỏng', to: '/firestaff/simulation', Icon: Waves },
	{ label: 'Sự cố', to: '/firestaff/incidents', Icon: WarningDiamond }
];

function FireStaffBottomNav() {
	return (
		<nav className="firestaff-bottom-nav" aria-label="Điều hướng nhân sự PCCC">
			{navItems.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					className={({ isActive }) =>
						`firestaff-nav-item typo-label ${isActive ? 'is-active' : ''}`
					}
				>
					<span aria-hidden="true" className="firestaff-nav-icon">
						<item.Icon size={18} weight="duotone" />
					</span>
					<span>{item.label}</span>
				</NavLink>
			))}
		</nav>
	);
}

export default FireStaffBottomNav;
