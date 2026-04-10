'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

const labelMap: Record<string, string> = {
  students: 'Learners',
  mallams: 'Mallams',
  content: 'Content Library',
  assessments: 'Assessments',
  pods: 'Pods',
  reports: 'Analytics',
  settings: 'Settings',
  assignments: 'Assignments',
  attendance: 'Attendance',
  progress: 'Progress',
};

function prettify(segment: string) {
  return labelMap[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Breadcrumbs({ items, currentLabel }: { items?: BreadcrumbItem[]; currentLabel?: string }) {
  const pathname = usePathname();

  const derivedItems = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, segments) => ({
      href: `/${segments.slice(0, index + 1).join('/')}`,
      label: index === segments.length - 1 && currentLabel ? currentLabel : prettify(segment),
    }));

  const crumbs = items ?? [{ label: 'Dashboard', href: '/' }, ...derivedItems];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      {crumbs.map((item, index) => {
        const isLast = index === crumbs.length - 1;
        const content: ReactNode = item.href && !isLast ? (
          <Link href={item.href} style={{ color: '#64748b', textDecoration: 'none', fontWeight: 700 }}>
            {item.label}
          </Link>
        ) : (
          <span style={{ color: isLast ? '#0f172a' : '#64748b', fontWeight: isLast ? 800 : 700 }}>{item.label}</span>
        );

        return (
          <div key={`${item.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {content}
            {!isLast ? <span style={{ color: '#94a3b8' }}>›</span> : null}
          </div>
        );
      })}
    </div>
  );
}
