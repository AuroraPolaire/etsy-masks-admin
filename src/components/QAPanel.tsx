import { ChevronDown, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { Surface } from './ui/Surface';

import type { QAGroup, QAResult } from '../types';

type QAPanelProps = {
  result: QAResult;
  canAnalyzeWithAI?: boolean;
  isAnalyzing?: boolean;
  onAnalyzeWithAI?: () => void;
};

const groupLabels: Record<QAGroup, string> = {
  critical: 'Critical',
  warning: 'Warnings',
  informational: 'Informational',
};

const groupPriority: Record<QAGroup, number> = {
  critical: 0,
  warning: 1,
  informational: 2,
};

const statusTone = {
  pass: 'success',
  fail: 'danger',
  info: 'info',
} as const;

export const QAPanel = ({
  result,
  canAnalyzeWithAI = false,
  isAnalyzing = false,
  onAnalyzeWithAI,
}: QAPanelProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const criticalIssues = result.checks.filter(
    (check) => check.group === 'critical' && check.status === 'fail',
  ).length;
  const warningIssues = result.checks.filter(
    (check) => check.group === 'warning' && check.status === 'fail',
  ).length;
  const passedCount = result.checks.filter((check) => check.status === 'pass').length;
  const requiredChecks = result.checks.filter((check) => check.group !== 'informational');
  const requiredPassedCount = requiredChecks.filter((check) => check.status === 'pass').length;
  const tipCount = result.checks.length - requiredChecks.length;
  const failedChecks = result.checks
    .filter((check) => check.status === 'fail')
    .sort((first, second) => groupPriority[first.group] - groupPriority[second.group]);
  const informationalChecks = result.checks.filter((check) => check.status === 'info');
  const passedChecks = result.checks.filter((check) => check.status === 'pass');
  const priorityChecks = [...failedChecks, ...informationalChecks];
  const renderCheck = (check: QAResult['checks'][number]) => (
    <Surface as="li" key={check.id} variant="muted" className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-strong">{check.label}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase text-ink-muted">
            {groupLabels[check.group]}
          </p>
        </div>
        <Badge tone={statusTone[check.status]}>{check.status}</Badge>
      </div>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{check.details}</p>
    </Surface>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink-strong">QA readiness</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {result.criticalPassed
                ? tipCount > 0
                  ? 'Required checks pass. Tips may remain.'
                  : 'Required checks pass.'
                : 'Required checks need fixes.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={result.status === 'etsy-ready' ? 'success' : 'warning'}>
              {result.status}
            </Badge>
            {onAnalyzeWithAI ? (
              <Button disabled={!canAnalyzeWithAI || isAnalyzing} onClick={onAnalyzeWithAI}>
                <Sparkles aria-hidden="true" className="mr-2" size={17} />
                {isAnalyzing ? 'Reviewing...' : 'Run AI review'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
          <StatCard label="Readiness" value={`${result.readinessPercentage}%`} />
          <StatCard label="Blockers" value={criticalIssues} />
          <StatCard label="Warnings" value={warningIssues} />
          <StatCard
            label="Required checks"
            value={`${requiredPassedCount}/${requiredChecks.length}`}
          />
        </dl>
        {tipCount > 0 ? (
          <p className="text-xs text-ink-muted">
            {passedCount}/{result.checks.length} total checks passed, including {tipCount}{' '}
            informational tip{tipCount === 1 ? '' : 's'}.
          </p>
        ) : null}
        <Button
          className="w-full gap-2"
          variant="ghost"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((isOpen) => !isOpen)}
        >
          {detailsOpen ? 'Hide QA checks' : 'Show QA checks'}
          <ChevronDown
            aria-hidden="true"
            className={`transition ${detailsOpen ? 'rotate-180' : ''}`}
            size={16}
          />
        </Button>
        {detailsOpen ? (
          <div id={detailsId} className="space-y-5">
            {priorityChecks.length > 0 ? (
              <div>
                <h3 className="text-sm font-bold text-ink-strong">Needs attention first</h3>
                <ul className="mt-2 space-y-2">{priorityChecks.map(renderCheck)}</ul>
              </div>
            ) : (
              <Surface variant="muted" className="p-3">
                <p className="text-sm font-semibold text-ink-strong">No failed QA checks</p>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  Passed checks are collapsed below to keep this section compact.
                </p>
              </Surface>
            )}
            {passedChecks.length > 0 ? (
              <details className="rounded-control border border-surface-outline bg-surface-raised">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink-strong">
                  Passed checks ({passedChecks.length})
                </summary>
                <ul className="space-y-2 border-t border-surface-outline p-3">
                  {passedChecks.map(renderCheck)}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};
