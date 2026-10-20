/*
  YACHTIQUE FLEET SETTINGS
  The fleet on the site is pulled live from YCN Miami (ycn.yachts). Edit this file to change
  how it shows on yachtique.co. Changes go live about a minute after you commit.

  - markup:         added to every YCN price. 0.20 = +20%.
  - roundTo:        prices are rounded UP to this step, e.g. 5 → $2,118 becomes $2,120.
  - brokerListedOnly: true = only show yachts that are on YCN's broker page (the ones
                    YCN offers to brokers, with their live calendar).
  - hide:           yachts to leave off the site, by their handle (the last part of the
                    ycn.yachts/products/... link), e.g. "bimini-blue".
  - priceOverrides: a fixed price for one yacht and duration, used instead of the markup.
                    e.g. "bimini-blue": { "4 hours": 2400 }
  - calendars:      backup list of each yacht's Google Calendar. The site reads the current
                    list from YCN's broker page first and only falls back to this.
*/
export default {
  markup: 0.20,
  roundTo: 5,
  brokerListedOnly: true,
  hide: [],
  priceOverrides: {},
  calendars: {
    "four-keeps": "benmiamirealestate@gmail.com",
    "let-it-be-3": "c_af5fcedb4925302075af8b9c04a47f4bce50b130814bf0ba8834ca228769f96e@group.calendar.google.com",
    "bimini-blue": "c_9a84d0bf2b1b346d4facc5c35708b6b28dff83808da32d730dd8b5b704a09ea9@group.calendar.google.com",
    "somewhere": "0904a30f4a68afcd07b0785db27ac2c2cda50510ffc27d8a377a8e5985125d1e@group.calendar.google.com",
    "caprice": "c_0861c13f03faa5868419d8f97a95c4c024c1a2329f7e8eb97b710f9ffa734a27@group.calendar.google.com",
    "grand-admiral": "laromayachts@gmail.com",
    "solaris": "c_51dac18651b5d6e06c508c37fe4ba1d96db8dca3afe0548d74d056cc3f9147e9@group.calendar.google.com",
    "kilauea": "c_981c25bd8112e50e895b5cd74c7ee0d720b3f6a7b4091d445ca2717138dcf09b@group.calendar.google.com",
    "moltopiaciuto": "c_a856eb6ccb4a18bc58d94dd61346f007a12051078c64c278015e3fa33db9a9ef@group.calendar.google.com",
    "brusea": "c_2af4d20917ba295e4efb91b5ce1049670b831d9d9e90fae8714db297330a23c9@group.calendar.google.com",
    "sea-suite": "c_7c006173eb06aba1283d7f6c22b3d1742b1d2a602392ac2c29fbcf9f49e347ee@group.calendar.google.com",
    "atlantia": "d3b26f15044ae5dcf0b9dd17eca86e7b9d58436adaf4df80273c70b7b38f84bd@group.calendar.google.com",
    "exumas": "c_2f545dc7bf24040e4b4e7e296d928efd0e0acf5dbaf20241d1cde6ae62e2e72b@group.calendar.google.com",
    "paragon": "4a8c3935509105e41f8c120af70f1b11dff33b6f786530b367e763ef358e74f0@group.calendar.google.com",
    "le-grand-bleu": "sf8m2t5lb9smhjosil5sandj83mi5n73@import.calendar.google.com",
    "dont-tell-mom": "c_2ba9ea17988c1fda21d45248d23f418e639f82bc6c47d371c7cdc97bce4f53b7@group.calendar.google.com",
    "spysea": "c_31ca4f15a5ce784c07ed646ad36f63d9e0bdf47d951a7cc4c85c0a2390b820ca@group.calendar.google.com",
    "orca": "c_4d31ad753b378991d747d74ef82a2dbc68cf0cd1b544ad9772920984eecfd857@group.calendar.google.com",
    "lupo-ii": "lupo2yacht@gmail.com",
    "carpediem1": "050ebcbbb3e0d1da85d68e9c6df7891e554c1a8368e5d1cd6a75dd81f4a4f99e@group.calendar.google.com",
    "makebighappen": "c_3913a41064752bcf432b10272e11a44d39fd160a1f05579267911f2a9202838b@group.calendar.google.com",
    "rmmjob": "c_29b0d0789a151a63ece847ab61fde2e7ab446d293ff3f4569dd99dc36ad0be78@group.calendar.google.com",
    "no-curfew": "c_c5e227864d8476d3981bbfaa5e785f8023eb6b559e50c08f4dfde5fa6d1171ad@group.calendar.google.com",
    "carpediem2": "f624bde7ca48e3205cf6f632cc3d2850a4eefd748e041893bef159ec8a6cabc2@group.calendar.google.com"
  }
};
