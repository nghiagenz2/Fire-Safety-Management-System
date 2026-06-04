import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Shield, Bell } from '@phosphor-icons/react';
import './Onboarding.css';

const slides = [
  {
    id: 1,
    title: 'An Toàn Tuyệt Đối',
    description: 'Hệ thống giám sát và quản lý an toàn cháy nổ toàn diện, bảo vệ tài sản và tính mạng con người.',
    image: '/onboarding/hinh1.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?auto=format&fit=crop&w=820&q=80',
    imagePosition: 'center center',
    icon: 'shield',
  },
  {
    id: 2,
    title: 'Cảnh Báo Kịp Thời',
    description: 'Nhận thông báo ngay lập tức khi phát hiện nguy cơ cháy nổ. Phản ứng nhanh chóng để giảm thiểu thiệt hại.',
    image: '/onboarding/hinh2.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1550109161-7262e652bf1d?auto=format&fit=crop&w=820&q=80',
    imagePosition: 'center center',
    icon: 'bell',
  },
  {
    id: 3,
    title: 'Quản Lý Hiệu Quả',
    description: 'Theo dõi, kiểm tra và bảo trì thiết bị PCCC định kỳ. Đảm bảo tuân thủ các quy định an toàn.',
    image: '/onboarding/hinh3.jpg',
    fallbackImage:
      'https://images.unsplash.com/photo-1573166364524-d9dbfd8bbf84?auto=format&fit=crop&w=820&q=80',
    imagePosition: 'center center',
    icon: 'task',
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

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

  return (
    <div className="onboarding-container">
      <div className="onboarding-header">
        <div className="progress-dots" aria-label="Onboarding progress">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
            />
          ))}
        </div>
        <button className="skip-button typo-label" onClick={handleSkip}>
          Bỏ qua
        </button>
      </div>

      <div className="onboarding-content">
        <div className="slide-image-wrapper">
          <img
            className="slide-image"
            src={slide.image}
            alt={slide.title}
            style={{ objectPosition: slide.imagePosition }}
            onError={(event) => {
              if (event.currentTarget.src !== slide.fallbackImage) {
                event.currentTarget.src = slide.fallbackImage;
              }
            }}
          />
          <div className="icon-badge">
            {slide.icon === 'shield' && <Shield size={42} weight="regular" className="badge-icon" />}
            {slide.icon === 'bell' && <Bell size={42} weight="regular" className="badge-icon" />}
            {slide.icon === 'task' && <CheckSquare size={42} weight="regular" className="badge-icon" />}
          </div>
        </div>

        <div className="slide-text">
          <h2 className="slide-title typo-h1">{slide.title}</h2>
          <p className="slide-description typo-body-md">{slide.description}</p>
        </div>
      </div>

      <div className="onboarding-footer">
        <button className="next-button typo-h2" onClick={handleNext}>
          {currentSlide === slides.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
        </button>
      </div>
    </div>
  );
}

export default Onboarding;
