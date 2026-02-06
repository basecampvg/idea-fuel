'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PREDEFINED_SECTIONS } from '@forge/shared';
import {
  Plus,
  GripVertical,
  Trash2,
  StickyNote,
  Lightbulb,
  Link2,
  LayoutGrid,
  ChevronDown,
  Pencil,
  Check,
} from 'lucide-react';

// Types matching the shared CanvasBlock types
interface BlockBase {
  id: string;
  type: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface SectionBlock extends BlockBase {
  type: 'section';
  sectionType: string;
  title: string;
  content: string;
}

interface NoteBlock extends BlockBase {
  type: 'note';
  content: string;
}

interface SubIdeaBlock extends BlockBase {
  type: 'subIdea';
  title: string;
  description: string;
}

interface LinkBlock extends BlockBase {
  type: 'link';
  url: string;
  title?: string;
  description?: string;
}

type CanvasBlock = SectionBlock | NoteBlock | SubIdeaBlock | LinkBlock;

interface CanvasEditorProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    canvas: unknown;
    ideas: { id: string; status: string }[];
  };
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export function CanvasEditor({ project }: CanvasEditorProps) {
  const rawBlocks = Array.isArray(project.canvas) ? (project.canvas as CanvasBlock[]) : [];
  const [blocks, setBlocks] = useState<CanvasBlock[]>(rawBlocks.sort((a, b) => a.order - b.order));
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(project.title);
  const [descValue, setDescValue] = useState(project.description || '');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const updateCanvas = trpc.project.updateCanvas.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
    },
  });
  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: project.id });
      utils.project.list.invalidate();
    },
  });

  // Debounced auto-save for canvas blocks
  const saveBlocks = useCallback(
    (newBlocks: CanvasBlock[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateCanvas.mutate({ id: project.id, blocks: newBlocks });
      }, 1500);
    },
    [project.id, updateCanvas]
  );

  // Update blocks and trigger auto-save
  const updateBlocks = useCallback(
    (newBlocks: CanvasBlock[]) => {
      setBlocks(newBlocks);
      saveBlocks(newBlocks);
    },
    [saveBlocks]
  );

  // Save title/description
  const saveTitle = () => {
    setEditingTitle(false);
    if (titleValue.trim() !== project.title || descValue !== (project.description || '')) {
      updateProject.mutate({
        id: project.id,
        data: {
          title: titleValue.trim() || 'Untitled Project',
          description: descValue || undefined,
        },
      });
    }
  };

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  // Add block helpers
  const addSection = (sectionType: string, title: string) => {
    const block: SectionBlock = {
      id: generateId(),
      type: 'section',
      order: blocks.length,
      sectionType,
      title,
      content: '',
      createdAt: now(),
      updatedAt: now(),
    };
    updateBlocks([...blocks, block]);
    setShowAddMenu(false);
  };

  const addNote = () => {
    const block: NoteBlock = {
      id: generateId(),
      type: 'note',
      order: blocks.length,
      content: '',
      createdAt: now(),
      updatedAt: now(),
    };
    updateBlocks([...blocks, block]);
    setShowAddMenu(false);
  };

  const addSubIdea = () => {
    const block: SubIdeaBlock = {
      id: generateId(),
      type: 'subIdea',
      order: blocks.length,
      title: '',
      description: '',
      createdAt: now(),
      updatedAt: now(),
    };
    updateBlocks([...blocks, block]);
    setShowAddMenu(false);
  };

  const addLink = () => {
    const block: LinkBlock = {
      id: generateId(),
      type: 'link',
      order: blocks.length,
      url: '',
      title: '',
      description: '',
      createdAt: now(),
      updatedAt: now(),
    };
    updateBlocks([...blocks, block]);
    setShowAddMenu(false);
  };

  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i }));
    updateBlocks(newBlocks);
  };

  const updateBlock = (id: string, updates: Partial<CanvasBlock>) => {
    const newBlocks = blocks.map((b) =>
      b.id === id ? { ...b, ...updates, updatedAt: now() } : b
    ) as CanvasBlock[];
    updateBlocks(newBlocks);
  };

  const hasIdea = project.ideas.length > 0;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        {editingTitle ? (
          <div className="space-y-3">
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') {
                  setTitleValue(project.title);
                  setEditingTitle(false);
                }
              }}
              className="text-2xl font-semibold text-foreground bg-transparent border-b-2 border-primary outline-none w-full pb-1"
              placeholder="Project title..."
            />
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              className="w-full text-sm text-muted-foreground bg-transparent border border-border rounded-lg p-3 outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="Brief description (optional)"
            />
            <button
              onClick={saveTitle}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        ) : (
          <div className="group cursor-pointer" onClick={() => setEditingTitle(true)}>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{project.title}</h1>
              <Pencil className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {project.description && (
              <p className="mt-1.5 text-sm text-muted-foreground/60">{project.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Idea Quick-Create (when no idea exists) */}
      {!hasIdea && (
        <IdeaPrompt projectId={project.id} />
      )}

      {/* Canvas Blocks */}
      <div className="space-y-3">
        {blocks.map((block) => (
          <div key={block.id} className="group relative">
            <div className="absolute -left-8 top-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
              <GripVertical className="w-4 h-4 text-muted-foreground/40" />
            </div>
            <div className="absolute -right-8 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => removeBlock(block.id)}
                className="p-1 rounded text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {block.type === 'section' && (
              <SectionBlockEditor block={block as SectionBlock} onUpdate={(u) => updateBlock(block.id, u)} />
            )}
            {block.type === 'note' && (
              <NoteBlockEditor block={block as NoteBlock} onUpdate={(u) => updateBlock(block.id, u)} />
            )}
            {block.type === 'subIdea' && (
              <SubIdeaBlockEditor block={block as SubIdeaBlock} onUpdate={(u) => updateBlock(block.id, u)} />
            )}
            {block.type === 'link' && (
              <LinkBlockEditor block={block as LinkBlock} onUpdate={(u) => updateBlock(block.id, u)} />
            )}
          </div>
        ))}
      </div>

      {/* Add Block Button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="
            w-full py-3 rounded-xl border-2 border-dashed border-border
            text-sm text-muted-foreground/60 hover:text-foreground hover:border-primary/30
            flex items-center justify-center gap-2
            transition-all
          "
        >
          <Plus className="w-4 h-4" />
          Add to canvas
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
        </button>

        {showAddMenu && (
          <AddBlockMenu
            onAddSection={addSection}
            onAddNote={addNote}
            onAddSubIdea={addSubIdea}
            onAddLink={addLink}
            onClose={() => setShowAddMenu(false)}
          />
        )}
      </div>

      {/* Save indicator */}
      {updateCanvas.isPending && (
        <div className="fixed bottom-4 right-4 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground animate-pulse">
          Saving...
        </div>
      )}
    </div>
  );
}

