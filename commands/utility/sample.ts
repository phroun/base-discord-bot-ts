import { SlashCommandBuilder } from 'discord.js';

let commandSet = {};

module.exports = {
  setCommands: function(cs) {
    commandSet = cs;
  },
  data: new SlashCommandBuilder()
    .setName('sample')
    .setDescription('Just a sample command.')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name to send to sample command.')
        .setRequired(true)
    ),
  async execute(interaction) {

    const name = interaction.options.getString('name') ?? 'help';
    await interaction.reply(commandSet.sample(true, name));
  }
};
