'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface LanguageBadgeProps {
  language: 'en' | 'bn';
}

export function LanguageBadge({ language }: LanguageBadgeProps) {
  return (
    <Badge variant={language === 'en' ? 'en' : 'bn'}>
      {language === 'en' ? 'EN' : 'BN'}
    </Badge>
  );
}
