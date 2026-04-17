const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const isProductionDeployment =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.CONTEXT === 'production';

if (!configuredApiBase) {
  const lines = [
    '',
    isProductionDeployment ? 'Lumo LMS production build blocker.' : 'Lumo LMS build warning.',
    'NEXT_PUBLIC_API_BASE_URL is missing, so live dashboard/admin data will stay intentionally blocked in the shipped UI.',
    isProductionDeployment
      ? 'Production builds must stop here instead of deploying a dashboard that only renders blocker cards.'
      : 'Set it in Vercel or your build environment before shipping to production.',
    '',
  ];

  const output = lines.join('\n');
  if (isProductionDeployment) {
    console.error(output);
    process.exit(1);
  }

  console.warn(output);
}
