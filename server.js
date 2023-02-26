const http = require("http");
const querystring = require("querystring");
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, ActivityType, Message } = require('discord.js');
const token = process.env.DISCORD_BOT_TOKEN;
const {JsonDB, Config} = require('node-json-db')
const db = new JsonDB(new Config("usersDataBase", true, false, '/'));

const client = new Client({ intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// GAS(Google Apps Script)からの受信(botの常時起動)
http.createServer(function(req, res){
  res.write("OK");
  res.end();
}).listen(8080);

client.on('ready', () => {
  console.info(`Bot ${client.user.tag} online.`);
  client.user.setPresence({ activities: [{ name: 'ひみちゅきちゅき', type: ActivityType.Competing }], status: 'idle' });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    client.user.setStatus('online');
    await command.execute(interaction);
    client.user.setStatus('idle');
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content.includes('いいすぎ')) {
    message.channel.sendTyping()
    client.user.setPresence({ activities: [{ name: `${message.member.nickname}はくさすぎ！！`, type: ActivityType.Playing}], status: 'online' });

    // update database
    try {
      let guildIndex = await db.getIndex("/guilds", message.guildId);
      let userIndex = await db.getIndex(`/guilds[${guildIndex}]/users`, message.author.id);
      let path = `/guilds[${guildIndex}]/users[${userIndex}]`;
      let data = await db.getData(path);
      data.counter++
      await db.push(path, data, true);
    } catch(error) {
      console.info(`データベースに${message.guildId}を追加しました --- user: ${message.author.id}`);
      await db.push("/guilds", [{
        id: message.guildId,
        users: [
          {
            id: message.author.id,
            counter: 1
          }
        ]
      }], true);
    };
    await new Promise(resolve => setTimeout(resolve, 1000));
    const reply = await message.reply('口くさ！！！');
    await reply.react(message.guild.emojis.cache.get('1079087940665348157'));
    client.user.setPresence({ activities: [{ name: 'ひみちゅきちゅき', type: ActivityType.Competing }], status: 'idle' });
  }
})

client.login(token);