// ─── Idea Prompt ─────────────────────────────────────────────
function IdeaPrompt({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();
  const createIdea = trpc.idea.create.useMutation({
    onSuccess: () => {
      utils.project.get.invalidate({ id: projectId });
      utils.project.list.invalidate();
      setTitle('');
      setDescription('');
      setIsOpen(false);
    },
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="
          w-full py-4 rounded-xl border border-primary/20 bg-primary/5
          text-sm text-primary hover:bg-primary/10
          flex items-center justify-center gap-2
          transition-all
        "
      >
        <Lightbulb className="w-4 h-4" />
        Add your idea to start the pipeline
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Lightbulb className="w-4 h-4" />
        Add Idea
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's your business idea?"
        className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
        autoFocus
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe it in a few sentences (min 10 characters)..."
        className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 outline-none focus:border-primary resize-none"
        rows={3}
      />
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(false)}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (title.trim() && description.trim().length >= 10) {
              createIdea.mutate({ title: title.trim(), description: description.trim(), projectId });
            }
          }}
          disabled={!title.trim() || description.trim().length < 10 || createIdea.isPending}
          className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50 transition-colors"
        >
          {createIdea.isPending ? 'Creating...' : 'Create Idea'}
        </button>
      </div>
    </div>
  );
}

// ─── Add Block Menu ──────────────────────────────────────────
function AddBlockMenu({
  onAddSection,
  onAddNote,
  onAddSubIdea,
  onAddLink,
  onClose,
}: {
  onAddSection: (type: string, title: string) => void;
  onAddNote: () => void;
  onAddSubIdea: () => void;
  onAddLink: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-card border border-border rounded-xl shadow-xl p-3 space-y-1">
        {/* Predefined Sections */}
        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Sections
        </div>
        {PREDEFINED_SECTIONS.map((section) => (
          <button
            key={section.type}
            onClick={() => onAddSection(section.type, section.title)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
          >
            <LayoutGrid className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium">{section.title}</div>
              <div className="text-xs text-muted-foreground/60">{section.description}</div>
            </div>
          </button>
        ))}
        <button
          onClick={() => onAddSection('custom', 'Custom Section')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
        >
          <LayoutGrid className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">Custom Section</div>
            <div className="text-xs text-muted-foreground/60">Add your own section</div>
          </div>
        </button>

        <div className="my-2 h-px bg-border" />

        {/* Other block types */}
        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Other
        </div>
        <button
          onClick={onAddNote}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
        >
          <StickyNote className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">Note</div>
            <div className="text-xs text-muted-foreground/60">Free-form text</div>
          </div>
        </button>
        <button
          onClick={onAddSubIdea}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
        >
          <Lightbulb className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">Sub-Idea</div>
            <div className="text-xs text-muted-foreground/60">A related idea or variant</div>
          </div>
        </button>
        <button
          onClick={onAddLink}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
        >
          <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <div className="font-medium">Link</div>
            <div className="text-xs text-muted-foreground/60">Reference URL</div>
          </div>
        </button>
      </div>
    </>
  );
}

// ─── Block Editors ───────────────────────────────────────────

function SectionBlockEditor({ block, onUpdate }: { block: SectionBlock; onUpdate: (u: Partial<SectionBlock>) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
      <input
        type="text"
        value={block.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className="text-sm font-semibold text-foreground bg-transparent outline-none w-full"
        placeholder="Section title..."
      />
      <textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        className="w-full text-sm text-foreground/80 bg-transparent outline-none resize-none min-h-[60px]"
        placeholder="Write your thoughts..."
        rows={3}
      />
    </div>
  );
}

function NoteBlockEditor({ block, onUpdate }: { block: NoteBlock; onUpdate: (u: Partial<NoteBlock>) => void }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-1.5 text-xs text-amber-500/70 mb-2">
        <StickyNote className="w-3.5 h-3.5" />
        <span>Note</span>
      </div>
      <textarea
        value={block.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        className="w-full text-sm text-foreground/80 bg-transparent outline-none resize-none min-h-[40px]"
        placeholder="Jot down a note..."
        rows={2}
      />
    </div>
  );
}

function SubIdeaBlockEditor({ block, onUpdate }: { block: SubIdeaBlock; onUpdate: (u: Partial<SubIdeaBlock>) => void }) {
  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-purple-500/70 mb-1">
        <Lightbulb className="w-3.5 h-3.5" />
        <span>Sub-Idea</span>
      </div>
      <input
        type="text"
        value={block.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className="text-sm font-semibold text-foreground bg-transparent outline-none w-full"
        placeholder="Sub-idea title..."
      />
      <textarea
        value={block.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        className="w-full text-sm text-foreground/80 bg-transparent outline-none resize-none min-h-[40px]"
        placeholder="Describe this idea..."
        rows={2}
      />
    </div>
  );
}

function LinkBlockEditor({ block, onUpdate }: { block: LinkBlock; onUpdate: (u: Partial<LinkBlock>) => void }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-blue-500/70 mb-1">
        <Link2 className="w-3.5 h-3.5" />
        <span>Reference Link</span>
      </div>
      <input
        type="url"
        value={block.url}
        onChange={(e) => onUpdate({ url: e.target.value })}
        className="text-sm text-foreground bg-transparent outline-none w-full font-mono"
        placeholder="https://..."
      />
      <input
        type="text"
        value={block.title || ''}
        onChange={(e) => onUpdate({ title: e.target.value })}
        className="text-sm text-foreground/80 bg-transparent outline-none w-full"
        placeholder="Link title (optional)"
      />
    </div>
  );
}
