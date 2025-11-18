import type React from 'react';

interface ControlsHelpProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ControlsHelp: React.FC<ControlsHelpProps> = ({ isOpen, onToggle }) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40 transition-all duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Toggle Button */}
      <button
        className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white border-0 cursor-pointer text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        onClick={onToggle}
      >
        <span className="text-base">💡</span>
        <span className="flex-1 text-left">Controls & Instructions</span>
        <span className={`text-xs transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-300 bg-gray-50 ${isOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 p-5 max-w-6xl mx-auto">
            {/* Mouse Controls */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🖱️ Mouse Controls
              </h4>
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    Left Click + Drag
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Rotate the molecular view
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    Right Click + Drag
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">Pan the view around</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    Scroll Wheel
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">Zoom in/out</span>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h4>
              <div className="space-y-2">
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    Space
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Play/Pause simulation
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    R
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">Reset simulation</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    H
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Toggle this help panel
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold text-center">
                    + / -
                  </span>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    Increase/decrease speed
                  </span>
                </div>
              </div>
            </div>

            {/* Reaction Setup */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                ⚗️ Reaction Setup
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Substrate:</strong> The molecule being attacked
                  (e.g., CH₃Br)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Nucleophile:</strong> The attacking species
                  (e.g., OH⁻)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Reaction Type:</strong> Choose SN2, SN1, or E2
                  mechanism
                </div>
              </div>
            </div>

            {/* Attack Modes */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🎯 Attack Modes
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Backside SN2:</strong> Nucleophile approaches
                  from behind (180°)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Front Attack:</strong> Direct frontal approach
                  (0°)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Side Attack:</strong> Perpendicular approach
                  (90°)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Impact Parameter:</strong> Lateral offset
                  distance
                </div>
              </div>
            </div>

            {/* Energy Profile */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                ⚡ Energy Profile
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Activation Energy:</strong> Energy barrier to
                  overcome
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Reaction Progress:</strong> How far along the
                  reaction is
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Transition State:</strong> Highest energy point
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Phase:</strong> Current reaction stage
                </div>
              </div>
            </div>

            {/* Visual Options */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🎨 Visual Options
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Background:</strong> Change 3D scene background
                  color
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Molecule Colors:</strong> Standard CPK coloring
                  scheme
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Speed Control:</strong> Adjust simulation
                  playback speed
                </div>
              </div>
            </div>

            {/* Live Data */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                📊 Live Data
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Distance:</strong> Separation between molecules
                  (Å)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Velocity:</strong> Relative approach speed (m/s)
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Status:</strong> Current simulation state
                </div>
              </div>
            </div>

            {/* Educational Tips */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🎓 Educational Tips
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  • Watch for <strong>Walden inversion</strong> in SN2 reactions
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  • Notice how <strong>steric hindrance</strong> affects approach angles
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  • Observe <strong>bond breaking/forming</strong> during reactions
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  • Compare different <strong>attack modes</strong> and their outcomes
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h4 className="text-base font-semibold mb-3 text-gray-800 flex items-center gap-2">
                🔧 Troubleshooting
              </h4>
              <div className="space-y-2">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">No collision:</strong> Check attack mode and
                  impact parameter
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Slow performance:</strong> Reduce simulation
                  speed
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Molecules stuck:</strong> Reset the simulation
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <strong className="text-gray-800">Can't see molecules:</strong> Try different
                  background color
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
