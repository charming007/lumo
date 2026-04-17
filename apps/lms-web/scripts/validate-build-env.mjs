const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const isProductionDeployment = process.env.VERCEL_ENV === 'production' || process.env.CONTEXT === 'production';

if (!configuredApiBase) {
  const lines = [
    '',
    isProductionDeployment ? 'Lumo LMS production build warning.' : 'Lumo LMS build warning.',
    'NEXT_PUBLIC_API_BASE_URL is missing, so live dashboard/admin data will stay intentionally blocked in the shipped UI.',
    'The app now renders explicit production blocker states instead of fake-empty data, so this build can ship safely while deployment wiring is fixed.',
    'Set it in Vercel or your build environment, then redeploy to restore live API-backed screens.',
    '',
  ];

  console.warn(lines.join('\n'));
}
