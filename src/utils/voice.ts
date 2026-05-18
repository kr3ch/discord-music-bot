import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';

export function getUserVoiceChannel(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember | null;
  return member?.voice?.channel ?? null;
}

export function getBotVoiceChannel(guildId: string) {
  const connection = getVoiceConnection(guildId);
  if (!connection) return null;
  return connection.joinConfig.channelId;
}

export function isInSameVoice(interaction: ChatInputCommandInteraction): boolean {
  const userChannel = getUserVoiceChannel(interaction);
  if (!userChannel) return false;
  const botChannel = getBotVoiceChannel(interaction.guildId!);
  if (!botChannel) return true; // bot not in voice = allow
  return userChannel.id === botChannel;
}
