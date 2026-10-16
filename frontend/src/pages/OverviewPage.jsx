// OverviewPage.jsx — manages tab state, shares Header across tabs
import { useState } from 'react';
import '../assets/styles/TabTongQuan.css';

import Header from '../components/layout/Header';

// Overview tab components
import ThreadInfoCard from '../components/overview/ThreadInfoCard';
import SummaryCard from '../components/overview/SummaryCard';
import SentimentCard from '../components/overview/SentimentCard';
import ToxicityCard from '../components/overview/ToxicityCard';
import QuickActions from '../components/overview/QuickActions';

// Comments tab
import CommentsPage from './CommentsPage';

export default function OverviewPage() {
  const [activeTab, setActiveTab] = useState('tongquan');

  const renderContent = () => {
    switch (activeTab) {
      case 'binhluận':
        return <CommentsPage onSwitchTab={setActiveTab} />;
      case 'tongquan':
      default:
        return (
          <div className="tab-tong-quan">
            <ThreadInfoCard onScan={() => { }} />
            <SummaryCard />
            <SentimentCard />
            <ToxicityCard />
            <QuickActions onAction={(id) => {
              if (id === 'view-replies' || id === 'filter-toxic') setActiveTab('binhluận');
            }} />
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {renderContent()}

      <div className="ov-footer">
        <span className="ov-footer-left">
          <span className="ov-footer-model">PhoBERT v2.1</span>
          <span className="ov-footer-dot">•</span>
          <span className="ov-footer-lang">VN</span>
          <span className="ov-footer-syncing">Syncing...</span>
        </span>
        <span className="ov-footer-right">↺ Auto-refresh</span>
      </div>
    </div>
  );
}
