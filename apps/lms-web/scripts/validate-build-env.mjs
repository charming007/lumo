const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const lifecycleEvent = process.env.npm_lifecycle_event;
const isHostedDeployment =
  process.env.VERCEL === '1' ||
  Boolean(process.env.VERCEL_ENV) ||
  Boolean(process.env.CONTEXT) ||
  process.env.CI === 'true';
const isProductionDeployment =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.env.CONTEXT === 'production';
const isBuildCommand = lifecycleEvent === 'build';
const shouldBlockBuild = isHostedDeployment || isProductionDeployment || isBuildCommand;

if (!configuredApiBase) {
  const lines = [
    '',
    shouldBlockBuild ? 'Lumo LMS deployment build blocker.' : 'Lumo LMS build warning.',
    'NEXT_PUBLIC_API_BASE_URL is missing, so live dashboard/admin data will stay intentionally blocked in the shipped UI.',
    shouldBlockBuild
      ? 'Hosted builds must stop here instead of deploying a dashboard that only renders blocker cards.'
      : 'Set it in Vercel or your build environment before shipping to production.',
    '',
  ];

  const output = lines.join('\n');
  if (shouldBlockBuild) {
    console.error(output);
    process.exit(1);
  }

  console.warn(output);
}
