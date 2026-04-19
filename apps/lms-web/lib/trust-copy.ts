export function describeCatalogState(seedCount: number) {
  if (seedCount <= 0) {
    return null;
  }

  return `Catalog currently includes ${seedCount} starter content pack${seedCount === 1 ? '' : 's'}. Treat that as reference curriculum content until it is replaced or confirmed against live operating data.`;
}

export function describeLiveBackendWithCatalog(seedCount: number, storageMode: string, visibleBackupCount: number) {
  const backupLabel = `${visibleBackupCount} visible backup${visibleBackupCount === 1 ? '' : 's'}`;
  if (seedCount > 0) {
    return `Backend storage is live in ${storageMode} mode with persistent backing and ${backupLabel}. The operator catalog still includes ${seedCount} starter content pack${seedCount === 1 ? '' : 's'}, so treat curriculum/admin content as reference material rather than fully confirmed live operations.`;
  }

  return `Backend storage is live in ${storageMode} mode with persistent backing and ${backupLabel}.`;
}
