const express = require("express");
const mongoose = require("mongoose");
require("dotenv/config");
const scrapeProfile = require("./helpers/scrapeProfile");

const useRealBrowser = async () => {
  const { connect } = require("puppeteer-real-browser");
  const { browser, page } = await connect({
    headless: false,

    args: [],

    customConfig: {},

    turnstile: true,

    connectOption: {},

    disableXvfb: false,
    ignoreAllFlags: false,
    // proxy:{
    //     host:'<proxy-host>',
    //     port:'<proxy-port>',
    //     username:'<proxy-username>',
    //     password:'<proxy-password>'
    // }
  });

  return { browser, page };
};

async function test(site) {
  try {
    const { browser, page } = await useRealBrowser();

    console.log("Browser runs properly.");

    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);

    page.on("targetcreated", async (target) => {
      if (target.type() === "page") {
        const newPagePromise = target.page();
        newPagePromise.then((newPage) => newPage.close());
      }
    });

    page.on("request", (request) => {
      if (request.frame() && request.frame() !== page.mainFrame()) {
        request.abort();
      } else {
        request.continue();
      }
    });

    let pageNumber = 1;
    let hasLinks = true;
    console.log("Gets here");

    while (hasLinks) {
      const currentPageUrl =
        pageNumber === 1
          ? site
          : site + `&page=${pageNumber}&offset=-5&limit=48`;

      console.log("Constructed url ", currentPageUrl);
      await page.goto(currentPageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 9990000,
      });
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500
        )
      );

      // Log the HTML content
      const html = await page.content();
      // console.log("HTML content:", html);

      const targetLinkSelector = "span.p-r-24._1lc1p3l1 a";
      const links = await page.$$(targetLinkSelector);
      console.log("LINKS: ", links.length, " links");
      hasLinks = links.length > 0;

      if (hasLinks) {
        const profileUrls = [];
        for (const link of links) {
          const href = await link.evaluate((el) => el.href);
          const usernameMatch = href.match(/fiverr\.com\/([^\/?]+)/);
          if (usernameMatch && usernameMatch[1]) {
            const username = usernameMatch[1];
            const profileUrl = `https://www.fiverr.com/${username}`;
            console.log(profileUrl);
            profileUrls.push(profileUrl);
            await new Promise((resolve) =>
              setTimeout(
                resolve,
                Math.floor(Math.random() * (1500 - 800 + 1)) + 800
              )
            );
          }
        }

        console.log(
          "\n\n============================================\nScraping started\n============================================\n\n"
        );

        for (const profileUrl of profileUrls) {
          const usernameMatch = profileUrl.match(/fiverr.com\/([^\/?]+)/);
          const username = usernameMatch[1];
          await scrapeProfile(browser, profileUrl, username);
        }
        pageNumber++;
      }
    }
    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error);
    try {
      if (browser) await browser.close();
    } catch (err) {
      console.log("Error closing browser:", err);
    }
  }
}

const app = express();
app.get("/", async (req, res) => {
  res.send("Hello world");
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});

mongoose
  .connect(process.env.URI, { dbName: "fiverr-scraper" })
  .then(() => {
    console.log("Connected to db.");

    const fiverrSearchLinks = [
      "https://www.fiverr.com/search/gigs?query=blockchain",
      "https://www.fiverr.com/search/gigs?query=dapp",
      "https://www.fiverr.com/search/gigs?query=defi",
      "https://www.fiverr.com/search/gigs?query=bot",
      "https://www.fiverr.com/search/gigs?query=crypto",
      "https://www.fiverr.com/search/gigs?query=web3",
      "https://www.fiverr.com/search/gigs?query=blockchain%20developer",
      "https://www.fiverr.com/search/gigs?query=pumpswap",
      "https://www.fiverr.com/search/gigs?query=staking",
      "https://www.fiverr.com/search/gigs?query=solana",
      "https://www.fiverr.com/search/gigs?query=fork%20new%20chain",
      "https://www.fiverr.com/search/gigs?query=presale",
      "https://www.fiverr.com/search/gigs?query=meme%20coin%20crypto",
      "https://www.fiverr.com/search/gigs?query=bot%20trading",
      "https://www.fiverr.com/search/gigs?query=token%20launch",
    ];

    async function processLinks() {
      for (const link of fiverrSearchLinks) {
        await test(link);
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000
          )
        );
      }
    }
    processLinks();
  })
  .catch((err) => {
    console.log(`Error connecting to db: ${err}`);
  });
