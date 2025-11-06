import React from 'react';

interface ReactionRateMetricsProps {
  reactionRate: number; // reactions per second
  remainingReactants: number; // percentage
  productsFormed: number; // count
  collisionCount: number; // total collisions
  elapsedTime: number; // seconds
  themeClasses: any;
}

export const ReactionRateMetrics: React.FC<ReactionRateMetricsProps> = ({
  reactionRate,
  remainingReactants,
  productsFormed,
  collisionCount,
  elapsedTime,
  themeClasses
}) => {
  // Calculate collision success rate
  const successRate = collisionCount > 0 ? (productsFormed / collisionCount) * 100 : 0;
  
  return (
    <section className="p-4 border-b border-gray-100">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${themeClasses.text}`}>
        📊 Reaction Rate Metrics
      </h3>
      
      <div className="space-y-3">
        {/* Reaction Rate Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary}`}>Reaction Rate</span>
            <span className={`text-xs font-semibold ${themeClasses.text}`}>
              {reactionRate.toFixed(2)} rxn/s
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
              style={{ width: `${Math.min((reactionRate / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining Reactants Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs ${themeClasses.textSecondary}`}>Remaining Reactants</span>
            <span className={`text-xs font-semibold ${themeClasses.text}`}>
              {remainingReactants.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
              style={{ width: `${remainingReactants}%` }}
            />
          </div>
        </div>

        {/* Products Formed Counter */}
        <div className={`p-3 rounded-lg ${themeClasses.card} border border-green-500/30`}>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${themeClasses.textSecondary}`}>Products Formed</span>
            <span className={`text-lg font-bold text-green-600`}>
              {productsFormed}
            </span>
          </div>
        </div>

        {/* Collision Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded ${themeClasses.card} border border-gray-300`}>
            <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>Collisions</div>
            <div className={`text-sm font-semibold ${themeClasses.text}`}>
              {collisionCount}
            </div>
          </div>
          
          <div className={`p-2 rounded ${themeClasses.card} border border-gray-300`}>
            <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>Success Rate</div>
            <div className={`text-sm font-semibold ${themeClasses.text}`}>
              {successRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className={`text-center p-2 rounded ${themeClasses.card}`}>
          <span className={`text-xs ${themeClasses.textSecondary}`}>
            Elapsed: <strong>{elapsedTime.toFixed(1)}s</strong>
          </span>
        </div>
      </div>
    </section>
  );
};

