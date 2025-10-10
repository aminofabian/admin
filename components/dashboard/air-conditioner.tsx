'use client';

import { useState } from 'react';

export function AirConditionerWidget() {
  const [isOn, setIsOn] = useState(true);
  const [temperature, setTemperature] = useState(25.2);

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Air Conditioner</h3>
        <button
          onClick={() => setIsOn(!isOn)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isOn ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isOn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="relative w-24 h-24 mx-auto mb-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(temperature / 30) * 251.2} 251.2`}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{temperature}°C</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Cooling to {temperature}°C</p>
        <p className="text-xs text-muted-foreground">Under 5 mnt</p>
      </div>

      <div className="flex justify-center space-x-2">
        {[
          { icon: '🚗', label: 'Auto' },
          { icon: '⬇️', label: 'Fan Down' },
          { icon: '👤', label: 'Personal' },
          { icon: '⬆️', label: 'Fan Up' },
        ].map((item, index) => (
          <button
            key={index}
            className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors"
            title={item.label}
          >
            <span className="text-sm">{item.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
