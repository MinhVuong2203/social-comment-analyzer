import React from 'react';
import './OverviewSkeleton.css';

export default function OverviewSkeleton() {
  return (
    <div className="skel-wrap" aria-busy="true" aria-label="Đang tải dữ liệu tổng quan...">
      {/* 1. ThreadInfoCard Skeleton */}
      <div className="skel-card skel-threads-card">
        <div className="skel-head-row">
          <div className="skel-box skel-title" style={{ width: '130px', height: '18px' }} />
          <div className="skel-box" style={{ width: '45px', height: '16px', borderRadius: '4px' }} />
        </div>

        <div className="skel-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skel-post-item">
              <div className="skel-post-head">
                <div className="skel-box skel-avatar" />
                <div className="skel-col">
                  <div className="skel-box" style={{ width: '100px', height: '12px' }} />
                  <div className="skel-box" style={{ width: '60px', height: '10px' }} />
                </div>
                <div className="skel-box" style={{ width: '70px', height: '18px', marginLeft: 'auto', borderRadius: '10px' }} />
              </div>
              <div className="skel-box" style={{ width: '90%', height: '12px' }} />
              <div className="skel-box" style={{ width: '65%', height: '12px' }} />
              <div className="skel-post-foot">
                <div className="skel-box" style={{ width: '50px', height: '10px' }} />
                <div className="skel-box" style={{ width: '60px', height: '10px', marginLeft: 'auto' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="skel-box" style={{ width: '100%', height: '36px', borderRadius: '8px', marginTop: '12px' }} />
      </div>

      {/* 2. SummaryCard Skeleton */}
      <div className="skel-card">
        <div className="skel-head-row">
          <div className="skel-box" style={{ width: '140px', height: '18px' }} />
          <div className="skel-box" style={{ width: '80px', height: '18px', borderRadius: '10px' }} />
        </div>
        <div className="skel-metrics-grid">
          <div className="skel-col">
            <div className="skel-box" style={{ width: '90px', height: '11px' }} />
            <div className="skel-box" style={{ width: '60px', height: '24px' }} />
          </div>
          <div className="skel-col">
            <div className="skel-box" style={{ width: '100px', height: '11px' }} />
            <div className="skel-box" style={{ width: '75px', height: '24px' }} />
          </div>
        </div>
        <div className="skel-box" style={{ width: '100%', height: '8px', borderRadius: '4px', marginTop: '14px' }} />
      </div>

      {/* 3. SentimentCard Skeleton */}
      <div className="skel-card">
        <div className="skel-head-row">
          <div className="skel-box" style={{ width: '150px', height: '18px' }} />
          <div className="skel-box" style={{ width: '70px', height: '18px', borderRadius: '10px' }} />
        </div>
        <div className="skel-sentiment-body">
          <div className="skel-box skel-donut" />
          <div className="skel-col skel-legend">
            <div className="skel-box" style={{ width: '100%', height: '14px' }} />
            <div className="skel-box" style={{ width: '100%', height: '14px' }} />
            <div className="skel-box" style={{ width: '100%', height: '14px' }} />
          </div>
        </div>
      </div>

      {/* 4. ToxicityCard Skeleton */}
      <div className="skel-card">
        <div className="skel-head-row">
          <div className="skel-box" style={{ width: '160px', height: '18px' }} />
          <div className="skel-box" style={{ width: '90px', height: '18px', borderRadius: '10px' }} />
        </div>
        <div className="skel-grid-4">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="skel-col" style={{ gap: '6px' }}>
              <div className="skel-box" style={{ width: '40px', height: '11px' }} />
              <div className="skel-box" style={{ width: '50px', height: '18px' }} />
              <div className="skel-box" style={{ width: '100%', height: '6px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>
        <div className="skel-box" style={{ width: '100%', height: '12px', borderRadius: '6px', marginTop: '14px' }} />
      </div>
    </div>
  );
}
