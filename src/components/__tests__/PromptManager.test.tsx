import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FileInput } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_COLORING_PAGE_QUALITY,
  DEFAULT_MARKETING_SETTINGS,
  DEFAULT_OPENAI_IMAGE_SETTINGS,
  DEFAULT_SETTINGS,
} from '../../constants';
import { createPromptItems } from '../../lib/files';
import { initialPromptStyleTemplates } from '../../lib/styleTemplates';
import { EtsySeoPanel } from '../EtsySeoPanel';
import { InitialPromptPanel } from '../InitialPromptPanel';
import { ProductBriefForm } from '../ProductBriefForm';
import { PromptManager } from '../PromptManager';
import { QAPanel } from '../QAPanel';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FileInputButton } from '../ui/FileInputButton';

import type {
  BriefReferenceImage,
  ManagedFile,
  Project,
  SubjectItem,
  ProjectSettings,
  QAResult,
} from '../../types';

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
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getAllByText('lion.png').length).toBeGreaterThan(0);
    expect(screen.getByText(/white background/i)).toBeInTheDocument();
    expect(screen.getAllByText('Needs mask').length).toBeGreaterThan(0);
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
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Add mask topic')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Lion')).not.toBeInTheDocument();
  });

  it('treats generated prompt images as ready without an approval step', () => {
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
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Mask ready').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  it('renders generated images as full-size preview triggers', () => {
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
      objectUrl: 'blob:lion-preview',
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
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Open full-size color mask preview for Lion' }),
    ).toBeInTheDocument();
  });

  it('shows queue label for per-topic coloring page generation while another image job is running', () => {
    const onGenerateColoringPage = vi.fn();
    const approvedImage: ManagedFile = {
      id: 'lion-file',
      file: new File(['image'], 'lion.png', { type: 'image/png' }),
      name: 'lion.png',
      originalName: 'lion.png',
      size: 5,
      type: 'image/png',
      addedAt: '2026-05-26T08:00:00.000Z',
      kind: 'uploaded',
      assetVariant: 'color',
      reviewState: 'approved',
      reviewNotes: '',
      mappedSubjectId: 'lion',
      explicitlyConfirmed: true,
    };

    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[approvedImage]}
        canGenerateImages
        generatingSubjectIds={['other-subject']}
        generatingColoringPageSubjectIds={[]}
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={onGenerateColoringPage}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Queue coloring page' }));

    expect(onGenerateColoringPage).toHaveBeenCalledWith('lion');
  });

  it('shows queued state and disables per-topic generation buttons once queued', () => {
    const approvedImage: ManagedFile = {
      id: 'lion-file',
      file: new File(['image'], 'lion.png', { type: 'image/png' }),
      name: 'lion.png',
      originalName: 'lion.png',
      size: 5,
      type: 'image/png',
      addedAt: '2026-05-26T08:00:00.000Z',
      kind: 'uploaded',
      assetVariant: 'color',
      reviewState: 'approved',
      reviewNotes: '',
      mappedSubjectId: 'lion',
      explicitlyConfirmed: true,
    };

    render(
      <PromptManager
        subjects={subjects}
        prompts={createPromptItems(subjects)}
        files={[approvedImage]}
        canGenerateImages
        generatingSubjectIds={[]}
        generatingColoringPageSubjectIds={[]}
        queuedSubjectIds={['lion']}
        queuedColoringPageSubjectIds={['lion']}
        promptStyle=""
        onPromptStyleChange={vi.fn()}
        onAddSubject={vi.fn()}
        onRemoveSubject={vi.fn()}
        onGenerateImage={vi.fn()}
        onGenerateColoringPage={vi.fn()}
        onDelete={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    const queuedButtons = screen.getAllByRole('button', { name: 'Queued' });
    expect(queuedButtons).toHaveLength(2);
    queuedButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
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
          label: 'Every topic has a color mask',
          status: 'fail',
          details: '0 of 1 topics have a color mask.',
        },
      ],
    };

    render(<QAPanel result={result} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Blockers')).toBeInTheDocument();
    expect(screen.queryByText('Every topic has a color mask')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show qa checks/i }));

    expect(screen.getByText('Needs attention first')).toBeInTheDocument();
    expect(screen.getByText('Every topic has a color mask')).toBeInTheDocument();
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
      coloringPageQuality: DEFAULT_COLORING_PAGE_QUALITY,
      marketingSettings: DEFAULT_MARKETING_SETTINGS,
      createdAt: '2026-05-25T10:00:00.000Z',
      updatedAt: '2026-05-25T10:00:00.000Z',
      lastEtsySeoGeneratedAt: '2026-05-25T10:00:00.000Z',
      etsySeoAnalysis: {
        titleWordCount: 8,
        firstTitleSegment: 'Lion Printable Mask',
        tags: ['lion mask'],
        repeatedTitleWords: [],
        suggestedTitle: 'Lion Printable Mask, 1 Kids Paper Mask',
        suggestedTags: ['lion mask', 'kids mask'],
        suggestedDescription: 'Buyer-ready AI description.',
        checks: [
          {
            id: 'title-readable',
            group: 'warning',
            label: 'Title reads naturally',
            passed: true,
            details: 'The title is buyer-readable.',
          },
        ],
      },
    };

    render(
      <EtsySeoPanel
        project={project}
        canAnalyzeWithAI
        isAnalyzing={false}
        onAnalyzeWithAI={vi.fn()}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('SEO checks')).toBeInTheDocument();
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
          description="This removes generated files from this browser session."
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
          description="This removes generated files from this browser session."
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
  it('fills the bundle idea from the style prompt wizard', () => {
    const styleTemplate = initialPromptStyleTemplates[1];
    if (!styleTemplate) {
      throw new Error('Expected at least two style templates.');
    }

    render(
      <InitialPromptPanel
        aiReady
        disabled={false}
        isGenerating={false}
        onFillBrief={vi.fn()}
        onOpenBackendSaves={vi.fn()}
      />,
    );

    expect(screen.queryByText('Custom idea')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Style template' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open wizard' }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(styleTemplate.name) }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Bundle idea/theme'), {
      target: { value: 'Woodland animal masks for a preschool party' },
    });
    fireEvent.change(screen.getByLabelText('Topics'), {
      target: { value: 'Fox, owl, bear, deer' },
    });
    fireEvent.change(screen.getByLabelText('SEO/marketplace angle'), {
      target: { value: 'Printable digital download for Etsy party craft buyers' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review prompt' }));

    const finalPromptInput = screen.getByLabelText('Final prompt');
    expect(finalPromptInput).toBeInstanceOf(HTMLTextAreaElement);
    if (!(finalPromptInput instanceof HTMLTextAreaElement)) {
      throw new Error('Expected final prompt input to be a textarea.');
    }
    expect(finalPromptInput.value).toContain(`using a ${styleTemplate.name} visual preference`);

    fireEvent.click(screen.getByRole('button', { name: 'Apply prompt' }));

    const bundleIdeaInput = screen.getByLabelText('Bundle idea');
    expect(bundleIdeaInput).toBeInstanceOf(HTMLTextAreaElement);
    if (!(bundleIdeaInput instanceof HTMLTextAreaElement)) {
      throw new Error('Expected bundle idea input to be a textarea.');
    }
    expect(bundleIdeaInput.value).toContain('Topics: Fox, owl, bear, deer.');
    expect(bundleIdeaInput.value).toContain('SEO/marketplace angle: Printable digital download');
  });

  it('shows the busy label while generating through backend AI', () => {
    render(
      <InitialPromptPanel
        aiReady={false}
        disabled={false}
        isGenerating
        onFillBrief={vi.fn()}
        onOpenBackendSaves={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Drafting brief...' })).toBeDisabled();
  });

  it('passes attached reference images when drafting the bundle idea', async () => {
    const onFillBrief =
      vi.fn<(initialPrompt: string, referenceImages: BriefReferenceImage[]) => void>();
    const imageFile = new File(['reference image'], 'unicorn-reference.png', {
      type: 'image/png',
    });

    render(
      <InitialPromptPanel
        aiReady
        disabled={false}
        isGenerating={false}
        onFillBrief={onFillBrief}
        onOpenBackendSaves={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Bundle idea'), {
      target: { value: 'Unicorn birthday masks' },
    });
    fireEvent.change(screen.getByLabelText('Attach images'), {
      target: { files: [imageFile] },
    });

    expect(await screen.findByText('unicorn-reference.png')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Draft brief' }));

    await waitFor(() => {
      expect(onFillBrief).toHaveBeenCalledTimes(1);
    });

    const firstCall = onFillBrief.mock.calls[0];
    if (!firstCall) {
      throw new Error('Expected onFillBrief to be called.');
    }

    const [prompt, referenceImages] = firstCall;
    expect(prompt).toBe('Unicorn birthday masks');
    expect(referenceImages).toHaveLength(1);
    expect(referenceImages[0]).toMatchObject({
      name: 'unicorn-reference.png',
      mimeType: 'image/png',
      size: imageFile.size,
    });
    expect(referenceImages[0]?.dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
