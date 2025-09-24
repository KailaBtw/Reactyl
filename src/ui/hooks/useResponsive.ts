import { useWindowSize } from 'react-use';

export interface ResponsiveConfig {
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  width: number;
  height: number;
  isVerticallyConstrained: boolean;
  needsReactionBar: boolean;
  bottomBarLayout: 'horizontal' | 'vertical' | 'compact';
  infoBoxWidth: {
    flex: string;
    minWidth: string;
    maxWidth: string;
  };
  statsGridWidth: string;
  contentGap: string;
  contentPadding: string;
  animationVariants: {
    container: {
      collapsed: any;
      expanded: any;
    };
    content: {
      hidden: any;
      visible: any;
    };
    infoPanel: {
      hidden: any;
      visible: any;
    };
  };
}

export const useResponsive = (): ResponsiveConfig => {
  const { width = 1200, height = 800 } = useWindowSize();

  const isSmall = width < 768;
  const isMedium = width >= 768 && width < 1024;
  const isLarge = width >= 1024 && width < 1440;
  const isXLarge = width >= 1440;
  
  // Mobile devices use tabbed interface now, no separate reaction bar needed
  const isVerticallyConstrained = height < 700;
  const needsReactionBar = false; // Disabled - mobile uses same tabbed interface

  // Determine bottom bar layout based on width
  const getBottomBarLayout = (): 'horizontal' | 'vertical' | 'compact' => {
    if (isSmall) return 'vertical';
    if (isMedium) return 'compact';
    return 'horizontal';
  };

  // Calculate info box dimensions
  const getInfoBoxWidth = () => {
    if (isSmall) {
      return {
        flex: '1 1 100%',
        minWidth: '200px',
        maxWidth: '100%'
      };
    }
    if (isMedium) {
      return {
        flex: '0 1 250px',
        minWidth: '220px',
        maxWidth: '300px'
      };
    }
    if (isLarge) {
      return {
        flex: '0 1 280px',
        minWidth: '260px',
        maxWidth: '320px'
      };
    }
    // XLarge
    return {
      flex: '0 1 320px',
      minWidth: '300px',
      maxWidth: '400px'
    };
  };

  // Calculate stats grid width
  const getStatsGridWidth = (): string => {
    if (isSmall) return '100%';
    if (isMedium) return '160px';
    if (isLarge) return '180px';
    return '200px'; // XLarge
  };

  // Calculate content gap
  const getContentGap = (): string => {
    if (isSmall) return '8px';
    if (isMedium) return '12px';
    if (isLarge) return '16px';
    return '20px'; // XLarge
  };

  // Calculate content padding
  const getContentPadding = (): string => {
    if (isSmall) return '8px 12px';
    if (isMedium) return '10px 16px';
    return '12px 20px'; // Large and XLarge
  };

  // Animation variants based on screen size
  const getAnimationVariants = () => ({
    container: {
      collapsed: {
        height: isSmall ? '28px' : '32px', // Ultra-narrow with stats
        transition: {
          duration: 0.3,
          ease: 'easeInOut'
        }
      },
      expanded: {
        height: isSmall ? '140px' : '160px', // Much narrower, compress UI
        transition: {
          duration: 0.3,
          ease: 'easeInOut'
        }
      }
    },
    content: {
      hidden: {
        opacity: 0,
        y: 10,
        transition: {
          duration: 0.2
        }
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
          delay: 0.1
        }
      }
    },
    infoPanel: {
      hidden: {
        opacity: 0,
        scale: 0.95,
        y: isSmall ? 20 : 10,
        transition: {
          duration: 0.2
        }
      },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          duration: 0.3,
          ease: 'easeOut'
        }
      }
    }
  });

  return {
    isSmall,
    isMedium,
    isLarge,
    isXLarge,
    width,
    height,
    isVerticallyConstrained,
    needsReactionBar,
    bottomBarLayout: getBottomBarLayout(),
    infoBoxWidth: getInfoBoxWidth(),
    statsGridWidth: getStatsGridWidth(),
    contentGap: getContentGap(),
    contentPadding: getContentPadding(),
    animationVariants: getAnimationVariants()
  };
};
