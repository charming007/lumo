import nextEnv from '@next/env';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(currentDir, '..');
const isDev = process.env.NODE_ENV !== 'production' && process.env.npm_lifecycle_event !== 'build';
loadEnvConfig(projectDir, isDev);

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

function invalidProductionApiReason(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const looksPlaceholder = hostname === 'example.com' || hostname.endsWith('.example.com');
    const looksLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local');

    if (protocol !== 'https:') {
      return `NEXT_PUBLIC_API_BASE_URL must use https in production. Current value: ${value}`;
    }

    if (looksPlaceholder) {
      return `NEXT_PUBLIC_API_BASE_URL still points at the placeholder host ${hostname}. Replace it with the real production API before deploying.`;
    }

    if (looksLocal) {
      return `NEXT_PUBLIC_API_BASE_URL points at ${hostname}, which is only reachable from the local machine. Production LMS users would hit a dead backend.`;
    }

    return null;
  } catch {
    return `NEXT_PUBLIC_API_BASE_URL is not a valid URL. Current value: ${value}`;
  }
}

const missingApiBaseReason = configuredApiBase
  ? null
  : 'NEXT_PUBLIC_API_BASE_URL is missing.';
const invalidReason = missingApiBaseReason ?? invalidProductionApiReason(configuredApiBase);

if (invalidReason) {
  const lines = [
    '',
    shouldBlockBuild ? 'Lumo LMS deployment build blocker.' : 'Lumo LMS build warning.',
    invalidReason,
    shouldBlockBuild
      ? 'Hosted builds must stop here instead of deploying a dashboard that points at a guessed or unsafe backend.'
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
