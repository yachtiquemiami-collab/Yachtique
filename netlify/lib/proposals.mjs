// Proposals written into the site itself (a quick way to publish one without the Google Sheet).
// Most proposals should live in the Proposals tab of the Yachtique Google Sheet instead: one row per yacht option,
// all rows with the same ID make one page at yachtique.co/p/<ID>. See README.
//
// Fields: date (YYYY-MM-DD), guests, time, pickup, client (optional, shown as "Prepared for"),
// options: [{ yacht: handle, label, note, prices: { "4 hours": 2690, ... } (optional, else website rates), label_es, note_es }],
// terms: [sentences], terms_es, validUntil (YYYY-MM-DD, optional).
// This repo is public: never put client names, phone numbers or addresses here. Use the Sheet for those.
export const PROPOSALS = {
  "oct24-k9m4": {
    date: "2026-10-24",
    guests: 13,
    time: "Daytime charter", time_es: "Alquiler de día",
    pickup: "Your private dock, North Bay Village", pickup_es: "Su muelle privado, North Bay Village",
    options: [
      { yacht: "kilauea", label: "Best value", label_es: "Mejor precio",
        note: "Italian flybridge yacht with a wet bar, dining area and sun loungers up top. Captain and stewardess, floating mat and snorkeling gear.",
        note_es: "Yate italiano con flybridge, bar, comedor y tumbonas arriba. Capitán y azafata, colchoneta flotante y equipo de snorkel.",
        prices: { "4 hours": 2690, "6 hours": 3390, "8 hours": 4240 } },
      { yacht: "moltopiaciuto", label: "Same price, more yacht", label_es: "Mismo precio, más yate",
        note: "Award-winning Prestige design, refined and smooth on the water. Captain and stewardess, floating island, tender and snorkeling gear.",
        note_es: "Diseño Prestige premiado, elegante y suave en el agua. Capitán y azafata, isla flotante, bote auxiliar y equipo de snorkel.",
        prices: { "4 hours": 2690, "6 hours": 3390, "8 hours": 4240 } },
      { yacht: "exumas", label: "Most space & toys", label_es: "Más espacio y juguetes",
        note: "A true private escape with room for the whole group. Captain and stewardess, floating island, tender, water scooter and snorkeling gear.",
        note_es: "Una verdadera escapada privada con espacio para todo el grupo. Capitán y azafata, isla flotante, bote auxiliar, scooter acuático y equipo de snorkel.",
        prices: { "4 hours": 3675, "6 hours": 5085, "8 hours": 6500 } },
      { yacht: "sea-suite", label: "Fastest & sleekest", label_es: "El más rápido y elegante",
        note: "The fastest, most striking way to see Miami from the water. Italian sport yacht with captain and stewardess, floating mat on board.",
        note_es: "La forma más rápida e impactante de ver Miami desde el agua. Yate deportivo italiano con capitán y azafata, colchoneta flotante a bordo.",
        prices: { "4 hours": 4240, "6 hours": 5655, "8 hours": 7060 } },
    ],
    terms: [
      "Prices are per charter and already include pickup and drop-off at your private dock. They exclude Florida sales tax and crew gratuity.",
      "We confirm the dock details once we have your address. A deposit holds your yacht and date.",
    ],
    terms_es: [
      "Los precios son por alquiler e incluyen la recogida y el regreso en su muelle privado. No incluyen el impuesto sobre las ventas de Florida ni la propina de la tripulación.",
      "Confirmamos los detalles del muelle cuando tengamos su dirección. Un depósito reserva su yate y su fecha.",
    ],
  },
};
