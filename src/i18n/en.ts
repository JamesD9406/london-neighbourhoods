// English is the source language: other language files must have exactly the same keys.
// Place and street names stay in English on purpose in every language: they match the signs people will see.
// Content (neighbourhoods, parks, notes) is keyed by the id used in src/data.
import type { Plural } from './plural';

export const en = {
  // ── Interface: buttons, labels, messages and page text ──
  title: 'London, Ontario',
  subtitle: 'Get to know your new city: neighbourhoods, libraries, ServiceOntario, parks and coffee.',
  language: 'Language',
  searchLabel: 'Search places, activities or addresses',
  searchPlaceholder: 'Try: coffee, Byron, library…',
  themeToDark: 'Switch to dark mode',
  themeToLight: 'Switch to light mode',
  tabPlaces: 'Places',
  tabAddress: 'Address or intersection',
  addrLabel: 'Search a street, intersection or address',
  addrPlaceholder: 'Try: Dundas & Richmond, or 251 Dundas St',
  addrHint: 'Type a street name, or two streets with “&” between them.',
  addrLoading: 'Loading streets…',
  addrNone: 'No streets or intersections match. Check the spelling, or type fewer letters.',
  addrOnline: 'Look up this address online',
  addrOnlineNote: 'House numbers need internet. Your search is sent to OpenStreetMap’s search service.',
  addrOffline: 'You are offline. Streets and intersections still work; house numbers need internet.',
  addrFailed: 'The online lookup didn’t work. Try again, or search for the nearest intersection.',
  addrNoAddress: 'No address found. Check the number and street, or search for the nearest intersection.',
  addrKind: 'Search result',
  addrStreet: 'Street',
  addrIntersection: 'Intersection',
  nearest: 'Nearest',
  fromOsm: 'Location from OpenStreetMap.',
  noResults: 'No matches. Try another word.',
  show: 'Show on map',
  layers: { neighbourhood: 'Neighbourhoods', library: 'Libraries', serviceontario: 'ServiceOntario', park: 'Parks', cafe: 'Coffee' },
  type: { neighbourhood: 'Neighbourhood', library: 'Public library', serviceontario: 'ServiceOntario office', park: 'Park', cafe: 'Coffee shop' },
  about: {
    library: 'Free library card with proof of address. Every branch has free Wi-Fi and computers, plus printing and photocopying.',
    serviceontario: 'Health cards (OHIP), driver’s licences, Ontario photo cards and birth certificates. Bring your documents and check hours before you go.',
    cafe: 'Coffee, tea and snacks. A relaxed place to meet someone or to practise ordering in English. Check opening hours before you go.',
  },
  servicesHere: 'Also at this branch',
  // Keyed by service in src/data/libraries.json; only list what the library's own pages confirm.
  libraryServices: {
    settlement: 'Settlement workers to help newcomers (drop in, no appointment needed)',
    labs: 'The Labs: 3D printers, sewing machines, a recording studio and more',
    'accessible-computers': 'Computers with screen reader and magnifier software',
    'braille-printer': 'Braille printer',
    'digital-piano': 'Digital piano with headphones',
  },
  timsNote: 'Tim Hortons (“Timmies”) is Canada’s best-known coffee chain. A “double-double” is a coffee with two creams and two sugars.',
  parksTitle: 'Parks and nature',
  coffeePrint: {
    one: 'The interactive version also shows {n} coffee shop.',
    other: 'The interactive version also shows {n} coffee shops.',
  } as Plural,
  cafesSource: 'Coffee shops from OpenStreetMap',
  tags: {
    food: 'Food', coffee: 'Coffee', shopping: 'Shopping', parks: 'Parks', walks: 'Walks', arts: 'Arts',
    nightlife: 'Evenings out', students: 'Students', errands: 'Errands', history: 'History', events: 'Events',
    market: 'Market', transit: 'Bus connections', 'first-outing': 'Good first outing',
  },
  nearby: 'Nearby',
  address: 'Address',
  approximate: 'Map location is approximate.',
  directions: 'Directions (needs internet)',
  officialPage: 'Official page (needs internet)',
  website: 'Website (needs internet)',
  zoomIn: 'Zoom in', zoomOut: 'Zoom out', resetMap: 'Show all of London',
  zoomHint: 'Hold Ctrl and scroll to zoom the map', zoomHintMac: 'Hold ⌘ and scroll to zoom the map',
  mapLabel: 'Map of London, Ontario',
  tabMap: 'Map', tabList: 'List', tabEvents: 'Events',
  // ── Events tab: library programs, loaded from the library's calendar when the tab is opened ──
  eventsTitle: 'Library events this week',
  eventsIntro: 'Free programs at London Public Library over the next 7 days. Event details come from the library and are in English.',
  eventsNote: 'Opening this tab loads the library’s event calendar from its calendar service (Communico).',
  eventsNewcomer: 'Newcomer and English-learning events only',
  eventsBranch: 'Branch', eventsAllBranches: 'All branches',
  eventsAge: 'Age group', eventsAllAges: 'All ages',
  eventsLoading: 'Loading events…',
  eventsFailed: 'The events didn’t load. Try again later, or open the library’s full calendar.',
  eventsOffline: 'You are offline. These are the events saved on your last visit.',
  eventsUpdated: 'Updated',
  eventsNone: 'No events match. Try another branch or age group, or include all events.',
  eventsRegister: 'Registration required',
  eventsChanged: 'This event has changed. Check the details before you go.',
  eventsMoved: 'Moved to',
  eventsDetails: 'Details and registration (needs internet)',
  eventsCalendar: 'Full library calendar (needs internet)',
  // Keyed by the library's own age-group names.
  eventAges: {
    'Babies birth-1': 'Babies (under 1)', Children: 'Children', Teens: 'Teens',
    Adults: 'Adults', 'Older Adults': 'Older adults', Families: 'Families',
  },
  close: 'Close',
  offlineReady: 'Saved for offline use',
  offlineNow: 'You are offline. Everything here still works.',
  downloadPdf: 'Download printable PDF',
  printNow: 'Print this guide',
  tipsTitle: 'Exploring with confidence',
  tips: [
    'Get to know a place in daylight first. After dark, choose well-lit, busier streets, check when your bus home leaves, and consider travelling together.',
    'Quiet river paths and wooded trails are best explored in daylight. If you feel uncomfortable, go into an open business or change your route.',
    'Poverty, homelessness or someone’s appearance do not tell you whether they are dangerous. No guide can promise safety on every street.',
  ],
  outingsTitle: 'Three easy first outings',
  outings: [
    'Wortley Village: coffee and a stroll along Wortley Road.',
    'Downtown: Covent Garden Market and the Central Library.',
    'Byron: a daytime walk in Springbank Park.',
  ],
  beforeTitle: 'Before you go',
  before: 'Check opening hours, the weather, and your bus (LTC) there and back. Buses run less often in the evening. Neighbourhood names overlap and people use them differently.',
  disclaimer: 'Selected neighbourhoods, not an exhaustive list. Numbered points are approximate reference locations, not official boundaries. For orientation, not navigation. No safety ratings.',
  checked: 'Locations checked',
  translationNote: 'These translations were drafted with AI and haven’t been checked by a native speaker yet. If something is unclear, check the English version.',
  privacy: 'No tracking, no cookies, and your location is never requested. Only when you use them: house-number lookups are sent to OpenStreetMap’s search service, and the Events tab loads the library’s event calendar.',
  mapData: 'Map data © OpenStreetMap contributors',
  printTitle: 'London, Ontario — get your bearings',
  printSubtitle: 'Numbers on the map match the descriptions. North is up.',
  libraries: 'Public libraries',
  offices: 'ServiceOntario offices',
  scanForApp: 'Interactive version, works offline:',

  // ── Neighbourhoods: name and description, keyed by id in src/data/neighbourhoods.json ──
  neighbourhoods: {
    downtown: {
      name: 'Downtown',
      text: 'Start here for Covent Garden Market, restaurants, the library and events. This is London’s busy centre. If you stay out in the evening, check when the last bus home leaves before you go.',
    },
    'richmond-row': {
      name: 'Richmond Row',
      text: 'The stretch of Richmond north of downtown is a go-to for restaurants, shops and an evening out. It can feel lively and noisy late at night.',
    },
    woodfield: {
      name: 'Woodfield',
      text: 'Just east of the core: older houses, leafy streets and an easy walk toward Victoria Park. Come for a relaxed look at London’s heritage streets.',
    },
    'old-north': {
      name: 'Old North',
      text: 'Tree-lined streets and older homes between downtown and the university area. A pleasant place for a daytime walk and a look at established London.',
    },
    'wortley-village': {
      name: 'Old South / Wortley Village',
      text: 'This is where you go for a village feeling inside the city: coffee, independent shops and a stroll along Wortley Road. An easy first neighbourhood outing.',
    },
    'old-east-village': {
      name: 'Old East Village',
      text: 'Come for independent businesses, arts and performance spaces, and the Western Fair District nearby. Explore with a destination in mind; the feel changes from street to street.',
    },
    soho: {
      name: 'SoHo',
      text: 'The name means “south of Horton”. A neighbourhood close to downtown and the river, with older homes and redevelopment. Useful to recognize when people describe central London.',
    },
    blackfriars: {
      name: 'Blackfriars / Petersville',
      text: 'A small historic area across the river from downtown. Blackfriars Bridge and nearby river paths make a good starting point for a walk.',
    },
    western: {
      name: 'Western / Broughdale',
      text: 'University buildings, students and busy term-time streets. Visit for the campus and events; check parking and visitor access before going.',
    },
    masonville: {
      name: 'Masonville',
      text: 'When someone says Masonville, they often mean the north-end mall and surrounding shops and restaurants. Handy for a shopping trip; roads are busy.',
    },
    'hyde-park': {
      name: 'Hyde Park',
      text: 'The northwest shopping-and-neighbourhood area around Hyde Park Road. Good for errands and restaurants; distances between stops can be longer than they look.',
    },
    oakridge: {
      name: 'Oakridge',
      text: 'Established west-end streets, shopping along Oxford and access toward the river. Think everyday errands mixed with quiet residential pockets.',
    },
    byron: {
      name: 'Byron',
      text: 'A west-end village feel, with Springbank Park nearby and Boler Mountain to the south. A favourite direction for a park outing or outdoor activity.',
    },
    'river-bend': {
      name: 'River Bend / West 5',
      text: 'Farther west: newer neighbourhoods, the West 5 area and nearby woodland walks. Choose an official trail entrance and check trail conditions.',
    },
    westmount: {
      name: 'Westmount',
      text: 'A southwest area Londoners associate with shopping and established residential streets. Handy for everyday services around Wonderland and Commissioners.',
    },
    lambeth: {
      name: 'Lambeth',
      text: 'The southwest village that became part of London. Come for local shops and community places; allow more travel time from the city centre.',
    },
    'white-oaks': {
      name: 'White Oaks',
      text: 'South-end shopping around White Oaks Mall and Wellington Road, with residential streets nearby. Useful for errands and meeting up over food.',
    },
    'pond-mills': {
      name: 'Pond Mills / Westminster',
      text: 'Southeast neighbourhoods near ponds, natural areas and everyday services. Use marked public trails; wooded routes are better explored in daylight.',
    },
    argyle: {
      name: 'Argyle',
      text: 'A broad east-end area with shopping along Dundas and many residential streets. A practical place for errands; “Argyle” covers more than one small pocket.',
    },
    fanshawe: {
      name: 'Huron Heights / Fanshawe',
      text: 'Northeast London around Fanshawe College and surrounding neighbourhoods. Think campus activities, local services and parks; the conservation area is farther northeast.',
    },
  },

  // ── Parks: description, keyed by id in src/data/parks.json (park names stay in English) ──
  parks: {
    'park-springbank': 'London’s largest park, stretching along the Thames. Paved paths for walking and cycling, picnic areas, and Storybook Gardens for young children (admission charged).',
    'park-victoria': 'Downtown’s main park. Summer festivals and events, and an outdoor skating rink in winter.',
    'park-harris': 'A big open park beside the river at the edge of downtown, used for outdoor concerts and festivals. A good place to join the riverside paths.',
    'park-forks': 'Where the two branches of the Thames meet, next to downtown. The Thames Valley Parkway, a long paved path along the river, passes through here.',
    'park-gibbons': 'A river park north of downtown with a playground, open lawns and paths along the water. Popular with families.',
    'park-thames': 'A riverside park near SoHo with sports fields and paths along the Thames.',
    'park-greenway': 'Sports fields and river paths west of downtown. Follow the river west to reach Springbank Park.',
    'park-kiwanis': 'A long east-end park along the river, with sports fields and walking and cycling paths.',
    'park-white-oaks': 'A south-end community park with sports fields and open space, close to White Oaks Mall.',
    'park-fanshawe-ca': 'A large conservation area around Fanshawe Lake in the northeast: walking and cycling trails, picnics and camping. An entry fee applies.',
    'park-westminster-ponds': 'A natural area of ponds and woods with trails and boardwalks. Look for birds and turtles; stay on marked trails.',
    'park-sifton-bog': 'A boardwalk leads into a rare bog, unusual for a city. A short, quiet nature walk in the west end.',
    'park-medway': 'Wooded valley trails along Medway Creek, near Western University. Trails can be steep and muddy; wear good shoes.',
    'park-meadowlily': 'Woods and meadows along the Thames in the east end, reached by the historic Meadowlily Bridge.',
    'park-warbler-woods': 'Quiet forest trails in Byron, in the west end. Best in daylight; stay on marked trails.',
  },

  // ── Notes: extra location details, keyed by id in src/data/libraries.json and src/data/places.json ──
  notes: {
    'lpl-bostwick': 'Inside the StarTech.com Community Centre',
    'lpl-glanworth': 'Open only a few hours a week. Check hours before you go.',
    'so-dundas-talbot': 'Bell Building, main entrance on Talbot St',
    'so-fanshawe-hyde-park': 'Inside Walmart',
    'so-wharncliffe-campbell': 'In East Lambeth Plaza',
  },
};

export type Strings = typeof en;
