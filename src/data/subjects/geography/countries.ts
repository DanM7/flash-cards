export type Continent = "north-america" | "south-america" | "europe" | "africa" | "asia" | "oceania";

export interface Country {
  /** ISO 3166-1 numeric code, matching the map data. */
  id: string;
  name: string;
}

export interface GeographyUnit {
  id: string;
  unit: number;
  title: string;
  /** Phrase for descriptions, e.g. "Name all 22 countries of {region}". */
  region: string;
  /** Maps open zoomed out on this whole continent. */
  continent: Continent;
  countries: Country[];
}

/**
 * UN member states plus the two observer states (Vatican City, Palestine), grouped into regional units.
 * Tuvalu is left out because the map data has no shape for it.
 */
export const GEOGRAPHY_UNITS: GeographyUnit[] = [
  {
    id: "north-america-continental",
    unit: 1,
    title: "North America: Continental North & Central",
    region: "continental North and Central America",
    continent: "north-america",
    countries: [
      { id: "084", name: "Belize" },
      { id: "124", name: "Canada" },
      { id: "188", name: "Costa Rica" },
      { id: "222", name: "El Salvador" },
      { id: "320", name: "Guatemala" },
      { id: "340", name: "Honduras" },
      { id: "484", name: "Mexico" },
      { id: "558", name: "Nicaragua" },
      { id: "591", name: "Panama" },
      { id: "840", name: "United States" }
    ]
  },
  {
    id: "north-america-islands",
    unit: 2,
    title: "North America: Island Nations",
    region: "the Caribbean island nations",
    continent: "north-america",
    countries: [
      { id: "028", name: "Antigua and Barbuda" },
      { id: "044", name: "Bahamas" },
      { id: "052", name: "Barbados" },
      { id: "192", name: "Cuba" },
      { id: "212", name: "Dominica" },
      { id: "214", name: "Dominican Republic" },
      { id: "308", name: "Grenada" },
      { id: "332", name: "Haiti" },
      { id: "388", name: "Jamaica" },
      { id: "659", name: "Saint Kitts and Nevis" },
      { id: "662", name: "Saint Lucia" },
      { id: "670", name: "Saint Vincent and the Grenadines" },
      { id: "780", name: "Trinidad and Tobago" }
    ]
  },
  {
    id: "south-america",
    unit: 3,
    title: "South America",
    region: "South America",
    continent: "south-america",
    countries: [
      { id: "032", name: "Argentina" },
      { id: "068", name: "Bolivia" },
      { id: "076", name: "Brazil" },
      { id: "152", name: "Chile" },
      { id: "170", name: "Colombia" },
      { id: "218", name: "Ecuador" },
      { id: "328", name: "Guyana" },
      { id: "600", name: "Paraguay" },
      { id: "604", name: "Peru" },
      { id: "740", name: "Suriname" },
      { id: "858", name: "Uruguay" },
      { id: "862", name: "Venezuela" }
    ]
  },
  {
    id: "europe-west",
    unit: 4,
    title: "Europe: West",
    region: "Western Europe",
    continent: "europe",
    countries: [
      { id: "020", name: "Andorra" },
      { id: "040", name: "Austria" },
      { id: "056", name: "Belgium" },
      { id: "208", name: "Denmark" },
      { id: "246", name: "Finland" },
      { id: "250", name: "France" },
      { id: "276", name: "Germany" },
      { id: "352", name: "Iceland" },
      { id: "372", name: "Ireland" },
      { id: "380", name: "Italy" },
      { id: "438", name: "Liechtenstein" },
      { id: "442", name: "Luxembourg" },
      { id: "470", name: "Malta" },
      { id: "492", name: "Monaco" },
      { id: "528", name: "Netherlands" },
      { id: "578", name: "Norway" },
      { id: "620", name: "Portugal" },
      { id: "674", name: "San Marino" },
      { id: "724", name: "Spain" },
      { id: "752", name: "Sweden" },
      { id: "756", name: "Switzerland" },
      { id: "826", name: "United Kingdom" },
      { id: "336", name: "Vatican City" }
    ]
  },
  {
    id: "europe-east",
    unit: 5,
    title: "Europe: East",
    region: "Eastern Europe",
    continent: "europe",
    countries: [
      { id: "008", name: "Albania" },
      { id: "112", name: "Belarus" },
      { id: "070", name: "Bosnia and Herzegovina" },
      { id: "100", name: "Bulgaria" },
      { id: "191", name: "Croatia" },
      { id: "196", name: "Cyprus" },
      { id: "203", name: "Czechia" },
      { id: "233", name: "Estonia" },
      { id: "300", name: "Greece" },
      { id: "348", name: "Hungary" },
      { id: "428", name: "Latvia" },
      { id: "440", name: "Lithuania" },
      { id: "498", name: "Moldova" },
      { id: "499", name: "Montenegro" },
      { id: "807", name: "North Macedonia" },
      { id: "616", name: "Poland" },
      { id: "642", name: "Romania" },
      { id: "643", name: "Russia" },
      { id: "688", name: "Serbia" },
      { id: "703", name: "Slovakia" },
      { id: "705", name: "Slovenia" },
      { id: "804", name: "Ukraine" }
    ]
  },
  {
    id: "africa-north",
    unit: 6,
    title: "Africa: North",
    region: "North Africa",
    continent: "africa",
    countries: [
      { id: "012", name: "Algeria" },
      { id: "854", name: "Burkina Faso" },
      { id: "132", name: "Cabo Verde" },
      { id: "148", name: "Chad" },
      { id: "262", name: "Djibouti" },
      { id: "818", name: "Egypt" },
      { id: "232", name: "Eritrea" },
      { id: "231", name: "Ethiopia" },
      { id: "270", name: "Gambia" },
      { id: "434", name: "Libya" },
      { id: "466", name: "Mali" },
      { id: "478", name: "Mauritania" },
      { id: "504", name: "Morocco" },
      { id: "562", name: "Niger" },
      { id: "686", name: "Senegal" },
      { id: "706", name: "Somalia" },
      { id: "729", name: "Sudan" },
      { id: "788", name: "Tunisia" }
    ]
  },
  {
    id: "africa-central",
    unit: 7,
    title: "Africa: Central",
    region: "Central Africa",
    continent: "africa",
    countries: [
      { id: "204", name: "Benin" },
      { id: "108", name: "Burundi" },
      { id: "120", name: "Cameroon" },
      { id: "140", name: "Central African Republic" },
      { id: "384", name: "Côte d'Ivoire" },
      { id: "180", name: "Democratic Republic of the Congo" },
      { id: "226", name: "Equatorial Guinea" },
      { id: "266", name: "Gabon" },
      { id: "288", name: "Ghana" },
      { id: "324", name: "Guinea" },
      { id: "624", name: "Guinea-Bissau" },
      { id: "404", name: "Kenya" },
      { id: "430", name: "Liberia" },
      { id: "566", name: "Nigeria" },
      { id: "178", name: "Republic of the Congo" },
      { id: "646", name: "Rwanda" },
      { id: "678", name: "São Tomé and Príncipe" },
      { id: "694", name: "Sierra Leone" },
      { id: "728", name: "South Sudan" },
      { id: "768", name: "Togo" },
      { id: "800", name: "Uganda" }
    ]
  },
  {
    id: "africa-south",
    unit: 8,
    title: "Africa: South",
    region: "Southern Africa",
    continent: "africa",
    countries: [
      { id: "024", name: "Angola" },
      { id: "072", name: "Botswana" },
      { id: "174", name: "Comoros" },
      { id: "748", name: "Eswatini" },
      { id: "426", name: "Lesotho" },
      { id: "450", name: "Madagascar" },
      { id: "454", name: "Malawi" },
      { id: "480", name: "Mauritius" },
      { id: "508", name: "Mozambique" },
      { id: "516", name: "Namibia" },
      { id: "690", name: "Seychelles" },
      { id: "710", name: "South Africa" },
      { id: "834", name: "Tanzania" },
      { id: "894", name: "Zambia" },
      { id: "716", name: "Zimbabwe" }
    ]
  },
  {
    id: "asia-west",
    unit: 9,
    title: "Asia: West",
    region: "West Asia",
    continent: "asia",
    countries: [
      { id: "004", name: "Afghanistan" },
      { id: "051", name: "Armenia" },
      { id: "031", name: "Azerbaijan" },
      { id: "048", name: "Bahrain" },
      { id: "268", name: "Georgia" },
      { id: "364", name: "Iran" },
      { id: "368", name: "Iraq" },
      { id: "376", name: "Israel" },
      { id: "400", name: "Jordan" },
      { id: "398", name: "Kazakhstan" },
      { id: "414", name: "Kuwait" },
      { id: "417", name: "Kyrgyzstan" },
      { id: "422", name: "Lebanon" },
      { id: "512", name: "Oman" },
      { id: "586", name: "Pakistan" },
      { id: "275", name: "Palestine" },
      { id: "634", name: "Qatar" },
      { id: "682", name: "Saudi Arabia" },
      { id: "760", name: "Syria" },
      { id: "762", name: "Tajikistan" },
      { id: "792", name: "Turkey" },
      { id: "795", name: "Turkmenistan" },
      { id: "784", name: "United Arab Emirates" },
      { id: "860", name: "Uzbekistan" },
      { id: "887", name: "Yemen" }
    ]
  },
  {
    id: "asia-east",
    unit: 10,
    title: "Asia: East",
    region: "East Asia",
    continent: "asia",
    countries: [
      { id: "050", name: "Bangladesh" },
      { id: "064", name: "Bhutan" },
      { id: "096", name: "Brunei" },
      { id: "116", name: "Cambodia" },
      { id: "156", name: "China" },
      { id: "356", name: "India" },
      { id: "360", name: "Indonesia" },
      { id: "392", name: "Japan" },
      { id: "418", name: "Laos" },
      { id: "458", name: "Malaysia" },
      { id: "462", name: "Maldives" },
      { id: "496", name: "Mongolia" },
      { id: "104", name: "Myanmar" },
      { id: "524", name: "Nepal" },
      { id: "408", name: "North Korea" },
      { id: "608", name: "Philippines" },
      { id: "702", name: "Singapore" },
      { id: "410", name: "South Korea" },
      { id: "144", name: "Sri Lanka" },
      { id: "764", name: "Thailand" },
      { id: "626", name: "Timor-Leste" },
      { id: "704", name: "Vietnam" }
    ]
  },
  {
    id: "oceania",
    unit: 11,
    title: "Oceania",
    region: "Oceania",
    continent: "oceania",
    countries: [
      { id: "036", name: "Australia" },
      { id: "242", name: "Fiji" },
      { id: "296", name: "Kiribati" },
      { id: "584", name: "Marshall Islands" },
      { id: "583", name: "Micronesia" },
      { id: "520", name: "Nauru" },
      { id: "554", name: "New Zealand" },
      { id: "585", name: "Palau" },
      { id: "598", name: "Papua New Guinea" },
      { id: "882", name: "Samoa" },
      { id: "090", name: "Solomon Islands" },
      { id: "776", name: "Tonga" },
      { id: "548", name: "Vanuatu" }
    ]
  }
];
