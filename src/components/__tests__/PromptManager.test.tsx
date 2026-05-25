import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '../../constants';
import { createPromptItems } from '../../lib/files';
import { ProductBriefForm } from '../ProductBriefForm';
import { PromptManager } from '../PromptManager';
import { QAPanel } from '../QAPanel';

import type { SubjectItem, ProjectSettings, QAResult } from '../../types';

const subjects: SubjectItem[] = [{ id: 'lion', name: 'Lion' }];

describe('PromptManager', () => {
  it('renders expected filename on a prompt card', () => {
    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[]}
        canGenerateImages={false}
        generatingSubjectId={null}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        onNotesChange={vi.fn()}
        onConfirmReview={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('lion.png')).toBeInTheDocument();
    expect(screen.getByText(/white background/i)).toBeInTheDocument();
  });
});

describe('QAPanel', () => {
  it('renders critical checks', () => {
    const result: QAResult = {
      readinessPercentage: 50,
      status: 'needs-review',
      criticalPassed: false,
      checks: [
        {
          id: 'approved-images',
          group: 'critical',
          label: 'Every mask topic has an approved mapped image',
          status: 'fail',
          details: '0 of 1 topics have approved mapped images.',
        },
      ],
    };

    render(<QAPanel result={result} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Every mask topic has an approved mapped image')).toBeInTheDocument();
  });
});

describe('ProductBriefForm', () => {
  it('emits updated project settings when title changes', () => {
    const onChange = vi.fn<(settings: ProjectSettings) => void>();
    render(<ProductBriefForm settings={DEFAULT_SETTINGS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New bundle title' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      title: 'New bundle title',
    });
  });
});
