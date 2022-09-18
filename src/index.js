const cheerio = require("cheerio");
const axios = require("axios");
const cmd = "!3d2y";

require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log("Node: " + process.version);
  console.log("Username: " + client.user.username);
});

client.on("messageCreate", async (message) => {
  console.log("Got message");

  if (message.author.bot) return;
  if (!message.content.startsWith(cmd)) return;

  const args = message.content.slice(cmd.length).trim().split(/ +/g); //get arguments after command
  const argument = args[0];

  /* --- RANDOM COLOR SPREAD --- */

  if (argument == "random") {
    const colorPages = await getColorPagesList();
    const chapterNumber = randomChapter(colorPages);
    const image = await getImage(chapterNumber, colorPages);

    message.channel.send({
      embeds: [
        {
          title: `Chapter ${chapterNumber}`,
          image: {
            url: image,
          },
        },
      ],
    });
    return;
  }

  /* --- SPECIFIC COLOR SPREAD --- */

  if (args.length === 0 || argument === "" || isNaN(argument)) {
    message.reply("Please provide a chapter number");
    return;
  }
  console.log("Got chapter number, getting image...");

  const chapterNumber = parseInt(argument);

  const colorPages = await getColorPagesList();
  const image = await getImage(chapterNumber, colorPages);

  image
    ? message.channel.send({
        embeds: [
          {
            title: `Chapter ${chapterNumber}`,
            image: {
              url: image,
            },
          },
        ],
      })
    : message.channel.send(
        `No color spread found for chapter ${chapterNumber}, the closest is chapter ${closestChapter(
          chapterNumber,
          colorPages
        )}`
      );
});

const getColorPagesList = async () => {
  try {
    const response = await axios.get(
      "https://onepiece.fandom.com/wiki/Category:Color_Spreads"
    );
    const $ = cheerio.load(response.data);
    const links = [];
    const elements = $(".category-page__member");
    elements.each(function () {
      const pageLink = $(this)
        .find(".category-page__member-left > a")
        .attr("href")
        .replace(".png", "");
      links.push({
        chapterNumber: getNumber(pageLink),
      });
    });
    return links;
  } catch (error) {
    console.log(`Error while getting color pages list: ${error}`);
  }
};

const getImage = async (chapterNumber, colorPages) => {
  const result = colorPages.find((page) => page.chapterNumber == chapterNumber);
  if (!result) return null;

  let url = `https://onepiece.fandom.com/wiki/Chapter_${result.chapterNumber}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const imageLink = $(".image").attr("href");

    return imageLink;
  } catch (error) {
    console.log(`Error while getting image link: ${error}`);
  }
};

//regex to find number in string
const getNumber = (str) => {
  const regex = /\d+/g;
  const found = str.match(regex);
  return parseInt(found[0].trim());
};

function closestChapter(chapterNumber, colorPages) {
  return colorPages.reduce((prev, curr) =>
    Math.abs(curr.chapterNumber - chapterNumber) <
    Math.abs(prev.chapterNumber - chapterNumber)
      ? curr
      : prev
  ).chapterNumber;
}

const randomChapter = (colorPages) =>
  colorPages[Math.floor(Math.random() * colorPages.length)].chapterNumber;

/* --- EXCEPTIONS --- */

process.on("uncaughtException", (err) => {
  console.error(err);
  if (!process.env.BOT_OWNER_ID) {
    throw Error("missing bot owner id");
  }

  client.users.cache
    .get(process.env.BOT_OWNER_ID)
    ?.send("Dead" + err)
    .then(() => process.exit(1))
    .catch(() => console.log("Message failed to send to Bot owner"));
});

process.on("unhandledRejection", (err) => {
  console.error(err);

  if (!process.env.BOT_OWNER_ID) {
    throw Error("missing bot owner id");
  }

  client.users.cache
    .get(process.env.BOT_OWNER_ID)
    ?.send("Dead" + err)
    .then((message) => process.exit(1))
    .catch(() => console.log("Message failed to send to Bot owner"));
});

client.login(process.env.BOT_TOKEN);
