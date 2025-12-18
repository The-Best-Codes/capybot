import { Message, type OmitPartialGroupDMChannel } from "discord.js";
import prettier from "prettier";

export async function buildContextXML(
  message: OmitPartialGroupDMChannel<Message<boolean>>,
): Promise<string> {
  const author = message.author;
  const guild = message.guild;
  const channel = message.channel;

  let messageHistory = "";
  try {
    const messages = await channel.messages.fetch({ limit: 6 });
    const sortedMessages = Array.from(messages.values())
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .slice(0, -1);

    messageHistory = sortedMessages
      .map((msg: Message) => {
        const msgAuthor = msg.author.bot
          ? `${msg.author.username} [BOT]`
          : msg.author.username;
        return `    <message>
      <author>${msgAuthor}</author>
      <content>${msg.content}</content>
      <timestamp>${msg.createdTimestamp}</timestamp>
    </message>`;
      })
      .join("\n");
  } catch (error) {
    messageHistory =
      "    <message>\n      <error>Unable to fetch message history</error>\n    </message>";
  }

  const guildSection = guild
    ? `  <guild>
    <id>${guild.id}</id>
    <name>${guild.name}</name>
    <member_count>${guild.memberCount}</member_count>
  </guild>`
    : "";

  const rawXML = `<context>
  <user>
    <id>${author.id}</id>
    <username>${author.username}</username>
    <discriminator>${author.discriminator}</discriminator>
    <bot>${author.bot}</bot>
  </user>
  <message>
    <id>${message.id}</id>
    <content>${message.content}</content>
    <timestamp>${message.createdTimestamp}</timestamp>
    <mentions_bot>${message.mentions.has(message.client.user!.id)}</mentions_bot>
    <is_reply>${message.reference !== null}</is_reply>
  </message>
  <channel>
    <id>${channel.id}</id>
    <name>${channel.isDMBased() ? "DM" : channel.name}</name>
    <type>${channel.isDMBased() ? "dm" : "guild"}</type>
  </channel>
${guildSection}
  <message_history>
${messageHistory}
  </message_history>
</context>`;

  const formattedXML = await prettier.format(rawXML, {
    parser: "html",
  });

  return formattedXML;
}
