const { SlashCommandBuilder } = require('discord.js');
const mysql = require('mysql2');
const config = require('../config.json');

const connection = mysql.createPool({
  host: config.MYSQL_HOST,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD,
  database: config.MYSQL_DB,
  port: config.MYSQL_PORT,
});
module.exports = {
    data: new SlashCommandBuilder()
      .setName('link')
      .setDescription('Generate a code to link a Steam account with a Discord account'),
    async execute(interaction) {
      let discordId = interaction.user.id;
      connection.query(
        'SELECT eos_id, code FROM player_discord WHERE discord_id = ? AND eos_id IS NOT NULL AND eos_id <> 0',
        [discordId],
        function (err, results) {
          if (err) {
            console.log(err);
            interaction.reply({content: 'Failed to verify linking.', ephemeral: true });
          } else if (results.length > 0) {
            let eos_id = results[0].eos_id;
            let linkcode = results[0].linkcode;
            if (eos_id === null || eos_id === "0") {
              if (linkcode != null && linkcode != "") {
                interaction.reply({content: `You already have a previous generated link, link using it: \`/linkdiscord  ${linkcode}\``, ephemeral: true});
              } else {
                generateLinkCode().then((newCode) => {
                  connection.query(
                    'INSERT INTO player_discord (discord_id, eos_id, code) VALUES (?, ?, ?)',
                    [discordId, null, newCode],
                    function (err, results) {
                      if (err) {
                        console.log(err);
                        interaction.reply({content: 'Failed to generate link code.', ephemeral: true});
                      } else {
                        interaction.reply({content: `Use this in-game command to link your account: \`/linkdiscord ${newCode}\``, ephemeral: true});
                        
                      }
                    }
                  );
                }).catch((err) => {
                  console.log(err);
                  interaction.reply({content: 'Failed to generate link code.', ephemeral: true});
                });
              }
            } else {
                connection.query(
                  'UPDATE player_discord SET code = "linked" WHERE discord_id = ?',
                  [discordId],
                  function (err, results) {
                    if (err) {
                      console.log(err);
                      interaction.reply({content: 'Failed to remove link code.', ephemeral: true});
                    } else {
                      console.log(`Link code removed for Discord ID ${discordId}`);
                      interaction.reply({content: `Your discord account is linked with this eos_id: ${eos_id}`, ephemeral: true});
                      const autoAssign = config.rolassign.find(role => role.name === 'autoroll' && role.active);
                      if (autoAssign) {
                        const roleId = autoAssign.rolId;
                        const member = interaction.member;
                        const role = interaction.guild.roles.cache.get(roleId);
                        if (role) {
                          member.roles.add(role)
                            .then(() => console.log(`El rol ${role.name} ha sido añadido a ${member.user.tag}`))
                            .catch(console.error);
                        } else {
                          console.error(`No se encontró el rol con el ID ${roleId}`);
                        }
                      }
                    }
                  }
                );
              }
          } else {
            connection.query(
              'SELECT code FROM player_discord WHERE discord_id = ? AND code IS NOT NULL AND code <> ""',
              [discordId],
              function (err, results) {
                if (err) {
                  console.log(err);
                  interaction.reply({content: 'Failed to verify linking.', ephemeral: true});
                } else if (results.length > 0) {
                  let linkcode = results[0].linkcode;
                  interaction.reply({content: `You already have a previous generated link, link using it: \`/linkdiscord ${linkcode}\``, ephemeral: true});
                } else {
                  generateLinkCode().then((newCode) => {
                    connection.query(
                      'INSERT INTO player_discord (discord_id, code) VALUES (?, ?)',
                      [discordId, newCode],
                      function (err, results) {
                        if (err) {
                          console.log(err);
                          interaction.reply({content: 'Failed to generate link code.', ephemeral: true});
                        } else {
                          interaction.reply({content: `:flag_us: Use this in-game command to link your account: \`/linkdiscord ${newCode}\` \n :flag_es: Usa en el juego este comando para vincularte: \`/linkgame ${newCode}\``, ephemeral: true});
                        }
                      }
                    );
                  }).catch((err) => {
                    console.log(err);
                    interaction.reply({content: 'Failed to generate link code.', ephemeral: true});
                  });
                }
              }
            );
          }
        }
      )
    }
  };
  
function generateLinkCode() {
  return new Promise((resolve, reject) => {
    const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 10; i++) {
      code += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }
    connection.query(
     'SELECT code FROM player_discord WHERE code = ?',
      [code],
      function (err, results) {
        if (err) {
          reject(err);
        } else if (results.length === 0) {
          resolve(code);
        } else {
          generateLinkCode().then(resolve).catch(reject);
        }
      }
    );
  });
};
