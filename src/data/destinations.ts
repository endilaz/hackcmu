/**
 * Destinations for Spare Walk, within ~25 min walk of the CMU Fence
 * (40.4428, -79.9430).
 *
 * Verified: 2026-09-12.
 *
 * Coordinates were looked up individually via OpenStreetMap Nominatim
 * (https://nominatim.openstreetmap.org/search), one request at a time,
 * and each result was checked to be the actual landmark in Pittsburgh's
 * Oakland / Squirrel Hill / Schenley Park area (not a same-named place
 * elsewhere) and within ~1.4 km straight-line of the Fence. Straight-line
 * distance was computed with a haversine script and converted to walk
 * minutes via metres * 1.3 / 1.35 m/s / 60, per the app's estimate formula.
 *
 * Everything below verified cleanly against a named Nominatim/OSM result,
 * with one exception:
 *   - "westinghouse-memorial": OpenStreetMap has no node specifically
 *     tagged as the Westinghouse Memorial monument itself. As a proxy,
 *     this entry uses the coordinates of the adjacent, explicitly named
 *     "Westinghouse Pond" (OSM way 27574440, in Schenley Park), since the
 *     bronze memorial sits immediately beside that pond. The blurb
 *     describes the actual memorial; only the exact pin may be off by a
 *     short distance within the same small clearing.
 *
 * "cmu-fence" uses the app's own reference coordinate (given, not looked
 * up) since it IS the reference point.
 */
import type { Destination } from "../types";

export const DESTINATIONS: Destination[] = [
  {
    id: "cmu-fence",
    name: "The Fence (CMU)",
    lat: 40.4428,
    lng: -79.943,
    blurb:
      "Carnegie Mellon's hand-painted wooden fence, a campus landmark that students repaint at all hours to announce birthdays, events, and causes.",
    category: "campus",
  },
  {
    id: "walking-to-the-sky",
    name: "Walking to the Sky",
    lat: 40.4441403,
    lng: -79.9428881,
    blurb:
      "A roughly 100-foot stainless steel pole on CMU's campus by artist Jonathan Borofsky, with life-size human figures fixed along it appearing to walk up into the sky.",
    category: "art",
  },
  {
    id: "flagstaff-hill",
    name: "Flagstaff Hill",
    lat: 40.4400577,
    lng: -79.9441013,
    blurb:
      "An open grassy hillside at the edge of Schenley Park long used for sledding in winter, with clear sightlines down into the park.",
    category: "park",
  },
  {
    id: "westinghouse-memorial",
    name: "Westinghouse Memorial",
    lat: 40.4394571,
    lng: -79.9429542,
    blurb:
      "A 1930 monument to inventor George Westinghouse with a bronze relief panel set beside a small reflecting pool, tucked into a quiet corner of Schenley Park.",
    category: "park",
  },
  {
    id: "bigelow-monument",
    name: "Bigelow Monument",
    lat: 40.4401997,
    lng: -79.9472028,
    blurb:
      "A monument along Schenley Drive honoring Edward Manning Bigelow, the Pittsburgh public-works official credited with establishing the city's park system, including Schenley Park itself.",
    category: "art",
  },
  {
    id: "schenley-visitor-center",
    name: "Schenley Park Visitor Center",
    lat: 40.4383361,
    lng: -79.9465029,
    blurb:
      "A small cafe and Pittsburgh Parks Conservancy information point on Panther Hollow Road, serving as a trailhead for several of Schenley Park's wooded walking trails.",
    category: "food",
  },
  {
    id: "carnegie-museums",
    name: "Carnegie Museums of Art & Natural History",
    lat: 40.4430605,
    lng: -79.9499422,
    blurb:
      "Two museums under one roof on Forbes Avenue, including the natural history museum's dinosaur halls and a life-size cast of the diplodocus 'Dippy' outside the entrance.",
    category: "art",
  },
  {
    id: "craig-street",
    name: "S. Craig Street shops",
    lat: 40.4461113,
    lng: -79.9488793,
    blurb:
      "A stretch of South Craig Street in Oakland lined with small independent restaurants, cafes, and shops, a short walk north of the museums.",
    category: "food",
  },
  {
    id: "hiker-memorial",
    name: "The Hiker (Spanish-American War Memorial)",
    lat: 40.4418521,
    lng: -79.9504923,
    blurb:
      "A bronze statue of a Spanish-American War soldier known as 'The Hiker,' one of many casts of this design placed as war memorials in cities across the country, standing along Schenley Drive.",
    category: "art",
  },
  {
    id: "phipps-conservatory",
    name: "Phipps Conservatory",
    lat: 40.4388913,
    lng: -79.9487114,
    blurb:
      "A Victorian glasshouse botanical garden dating to 1893, with a series of connected rooms ranging from tropical ferns to desert plants.",
    category: "park",
  },
  {
    id: "frick-fine-arts",
    name: "Frick Fine Arts Building",
    lat: 40.4415607,
    lng: -79.9510942,
    blurb:
      "A University of Pittsburgh building built around an open Italian Renaissance-style cloister courtyard, home to the university's small fine arts gallery.",
    category: "campus",
  },
  {
    id: "panther-hollow-lake",
    name: "Panther Hollow Lake",
    lat: 40.4368616,
    lng: -79.9482278,
    blurb:
      "A small man-made lake at the bottom of the wooded Panther Hollow ravine in Schenley Park, a regular stop for ducks and geese along the park's loop trails.",
    category: "park",
  },
  {
    id: "schenley-plaza",
    name: "Schenley Plaza",
    lat: 40.4427237,
    lng: -79.9525627,
    blurb:
      "An open lawn and gathering space facing the Carnegie Library and museums, with a seasonal carousel, food kiosks, and lawn games like giant chess.",
    category: "park",
  },
  {
    id: "cathedral-of-learning",
    name: "Cathedral of Learning",
    lat: 40.4442951,
    lng: -79.953191,
    blurb:
      "The University of Pittsburgh's 42-story Gothic Revival tower, one of the tallest education buildings in the world, known for its Commons Room and dozens of Nationality Rooms in different cultural styles.",
    category: "view",
  },
  {
    id: "walnut-street",
    name: "Walnut Street, Shadyside",
    lat: 40.4511674,
    lng: -79.9338487,
    blurb:
      "The main shopping and dining street of Shadyside, lined with boutique clothing stores, restaurants, and cafes over several walkable blocks.",
    category: "food",
  },
  {
    id: "schenley-park-overlook",
    name: "Schenley Park Overlook",
    lat: 40.4305369,
    lng: -79.9451178,
    blurb:
      "A named lookout point in the wooded southern section of Schenley Park, reached via the park's trail network well south of the main lawns.",
    category: "view",
  },
];
