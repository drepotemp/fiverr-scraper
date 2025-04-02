const Developer = require("../models/developer");
const Gig = require("../models/gig");
const cheerio = require("cheerio");

module.exports = scrapeProfile = async (browser, profileUrl, username) => {
  try {
    //Check if dev exists
    const existingDeveloper = await Developer.findOne({
      username,
    });

    //If dev exists, skip
    if (existingDeveloper) {
      console.log(`Already scrapped ${username}, skipping.`);
      return null;
    }

    //Otherwise continue
    const developer = new Developer({
      username: username,
      gigs: [],
    });

    const profilePage = await browser.newPage();
    await profilePage.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 9990000,
    });
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000)
    );

    let name = "";
    try {
      name = await profilePage.$eval('h1[aria-label="Public Name"]', (el) =>
        el.textContent.trim()
      );
    } catch (error) {
      console.error("Couldn't get developer name for ", username
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000)
    );

    let level = "";
    try {
      level = await profilePage.$eval(
        "div._1554sdp0._1554sdp109._1554sdp195._1554sdp17c._1554sdp1bd p._1554sdp2",
        (el) => el.textContent.trim()
      );
    } catch (error) {
      console.error("Couldn't get developer level for ", username);
      try {
        const html = await profilePage.content();
        const $ = cheerio.load(html);
        level = $(
          "div._1554sdp0._1554sdp109._1554sdp195._1554sdp17c._1554sdp1bd p._1554sdp2"
        )
          .text()
          .trim();
      } catch (cheerioError) {
        console.error(
          "Couldn't get developer level for ",username
        );
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000)
    );

    developer.name = name;
    developer.level = level;

    try {
      await developer.save();
    } catch (saveError) {
      console.error("Error saving developer- ",username,"\n", saveError);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000)
    );

    let reviewItems = [];
    try {
      reviewItems = await profilePage.$$eval(
        "span.freelancer-review-item-wrapper",
        (items) => {
          return items.map((item) => {
            const clientName = item
              .querySelector(
                "div._1554sdp0._1554sdp10j._1554sdp195._1554sdp1b8 p"
              )
              .textContent.trim();
            let price = "";
            let duration = "";
            const priceDurationContainer = item.querySelector(
              "div._1554sdp16s._1554sdp0._1554sdp11i._1554sdpkf._1554sdp1b8"
            );
            if (priceDurationContainer) {
              const children = Array.from(
                priceDurationContainer.querySelectorAll(
                  "div._1554sdp16n._1554sdp0._1554sdp104._1554sdp177._1554sdp1b8"
                )
              );
              children.forEach((child) => {
                const label = child.querySelector("p:last-child");
                if (label) {
                  const labelText = label.textContent.trim();
                  if (labelText === "Price") {
                    price = child
                      .querySelector("p:first-child")
                      .textContent.trim();
                  } else if (labelText === "Duration") {
                    duration = child
                      .querySelector("p:first-child")
                      .textContent.trim();
                  }
                }
              });
            }
            const gigName = item
              .querySelector(
                "a.d1hltpk.d1hltpl.d1hltpw._1554sdp25a._1554sdp25b._1554sdp25m._1554sdp25r._1554sdp1d._1554sdpv._1554sdp13b._1554sdp78._1554sdp1bd p"
              )
              .textContent.trim();

            const descriptionElement = item.querySelector(
              "div.reliable-review-description.review-description p"
            );
            const description = descriptionElement
              ? descriptionElement.textContent.trim()
              : "";

            return { clientName, price, duration, gigName, description };
          });
        }
      );
    } catch (reviewItemsError) {
      console.error("Couldn't get review items for ", username);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000)
    );

    const gigIds = [];
    for (const review of reviewItems) {
      try {
        const gig = new Gig({
          developerId: developer._id,
          client: review.clientName,
          price: review.price,
          duration: review.duration,
          name: review.gigName,
          description: review.description,
        });
        await gig.save();
        gigIds.push(gig._id);
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            Math.floor(Math.random() * (1500 - 800 + 1)) + 800
          )
        );
      } catch (gigSaveError) {
        console.error("Error saving gig for ",username, "\n", gigSaveError);
      }
    }

    developer.gigs = gigIds;
    try {
      await developer.save();
    } catch (developerSaveError) {
      console.error("Error saving developer gigs for ",username, "\n", developerSaveError);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000)
    );

    let message = `Developer Name: ${developer.name}\nDeveloper Username: ${developer.username}\nLevel: ${developer.level}\nProfile: fiverr.com/${developer.username}\n\nRECENT GIGS:\n\n`;

    try {
      const gigDocs = await Gig.find({ _id: { $in: gigIds } });
      gigDocs.forEach((gig) => {
        message += `Client: ${gig.client}\nPrice: ${gig.price}\nDuration: ${gig.duration}\nGig name: ${gig.name}\nDescription: ${gig.description}\n\n================================\n\n`;
      });
    } catch (gigFindError) {
      console.error("Couldn't find gig for ",username, "\n", gigFindError);
    }

    try {
      await profilePage.close();
    } catch (closeError) {
      console.error("Error closing profile page for ",username, "\n", closeError);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000)
    );
    return developer;
  } catch (error) {
    console.error("Error scraping profile for ",username, "\n", error);
    try {
      await profilePage.close();
    } catch (closeError) {
      console.error("Error closing profile page in main error:", closeError);
    }
    return null;
  }
};
