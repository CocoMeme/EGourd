import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import './PuzzleCaptcha.css';

// Gourd-themed puzzle images
const PUZZLE_IMAGES = [
  'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&h=200&fit=crop', // Gourd/squash
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop', // Farm landscape
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=200&fit=crop', // Green vegetables
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=200&fit=crop', // Pumpkins
  'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=400&h=200&fit=crop', // Farm field
];

const PuzzleCaptcha = ({ onVerify, onReset }) => {
  const [image, setImage] = useState('');
  const [puzzlePosition, setPuzzlePosition] = useState({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const [sliderValue, setSliderValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, verifying, success, failed
  const [attempts, setAttempts] = useState(0);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);

  const PUZZLE_SIZE = 50;
  const TOLERANCE = 8; // Pixel tolerance for matching

  // Initialize puzzle
  const initializePuzzle = useCallback(() => {
    const randomImage = PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)];
    setImage(randomImage);

    // Random target position (where the piece should go)
    const targetX = Math.floor(Math.random() * 200) + 100; // 100-300px from left
    const targetY = Math.floor(Math.random() * 80) + 40; // 40-120px from top
    setTargetPosition({ x: targetX, y: targetY });

    // Puzzle piece starts at the left
    setPuzzlePosition({ x: 0, y: targetY });
    setSliderValue(0);
    setStatus('idle');
  }, []);

  useEffect(() => {
    initializePuzzle();
  }, [initializePuzzle]);

  // Handle slider change
  const handleSliderChange = (e) => {
    if (status === 'success') return;

    const value = parseInt(e.target.value, 10);
    setSliderValue(value);
    setPuzzlePosition((prev) => ({ ...prev, x: value }));
  };

  // Handle slider release (verification check)
  const handleSliderRelease = () => {
    if (status === 'success') return;

    setStatus('verifying');
    setIsDragging(false);

    // Check if puzzle piece is in the correct position
    const isCorrect = Math.abs(puzzlePosition.x - targetPosition.x) <= TOLERANCE;

    setTimeout(() => {
      if (isCorrect) {
        setStatus('success');
        onVerify?.(true);
      } else {
        setStatus('failed');
        setAttempts((prev) => prev + 1);

        // Reset after failed attempt
        setTimeout(() => {
          setSliderValue(0);
          setPuzzlePosition((prev) => ({ ...prev, x: 0 }));
          setStatus('idle');

          // Refresh puzzle after 3 failed attempts
          if (attempts >= 2) {
            initializePuzzle();
            setAttempts(0);
          }
        }, 1000);

        onVerify?.(false);
      }
    }, 500);
  };

  const handleRefresh = () => {
    initializePuzzle();
    setAttempts(0);
    onReset?.();
  };

  return (
    <div className="puzzle-captcha" ref={containerRef}>
      <div className="puzzle-header">
        <span className="puzzle-title">
          {status === 'success' ? (
            <>
              <Check size={18} className="success-icon" />
              Verification Complete
            </>
          ) : (
            'Drag the puzzle piece to complete'
          )}
        </span>
        <button
          type="button"
          className="puzzle-refresh"
          onClick={handleRefresh}
          disabled={status === 'verifying'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="puzzle-image-container">
        {image && (
          <>
            <img
              src={image}
              alt="Puzzle background"
              className="puzzle-background"
              draggable={false}
            />

            {/* Target slot (where piece should go) */}
            <div
              className={`puzzle-slot ${status === 'success' ? 'matched' : ''}`}
              style={{
                left: `${targetPosition.x}px`,
                top: `${targetPosition.y}px`,
                width: `${PUZZLE_SIZE}px`,
                height: `${PUZZLE_SIZE}px`,
              }}
            />

            {/* Draggable puzzle piece */}
            <div
              className={`puzzle-piece ${status}`}
              style={{
                left: `${puzzlePosition.x}px`,
                top: `${puzzlePosition.y}px`,
                width: `${PUZZLE_SIZE}px`,
                height: `${PUZZLE_SIZE}px`,
                backgroundImage: `url(${image})`,
                backgroundPosition: `-${targetPosition.x}px -${targetPosition.y}px`,
              }}
            />
          </>
        )}

        {/* Status overlay */}
        {status === 'verifying' && (
          <div className="puzzle-overlay verifying">
            <div className="puzzle-spinner" />
          </div>
        )}
        {status === 'success' && (
          <div className="puzzle-overlay success">
            <Check size={48} />
          </div>
        )}
        {status === 'failed' && (
          <div className="puzzle-overlay failed">
            <X size={48} />
          </div>
        )}
      </div>

      {/* Slider control */}
      <div className="puzzle-slider-container">
        <div className="puzzle-slider-track">
          <div className="puzzle-slider-fill" style={{ width: `${(sliderValue / 350) * 100}%` }} />
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="350"
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={handleSliderRelease}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={handleSliderRelease}
            className="puzzle-slider"
            disabled={status === 'success' || status === 'verifying'}
          />
        </div>
        <div className="puzzle-slider-hint">
          {status === 'idle' && !isDragging && 'Slide to verify'}
          {isDragging && 'Release to verify'}
          {status === 'failed' && 'Try again'}
          {status === 'success' && 'Verified!'}
        </div>
      </div>

      {attempts > 0 && status !== 'success' && (
        <div className="puzzle-attempts">Attempts: {attempts}/3</div>
      )}
    </div>
  );
};

export default PuzzleCaptcha;
