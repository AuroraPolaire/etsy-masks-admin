import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultProject } from '../../constants';
import { MarketingAssetsPanel } from '../MarketingAssetsPanel';

import type { ManagedFile, Project } from '../../types';

const createProject = (): Project => ({
  ...createDefaultProject(),
  settings: {
    ...createDefaultProject().settings,
    title: 'Dinosaur Printable Masks',
    theme: 'Dinosaur masks',
  },
  subjects: [{ id: 'dino', name: 'Dinosaur' }],
  lastBriefUpdatedAt: '2026-05-26T10:00:00.000Z',
});

const createFile = (overrides: Partial<ManagedFile>): ManagedFile => {
  const file = new File(['image'], overrides.name ?? 'dinosaur.png', { type: 'image/png' });

  return {
    id: overrides.id ?? 'file-1',
    file,
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: file.type,
    addedAt: '2026-05-26T10:00:00.000Z',
    kind: 'uploaded',
    assetVariant: 'color',
    reviewState: 'approved',
    reviewNotes: '',
    mappedSubjectId: 'dino',
    explicitlyConfirmed: true,
    imageMetadata: { width: 3000, height: 3000 },
    ...overrides,
  };
};

describe('MarketingAssetsPanel', () => {
  it('unlocks generation controls from approved masks', () => {
    const project = createProject();

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' })]}
        hasAIProvider
        busyAction={null}
        onMarketingSettingsChange={vi.fn()}
        onGenerateSloganPreviews={vi.fn()}
        onFinalizeSloganPoster={vi.fn()}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onFinalizeChildrenScene={vi.fn()}
        onApprovePreview={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByText('1 approved source mask')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate mask sheet' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: 'Generate 3 previews' })[0]).toBeEnabled();
  });

  it('updates the marketing slogan from the main workflow panel', () => {
    const project = createProject();
    const onMarketingSettingsChange = vi.fn();

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' })]}
        hasAIProvider
        busyAction={null}
        onMarketingSettingsChange={onMarketingSettingsChange}
        onGenerateSloganPreviews={vi.fn()}
        onFinalizeSloganPoster={vi.fn()}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onFinalizeChildrenScene={vi.fn()}
        onApprovePreview={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Marketing slogan/ }), {
      target: { value: 'Dinosaur masks for classroom parties' },
    });

    expect(onMarketingSettingsChange).toHaveBeenCalledWith({
      ...project.marketingSettings,
      slogan: 'Dinosaur masks for classroom parties',
    });
  });

  it('approves one preview option and requests final generation', () => {
    const project = createProject();
    const onApprovePreview = vi.fn();
    const onFinalizeSloganPoster = vi.fn();
    const preview = createFile({
      id: 'slogan-preview',
      name: 'slogan-preview.png',
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      reviewState: 'pending',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'preview',
        optionIndex: 0,
        recipeId: 'slogan-1',
        sourceFileIds: ['dino-mask'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: project.marketingSettings.final,
      },
    });

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' }), preview]}
        hasAIProvider
        busyAction={null}
        onMarketingSettingsChange={vi.fn()}
        onGenerateSloganPreviews={vi.fn()}
        onFinalizeSloganPoster={onFinalizeSloganPoster}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onFinalizeChildrenScene={vi.fn()}
        onApprovePreview={onApprovePreview}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use option' }));

    expect(onApprovePreview).toHaveBeenCalledWith('slogan-preview');
    expect(onFinalizeSloganPoster).toHaveBeenCalledWith('slogan-preview');
  });
});
