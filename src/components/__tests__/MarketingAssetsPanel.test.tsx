import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultProject } from '../../constants';
import { MarketingAssetsPanel } from '../MarketingAssetsPanel';

import type { ManagedFile, Project } from '../../types';

const defaultSubjects = [{ id: 'dino', name: 'Dinosaur' }];

const createProject = (subjects = defaultSubjects): Project => ({
  ...createDefaultProject(),
  settings: {
    ...createDefaultProject().settings,
    title: 'Dinosaur Printable Masks',
    theme: 'Dinosaur masks',
  },
  subjects,
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

  it('allows selecting three current children scene masks while ignoring stale saved selections', () => {
    const subjects = [
      { id: 'dino-1', name: 'Dino 1' },
      { id: 'dino-2', name: 'Dino 2' },
      { id: 'dino-3', name: 'Dino 3' },
      { id: 'dino-4', name: 'Dino 4' },
    ];
    const initialProject = {
      ...createProject(subjects),
      marketingSettings: {
        ...createProject(subjects).marketingSettings,
        childrenSceneSubjectIds: ['stale-mask-a', 'stale-mask-b'],
      },
    };
    const files = subjects.map((subject, index) =>
      createFile({
        id: `mask-${index + 1}`,
        name: `${subject.id}.png`,
        mappedSubjectId: subject.id,
      }),
    );

    const TestPanel = () => {
      const [project, setProject] = useState<Project>(initialProject);

      return (
        <MarketingAssetsPanel
          project={project}
          files={files}
          hasAIProvider
          busyAction={null}
          onMarketingSettingsChange={(marketingSettings) =>
            setProject((currentProject) => ({ ...currentProject, marketingSettings }))
          }
          onGenerateSloganPreviews={vi.fn()}
          onFinalizeSloganPoster={vi.fn()}
          onGenerateMaskSheets={vi.fn()}
          onGenerateChildrenScenePreviews={vi.fn()}
          onFinalizeChildrenScene={vi.fn()}
          onApprovePreview={vi.fn()}
          onDeleteFile={vi.fn()}
        />
      );
    };

    render(<TestPanel />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Dino 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dino 2' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Dino 3' }));

    expect(screen.getByRole('checkbox', { name: 'Dino 1' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dino 2' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dino 3' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dino 4' })).toBeDisabled();
  });
});
