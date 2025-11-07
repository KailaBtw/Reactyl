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
    <section className="p-5 border-b border-gray-200 dark:border-gray-700">
      <h3 className={`text-sm font-semibold mb-4 ${themeClasses.text} flex items-center gap-2`}>
        <span className="text-lg">📊</span>
        <span>Reaction Metrics</span>
      </h3>
      
      <div className="space-y-4">
        {/* Reaction Rate - Prominent Display */}
        <div className={`p-4 rounded-lg ${themeClasses.card} border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20`}>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-xs font-medium uppercase tracking-wide ${themeClasses.textSecondary}`}>
              Reaction Rate
            </span>
            <span className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
              {reactionRate.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">reactions per second</div>
          <div className="mt-3 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
              style={{ width: `${Math.min((reactionRate / 5) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Progress Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Remaining Reactants */}
          <div className={`p-3 rounded-lg ${themeClasses.card} border border-blue-500/20`}>
            <div className={`text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
              Remaining
            </div>
            <div className={`text-xl font-bold text-blue-600 dark:text-blue-400 mb-1`}>
              {remainingReactants.toFixed(0)}%
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                style={{ width: `${remainingReactants}%` }}
              />
            </div>
          </div>

          {/* Products Formed */}
          <div className={`p-3 rounded-lg ${themeClasses.card} border border-green-500/20`}>
            <div className={`text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
              Products
            </div>
            <div className={`text-xl font-bold text-green-600 dark:text-green-400`}>
              {productsFormed}
            </div>
            <div className={`text-xs mt-1 ${themeClasses.textSecondary}`}>
              formed
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-3 rounded-lg ${themeClasses.card} border border-gray-300 dark:border-gray-600`}>
            <div className={`text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
              Collisions
            </div>
            <div className={`text-lg font-semibold ${themeClasses.text}`}>
              {collisionCount.toLocaleString()}
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${themeClasses.card} border border-gray-300 dark:border-gray-600`}>
            <div className={`text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
              Success Rate
            </div>
            <div className={`text-lg font-semibold ${themeClasses.text}`}>
              {successRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Elapsed Time */}
        <div className={`p-3 rounded-lg ${themeClasses.card} border border-gray-300 dark:border-gray-600 text-center`}>
          <div className={`text-xs font-medium mb-1 ${themeClasses.textSecondary}`}>
            Simulation Time
          </div>
          <div className={`text-lg font-semibold ${themeClasses.text}`}>
            {elapsedTime.toFixed(1)}s
          </div>
        </div>
      </div>
    </section>
  );
};
