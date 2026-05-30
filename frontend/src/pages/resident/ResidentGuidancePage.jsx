import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import ResidentBottomNav from '../../components/resident/ResidentBottomNav.jsx';
import { fetchResidentGuides } from '../../services/mockResidentGuidesApi.js';

const CATEGORIES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'escape', label: 'Thoát hiểm' },
  { value: 'device', label: 'Thiết bị' },
  { value: 'emergency', label: 'Khẩn cấp' }
];

function getYouTubeId(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function ResidentGuidancePage() {
  const [guideItems, setGuideItems] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeGuide, setActiveGuide] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchResidentGuides()
      .then((data) => {
        if (isMounted) {
          setGuideItems(data);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleCategoryFilterChange(nextFilter) {
    setCategoryFilter(nextFilter);
    if (nextFilter === 'all') {
      setSearch('');
    }
  }

  const filteredGuides = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return guideItems.filter((guide) => {
      const matchCategory = categoryFilter === 'all' || guide.category === categoryFilter;
      const matchKeyword =
        keyword.length === 0 ||
        guide.title.toLowerCase().includes(keyword) ||
        guide.summary.toLowerCase().includes(keyword) ||
        guide.level.toLowerCase().includes(keyword) ||
        guide.videoTitle.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });
  }, [guideItems, search, categoryFilter]);

  const featuredGuide = useMemo(() => {
    return guideItems.find((guide) => guide.category === 'escape') || guideItems[0] || null;
  }, [guideItems]);

  return (
    <main className="resident-screen">
      <Header />
      <div className="app-header-spacer" aria-hidden="true"></div>
      <header className="resident-topbar">
        <div>
          <p className="typo-label text-secondary resident-overline">Cư dân - Thư viện an toàn</p>
          <h1 className="typo-h1 resident-title">Hướng dẫn thoát hiểm</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="resident-floor-chip typo-label">Tầng hiện tại: 3</span>
          <button type="button" className="resident-call-btn typo-label">
            Liên hệ khẩn cấp
          </button>
        </div>
      </header>

      <section className="resident-panel resident-featured-guide">
        <p className="typo-label text-secondary">Video nổi bật</p>
        <h2 className="typo-h2">{featuredGuide ? featuredGuide.title : 'Đang cập nhật nội dung video'}</h2>
        <p className="typo-body-md text-secondary">{featuredGuide ? featuredGuide.summary : 'Nội dung sẽ hiển thị khi dữ liệu sẵn sàng.'}</p>
        
        {featuredGuide ? (
          <div 
            className="resident-video-wrapper"
            onClick={() => window.open(featuredGuide.videoUrl, '_blank')}
            style={{ cursor: 'pointer' }}
            aria-label="Xem video hướng dẫn trên YouTube"
          >
            <img 
              src={featuredGuide.coverImage ? featuredGuide.coverImage : `https://img.youtube.com/vi/${getYouTubeId(featuredGuide.videoUrl)}/hqdefault.jpg`} 
              alt={featuredGuide.videoTitle} 
              style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }}
            />
            <div className="resident-video-overlay">
              <span className="resident-video-play-icon">▶</span>
              <p className="resident-video-overlay-title typo-body-md">{featuredGuide.videoTitle}</p>
            </div>
          </div>
        ) : (
          <div className="resident-video-placeholder" aria-label="Khung video hướng dẫn">
            <p className="typo-label">Video đang cập nhật</p>
          </div>
        )}

        <button 
          type="button" 
          className="resident-primary-btn typo-body-md"
          onClick={() => featuredGuide && window.open(featuredGuide.videoUrl, '_blank')}
        >
          Phát video hướng dẫn
        </button>
      </section>

      <section className="resident-panel resident-text-guide">
        <h2 className="typo-h2">Hướng dẫn bằng văn bản</h2>
        <ol className="resident-steps typo-body-md">
          {(featuredGuide?.textSteps || []).map((step, index) => (
            <li key={`featured-step-${index}`}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="resident-panel resident-contact-card">
        <h2 className="typo-h2">Liên hệ khẩn cấp</h2>
        <p className="typo-body-md text-secondary">
          {guideItems.find((guide) => guide.category === 'emergency')?.contacts?.join(' | ') ||
            '114 - Cảnh sát PCCC | 115 - Cấp cứu | Bảo vệ tòa nhà: 0900 000 111'}
        </p>
      </section>

      <section className="resident-search-wrap">
        <input
          className="resident-search-input typo-body-md"
          placeholder="Tìm theo chủ đề, mức độ hoặc từ khóa"
          aria-label="Tìm nội dung hướng dẫn"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      <section className="resident-filter-row" aria-label="Lọc danh mục hướng dẫn">
        {CATEGORIES.map((category) => (
          <button
            key={category.value}
            type="button"
            className={`resident-filter-pill typo-label ${categoryFilter === category.value ? 'is-active' : ''}`}
            onClick={() => handleCategoryFilterChange(category.value)}
          >
            {category.label}
          </button>
        ))}
      </section>

      <section className="resident-list-section">
        <div className="resident-section-heading">
          <h2 className="typo-h2">Danh mục kỹ năng</h2>
          <p className="typo-label text-secondary">
            {filteredGuides.length}/{guideItems.length} nội dung
          </p>
        </div>

        {isLoading && (
          <ul className="resident-guide-list" aria-label="Đang tải thư viện hướng dẫn">
            <li className="resident-panel resident-guide-card resident-skeleton" />
            <li className="resident-panel resident-guide-card resident-skeleton" />
          </ul>
        )}

        {!isLoading && filteredGuides.length > 0 && (
          <ul className="resident-guide-list">
            {filteredGuides.map((guide) => (
              <li key={guide.id} className="resident-panel resident-guide-card">
                <div 
                  className="resident-guide-thumb" 
                  aria-label="Xem video hướng dẫn trên YouTube"
                  onClick={() => window.open(guide.videoUrl, '_blank')}
                >
                  <img 
                    src={guide.coverImage ? guide.coverImage : `https://img.youtube.com/vi/${getYouTubeId(guide.videoUrl)}/hqdefault.jpg`} 
                    alt={guide.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '12px' }}
                  />
                  <span className="resident-thumb-play">▶</span>
                </div>

                <div className="resident-guide-content">
                  <h3 className="typo-body-lg resident-guide-title">{guide.title}</h3>
                  <p className="typo-label text-secondary">
                    Thời lượng: {guide.duration} | Mức: {guide.level}
                  </p>
                  <button type="button" className="resident-link-btn typo-label" onClick={() => setActiveGuide(guide)}>
                    Xem văn bản tóm tắt
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && filteredGuides.length === 0 && (
          <article className="resident-panel resident-empty-state" aria-live="polite">
            <p className="typo-h2">Không tìm thấy nội dung phù hợp</p>
            <p className="typo-body-md text-secondary">
              Hãy thử thay đổi bộ lọc hoặc tìm theo từ khóa ngắn hơn.
            </p>
          </article>
        )}
      </section>

      {activeGuide && (
        <section className="resident-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Tóm tắt hướng dẫn">
          <article className="resident-sheet resident-panel">
            <header className="resident-sheet-header">
              <h2 className="typo-h2">{activeGuide.title}</h2>
              <button type="button" className="resident-close-btn typo-label" onClick={() => setActiveGuide(null)}>
                Đóng
              </button>
            </header>

            <p className="typo-body-md text-secondary">{activeGuide.summary}</p>
            <p className="typo-label text-secondary">Video tham khảo: {activeGuide.videoTitle}</p>

            <ol className="resident-steps typo-body-md">
              {activeGuide.textSteps.map((step, index) => (
                <li key={`${activeGuide.id}-step-${index}`}>{step}</li>
              ))}
            </ol>

            {activeGuide.contacts && activeGuide.contacts.length > 0 && (
              <p className="typo-label text-secondary">Liên hệ: {activeGuide.contacts.join(' | ')}</p>
            )}
          </article>
        </section>
      )}

      <ResidentBottomNav />
    </main>
  );
}

export default ResidentGuidancePage;
