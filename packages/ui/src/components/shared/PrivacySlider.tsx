import { PrivacyLevel } from '@gravytos/types';

interface PrivacySliderProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
  chainId?: string;
  disabled?: boolean;
  className?: string;
}

const LEVELS = [
  {
    level: PrivacyLevel.Low,
    label: 'Low',
    color: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/30',
    textColor: 'text-emerald-400',
    description: 'Fast & cheap. Standard transaction.',
  },
  {
    level: PrivacyLevel.Medium,
    label: 'Medium',
    color: 'bg-amber-500',
    glowColor: 'shadow-amber-500/30',
    textColor: 'text-amber-400',
    description: 'RPC rotation + batching + delays.',
  },
  {
    level: PrivacyLevel.High,
    label: 'High',
    color: 'bg-purple-500',
    glowColor: 'shadow-purple-500/30',
    textColor: 'text-purple-400',
    description: 'CoinJoin / stealth addresses. Full privacy.',
  },
];

export function PrivacySlider({ value, onChange, disabled = false, className = '' }: PrivacySliderProps) {
  const currentIndex = LEVELS.findIndex(l => l.level === value);
  const current = LEVELS[currentIndex];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-light tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>Privacy Level</label>
        <span className={`text-xs font-semibold ${current.textColor}`}>{current.label}</span>
      </div>

      {/* Slider Track */}
      <div className="relative">
        <div className="flex gap-1.5">
          {LEVELS.map((level, i) => (
            <button
              key={level.level}
              onClick={() => !disabled && onChange(level.level)}
              disabled={disabled}
              className={`
                flex-1 h-2.5 rounded-full transition-all duration-500
                ${i <= currentIndex ? level.color : 'bg-white/10'}
                ${i <= currentIndex && i === currentIndex ? `shadow-lg ${level.glowColor}` : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
              `}
              aria-label={`Set privacy to ${level.label}`}
            />
          ))}
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-2">
          {LEVELS.map((level) => (
            <span
              key={level.level}
              className={`text-[10px] font-light tracking-wider transition-all duration-300 ${
                level.level === value ? level.textColor : 'opacity-30'
              }`}
              style={{ color: level.level !== value ? 'rgba(255,255,255,0.3)' : undefined }}
            >
              {level.label}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-light tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{current.description}</p>
    </div>
  );
}
