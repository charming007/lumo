const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const isProductionDeployment = process.env.VERCEL_ENV === 'production' || process.env.CONTEXT === 'production';

if (!configuredApiBase) {
  const lines = [
    '',
    isProductionDeployment ? 'Lumo LMS production build failed.' : 'Lumo LMS build warning.',
    'NEXT_PUBLIC_API_BASE_URL is missing, so the deployed UI cannot load live dashboard/admin data.',
    'Set it in Vercel or your build environment, then redeploy to restore live API-backed screens.',
    '',
  ];

  if (isProductionDeployment) {
    console.error(lines.join('\n'));
    process.exit(1);
  }

  console.warn(lines.join('\n'));
}
