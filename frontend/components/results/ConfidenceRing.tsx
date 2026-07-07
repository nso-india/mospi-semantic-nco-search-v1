"use client";

import React from "react";

interface ConfidenceRingProps {
  value: number;
  size?: number;
}

export default function ConfidenceRing({ value, size = 52 }: ConfidenceRingProps) {
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const tier =
    value >= 70 ? "high" : value >= 40 ? "mid" : "low";

  return (
    <div
      className={`sw-ring sw-ring--${tier}`}
      style={{ width: size, height: size }}
      aria-label={`Confidence: ${value}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="sw-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="sw-ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="sw-ring__label">
        <span className="sw-ring__value">{Math.round(value)}</span>
        <span className="sw-ring__unit">%</span>
      </div>
    </div>
  );
}
