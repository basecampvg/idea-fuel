import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const STORAGE_KEY = 'ideafuel_sketch_library';

export interface LocalSketch {
  id: string;
  localImagePath: string;
  remoteImageUrl: string;
  storagePath: string;
  templateType: 'app_page' | 'web_layout' | 'physical_object' | 'scene';
  description: string;
  annotations: boolean;
  pinnedTo: { type: 'sandbox' | 'vault'; id: string; name: string } | null;
  createdAt: string;
}

const SKETCH_DIR = `${FileSystem.documentDirectory}sketches/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(SKETCH_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(SKETCH_DIR, { intermediates: true });
  }
}

export async function getAllSketches(): Promise<LocalSketch[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const sketches: LocalSketch[] = JSON.parse(raw);
  return sketches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSketch(sketch: LocalSketch, imageUrl: string): Promise<LocalSketch> {
  await ensureDir();

  // Download image to local file system
  const localPath = `${SKETCH_DIR}${sketch.id}.png`;
  await FileSystem.downloadAsync(imageUrl, localPath);

  const entry: LocalSketch = {
    ...sketch,
    localImagePath: localPath,
  };

  const existing = await getAllSketches();
  existing.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  return entry;
}

export async function updateSketchPin(
  sketchId: string,
  pinnedTo: LocalSketch['pinnedTo'],
): Promise<void> {
  const sketches = await getAllSketches();
  const idx = sketches.findIndex((s) => s.id === sketchId);
  if (idx === -1) return;
  sketches[idx].pinnedTo = pinnedTo;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sketches));
}

export async function deleteSketch(sketchId: string): Promise<void> {
  const sketches = await getAllSketches();
  const sketch = sketches.find((s) => s.id === sketchId);
  if (sketch?.localImagePath) {
    try {
      await FileSystem.deleteAsync(sketch.localImagePath, { idempotent: true });
    } catch {
      // File may already be deleted
    }
  }
  const filtered = sketches.filter((s) => s.id !== sketchId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
