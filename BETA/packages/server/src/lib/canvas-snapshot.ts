import type { PrismaClient, Prisma } from '@prisma/client';

/**
 * Create a frozen snapshot of a project's canvas.
 * Called when research starts to preserve the canvas state at that moment.
 * Returns the snapshot ID for linking to the Research record.
 */
export async function createCanvasSnapshot(
  prisma: PrismaClient,
  projectId: string,
): Promise<string> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { canvas: true },
  });

  const snapshot = await prisma.canvasSnapshot.create({
    data: {
      projectId,
      content: (project.canvas ?? []) as Prisma.InputJsonValue,
    },
  });

  return snapshot.id;
}
