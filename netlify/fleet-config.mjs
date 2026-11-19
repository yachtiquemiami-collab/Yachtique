/*
  YACHTIQUE FLEET SETTINGS
  The fleet on the site is pulled live from YCN Miami (ycn.yachts). Edit this file to change
  how it shows on yachtique.co. Changes go live about a minute after you commit.

  - markup:         added to every YCN price. 0.20 = +20%.
  - roundTo:        prices are rounded UP to this step, e.g. 5 → $2,118 becomes $2,120.
  - brokerShare:    what YCN charges us, as a share of its public price (its broker page shows
                    public × 0.85; checked on all 101 prices, 8 Nov 2026). Used for the margin
                    shown to Nektarios in the inquiry email and on the Accept page.
  - brokerListedOnly: true = only show yachts that are on YCN's broker page (the ones
                    YCN offers to brokers, with their live calendar).
  - featured:       the yachts shown first on the home page (up to 6), in this order. The rest
                    appear when a visitor clicks "View all" or searches by date.
  - hide:           yachts to leave off the site, by their handle (the last part of the
                    ycn.yachts/products/... link), e.g. "bimini-blue".
  - priceOverrides: a fixed price for one yacht and duration, used instead of the markup.
                    e.g. "bimini-blue": { "4 hours": 2400 }
  - onboard:        what YCN tells brokers on WhatsApp but doesn't put on its website, per yacht handle:
                    included (amenities on board), toys (replaces YCN's toy list), baths.
                    Paste from YCN's WhatsApp listing; never put YCN's prices here (they're our costs).
  - calendars:      backup list of each yacht's Google Calendar. The site reads the current
                    list from YCN's broker page first and only falls back to this.
  - direct:         yachts we get straight from their owner (not on YCN), by handle. Prices here
                    are NET (what the owner charges us). The site sells them at the same margin as
                    YCN yachts: net ÷ brokerShare × (1 + markup), rounded up like the rest.
                    net:        Friday–Sunday net price per duration
                    netWeekday: Monday–Thursday net price per duration (optional)
                    calendar + calendarMatch: the owner's Google Calendar, and the words an event title
                    must contain to count as this yacht's booking (the calendar can hold other boats).
*/
export default {
  markup: 0.20,
  roundTo: 5,
  brokerShare: 0.85,
  brokerListedOnly: true,
  featured: ["aqua-life", "bimini-blue", "sea-suite", "dont-tell-mom", "orca", "makebighappen"],
  hide: [],
  priceOverrides: {},
  onboard: {
    // YCN WhatsApp listing, 11 Nov 2026
    "moltopiaciuto": {
      included: ["Cooler and ice", "Sodas and water", "Towels", "LED lights", "Starlink Wi-Fi"],
      toys: ["Floating mat", "Snorkeling gear", "Tender (50hp dinghy)"],
      baths: 2,
    },
  },
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
  },
  direct: {
    // Owner's WhatsApp listing ("Horizon FD90 Aston Martin"), 19 Nov 2026. Net broker prices, gratuity included.
    "aqua-life": {
      name: "Aqua Life",
      builder: "Horizon FD90 Sky Lounge",
      feet: 92,
      year: 2021,
      type: "Motor Yacht",
      guests: 13,
      net: { "4 hours": 6000, "6 hours": 8000, "8 hours": 10000 },
      netWeekday: { "4 hours": 5500, "6 hours": 7500, "8 hours": 9000 },
      gratuityIncluded: true,
      departure: "Aston Martin Residences, Downtown Miami",
      crew: ["Captain", "Crew"],
      toys: ["2 Seabobs", "Jet ski (1 hour included)"],
      rules: ["No smoking", "No red wine", "No pets"],
      calendar: "hypertoyz11@gmail.com",
      calendarMatch: ["horizon", "aqua life", "aqualife"],
      summary: "A 2021 Horizon FD90 Sky Lounge departing from the private superyacht marina at the Aston Martin Residences in Downtown Miami, where the Miami River meets Biscayne Bay.",
      about: [
        { p: "A 2021 Horizon FD90 Sky Lounge departing from the private superyacht marina at the Aston Martin Residences in Downtown Miami, where the Miami River meets Biscayne Bay. Up to 13 guests, with gratuity included in the price." },
        { h: "Deck spaces" },
        { p: "Panoramic skyline views from the bow lounge with its two tables, and a sky lounge flybridge with seating, a bar and a sun pad." },
        { h: "Interior" },
        { p: "A modern open-plan salon with wraparound lounge seating, a dining table and a marble bar." },
        { h: "After dark" },
        { p: "Underwater LED lighting around the hull for evening cruises on the bay." },
        { h: "Water toys" },
        { p: "Two Seabobs and a jet ski (one hour of jet ski use included; a second jet ski is available)." },
        { h: "On board" },
        { p: "No smoking, no red wine and no pets." },
      ],
      images: [
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-RHLMps2/0/LJcbJNb4JJg4Ctz36WNcLxMgmPbtc6K85nPqtwfmj/X2/DJI_20260814110017_0583_D-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-t225tjT/0/KP8v8RcNWwjWQCbzbmhfL6G4fZp3VzGP2JZZmhKPh/X2/DJI_20260814110112_0613_D-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-mZ5shXs/0/KVT775RHNGDbZBvrGtWGcvmpwNL6tz7WwfWxp5LQM/X2/DJI_20260814113258_0830_D-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-kJdcVNZ/0/NWjdDDccZKHVSrHNzDbgFq5gFGBjsbtvnczW6tJpj/X2/DJI_20260814110210_0631_D-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-J5jHkJH/0/LzM626bHCGrRqdmXN66TrhrH43nNFpVZk9R6Bpnq8/X2/20261016_153126-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-dKCPjmm/0/KDL5qTQRTcMZ3xFKc3FCZFDHTKzmT4Dx5tsrqQtfc/X2/DSC04836-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-cbkDFRf/0/MLTjMNxSMTXK79PpcwstSJQVZXhnKt55dsm4QKZfP/X2/DSC04884-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-ck5QPkM/0/L8FTsTHhHFvRJGpDZmPCs6S7cV33Nb8NMHH3C2DNn/X2/DSC04891-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-3P8PsMM/0/Kp5bkbztbMHtd2XmmCBf4CfF3zgwLwD7B6KBTRBRj/X2/DSC04851-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-R6wh6HP/0/LFMsjxdtrzxvWZDLDzMqq6965fWHGGFFgphjmPLSz/X2/DSC04937-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-rvqDgmX/0/MHfgzNmzH3NSzkNwjF3nD73GNdfjDvVFNWZ7qGghM/X2/20261028_163959-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-GsdsGLR/0/MsqnJtvMdsZfs595457Vkqs74xnrc7RR2HXDp66Gw/X2/DSC05090-HDR-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-5DVtLR6/0/KSHxQQnHLCzNCfmcTbwFH4FKqsVfcSmPwXQpJzDhB/X2/DSC05015-HDR-X2.jpg",
        "https://photos.smugmug.com/AQUA-LIFE-2021-92-Horizon-FD90-Sky-Lounge/i-jDFxCSB/0/NCvgP2qKcrJPmGMsx7tpZxWxGcxS8jMj9f62Zv2JL/X2/20261028_070122-X2.jpg"
      ]
    }
  }
};
