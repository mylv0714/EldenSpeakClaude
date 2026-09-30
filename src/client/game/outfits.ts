import type { Localized } from '@shared/types';

/** Clothing sold at Maison Mode. The first one is the starting outfit. */
export interface Outfit {
  id: string;
  name: Localized;
  shirt: string;
  pants: string;
  price: number;
  /** Rank gift: never sold, only shown once owned. */
  exclusive?: boolean;
}

export const OUTFITS: readonly Outfit[] = [
  { id: 'street', name: { en: 'Street Casual', ko: '스트릿 캐주얼' }, shirt: '#e4572e', pants: '#2b3a55', price: 0 },
  { id: 'denim', name: { en: 'Denim Days', ko: '데님 데이즈' }, shirt: '#4c6ef5', pants: '#364fc7', price: 0 },
  { id: 'smart', name: { en: 'Smart Casual', ko: '스마트 캐주얼' }, shirt: '#f8f9fa', pants: '#1f2937', price: 150 },
  { id: 'sporty', name: { en: 'Sporty', ko: '스포티' }, shirt: '#12b886', pants: '#343a40', price: 200 },
  { id: 'summer', name: { en: 'Summer Vibes', ko: '여름 분위기' }, shirt: '#ffd43b', pants: '#4dabf7', price: 250 },
  { id: 'business', name: { en: 'Business Suit', ko: '비즈니스 정장' }, shirt: '#1e3a5f', pants: '#1e3a5f', price: 450 },
  { id: 'leather', name: { en: 'Leather Jacket', ko: '가죽 재킷' }, shirt: '#2d2d2d', pants: '#495057', price: 600 },
  { id: 'royal', name: { en: 'Royal Purple', ko: '로열 퍼플' }, shirt: '#7048e8', pants: '#212529', price: 800 },
  // Rank gifts (Insider, Citizen, Legend)
  { id: 'tuxedo', name: { en: 'Summit Tuxedo', ko: '서밋 턱시도' }, shirt: '#111111', pants: '#111111', price: 0, exclusive: true },
  { id: 'citizen', name: { en: 'City Blue', ko: '시티 블루' }, shirt: '#0b7285', pants: '#e9ecef', price: 0, exclusive: true },
  { id: 'legend', name: { en: 'Legend Gold', ko: '레전드 골드' }, shirt: '#f2b705', pants: '#1a1a1a', price: 0, exclusive: true },
];
