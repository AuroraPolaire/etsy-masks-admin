import { Badge } from './ui/Badge';
import { Card, CardBody, CardHeader } from './ui/Card';
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

export const QAPanel = ({ result }: QAPanelProps) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink-strong">QA readiness</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {result.criticalPassed ? 'Critical checks pass.' : 'Critical checks need attention.'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-ink-strong">{result.readinessPercentage}%</p>
          <Badge tone={result.status === 'etsy-ready' ? 'success' : 'warning'}>
            {result.status}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardBody className="space-y-5">
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
    </CardBody>
  </Card>
);
