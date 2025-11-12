import type React from 'react';

interface RateMetricsCardProps {
  reactionRate: number; // reactions per second
  remainingReactants: number; // percentage
  productsFormed: number; // count
  collisionCount: number; // total collisions
  elapsedTime: number; // seconds
  themeClasses: any;
}

export const RateMetricsCard: React.FC<RateMetricsCardProps> = ({
  reactionRate,
  remainingReactants,
  productsFormed,
  collisionCount,
  elapsedTime,
  themeClasses,
}) => {
  // Calculate collision success rate
  const successRate = collisionCount > 0 ? (productsFormed / collisionCount) * 100 : 0;

  return (
    <div className={`border-t ${themeClasses.card}`}>
      <div className="flex flex-row gap-3 p-3 overflow-x-auto">
        {/* Reaction Rate Card - Orange/Red theme */}
        <div className="flex-shrink-0 min-w-[140px] p-4 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Reaction Rate
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>
            {reactionRate.toFixed(2)}
          </div>
          <div className={`text-xs font-medium ${themeClasses.textSecondary}`}>reactions/s</div>
          <div className="mt-2 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300"
              style={{ width: `${Math.min((reactionRate / 3) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining Reactants Card - Blue/Indigo theme */}
        <div className="flex-shrink-0 min-w-[130px] p-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Remaining
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>
            {remainingReactants.toFixed(0)}%
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-300"
              style={{ width: `${remainingReactants}%` }}
            />
          </div>
        </div>

        {/* Products Formed Card - Green/Emerald theme */}
        <div className="flex-shrink-0 min-w-[130px] p-4 rounded-lg border border-green-500/20 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Products
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>{productsFormed}</div>
          <div className={`text-xs font-medium ${themeClasses.textSecondary}`}>formed</div>
        </div>

        {/* Collisions Card - Purple/Violet theme */}
        <div className="flex-shrink-0 min-w-[130px] p-4 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Collisions
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>
            {collisionCount.toLocaleString()}
          </div>
          <div className={`text-xs font-medium ${themeClasses.textSecondary}`}>total</div>
        </div>

        {/* Success Rate Card - Teal/Cyan theme */}
        <div className="flex-shrink-0 min-w-[130px] p-4 rounded-lg border border-teal-500/20 bg-gradient-to-br from-teal-50/50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Success Rate
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>
            {successRate.toFixed(1)}%
          </div>
          <div className={`text-xs font-medium ${themeClasses.textSecondary}`}>reaction rate</div>
        </div>

        {/* Elapsed Time Card - Slate/Gray theme */}
        <div className="flex-shrink-0 min-w-[130px] p-4 rounded-lg border border-slate-500/20 bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-800/10">
          <div className="mb-2">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${themeClasses.textSecondary}`}
            >
              Time
            </span>
          </div>
          <div className={`text-3xl font-bold ${themeClasses.text} mb-1`}>
            {elapsedTime.toFixed(1)}s
          </div>
          <div className={`text-xs font-medium ${themeClasses.textSecondary}`}>elapsed</div>
        </div>
      </div>
    </div>
  );
};
