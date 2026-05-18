import { Events } from 'discord.js';
import type { BotEvent } from '../types/event';
import { errorEmbed } from '../utils/embeds';
import { checkCooldown } from '../utils/cooldown';
import { isRateLimited } from '../utils/rateLimiter';
import { isDJ, isRestricted } from '../utils/permissions';
import { getUserVoiceChannel, isInSameVoice } from '../utils/voice';
import { handleButton } from '../handlers/buttonHandler';
import { handleSelectMenu } from '../handlers/selectMenuHandler';
import { createChildLogger } from '../utils/logger';
import { BotError } from '../utils/errors';

const log = createChildLogger('event:interaction');

const event: BotEvent<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    try {
      if (interaction.isButton()) {
        await handleButton(interaction, client);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction, client);
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (!interaction.inGuild()) {
        await interaction.reply({
          embeds: [errorEmbed('This command can only be used in a server.')],
          ephemeral: true,
        });
        return;
      }

      if (isRateLimited(interaction.user.id)) {
        await interaction.reply({
          embeds: [errorEmbed('You are running commands too quickly. Slow down a bit.')],
          ephemeral: true,
        });
        return;
      }

      // Restricted channel check (DJ bypass)
      if (await isRestricted(interaction.guildId!, interaction.channelId)) {
        const member = await interaction.guild!.members.fetch(interaction.user.id);
        if (!(await isDJ(member))) {
          await interaction.reply({
            embeds: [errorEmbed('Music commands are restricted to another channel here.')],
            ephemeral: true,
          });
          return;
        }
      }

      // Voice requirements
      if (command.inVoice || command.sameVoice) {
        const userChannel = getUserVoiceChannel(interaction);
        if (!userChannel) {
          await interaction.reply({
            embeds: [errorEmbed('Join a voice channel first.')],
            ephemeral: true,
          });
          return;
        }
        if (command.sameVoice && !isInSameVoice(interaction)) {
          await interaction.reply({
            embeds: [errorEmbed('You must be in the same voice channel as me.')],
            ephemeral: true,
          });
          return;
        }
      }

      // DJ check
      if (command.djOnly) {
        const member = await interaction.guild!.members.fetch(interaction.user.id);
        if (!(await isDJ(member))) {
          await interaction.reply({
            embeds: [errorEmbed('This command requires the DJ role.')],
            ephemeral: true,
          });
          return;
        }
      }

      // Cooldown
      const remaining = checkCooldown(command.data.name, interaction.user.id, command.cooldown);
      if (remaining > 0) {
        await interaction.reply({
          embeds: [
            errorEmbed(
              `Please wait \`${(remaining / 1000).toFixed(1)}s\` before reusing **/${command.data.name}**.`,
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await command.execute(interaction, client);
    } catch (err) {
      log.error(
        { err, command: 'commandName' in interaction ? interaction.commandName : undefined },
        'Interaction error',
      );
      const userMsg = err instanceof BotError ? err.userMessage : 'An unexpected error occurred.';
      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction
            .followUp({ embeds: [errorEmbed(userMsg)], ephemeral: true })
            .catch(() => undefined);
        } else {
          await interaction
            .reply({ embeds: [errorEmbed(userMsg)], ephemeral: true })
            .catch(() => undefined);
        }
      }
    }
  },
};

export default event;
