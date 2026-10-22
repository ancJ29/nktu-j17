import { EntityConflictError } from '@/stores/createEntityStore';

export type PhotoLike = { url: string; isDeleted?: boolean };

export function rebasePhotoWrite<T extends PhotoLike>(snapshot: T[], next: T[], latest: T[]): T[] {
  const snapshotByUrl = new Map(snapshot.map((photo) => [photo.url, photo]));

  const added = next.filter((photo) => !snapshotByUrl.has(photo.url));
  const newlyDeleted = new Set(
    next
      .filter((photo) => photo.isDeleted && !snapshotByUrl.get(photo.url)?.isDeleted)
      .map((photo) => photo.url),
  );

  const rebased = latest.map((photo) =>
    newlyDeleted.has(photo.url) && !photo.isDeleted ? { ...photo, isDeleted: true } : photo,
  );

  const latestUrls = new Set(latest.map((photo) => photo.url));
  return [...rebased, ...added.filter((photo) => !latestUrls.has(photo.url))];
}

export async function writePhotosWithConflictRetry<TRecord, TPhoto extends PhotoLike>({
  record,
  next,
  getPhotos,
  save,
  maxAttempts = 3,
}: {
  record: TRecord;

  next: TPhoto[];
  getPhotos: (record: TRecord) => TPhoto[];
  save: (record: TRecord, photos: TPhoto[]) => Promise<TRecord>;
  maxAttempts?: number;
}): Promise<{ record: TRecord; rebased: boolean }> {
  let current = record;
  let desired = next;
  let rebased = false;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const saved = await save(current, desired);
      return { record: saved, rebased };
    } catch (err) {
      const conflict = err instanceof EntityConflictError ? err : null;
      if (!conflict?.latest || attempt + 1 >= maxAttempts) throw err;

      const latest = conflict.latest as TRecord;
      desired = rebasePhotoWrite(getPhotos(current), desired, getPhotos(latest));
      current = latest;
      rebased = true;
    }
  }

  throw new Error('writePhotosWithConflictRetry: attempts exhausted');
}
