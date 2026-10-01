// Shared visual thresholds; gameplay damage and clocks stay in main.js.
export const healthColor = ratio => ratio > .5 ? 0x80efad : ratio > .25 ? 0xffd166 : 0xff596b;
export const weaponColor = tier => ['#d5ef9c','#a8e8ad','#efcf9b','#a9d6ff','#bdadff','#ffd166','#93e5d8','#80c9ff','#dab2ff','#ffb777','#79efff','#a2f6ff'][tier] || '#d5ef9c';
