import '../assets/styles/TabTongQuan.css';

import ThreadInfoCard from '../components/overview/ThreadInfoCard';
import SummaryCard    from '../components/overview/SummaryCard';
import SentimentCard  from '../components/overview/SentimentCard';
import ToxicityCard   from '../components/overview/ToxicityCard';
import QuickActions   from '../components/overview/QuickActions';
import { useNavigate } from 'react-router-dom';

export default function OverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="tab-tong-quan">
      <ThreadInfoCard onScan={() => {}} />
      <SummaryCard />
      <SentimentCard />
      <ToxicityCard />
      <QuickActions onAction={(id) => {
        if (id === 'view-replies' || id === 'filter-toxic') {
          navigate('/comments');
        }
      }} />
    </div>
  );
}