import Command from '../../structures/Command';
import Client from '../../structures/Client';
import CommandContext from '../../structures/CommandContext';

import { VERSION } from 'oceanic.js';

import os from 'os';
import { dynamicAvatar } from '../../utils/dynamicAvatar';

export default class Botinfo extends Command {
  constructor(client: Client) {
    super(client, {
      name: 'botinfo',
      description: 'Informações sobre mim.',
      category: 'Info',
      aliases: ['info', 'bi'],
      cooldown: 10
    });
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (ctx.channel.type !== 0 || !ctx.guild) return;

    if (!ctx.channel.permissionsOf(this.client.user.id).has('EMBED_LINKS')) {
      ctx.sendMessage({ content: ':x: Preciso da permissão `Anexar Links` para executar este comando', flags: 1 << 6 });
      return;
    }

    const cpuUsage = await getCpuUsage();
    const cpuName = os.cpus()[0].model;
    const totalCmdsUsed = this.client.commandsUsed;

    const startDB = process.hrtime();
    await this.client.botDB.findOne({ botID: this.client.user.id });
    const stopDB = process.hrtime(startDB);
    const pingDB = Math.round(((stopDB[0] * 1e9) + stopDB[1]) / 1e6);

    const mem = process.memoryUsage();

    const embed = new this.client.embed()
      .setColor('RANDOM')
      .setTitle('<a:blobdance:804026401849475094> Informações sobre mim')
      .setDescription('**[Convite](https://discord.com/oauth2/authorize?client_id=499901597762060288&scope=bot&permissions=8)**\n' +
        '**[Servidor de Suporte](https://discord.gg/dBQnxVCTEw)**\n\n' +
        `Modelo da CPU: \`${cpuName}\`\nTotal de comandos usados: \`${totalCmdsUsed}\``
      )
      .addField(':calendar: Criado em', `<t:${Math.floor(this.client.user.createdAt.getTime() / 1e3)}:d> (<t:${(Math.floor(this.client.user.createdAt.getTime() / 1e3))}:R>)`, true)
      .addField(':id: Meu ID', `\`${this.client.user.id}\``, true)
      .addField(':man: Dono', '`D4rkB#5745`', true)
      .addField('<a:infinity:838759634361253929> Uptime', `\`${this.client.utils.msToDate(process.uptime() * 1e3)}\``, true)
      .addField(':desktop: Servidores', `\`${this.client.guilds.size}\``, true)
      .addField(':ping_pong: Ping da API', `\`${ctx.guild.shard.latency}ms\``, true)
      .addField('<:lang_js:803678540528615424> Versão NodeJS', `\`${process.version}\``, true)
      .addField('<a:blobdiscord:803989275619754014> Versão do Oceanic.js', `\`v${VERSION}\``, true)
      .addField('<:MongoDB:773610222602158090>Banco de dados', `_MongoDB_\nPing: \`${pingDB}ms\``, true)
      .addField('<a:loading:804026048647659540> CPU', `\`${cpuUsage}%\``, true)
      .addField('<:ram:751468688686841986> RAM', `Heap: \`${(mem.heapUsed / 1024 / 1024).toFixed(0)}MiB\`\nRSS: \`${(mem.rss / 1024 / 1024).toFixed(0)}MiB\``, true)
      .setThumbnail(dynamicAvatar(this.client.user))
      .setTimestamp()
      .setFooter(`${ctx.author.username}#${ctx.author.discriminator}`, dynamicAvatar(ctx.author));

    ctx.sendMessage({ embeds: [embed] });
  }
}

const cpuAverage = () => {
  let totalIdle = 0;
  let totalTick = 0;
  const cpus = os.cpus();

  for (var i = 0, len = cpus.length; i < len; i++) {
    const cpu = cpus[i];
    const cpuTimes = cpu.times as any;
    for (const type in cpuTimes) {
      totalTick += cpuTimes[type];
    }
    totalIdle += cpuTimes.idle;
  }

  return {
    avgIdle: (totalIdle / cpus.length),
    avgTotal: (totalTick / cpus.length)
  }
}

const getCpuUsage = async () => {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage();

    setTimeout(() => {
      const endMeasure = cpuAverage();
      const idleDifference = endMeasure.avgIdle - startMeasure.avgIdle;
      const totalDifference = endMeasure.avgTotal - startMeasure.avgTotal;
      const cpuPercentage = (10000 - Math.round(10000 * idleDifference / totalDifference)) / 100;

      resolve(cpuPercentage);
    }, 1000);
  })
}