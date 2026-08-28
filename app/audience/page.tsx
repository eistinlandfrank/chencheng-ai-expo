'use client';

import { useState } from 'react';
import './audience.css';
import AudienceShell from './components/AudienceShell';

export default function AudiencePage() {
  const [tab, setTab] = useState<'map' | 'schedule' | 'nearby' | 'info'>('map');

  return (
    <AudienceShell activeTab={tab} onTabChange={setTab} />
  );
}
