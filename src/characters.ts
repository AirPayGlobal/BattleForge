export type SpecialEffect = 'burn' | 'freeze' | 'shock' | 'acid';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  /** Main costume color (vest, mask band, guards). */
  primary: string;
  /** Suit/under color. */
  secondary: string;
  /** Glow / effect accent. */
  accent: string;
  speed: number;
  jumpVel: number;
  projectileSpeed: number;
  projectileDamage: number;
  effect: SpecialEffect;
  projectileName: string;
  fatalityName: string;
  winQuote: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'scorch',
    name: 'SCORCH',
    title: 'The Hellfire Wraith',
    primary: '#ffb400',
    secondary: '#1a1a1e',
    accent: '#ff5a00',
    speed: 3.4,
    jumpVel: 13.5,
    projectileSpeed: 7.5,
    projectileDamage: 10,
    effect: 'burn',
    projectileName: 'HELLFIRE SKULL',
    fatalityName: 'INFERNO',
    winQuote: 'BURN WITH ME.',
  },
  {
    id: 'frostbite',
    name: 'FROSTBITE',
    title: 'The Cryomancer',
    primary: '#38b6ff',
    secondary: '#101024',
    accent: '#aef4ff',
    speed: 3.1,
    jumpVel: 13,
    projectileSpeed: 6,
    projectileDamage: 5,
    effect: 'freeze',
    projectileName: 'ICE BALL',
    fatalityName: 'DEEP FREEZE',
    winQuote: 'WINTER CLAIMS ALL.',
  },
  {
    id: 'volt',
    name: 'VOLT',
    title: 'The Storm God',
    primary: '#e8e8ff',
    secondary: '#26264a',
    accent: '#8f7bff',
    speed: 3.8,
    jumpVel: 14.5,
    projectileSpeed: 10,
    projectileDamage: 9,
    effect: 'shock',
    projectileName: 'THUNDERBOLT',
    fatalityName: 'STORM OF THE GODS',
    winQuote: 'THE SKY ANSWERS TO ME.',
  },
  {
    id: 'venom',
    name: 'VENOM',
    title: 'The Serpent',
    primary: '#4ade30',
    secondary: '#0e1c0e',
    accent: '#c8ff50',
    speed: 3.6,
    jumpVel: 13,
    projectileSpeed: 8,
    projectileDamage: 8,
    effect: 'acid',
    projectileName: 'ACID SPIT',
    fatalityName: 'ACID BATH',
    winQuote: 'SSSUFFER SSSLOWLY.',
  },
];
