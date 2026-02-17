// lib/avatars.ts

export const AVATAR_LIST = [
  { id: 1, seed: 'Felix', name: 'The Hacker' },
  { id: 2, seed: 'Byte', name: 'Script Kiddie' },
  { id: 3, seed: 'Glitch', name: 'Glitch' },
  { id: 4, seed: 'Neon', name: 'Neon Soul' },
  { id: 5, seed: 'Cyber', name: 'Cyber Punk' },
  { id: 6, seed: 'Retro', name: 'Retro Guy' },
  { id: 7, seed: 'Alan', name: 'Turing' },
  { id: 8, seed: 'Ada', name: 'Lovelace' },
  { id: 9, seed: 'Grace', name: 'Hopper' },
  { id: 10, seed: 'Linus', name: 'Torvalds' },
  { id: 11, seed: 'Mario', name: 'Plumber' },
  { id: 12, seed: 'Link', name: 'Hero' },
  { id: 13, seed: 'Zelda', name: 'Princess' },
  { id: 14, seed: 'Cloud', name: 'Soldier' },
  { id: 15, seed: 'Snake', name: 'Spy' },
  { id: 16, seed: 'Sonic', name: 'Speedster' },
  { id: 17, seed: 'Tails', name: 'Mechanic' },
  { id: 18, seed: 'Knuckles', name: 'Brawler' },
  { id: 19, seed: 'Shadow', name: 'Anti-Hero' },
  { id: 20, seed: 'Samus', name: 'Hunter' },
  { id: 21, seed: 'Kirby', name: 'Eater' },
  { id: 22, seed: 'DK', name: 'Kong' },
  { id: 23, seed: 'Fox', name: 'Pilot' },
  { id: 24, seed: 'Falco', name: 'Ace' },
  { id: 25, seed: 'Yoshi', name: 'Dino' },
]

export const getAvatarUrl = (seed: string) => 
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}&backgroundColor=b6e3f4`