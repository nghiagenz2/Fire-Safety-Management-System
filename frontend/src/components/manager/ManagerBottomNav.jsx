import {
	ChartBar,
	Door,
	HouseSimple,
	MapPin,
	UserCircle,
	WarningDiamond,
	FireExtinguisher
} from '@phosphor-icons/react';
import { NavLink } from 'react-router-dom';
import './ManagerBottomNav.css';

const navItems = [
	{ label: 'Home', to: '/manager/home', Icon: HouseSimple },
	{ label: 'Lối thoát', to: '/manager/escape', Icon: Door },
	{ label: 'Thiết bị', to: '/manager/devices', Icon: FireExtinguisher },
	{ label: 'Kiểm tra tầng', to: '/manager/floor-check', Icon: MapPin },
	{ label: 'Dashboard', to: '/manager/dashboard', Icon: ChartBar },
	{ label: 'Sự cố', to: '/manager/incidents', Icon: WarningDiamond },
	{ label: 'Tài khoản', to: '/manager/account', Icon: UserCircle }
];

function ManagerBottomNav() {
	return (
		<nav className="manager-bottom-nav" aria-label="Điều hướng ban quản lý">
			{navItems.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					className={({ isActive }) =>
						`manager-nav-item typo-label ${isActive ? 'is-active' : ''}`
					}
				>
					<span aria-hidden="true" className="manager-nav-icon">
						<item.Icon size={18} weight="duotone" />
					</span>
					<span>{item.label}</span>
				</NavLink>
			))}
		</nav>
	);
}

export default ManagerBottomNav;
