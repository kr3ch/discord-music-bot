export const Colors = {
  Primary: 0x5865f2,
  Success: 0x57f287,
  Warning: 0xfee75c,
  Error: 0xed4245,
  Info: 0x5865f2,
  NowPlaying: 0x1db954,
} as const;

export const Emojis = {
  Play: '▶️',
  Pause: '⏸️',
  Stop: '⏹️',
  Skip: '⏭️',
  Previous: '⏮️',
  Shuffle: '🔀',
  Repeat: '🔁',
  RepeatOne: '🔂',
  Queue: '📋',
  Music: '🎵',
  Sound: '🔊',
  Mute: '🔇',
  Clock: '⏱️',
  Star: '⭐',
  Error: '❌',
  Success: '✅',
  Warning: '⚠️',
  Loading: '⏳',
  Search: '🔎',
  Playlist: '📂',
  Heart: '❤️',
  Link: '🔗',
} as const;

export const Limits = {
  EmbedDescription: 4096,
  EmbedFieldValue: 1024,
  EmbedTitle: 256,
  SelectMenuOptions: 25,
  ButtonsPerRow: 5,
  ProgressBarLength: 15,
} as const;

export const PlayerButtons = {
  PauseResume: 'player:pause_resume',
  Skip: 'player:skip',
  Stop: 'player:stop',
  Queue: 'player:queue',
  Shuffle: 'player:shuffle',
  Loop: 'player:loop',
  VolumeDown: 'player:vol_down',
  VolumeUp: 'player:vol_up',
  NowPlaying: 'player:np',
  Favorite: 'player:favorite',
} as const;
