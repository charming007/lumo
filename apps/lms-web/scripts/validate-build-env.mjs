const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

if (!configuredApiBase) {
  console.warn('');
  console.warn('Lumo LMS production build warning.');
  console.warn('NEXT_PUBLIC_API_BASE_URL is missing, so the deployed UI will render explicit blocker states until the env var is set.');
  console.warn('Set it in Vercel or your build environment, then redeploy to restore live API-backed screens.');
  console.warn('');
}
