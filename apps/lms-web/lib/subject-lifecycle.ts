type BuildSubjectMutationPayloadOptions = {
  includeId?: boolean;
  includeInitialStrandName?: boolean;
};

export function buildSubjectMutationPayload(
  formData: FormData,
  options: BuildSubjectMutationPayloadOptions = {},
) {
  const payload: Record<string, string | number> = {
    name: String(formData.get('name') || ''),
    icon: String(formData.get('icon') || ''),
    order: Number(formData.get('order') || 0),
    status: String(formData.get('status') || 'draft'),
  };

  if (options.includeId) {
    payload.id = String(formData.get('id') || '');
  }

  if (options.includeInitialStrandName) {
    payload.initialStrandName = String(formData.get('initialStrandName') || '');
  }

  return payload;
}
