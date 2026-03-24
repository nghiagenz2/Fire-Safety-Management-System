# Frontend

## Cấu trúc chính
- `public/index.html`
- `src/App.js`
- `src/components/`
- `src/pages/`
- `src/services/`
- `src/gis/`
- `src/websocket/`
- `src/utils/`

## Chạy nhanh (placeholder)
```bash
npm install
npm run dev
```

## CSS Rules (Inter + Semantic Colors)
- File: `src/styles/design-system.css`
- Font mặc định: `Inter` (hỗ trợ tiếng Việt)
- Typography utilities:
	- `typo-h1` (24/32, 700)
	- `typo-h2` (18/24, 600)
	- `typo-body-lg` (16/24, 400)
	- `typo-body-md` (14/20, 400)
	- `typo-label` (12/16, 500)
	- `typo-emergency` (20/28, 800, uppercase)
- Semantic colors:
	- Success: `#28A745` (`--color-success`)
	- Danger: `#DC3545` (`--color-danger`)
	- Warning: `#FFC107` (`--color-warning`)
	- Neutral: `#9CA3AF` (`--color-neutral`)
	- Brand: `#0052CC` (`--color-brand`)
	- Text chính: `#111827` (`--text-primary`)
	- Text phụ: `#6B7280` (`--text-secondary`)
