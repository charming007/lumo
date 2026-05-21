const MODULE_STATUS_ALLOWLIST = ['draft', 'review', 'published'] as const;

export type ModuleStatus = typeof MODULE_STATUS_ALLOWLIST[number];

export function parseModuleStatus(rawStatus: FormDataEntryValue | null): ModuleStatus | null {
  const status = String(rawStatus || 'draft').trim().toLowerCase();
  return MODULE_STATUS_ALLOWLIST.includes(status as ModuleStatus)
    ? (status as ModuleStatus)
    : null;
}

export function normalizeModuleLifecycleStatus(rawStatus: string | null | undefined): ModuleStatus {
  const status = String(rawStatus || 'draft').trim().toLowerCase();

  if (status === 'approved' || status === 'active') {
    return 'published';
  }

  return MODULE_STATUS_ALLOWLIST.includes(status as ModuleStatus)
    ? (status as ModuleStatus)
    : 'draft';
}
