import { Capacitor } from '@capacitor/core';
import type { Platform } from './types';
import { createWebPlatform } from './web';

let current: Platform | null = null;

/** Call once before rendering. Inside the Android/iOS shell it swaps in the native adapters. */
export async function initPlatform(): Promise<Platform> {
  if (Capacitor.isNativePlatform()) {
    const { createNativePlatform } = await import('./native');
    current = createNativePlatform();
  }
  return platform();
}

export function platform(): Platform {
  current ??= createWebPlatform();
  return current;
}

export type { Platform } from './types';
