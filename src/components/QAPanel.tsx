import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card, CardBody, CardHeader } from './ui/Card';
import { StatCard } from './ui/StatCard';
import { Surface } from './ui/Surface';

import type { QAGroup, QAResult } from '../types';

type QAPanelProps = {
  result: QAResult;
};

const groupLabels: Record<QAGroup, string> = {
  critical: 'Critical',
  warning: 'Warnings',
  informational: 'Informational',
};

const statusTone = {
  pass: 'success',
  fail: 'danger',
  info: 'info',
} as const;

export const QAPanel = ({ result }: QAPanelProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const criticalIssues = result.checks.filter(
    (check) => check.group === 'critical' && check.status === 'fail',
  ).length;
  const warningIssues = result.checks.filter(
    (check) => check.group === 'warning' && check.status === 'fail',
  ).length;
  const passedCount = result.checks.filter((check) => check.status === 'pass').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink-strong">QA readiness</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {result.criticalPassed ? 'Critical checks pass.' : 'Critical checks need attention.'}
            </p>
          </div>
          <Badge tone={result.status === 'etsy-ready' ? 'success' : 'warning'}>
            {result.status}
          </Badge>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <dl className="grid grid-cols-2 gap-2 text-sm xl:grid-cols-4">
          <StatCard label="Ready" value={`${result.readinessPercentage}%`} />
          <StatCard label="Critical issues" value={criticalIssues} />
          <StatCard label="Warnings" value={warningIssues} />
          <StatCard label="Passed" value={`${passedCount}/${result.checks.length}`} />
        </dl>
        <Button
          className="w-full gap-2"
          variant="ghost"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((isOpen) => !isOpen)}
        >
          {detailsOpen ? 'Hide QA details' : 'Show QA details'}
          <ChevronDown
            aria-hidden="true"
            className={`transition ${detailsOpen ? 'rotate-180' : ''}`}
            size={16}
          />
        </Button>
        {detailsOpen ? (
          <div id={detailsId} className="space-y-5">
            {(['critical', 'warning', 'informational'] as QAGroup[]).map((group) => (
              <div key={group}>
                <h3 className="text-sm font-bold text-ink-strong">{groupLabels[group]}</h3>
                <ul className="mt-2 space-y-2">
                  {result.checks
                    .filter((check) => check.group === group)
                    .map((check) => (
                      <Surface as="li" key={check.id} variant="muted" className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-strong">{check.label}</p>
                          <Badge tone={statusTone[check.status]}>{check.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-ink-muted">{check.details}</p>
                      </Surface>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};
