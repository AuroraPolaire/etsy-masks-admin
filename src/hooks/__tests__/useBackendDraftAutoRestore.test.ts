import { describe, expect, it } from 'vitest';

import { shouldRunBackendDraftDiscovery } from '../useBackendDraftAutoRestore';

describe('backend draft auto restore', () => {
  it('waits for the initial active draft restore before running discovery', () => {
    expect(
      shouldRunBackendDraftDiscovery({
        initialDraftRunId: 'run-1',
        activeDraftRunId: 'run-1',
        completedInitialRunId: '',
        currentProjectId: 'project-1',
        completedDiscoveryProjectId: '',
      }),
    ).toBe(false);
  });

  it('allows discovery after the project changes away from the initial active draft', () => {
    expect(
      shouldRunBackendDraftDiscovery({
        initialDraftRunId: 'run-1',
        activeDraftRunId: '',
        completedInitialRunId: '',
        currentProjectId: 'project-2',
        completedDiscoveryProjectId: '',
      }),
    ).toBe(true);
  });

  it('does not repeat discovery for the same project id', () => {
    expect(
      shouldRunBackendDraftDiscovery({
        initialDraftRunId: 'run-1',
        activeDraftRunId: '',
        completedInitialRunId: '',
        currentProjectId: 'project-2',
        completedDiscoveryProjectId: 'project-2',
      }),
    ).toBe(false);
  });
});
