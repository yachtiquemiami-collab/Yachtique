// Proposals written into the site itself (a quick way to publish one without the Google Sheet).
// Most proposals should live in the Proposals tab of the Yachtique Google Sheet instead: one row per yacht option,
// all rows with the same ID make one page at yachtique.co/p/<ID>. See README.
//
// Fields: date (YYYY-MM-DD), guests, time, pickup, client (optional, shown as "Prepared for"),
// options: [{ yacht: handle, label, note, prices: { "4 hours": 2690, ... } (optional, else website rates), label_es, note_es }],
// terms: [sentences], terms_es, validUntil (YYYY-MM-DD, optional), discount ("10%" or dollars off each price, optional).
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
      "Prices are per charter and already include pickup and drop-off at your private dock. They exclude Florida sales tax and gratuity.",
      "We confirm the dock details once we have your address. A deposit holds your yacht and date.",
    ],
    terms_es: [
      "Los precios son por alquiler e incluyen la recogida y el regreso en su muelle privado. No incluyen el impuesto sobre las ventas de Florida ni la propina.",
      "Confirmamos los detalles del muelle cuando tengamos su dirección. Un depósito reserva su yate y su fecha.",
    ],
  },
  "nov15-xg9t": {
    date: "2026-11-15",
    guests: 13,
    time: "Birthday charter · start time flexible", time_es: "Alquiler de cumpleaños · hora de inicio flexible",
    pickup: "Marina in Miami (shown under each yacht)", pickup_es: "Marina en Miami (indicada en cada yate)",
    options: [
      { yacht: "kilauea", label: "Best value", label_es: "Mejor precio",
        note: "Italian flybridge yacht with a wet bar, dining area and sun loungers up top for the birthday toast. Captain and stewardess, floating mat and snorkeling gear. Boards at Bill Bird Marina, Haulover.",
        note_es: "Yate italiano con flybridge, bar, comedor y tumbonas arriba para el brindis de cumpleaños. Capitán y azafata, colchoneta flotante y equipo de snorkel. Embarque en Bill Bird Marina, Haulover.",
        prices: { "4 hours": 2690, "6 hours": 3390, "8 hours": 4240 } },
      { yacht: "moltopiaciuto", label: "Same price, more yacht", label_es: "Mismo precio, más yate",
        note: "Award-winning Prestige design, refined and smooth on the water. Captain and stewardess, floating island, tender and snorkeling gear. Boards at Bill Bird Marina, Haulover.",
        note_es: "Diseño Prestige premiado, elegante y suave en el agua. Capitán y azafata, isla flotante, bote auxiliar y equipo de snorkel. Embarque en Bill Bird Marina, Haulover.",
        prices: { "4 hours": 2690, "6 hours": 3390, "8 hours": 4240 } },
      { yacht: "exumas", label: "Most space for the party", label_es: "Más espacio para la fiesta",
        note: "Room for the whole group to celebrate. Captain and stewardess, floating island, tender, water scooter and snorkeling gear. Boards at Bill Bird Marina, Haulover.",
        note_es: "Espacio para que todo el grupo celebre. Capitán y azafata, isla flotante, bote auxiliar, scooter acuático y equipo de snorkel. Embarque en Bill Bird Marina, Haulover.",
        prices: { "4 hours": 3675, "6 hours": 5085, "8 hours": 6500 } },
      { yacht: "sea-suite", label: "Fastest & sleekest", label_es: "El más rápido y elegante",
        note: "The most striking way to celebrate on the water. Italian sport yacht with captain and stewardess, floating mat on board. Boards at Miami Beach Marina, South Beach.",
        note_es: "La forma más impactante de celebrar en el agua. Yate deportivo italiano con capitán y azafata, colchoneta flotante a bordo. Embarque en Miami Beach Marina, South Beach.",
        prices: { "4 hours": 4240, "6 hours": 5655, "8 hours": 7060 } },
    ],
    terms: [
      "Prices are per charter, boarding at the marina shown for each yacht. They exclude Florida sales tax and gratuity.",
      "Charters run between 9am and 10pm; pick the start time that suits the party and we confirm it with the captain.",
      "Want a cake, balloons, decorations or catering on board for the birthday? Tell us and we arrange it.",
      "A deposit holds your yacht and date.",
    ],
    terms_es: [
      "Los precios son por alquiler, con embarque en la marina indicada en cada yate. No incluyen el impuesto sobre las ventas de Florida ni la propina.",
      "Los alquileres son entre las 9am y las 10pm; elija la hora de inicio que mejor le convenga y la confirmamos con el capitán.",
      "¿Quiere pastel, globos, decoración o catering a bordo para el cumpleaños? Díganos y lo organizamos.",
      "Un depósito reserva su yate y su fecha.",
    ],
  },
};
