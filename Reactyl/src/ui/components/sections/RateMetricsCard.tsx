import type React from 'react';

interface RateMetricsCardProps {
  reactionRate: number; // reactions per second
  remainingReactants: number; // percentage
  productsFormed: number; // count
  collisionCount: number; // total collisions
  elapsedTime: number; // seconds
  themeClasses: any;
}

// Constants - Card sizing (fixed size)
const CARD_SIZE = 120; // px - fixed card size

// Base classes
const containerClasses = [
  'border-t',
  'h-full',
  'flex',
  'flex-col',
  'overflow-hidden',
  'w-full', // Ensure container takes full width of bottom panel
  'min-w-0', // Allow container to shrink below content size if needed
].join(' ');

const gridClasses = [
  'flex',
  'flex-col',
  'sm:flex-row',
  'gap-2',
  'p-2',
  'pt-2',
  'sm:overflow-x-auto',
  'flex-1',
  'min-h-0',
  'min-w-0', // Allow grid to shrink and let cards calculate their own size
  'flex-wrap', // Always allow wrapping so cards can grow and wrap naturally
  'overflow-x-visible',
  'justify-center', // Center cards horizontally - they'll grow in place and center when at max
  'items-start', // Align to top - cards stay at top as they grow
  'content-start',
  'w-full', // Ensure container takes full width
  'max-w-full', // Prevent overflow
].join(' ');

// Card base classes - fixed size cards that can move around
const getCardBaseClasses = () => [
  `w-[${CARD_SIZE}px]`,
  `h-[${CARD_SIZE}px]`,
  'aspect-square',
  'p-3',
  'rounded-lg',
  'border',
  'flex',
  'flex-col',
  'justify-between',
  'flex-shrink-0', // Prevent cards from shrinking
].join(' ');

const cardHeaderClasses = 'mb-2';
const cardTitleClasses = 'text-xs font-semibold uppercase tracking-wide';
const cardValueClasses = 'text-3xl font-bold mb-1';
const cardLabelClasses = 'text-xs font-medium';
const progressBarClasses = 'w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden';
const progressBarFillClasses = 'h-full transition-all duration-300';

// Color theme configurations
const colorThemes = {
  orange: {
    border: 'border-orange-500/20',
    gradient: 'bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10',
    progress: 'bg-gradient-to-r from-orange-400 to-red-500',
  },
  blue: {
    border: 'border-blue-500/20',
    gradient: 'bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10',
    progress: 'bg-gradient-to-r from-blue-400 to-indigo-500',
  },
  green: {
    border: 'border-green-500/20',
    gradient: 'bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10',
    progress: 'bg-gradient-to-r from-green-400 to-emerald-500',
  },
  purple: {
    border: 'border-purple-500/20',
    gradient: 'bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10',
    progress: 'bg-gradient-to-r from-purple-400 to-violet-500',
  },
  teal: {
    border: 'border-teal-500/20',
    gradient: 'bg-gradient-to-br from-teal-50/50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10',
    progress: 'bg-gradient-to-r from-teal-400 to-cyan-500',
  },
  slate: {
    border: 'border-slate-500/20',
    gradient: 'bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-900/20 dark:to-slate-800/10',
    progress: 'bg-gradient-to-r from-slate-400 to-gray-500',
  },
} as const;

interface MetricCardData {
  title: string;
  value: string | number;
  label: string;
  theme: keyof typeof colorThemes;
  progressBar?: {
    width: number;
    show: boolean;
  };
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

  // Card data configuration
  const cards: MetricCardData[] = [
    {
      title: 'Reaction Rate',
      value: reactionRate.toFixed(2),
      label: 'reactions/s',
      theme: 'orange',
      progressBar: {
        width: Math.min((reactionRate / 3) * 100, 100),
        show: true,
      },
    },
    {
      title: 'Remaining',
      value: `${remainingReactants.toFixed(0)}%`,
      label: '',
      theme: 'blue',
      progressBar: {
        width: remainingReactants,
        show: true,
      },
    },
    {
      title: 'Products',
      value: productsFormed,
      label: 'formed',
      theme: 'green',
    },
    {
      title: 'Collisions',
      value: collisionCount.toLocaleString(),
      label: 'total',
      theme: 'purple',
    },
    {
      title: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      label: 'reaction rate',
      theme: 'teal',
    },
    {
      title: 'Time',
      value: `${elapsedTime.toFixed(1)}s`,
      label: 'elapsed',
      theme: 'slate',
    },
  ];

  const renderCard = (card: MetricCardData) => {
    const theme = colorThemes[card.theme];
    const cardClasses = `${getCardBaseClasses()} ${theme.border} ${theme.gradient}`;

  return (
      <div key={card.title} className={cardClasses}>
        <div className={cardHeaderClasses}>
          <span className={`${cardTitleClasses} ${themeClasses.textSecondary}`}>{card.title}</span>
        </div>
        <div className={`${cardValueClasses} ${themeClasses.text}`}>{card.value}</div>
        {card.label && (
          <div className={`${cardLabelClasses} ${themeClasses.textSecondary}`}>{card.label}</div>
        )}
        {card.progressBar?.show && (
          <div className={`mt-2 ${progressBarClasses}`}>
            <div
              className={`${progressBarFillClasses} ${theme.progress}`}
              style={{ width: `${card.progressBar.width}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${containerClasses} ${themeClasses.card}`}>
      <div className={gridClasses}>{cards.map(renderCard)}</div>
    </div>
  );
};
