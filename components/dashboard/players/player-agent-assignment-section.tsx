'use client';

import { Button, Select } from '@/components/ui';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

export interface PlayerAgentAssignmentSectionProps {
  selectedAgentId: string;
  agentOptions: Array<{ value: string; label: string }>;
  isLoadingAgents: boolean;
  isAssigningAgent: boolean;
  isRemovingAgent: boolean;
  currentAgentUsername?: string | null;
  onSelectAgent: (value: string) => void;
  onAssign: () => void;
  onRemove: () => void;
  className?: string;
}

export function PlayerAgentAssignmentSection({
  selectedAgentId,
  agentOptions,
  isLoadingAgents,
  isAssigningAgent,
  isRemovingAgent,
  currentAgentUsername,
  onSelectAgent,
  onAssign,
  onRemove,
  className = '',
}: PlayerAgentAssignmentSectionProps) {
  return (
    <PlayerDetailPanel title="Agent assignment" className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Select
            value={selectedAgentId}
            onChange={onSelectAgent}
            options={agentOptions}
            placeholder={currentAgentUsername || 'Select an agent'}
            isLoading={isLoadingAgents}
            disabled={isLoadingAgents}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onAssign}
            isLoading={isAssigningAgent}
            disabled={!selectedAgentId || isLoadingAgents}
            variant="primary"
            size="sm"
            className="px-3 py-1.5 text-xs font-semibold"
          >
            Assign
          </Button>
          {currentAgentUsername ? (
            <Button
              type="button"
              onClick={onRemove}
              isLoading={isRemovingAgent}
              disabled={isRemovingAgent}
              variant="danger"
              size="sm"
              className="px-3 py-1.5 text-xs font-semibold"
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </PlayerDetailPanel>
  );
}
