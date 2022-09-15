const cheerio = require("cheerio");
const axios = require("axios");

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

const cmd = "!3d2y";

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
    console.log(error);
    return "Error while fetching color pages list";
  }
};

const getImage = async (chapterNumber, colorPages) => {
  const result = colorPages.find((page) => page.chapterNumber == chapterNumber);
  if (!result) return null;

  let url = `https://onepiece.fandom.com/wiki/Chapter_${result.chapterNumber}`;

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const imageLink = $("#mw-content-text > div > aside > figure > a").attr(
      "href"
    );
    return imageLink;
  } catch (error) {
    console.log(error);
    return "Error while fetching image";
  }
};

//regex to find number in string
const getNumber = (str) => {
  const regex = /\d+/g;
  const found = str.match(regex);
  return parseInt(found[0].trim());
};

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

client.on("ready", () => {
  console.log("Node: " + process.version);
  console.log("Username: " + client.user.username);
});

client.on("messageCreate", async (message) => {
  console.log("Got message");
  if (message.author.bot) return;
  if (!message.content.startsWith(cmd)) return;

  const args = message.content.slice(cmd.length).trim().split(/ +/g);
  const argument = args[0];

  if (argument == "random") {
    const colorPages = await getColorPagesList();

    const randomPage =
      colorPages[Math.floor(Math.random() * colorPages.length)];

    const image = await getImage(randomPage.chapterNumber, colorPages);

    message.channel.send({
      embeds: [
        {
          title: `Chapter ${randomPage.chapterNumber}`,
          image: {
            url: image,
          },
        },
      ],
    });
    return;
  }

  if (args.length === 0 || argument === "" || isNaN(argument)) {
    message.reply("Please provide a chapter number");
    return;
  }

  console.log("Got chapter number, getting image...");

  const chapterNumber = parseInt(argument);

  const colorPages = await getColorPagesList();
  const image = await getImage(chapterNumber, colorPages);

  //If image is null, then suggest the closest chapter
  if (!image) {
    const closestChapter = colorPages.reduce((prev, curr) =>
      Math.abs(curr.chapterNumber - chapterNumber) <
      Math.abs(prev.chapterNumber - chapterNumber)
        ? curr
        : prev
    );
    message.channel.send(
      `No color spread found for chapter ${chapterNumber}, the closest is chapter ${closestChapter.chapterNumber}`
    );
    return;
  } else {
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
  }
});

client.login(process.env.BOT_TOKEN);
