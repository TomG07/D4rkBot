const { MessageEmbed } = require('discord.js');
const osu = require('node-os-utils');
const os = require('os');
const msToDate = require('../../utils/mstodate');
const moment = require('moment');
moment.locale('pt-PT');
const package = require('../../../package.json');

module.exports = {
    name: 'botinfo',
    description: 'Informações sobre o bot',
    aliases: ['info'],
    category: 'Info',
    guildOnly: true,
    cooldown: 10,
    async execute(client, message, _args, prefix) {
        const cpu = osu.cpu;
        const cpuUsage = await cpu.usage();
        const cpuName = os.cpus()[0].model.split(' @')[0];

        const embed = new MessageEmbed()
            .setColor('RANDOM')
            .setTitle('Informações sobre mim')
            .setDescription('<a:lab_blobdance:643917533136814087> Adiciona me no teu servidor [aqui](https://discord.com/oauth2/authorize?client_id=499901597762060288&scope=bot&permissions=8)\n\n' +
                            `Modelo da CPU: \`${cpuName}\``
            )
            .addField(':calendar: Criado em', `\`${moment(client.user.createdAt).format('L')} (${moment(client.user.createdAt).startOf('day').fromNow()})\``, true)
            .addField(':closed_book: Meu ID', '`499901597762060288`', true)
            .addField(':man: Dono', '`D4rkB#2408`', true)
            .addField('<a:malakoi:478003266815262730> Uptime', `\`${msToDate(client.uptime)}\``, true)
            .addField(':desktop: Servidores em que estou', `\`${client.guilds.cache.size}\``, true)
            .addField(':ping_pong: Ping da API', `\`${Math.round(client.ws.ping)}ms\``, true)
            .addField('<:bot_badgehypesquad:590943982436089858> Prefixos', `Padrão: \`db.\`\nNo servidor: \`${prefix}\``, true)
            .addField('<:lang_js:427101545478488076> Versão NodeJS', `\`${process.version}\``, true)
            .addField('<a:lab_blobdiscord:643917538555854849> Versão do Discord.js', `\`${package.dependencies['discord.js'].replace(/\^/g, 'v')}\``, true)
            .addField('<:MongoDB:773610222602158090>Banco de dados', `_MongoDB_\nPing: \`${message.pingDB}ms\``, true)
            .addField('<a:carregando:488783607352131585> CPU', `\`${cpuUsage}%\``, true)
            .addField('<:ram:751468688686841986> RAM', `\`${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}MB\``, true)
            .setTimestamp()
            .setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true }));
        message.channel.send(embed);
    }
};