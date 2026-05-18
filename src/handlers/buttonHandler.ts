import { ButtonInteraction, GuildMember } from 'discord.js';
import type { BotClient } from '../client';
import { PlayerButtons } from '../config/constants';
import { errorEmbed, nowPlayingEmbed, successEmbed } from '../utils/embeds';
import { LoopMode } from '../types/track';
import { isRateLimited } from '../utils/rateLimiter';
import { createChildLogger } from '../utils/logger';
import { formatDuration } from '../utils/time';
import { env } from '../config/env';

const log = createChildLogger('button-handler');

export async function handleButton(
  interaction: ButtonInteraction,
  client: BotClient,
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guildId) return;

  if (isRateLimited(interaction.user.id)) {
    await interaction.reply({
      embeds: [errorEmbed('You are doing that too often.')],
      ephemeral: true,
    });
    return;
  }

  const player = client.music.get(interaction.guildId);
  if (!player) {
    await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  if (!member.voice.channelId) {
    await interaction.reply({
      embeds: [errorEmbed('Join the voice channel first.')],
      ephemeral: true,
    });
    return;
  }

  const id = interaction.customId;

  try {
    if (id === PlayerButtons.PauseResume) {
      const wasPaused = player.isPaused();
      if (wasPaused) player.resume();
      else player.pause();
      await interaction.reply({
        embeds: [successEmbed(wasPaused ? 'Resumed.' : 'Paused.')],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.Skip) {
      const skipped = player.skip();
      await interaction.reply({
        embeds: [successEmbed(skipped ? `Skipped **${skipped.title}**.` : 'Nothing to skip.')],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.Stop) {
      player.stop();
      await interaction.reply({
        embeds: [successEmbed('Stopped and queue cleared.')],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.Shuffle) {
      player.queue.shuffle();
      await interaction.reply({ embeds: [successEmbed('Queue shuffled.')], ephemeral: true });
      return;
    }

    if (id === PlayerButtons.Loop) {
      const next: LoopMode =
        player.queue.loopMode === LoopMode.Off
          ? LoopMode.Track
          : player.queue.loopMode === LoopMode.Track
            ? LoopMode.Queue
            : LoopMode.Off;
      player.queue.setLoop(next);
      const label = next === LoopMode.Off ? 'Off' : next === LoopMode.Track ? 'Track' : 'Queue';
      await interaction.reply({ embeds: [successEmbed(`Loop: **${label}**.`)], ephemeral: true });
      return;
    }

    if (id === PlayerButtons.VolumeUp) {
      player.setVolume(player.volume + 10);
      await interaction.reply({
        embeds: [successEmbed(`Volume: **${player.volume}%**.`)],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.VolumeDown) {
      player.setVolume(player.volume - 10);
      await interaction.reply({
        embeds: [successEmbed(`Volume: **${player.volume}%**.`)],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.NowPlaying) {
      if (!player.queue.current) {
        await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
        return;
      }
      const embed = nowPlayingEmbed(player.queue.current, player.getPosition(), player.volume);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (id === PlayerButtons.Queue) {
      const list = player.queue.list;
      if (list.length === 0) {
        await interaction.reply({
          embeds: [errorEmbed('Queue is empty. Use /play to add tracks.')],
          ephemeral: true,
        });
        return;
      }
      const slice = list.slice(0, env.QUEUE_PAGE_SIZE);
      const description = slice
        .map(
          (t, i) =>
            `**${i + 1}.** [${t.title.slice(0, 60)}](${t.url}) · \`${
              t.isLive ? 'LIVE' : formatDuration(t.duration)
            }\``,
        )
        .join('\n');
      await interaction.reply({
        embeds: [
          {
            color: 0x5865f2,
            title: `Queue · ${list.length} tracks`,
            description,
            footer: { text: `Use /queue for full paginated view` },
          },
        ],
        ephemeral: true,
      });
      return;
    }

    if (id === PlayerButtons.Favorite) {
      const current = player.queue.current;
      if (!current) {
        await interaction.reply({ embeds: [errorEmbed('Nothing is playing.')], ephemeral: true });
        return;
      }
      try {
        const { prisma } = await import('../database/prisma');
        await prisma.favoriteTrack.upsert({
          where: { userId_url: { userId: interaction.user.id, url: current.url } },
          create: {
            userId: interaction.user.id,
            url: current.url,
            title: current.title,
            duration: current.duration,
            author: current.author,
          },
          update: {},
        });
        await interaction.reply({
          embeds: [successEmbed(`❤️ Added **${current.title}** to favorites.`)],
          ephemeral: true,
        });
      } catch (err) {
        log.warn({ err }, 'favorite failed');
        await interaction.reply({
          embeds: [errorEmbed('Could not save favorite.')],
          ephemeral: true,
        });
      }
      return;
    }
  } catch (err) {
    log.error({ err, customId: id }, 'Button handler error');
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true })
        .catch(() => undefined);
    }
  }
}
