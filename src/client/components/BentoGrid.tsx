import React from 'react';
import { HeroCommandPanel } from './HeroCommandPanel.tsx';
import { ExecutionTimeline } from './ExecutionTimeline.tsx';
import { LiveScreenViewer } from './LiveScreenViewer.tsx';
import { LogConsole } from './LogConsole.tsx';

export const BentoGrid: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Hero Command Bar (Top Bento Card) */}
      <HeroCommandPanel />

      {/* Middle Split Bento Section: Execution Timeline (Left) + Live Screen/DOM Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
        {/* Left Column: Hierarchical Execution Steps (5 cols) */}
        <div className="lg:col-span-5 h-[520px]">
          <ExecutionTimeline />
        </div>

        {/* Right Column: Live Playwright Screen & DOM Viewer (7 cols) */}
        <div className="lg:col-span-7 h-[520px]">
          <LiveScreenViewer />
        </div>
      </div>

      {/* Bottom Bento Card: Log & Network Console */}
      <LogConsole />
    </div>
  );
};
