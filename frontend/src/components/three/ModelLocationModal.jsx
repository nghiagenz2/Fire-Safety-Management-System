import { useEffect, useMemo, useState } from 'react';
import { X } from '@phosphor-icons/react';
import BuildingModelViewer from './BuildingModelViewer.jsx';
import './ModelLocationModal.css';

function ModelLocationModal({
  isOpen,
  title = 'Vị trí trên mô hình 3D',
  subtitle = '',
  selectedFloorId = 'all',
  focusedNodeName = '',
  highlightExits = false,
  highlightedEscape = null,
  focusedNodeHighlightColor = '#f97316',
  onClose
}) {
  const [localFloorId, setLocalFloorId] = useState(selectedFloorId);

  useEffect(() => {
    if (isOpen) {
      setLocalFloorId(selectedFloorId);
    }
  }, [selectedFloorId, isOpen]);

  const focusPayload = useMemo(() => {
    return focusedNodeName
      ? { name: focusedNodeName, timestamp: Date.now() }
      : '';
  }, [focusedNodeName]);

  if (!isOpen) return null;

  return (
    <div className="model-location-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <section className="model-location-modal" onClick={(event) => event.stopPropagation()}>
        <header className="model-location-head">
          <div>
            <h2 className="typo-h2 model-location-title">{title}</h2>
            {subtitle ? <p className="typo-body-md text-secondary model-location-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="model-location-close" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <BuildingModelViewer
          className="model-location-viewer"
          showHeader={false}
          showCaption={false}
          showFloorSelector={true}
          selectedFloorId={localFloorId}
          onFloorChange={(floorId) => setLocalFloorId(floorId)}
          focusedNodeName={focusPayload}
          focusedNodeHighlightColor={focusedNodeHighlightColor}
          highlightExits={highlightExits}
          highlightedEscape={highlightedEscape}
          ariaLabel={title}
        />
      </section>
    </div>
  );
}

export default ModelLocationModal;
