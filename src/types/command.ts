import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { BotClient } from '../client';

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface Command {
  data: CommandData;
  cooldown?: number; // ms
  djOnly?: boolean;
  inVoice?: boolean; // require user in voice channel
  sameVoice?: boolean; // require user in same voice channel as bot
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<void>;
}
