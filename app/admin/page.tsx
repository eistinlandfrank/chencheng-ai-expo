'use client';

import { useState } from 'react';
import './admin.css';
import AdminShell from './components/AdminShell';

export default function AdminPage() {
  const [panel, setPanel] = useState<'overview' | 'map' | 'entry' | 'floorplan' | 'settings'>('overview');

  return (
    <AdminShell activePanel={panel} onPanelChange={setPanel} />
  );
}
