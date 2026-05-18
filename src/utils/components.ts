import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Emojis, Limits, PlayerButtons } from '../config/constants';

export function playerControlsRow(paused: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(PlayerButtons.PauseResume)
      .setEmoji(paused ? Emojis.Play : Emojis.Pause)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Skip)
      .setEmoji(Emojis.Skip)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Stop)
      .setEmoji(Emojis.Stop)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Shuffle)
      .setEmoji(Emojis.Shuffle)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Loop)
      .setEmoji(Emojis.Repeat)
      .setStyle(ButtonStyle.Secondary),
  );
}

export function playerSecondaryRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(PlayerButtons.VolumeDown)
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.VolumeUp)
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Queue)
      .setEmoji(Emojis.Queue)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.NowPlaying)
      .setEmoji(Emojis.Music)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(PlayerButtons.Favorite)
      .setEmoji(Emojis.Heart)
      .setStyle(ButtonStyle.Secondary),
  );
}

interface SearchOption {
  title: string;
  url: string;
  author: string;
  duration: string;
}

export function searchSelectMenu(
  customId: string,
  options: SearchOption[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder('Choose a track to play')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      options.slice(0, Limits.SelectMenuOptions).map((opt, idx) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(opt.title.slice(0, 100))
          .setDescription(`${opt.author.slice(0, 50)} • ${opt.duration}`)
          .setValue(`${idx}`),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function queuePagingRow(page: number, pageCount: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue:first:${page}`)
      .setEmoji('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`queue:prev:${page}`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`queue:next:${page}`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pageCount - 1),
    new ButtonBuilder()
      .setCustomId(`queue:last:${page}`)
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pageCount - 1),
  );
}
