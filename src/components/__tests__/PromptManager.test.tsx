import { fireEvent, render, screen } from '@testing-library/react';
import { FileInput } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPENAI_IMAGE_SETTINGS, DEFAULT_SETTINGS } from '../../constants';
import { createPromptItems } from '../../lib/files';
import { EtsySeoPanel } from '../EtsySeoPanel';
import { InitialPromptPanel } from '../InitialPromptPanel';
import { ProductBriefForm } from '../ProductBriefForm';
import { PromptManager } from '../PromptManager';
import { QAPanel } from '../QAPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FileInputButton } from '../ui/FileInputButton';

import type { ManagedFile, Project, SubjectItem, ProjectSettings, QAResult } from '../../types';

const subjects: SubjectItem[] = [{ id: 'lion', name: 'Lion' }];

describe('PromptManager', () => {
  it('renders expected filename on a prompt card', () => {
    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[]}
        canGenerateImages={false}
        generatingSubjectIds={[]}
        generatingColoringPageSubjectIds={[]}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onApproveAll={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        onNotesChange={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByText('lion.png')).toBeInTheDocument();
    expect(screen.getByText(/white background/i)).toBeInTheDocument();
    expect(screen.getByText('Needs image')).toBeInTheDocument();
    expect(screen.queryByText(/filename match/i)).not.toBeInTheDocument();
  });

  it('hides topic editing controls when topic editing is disabled', () => {
    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[]}
        canGenerateImages={false}
        generatingSubjectIds={[]}
        generatingColoringPageSubjectIds={[]}
        allowTopicEditing={false}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onApproveAll={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        onNotesChange={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Add topic')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Lion')).not.toBeInTheDocument();
  });

  it('approves all review-ready prompt images', () => {
    const onApproveAll = vi.fn();
    const pendingImage: ManagedFile = {
      id: 'lion-file',
      file: new File(['image'], 'lion.png', { type: 'image/png' }),
      name: 'lion.png',
      originalName: 'lion.png',
      size: 5,
      type: 'image/png',
      addedAt: '2026-05-26T08:00:00.000Z',
      kind: 'uploaded',
      assetVariant: 'color',
      reviewState: 'pending',
      reviewNotes: '',
      mappedSubjectId: 'lion',
      explicitlyConfirmed: false,
    };

    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[pendingImage]}
        canGenerateImages={false}
        generatingSubjectIds={[]}
        generatingColoringPageSubjectIds={[]}
        allowTopicEditing={false}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onApproveAll={onApproveAll}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        onNotesChange={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /approve all/i }));

    expect(onApproveAll).toHaveBeenCalledWith(['lion-file']);
  });
});

describe('QAPanel', () => {
  it('summarizes QA and expands critical checks', () => {
    const result: QAResult = {
      readinessPercentage: 50,
      status: 'needs-review',
      criticalPassed: false,
      checks: [
        {
          id: 'approved-images',
          group: 'critical',
          label: 'Every topic has an approved image',
          status: 'fail',
          details: '0 of 1 topics have an approved image.',
        },
      ],
    };

    render(<QAPanel result={result} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Blockers')).toBeInTheDocument();
    expect(screen.queryByText('Every topic has an approved image')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show qa checks/i }));

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Every topic has an approved image')).toBeInTheDocument();
  });
});

describe('EtsySeoPanel', () => {
  it('summarizes Etsy SEO and keeps suggestions collapsed', () => {
    const project: Project = {
      id: 'project',
      settings: DEFAULT_SETTINGS,
      subjects,
      pdfSettings: {
        generateA4: true,
        generateUSLetter: true,
        maskScale: 'medium',
        showSubjectLabel: true,
        showInstructionFooter: true,
        pageMarginMm: 12,
        includeCalibrationPage: true,
      },
      openAIImageSettings: DEFAULT_OPENAI_IMAGE_SETTINGS,
      createdAt: '2026-05-25T10:00:00.000Z',
      updatedAt: '2026-05-25T10:00:00.000Z',
    };

    render(<EtsySeoPanel project={project} onChange={vi.fn()} />);

    expect(screen.getByText('Checks passed')).toBeInTheDocument();
    expect(screen.getByText('Title words')).toBeInTheDocument();
    expect(screen.queryByText('Suggested title')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show seo suggestions/i }));

    expect(screen.getByText('Suggested title')).toBeInTheDocument();
  });
});

describe('ProductBriefForm', () => {
  it('emits updated project settings when title changes', () => {
    const onChange = vi.fn<(settings: ProjectSettings) => void>();
    render(<ProductBriefForm settings={DEFAULT_SETTINGS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Listing title'), {
      target: { value: 'New bundle title' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      title: 'New bundle title',
    });
  });
});

describe('ConfirmDialog', () => {
  it('focuses the cancel action, closes on Escape, and restores focus on unmount', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Return focus</button>
      </>,
    );
    const returnButton = screen.getByRole('button', { name: 'Return focus' });
    returnButton.focus();

    rerender(
      <>
        <button type="button">Return focus</button>
        <ConfirmDialog
          open
          title="Clear files?"
          description="This removes uploaded and generated files from this browser session."
          confirmLabel="Clear files"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <button type="button">Return focus</button>
        <ConfirmDialog
          open={false}
          title="Clear files?"
          description="This removes uploaded and generated files from this browser session."
          confirmLabel="Clear files"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Return focus' })).toHaveFocus();
  });
});

describe('FileInputButton', () => {
  it('emits the selected file through a real button control', () => {
    const onFileSelected = vi.fn();
    const { container } = render(
      <FileInputButton
        icon={FileInput}
        label="Import project JSON"
        accept=".json,application/json"
        onFileSelected={onFileSelected}
      />,
    );
    const file = new File(['{}'], 'project.json', { type: 'application/json' });
    const input = container.querySelector('input[type="file"]');

    expect(screen.getByRole('button', { name: 'Import project JSON' })).toBeEnabled();
    expect(input).toBeInstanceOf(HTMLInputElement);

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });
});

describe('InitialPromptPanel', () => {
  it('shows the busy label while generating through backend AI', () => {
    render(
      <InitialPromptPanel aiReady={false} disabled={false} isGenerating onFillBrief={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Drafting brief...' })).toBeDisabled();
  });
});
