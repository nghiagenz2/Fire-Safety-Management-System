import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';

function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      title: 'An Toàn Tuyệt Đối',
      description: 'Hệ thống giám sát và quản lý an toàn chầy nổ toàn diện, bảo vệ tài sản và tính mạng con người.',
      icon: '🚒',
      image: 'url-firestaff-image', // Placeholder - sẽ thay bằng ảnh thực
    },
    {
      id: 2,
      title: 'Cảnh Báo Kịp Thời',
      description: 'Nhận thông báo ngay lập tức khi phát hiện nguy cơ chầy nổ. Phản ứng nhanh chống để giảm thiệt hại.',
      icon: '🔔',
      image: 'url-alert-image', // Placeholder
    },
    {
      id: 3,
      title: 'Quản Lý Hiệu Quả',
      description: 'Theo dõi, kiểm tra và báo trị thiết bị PCCC định kỳ. Đảm bảo tuân thủ các quy định an toàn.',
      icon: '✅',
      image: 'url-device-image', // Placeholder
    },
  ];

  const slide = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/login');
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="onboarding-container">
      {/* Header - Skip Button */}
      <div className="onboarding-header">
        <button className="skip-button typo-label" onClick={handleSkip}>
          Bỏ qua
        </button>
      </div>

      {/* Main Content */}
      <div className="onboarding-content">
        {/* Slide Image with Icon Badge */}
        <div className="slide-image-wrapper">
          <div className="slide-image-placeholder">
            <svg viewBox="0 0 200 200" className="placeholder-svg">
              <rect width="200" height="200" fill="#E5E7EB" rx="20" />
              <text x="100" y="100" textAnchor="middle" dy="0.3em" fill="#9CA3AF" fontSize="48">
                {slide.id === 1 && '🚒'}
                {slide.id === 2 && '🔴'}
                {slide.id === 3 && '⚙️'}
              </text>
            </svg>
          </div>
          <div className="icon-badge">
            {slide.id === 1 && <span className="badge-icon">🛡️</span>}
            {slide.id === 2 && <span className="badge-icon">🔔</span>}
            {slide.id === 3 && <span className="badge-icon">✓</span>}
          </div>
        </div>

        {/* Slide Title & Description */}
        <div className="slide-text">
          <h2 className="slide-title typo-h1">{slide.title}</h2>
          <p className="slide-description typo-body-md">{slide.description}</p>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="progress-dots">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`dot ${index === currentSlide ? 'active' : ''} ${
              index < currentSlide ? 'completed' : ''
            }`}
          />
        ))}
      </div>

      {/* Footer - Navigation Buttons */}
      <div className="onboarding-footer">
        <button
          className="nav-button prev-button"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
        >
          ←
        </button>

        <button className="next-button typo-h2" onClick={handleNext}>
          {currentSlide === slides.length - 1 ? 'Bắt Đầu' : 'Tiếp theo'}
        </button>
      </div>
    </div>
  );
}

export default Onboarding;
