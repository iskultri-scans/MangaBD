'use client';

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const targetMs = targetDate.getTime();

  useEffect(() => {
    function calculateTime() {
      const now = Date.now();
      const difference = targetMs - now;

      if (difference <= 0) {
        setIsComplete(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onComplete?.();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetMs, onComplete]);

  const blocks = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hrs' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec' },
  ];

  if (isComplete) {
    return (
      <div
        className="px-3 py-1.5 rounded-md text-xs font-semibold inline-block"
        style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
      >
        Available Now
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {blocks.map((block, i) => (
        <React.Fragment key={block.label}>
          <div className="flex flex-col items-center">
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-md font-mono-num text-sm sm:text-base font-semibold"
              style={{
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {String(block.value).padStart(2, '0')}
            </div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wider">
              {block.label}
            </span>
          </div>
          {i < blocks.length - 1 && (
            <span className="text-[var(--text-muted)] font-mono-num font-bold text-sm mb-4">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
