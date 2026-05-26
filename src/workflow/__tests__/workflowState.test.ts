import { describe, expect, it } from 'vitest';

import { DRAFT_TEMPLATE_SETTINGS, createDefaultProject } from '../../constants';
import { createWorkflowState } from '../workflowState';

import type { ManagedFile, Project, QAResult } from '../../types';

const createQaResult = (): QAResult => ({
  readinessPercentage: 64,
  status: 'needs-review',
  checks: [],
  criticalPassed: false,
});

const createProjectWithBrief = (subjects = [{ id: 'moon', name: 'Moon' }]): Project => ({
  ...createDefaultProject(),
  settings: {
    ...DRAFT_TEMPLATE_SETTINGS,
    title: 'Moon Printable Masks, 1 Kids Paper Mask, Party Craft',
  },
  lastBriefUpdatedAt: '2026-05-25T10:00:00.000Z',
  subjects,
});

const createApprovedImage = (
  subjectId: string,
  name = 'moon.png',
  sourceFileId?: string,
): ManagedFile => {
  const file = new File(['image'], name, { type: 'image/png' });

  return {
    id: name,
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-25T10:00:00.000Z',
    kind: 'uploaded',
    assetVariant: file.name.endsWith('-coloring-page.png') ? 'coloring-page' : 'color',
    ...(sourceFileId ? { sourceFileId } : {}),
    reviewState: 'approved',
    reviewNotes: '',
    mappedSubjectId: subjectId,
    explicitlyConfirmed: true,
  };
};

describe('workflow state', () => {
  it('keeps the workflow source of truth in one selector', () => {
    const project = createProjectWithBrief();
    const workflow = createWorkflowState({
      project,
      files: [],
      qaResult: createQaResult(),
      hasAIProvider: false,
      activeStepId: 'brief',
    });

    expect(workflow.topicsComplete).toBe(true);
    expect(workflow.imagesComplete).toBe(false);
    expect(workflow.nextAction).toBe('Configure the Cloud OpenAI proxy before generating images.');
    expect(workflow.stepperItems.map((step) => step.status)).toEqual([
      'active',
      'available',
      'locked',
      'locked',
    ]);
  });

  it('unlocks export after every topic has an approved image and coloring page', () => {
    const project = createProjectWithBrief();
    const workflow = createWorkflowState({
      project,
      files: [
        createApprovedImage('moon', 'moon.png'),
        createApprovedImage('moon', 'moon-coloring-page.png', 'moon.png'),
      ],
      qaResult: createQaResult(),
      hasAIProvider: true,
      activeStepId: 'export',
    });

    expect(workflow.imagesComplete).toBe(true);
    expect(workflow.canExportFinalFiles).toBe(true);
    expect(workflow.getStepState('export')).toBe('active');
  });

  it('unlocks export for a partial approved image set', () => {
    const project = createProjectWithBrief([
      { id: 'moon', name: 'Moon' },
      { id: 'sun', name: 'Sun' },
    ]);
    const workflow = createWorkflowState({
      project,
      files: [createApprovedImage('moon', 'moon.png')],
      qaResult: createQaResult(),
      hasAIProvider: true,
      activeStepId: 'export',
    });

    expect(workflow.imagesComplete).toBe(false);
    expect(workflow.marketingUnlocked).toBe(true);
    expect(workflow.canExportFinalFiles).toBe(true);
    expect(workflow.visibleActiveStepId).toBe('export');
    expect(workflow.getStepState('export')).toBe('active');
    expect(workflow.nextAction).toBe(
      'Export available files, or finish missing images and coloring pages.',
    );
  });

  it('keeps partial export available when the coloring page belongs to an older color mask', () => {
    const project = createProjectWithBrief();
    const workflow = createWorkflowState({
      project,
      files: [
        createApprovedImage('moon', 'moon-v2.png'),
        createApprovedImage('moon', 'moon-coloring-page.png', 'moon-v1.png'),
      ],
      qaResult: createQaResult(),
      hasAIProvider: true,
      activeStepId: 'export',
    });

    expect(workflow.approvedColoringPageCount).toBe(0);
    expect(workflow.imagesComplete).toBe(false);
    expect(workflow.canExportFinalFiles).toBe(true);
    expect(workflow.visibleActiveStepId).toBe('export');
  });
});
