'use client';

import { useState } from 'react';

export function AirConditionerWidget() {
  const [isOn, setIsOn] = useState(true);
  const [bonusesActive, setBonusesActive] = useState(8);

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Active Bonuses</h3>
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
              strokeDasharray={`${(bonusesActive / 12) * 251.2} 251.2`}
              className="text-yellow-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{bonusesActive}/12</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Active Bonus Programs</p>
        <p className="text-xs text-muted-foreground">Last updated 2 min ago</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { 
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            ), 
            label: 'Purchase' 
          },
          { 
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ), 
            label: 'Recharge' 
          },
          { 
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            ), 
            label: 'Transfer' 
          },
          { 
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            ), 
            label: 'Signup' 
          },
        ].map((item, index) => (
          <button
            key={index}
            className="p-2 rounded-lg bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
