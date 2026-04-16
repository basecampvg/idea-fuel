import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

const STORAGE_KEY = 'ideafuel_sketch_library';

export interface LocalSketch {
  id: string;
  localImagePath: string;
  remoteImageUrl: string;
  storagePath: string;
  templateType: 'app_page' | 'web_layout' | 'physical_object' | 'scene';
  description: string;
  features: string[];
  annotations: boolean;
  pinnedTo: { type: 'sandbox' | 'vault'; id: string; name: string } | null;
  createdAt: string;
}

const sketchDir = new Directory(Paths.document, 'sketches');

function ensureDir() {
  if (!sketchDir.exists) {
    sketchDir.create();
  }
}

// In-memory mutex serializing read-modify-write cycles on the sketch array.
// Without this, two concurrent saves/updates/deletes can both read the same
// snapshot and both write back — the later write silently drops the earlier
// mutation.
let writeChain: Promise<unknown> = Promise.resolve();
function withSketchLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.catch(() => {}).then(fn);
  writeChain = run.catch(() => {});
  return run;
}

async function readAllSketches(): Promise<LocalSketch[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as LocalSketch[];
}

export async function getAllSketches(): Promise<LocalSketch[]> {
  const sketches = await readAllSketches();
  return sketches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSketch(sketch: LocalSketch, imageUrl: string): Promise<LocalSketch> {
  ensureDir();

  // Try to download image to local file system
  let localPath = '';
  try {
    const destination = new File(sketchDir, `${sketch.id}.png`);
    const downloaded = await File.downloadFileAsync(imageUrl, destination);
    localPath = downloaded.uri;
  } catch (err) {
    console.warn('[sketch-storage] Failed to download image locally:', err);
    localPath = ''; // Fall back to remote URL
  }

  const entry: LocalSketch = {
    ...sketch,
    localImagePath: localPath,
  };

  return withSketchLock(async () => {
    const existing = await readAllSketches();
    existing.unshift(entry);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return entry;
  });
}

export async function updateSketchPin(
  sketchId: string,
  pinnedTo: LocalSketch['pinnedTo'],
): Promise<void> {
  await withSketchLock(async () => {
    const sketches = await readAllSketches();
    const idx = sketches.findIndex((s) => s.id === sketchId);
    if (idx === -1) return;
    sketches[idx].pinnedTo = pinnedTo;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sketches));
  });
}

export async function deleteSketch(sketchId: string): Promise<void> {
  await withSketchLock(async () => {
    const sketches = await readAllSketches();
    const sketch = sketches.find((s) => s.id === sketchId);
    if (sketch?.localImagePath) {
      try {
        const file = new File(sketch.localImagePath);
        if (file.exists) {
          file.delete();
        }
      } catch {
        // File may already be deleted
      }
    }
    const filtered = sketches.filter((s) => s.id !== sketchId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  });
}
