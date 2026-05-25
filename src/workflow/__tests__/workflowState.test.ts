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

const createProjectWithBrief = (): Project => ({
  ...createDefaultProject(),
  settings: {
    ...DRAFT_TEMPLATE_SETTINGS,
    title: 'Moon Printable Masks, 1 Kids Paper Mask, Party Craft',
  },
  lastBriefUpdatedAt: '2026-05-25T10:00:00.000Z',
  subjects: [{ id: 'moon', name: 'Moon' }],
});

const createApprovedImage = (subjectId: string): ManagedFile => {
  const file = new File(['image'], 'moon.png', { type: 'image/png' });

  return {
    id: 'file',
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-25T10:00:00.000Z',
    kind: 'uploaded',
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
      hasOpenAIKey: false,
      activeStepId: 'brief',
    });

    expect(workflow.topicsComplete).toBe(true);
    expect(workflow.imagesComplete).toBe(false);
    expect(workflow.nextAction).toBe('Add an OpenAI key in Settings or upload images.');
    expect(workflow.stepperItems.map((step) => step.status)).toEqual([
      'active',
      'complete',
      'available',
      'locked',
      'locked',
    ]);
  });

  it('unlocks outputs after every topic has an approved image', () => {
    const project = createProjectWithBrief();
    const workflow = createWorkflowState({
      project,
      files: [createApprovedImage('moon')],
      qaResult: createQaResult(),
      hasOpenAIKey: true,
      activeStepId: 'outputs',
    });

    expect(workflow.imagesComplete).toBe(true);
    expect(workflow.canGenerateOutputs).toBe(true);
    expect(workflow.getStepState('outputs')).toBe('active');
  });
});
