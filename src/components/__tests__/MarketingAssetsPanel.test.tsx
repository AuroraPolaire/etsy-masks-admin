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
  it('unlocks generation controls from ready masks', () => {
    const project = createProject();

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' })]}
        hasAIProvider
        busyAction={null}
        onMarketingSettingsChange={vi.fn()}
        onGenerateSloganPreviews={vi.fn()}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByText('1 ready source mask')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create mask sheets' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Generate 3 variations' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Generate 3 suggestions' })).toBeEnabled();
  });

  it('requires online AI for slogan generation but allows local mask sheet creation', () => {
    const project = createProject();

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' })]}
        hasAIProvider={false}
        busyAction={null}
        onMarketingSettingsChange={vi.fn()}
        onGenerateSloganPreviews={vi.fn()}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Create mask sheets' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Generate 3 variations' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Generate 3 suggestions' })).toBeDisabled();
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
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
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

  it('updates the additional prompt for future suggestion batches', () => {
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
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onDeleteFile={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /Additional prompt/ }), {
      target: { value: 'Use a printer table with warm daylight' },
    });

    expect(onMarketingSettingsChange).toHaveBeenCalledWith({
      ...project.marketingSettings,
      additionalPrompt: 'Use a printer table with warm daylight',
    });
  });

  it('shows saved marketing suggestions without requiring final approval', () => {
    const project = createProject();
    const onDeleteFile = vi.fn();
    const suggestion = createFile({
      id: 'slogan-suggestion',
      name: 'slogan-suggestion.png',
      kind: 'generated-preview',
      assetVariant: 'marketing-slogan',
      reviewState: 'approved',
      marketingAsset: {
        type: 'slogan-poster',
        stage: 'final',
        optionIndex: 0,
        recipeId: 'slogan-1',
        sourceFileIds: ['dino-mask'],
        generatedAt: '2026-05-26T10:00:00.000Z',
        generatedFromSettings: project.marketingSettings.preview.customSettings,
      },
    });

    render(
      <MarketingAssetsPanel
        project={project}
        files={[createFile({ id: 'dino-mask' }), suggestion]}
        hasAIProvider
        busyAction={null}
        onMarketingSettingsChange={vi.fn()}
        onGenerateSloganPreviews={vi.fn()}
        onGenerateMaskSheets={vi.fn()}
        onGenerateChildrenScenePreviews={vi.fn()}
        onDeleteFile={onDeleteFile}
      />,
    );

    expect(screen.getByText('Slogan suggestion 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use option' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onDeleteFile).toHaveBeenCalledWith('slogan-suggestion');
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
          onGenerateMaskSheets={vi.fn()}
          onGenerateChildrenScenePreviews={vi.fn()}
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
