import type React from 'react';
import { InfoBubble } from './InfoBubble';
import { getInfoContent, type InfoTerm, type ReactionType } from './InfoBubbleContent';

interface SmartInfoBubbleProps {
  term: InfoTerm;
  reactionType: ReactionType;
  size?: 'small' | 'medium';
}

export const SmartInfoBubble: React.FC<SmartInfoBubbleProps> = ({
  term,
  reactionType,
  size = 'small',
}) => {
  const content = getInfoContent(reactionType, term);

  return <InfoBubble content={content} size={size} />;
};
