// Require the necessary discord.js classes
import fs = require('node:fs');
import path = require('node:path');
import { Client, Collection, Message, SlashCommandBuilder, MessageFlags, ClientOptions, TextChannel, Interaction, Events, GatewayIntentBits } from 'discord.js';
import { token } from './config.json';
import { commandSet } from './mycommands';
const dynamicRequire = (filePath: string) => require(filePath);

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: unknown) => Promise<void>;
  setCommands?: (cs: unknown) => void;
}

class CustomClient extends Client {
  public commands: Collection<string, Command>;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
  }
}
// Create a new client instance
const client = new CustomClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection<string, Command>();

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient: Client<true>) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = dynamicRequire(filePath) as Command;
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        command.setCommands(commandSet);
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`[ERROR] Failed to import command at ${filePath}:`, error);
    }
  }
}


client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  
  // Command handler for a custom format where command name is followed by space
  for (const [name, commandHandler] of client.commands.entries()) {
    if (commandHandler) {
      const mcl = message.content.toLowerCase();
      if (mcl.startsWith(name + ' ') || (mcl == name)) {
        try {
          // Get the content after the command name
          const content = message.content.substring(name.length + 1);
          
          // Create a fake interaction object that mimics what your slash commands expect
          const fakeInteraction = {
            options: {
              getString: (optionName: string) => {
                // Return the content as the 'optionName' parameter
                console.log('Asked for option:', optionName);
                return content;
                //return null;
              }
            },
            reply: async (replyContent: string | { content: string }) => {
              // Handle both string and object replies
              const messageContent = typeof replyContent === 'string' ? 
                replyContent : replyContent.content;
              return (message.channel as TextChannel).send(messageContent);
            }
          };
          
          // Call the execute method with only the fake interaction
          const command = client.commands.get(name);
          command.execute(fakeInteraction);
          return;
        } catch (error) {
          console.error(error);
          return (message.channel as TextChannel).send('Error executing command');
        }
      }
    }
  }
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

// Log in to Discord with your client's token
client.login(token);
