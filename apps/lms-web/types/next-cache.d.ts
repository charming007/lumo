declare module 'next/cache' {
  export function revalidatePath(path: string, type?: 'page' | 'layout'): void;
}
