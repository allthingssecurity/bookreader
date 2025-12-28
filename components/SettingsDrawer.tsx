import React from 'react';
import { GameSettings } from '../types';
import { Settings, X, Volume2, VolumeX, MousePointer2, Camera } from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, settings, updateSettings }) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white/90 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col p-6 text-slate-800">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" /> Settings
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 flex-1 overflow-y-auto">
          
          {/* Input Method */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Input Method</h3>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => updateSettings({ inputMode: 'hands', useMouseFallback: false })}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.inputMode === 'hands' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Camera className="w-4 h-4" /> Hands
              </button>
              <button 
                onClick={() => updateSettings({ inputMode: 'eyes', useMouseFallback: false })}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.inputMode === 'eyes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Camera className="w-4 h-4" /> Eyes
              </button>
              <button 
                onClick={() => updateSettings({ inputMode: 'mouse', useMouseFallback: true })}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.inputMode === 'mouse' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <MousePointer2 className="w-4 h-4" /> Mouse
              </button>
            </div>
            {settings.inputMode === 'eyes' && (
              <div className="flex items-center gap-2 mt-2">
                <input id="blinkFire" type="checkbox" checked={!!settings.blinkToFire} onChange={(e) => updateSettings({ blinkToFire: e.target.checked })} />
                <label htmlFor="blinkFire" className="text-sm text-slate-600">Blink (both eyes) to fire</label>
              </div>
            )}
          </div>

          {/* Mode */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Mode</h3>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => updateSettings({ mode: 'classic' as any })}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.mode !== 'themed' && settings.mode !== 'book' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Classic
              </button>
              <button 
                onClick={() => updateSettings({ mode: 'themed' as any })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.mode === 'themed' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Themed
              </button>
              <button 
                onClick={() => updateSettings({ mode: 'book' as any })}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.mode === 'book' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Book
              </button>
            </div>
            {settings.mode === 'book' && (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <input id="bookPinch" type="checkbox" checked={!!settings.bookRequirePinch} onChange={(e) => updateSettings({ bookRequirePinch: e.target.checked })} />
                  <label htmlFor="bookPinch" className="text-sm text-slate-600">Require pinch/blink to turn page</label>
                </div>
                <div className="mt-2">
                  <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1">Flip Mode</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(['hand','swipe','orientation'] as const).map(m => (
                      <button key={m} onClick={() => updateSettings({ bookFlipMode: m })}
                        className={`py-2 rounded-lg text-sm font-medium capitalize border-2 transition-all ${settings.bookFlipMode===m?'border-amber-500 bg-amber-50 text-amber-700':'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Challenge */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Challenge</h3>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => updateSettings({ challenge: 'standard' as any })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.challenge !== 'slingshot' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => updateSettings({ challenge: 'slingshot' as any })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${settings.challenge === 'slingshot' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Slingshot
              </button>
            </div>
            <p className="text-xs text-slate-500">Slingshot: pinch-hold to charge power, release to fire a projectile that can hit multiple targets (Angry Birds‑style).</p>
          </div>

          {/* Role */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Role</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['architect','developer','manager'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => updateSettings({ role: r })}
                  className={`py-2 rounded-lg text-sm font-medium capitalize border-2 transition-all ${
                    settings.role === r 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Tailor quiz emphasis by role.</p>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-500">Difficulty</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['chill','easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => updateSettings({ difficulty: diff })}
                  className={`py-2 rounded-lg text-sm font-medium capitalize border-2 transition-all ${
                    settings.difficulty === diff 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">Chill = slowest targets and spawns</p>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Smoothing</label>
                <span className="text-xs text-slate-500">{Math.round(settings.smoothing * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={settings.smoothing}
                onChange={(e) => updateSettings({ smoothing: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-400 mt-1">Lower is smoother but laggy</p>
            </div>

            <div>
               <div className="flex justify-between mb-1">
                <label className="text-sm font-medium">Sensitivity</label>
                <span className="text-xs text-slate-500">x{settings.sensitivity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={settings.sensitivity}
                onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          {/* Sound */}
          <div className="pt-4 border-t border-slate-100">
             <button 
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-100 transition-colors"
             >
                {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-green-600" /> : <VolumeX className="w-5 h-5 text-red-500" />}
                <span className="font-medium">Sound Effects</span>
             </button>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-center text-slate-400">
          v1.1.0 • Sky High Popper
        </div>
      </div>
    </div>
  );
};

export default SettingsDrawer;
