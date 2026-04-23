export type Question = {
  q: string;
  o: string[];
  a: number;
  e: string;
};

export type QuizConfig = {
  CODE: string;
  ADMIN_PASSWORD: string;
  WA: string;
  TIME: number;
  ADMIN: { name: string; school: string; dept: string };
  SCHOOLS: Record<string, string[]>;
  MAX_VIOLATIONS: number;
  QUESTIONS_PER_TEST: number;
  PORTAL_TITLE: string;
  PORTAL_SUBTITLE: string;
  LOGO_URL: string;
  TEST_START: string;
  TEST_END: string;
  REQUIRE_WEBCAM: boolean;
  ONE_ATTEMPT: boolean;
  AUTO_WHATSAPP: boolean;
};

export const DEFAULT_CONFIG: QuizConfig = {
  CODE: "INSIDEFUTA",
  ADMIN_PASSWORD: "MASTER2024",
  WA: "2348112476004",
  TIME: 1500,
  ADMIN: {
    name: "ISRAEL MARVELOUS ADEBISI",
    school: "SPS",
    dept: "Mathematical Science",
  },
  SCHOOLS: {
    SPS: [
      "Mathematical Science",
      "Physics Electronics",
      "Industrial Chemistry",
      "Statistics",
      "Library and Information Science",
      "Educational Technology",
    ],
    SBMS: [
      "Bachelor of Medicine and Surgery",
      "Public Health",
      "Human Anatomy",
      "Medical Laboratory Science",
      "Physiology",
    ],
    SOC: [
      "Information System",
      "Cyber Security",
      "Information Technology",
      "Software Engineering",
      "Data Science",
      "Computer Science",
    ],
    SAAT: [
      "Food Science and Technology",
      "Animal Production and Health",
      "Crop, Soil and Pest management",
      "Fisheries and Aquaculture Technology",
    ],
    
  "SIMME": [
    "Agricultural Engineering",
    "Chemical Engineering",
    "Civil & Environmental Engineering",
    "Industrial & Production Engineering",
    "Mechanical Engineering",
    "Metallurgical & Materials Engineering",
    "Mining Engineering"
  ],
  "SESE": [
    "Electrical and Electronics Engineering",
    "Computer Engineering",
    "Information and Communication Technology (ICT) Engineering",
    "Biomedical Engineering",
    "Mechatronics Engineering"
   ],
    SEMS: [
      "Applied Geophysics",
      "Applied Geology",
      "Meteorology and Climate Science",
    ],
    SET: [
      "Architecture",
      "Building Technology",
      "Estate Management",
      "Industrial Design",
      "Quantity Surveying",
    ],
  },
  MAX_VIOLATIONS: 3,
  QUESTIONS_PER_TEST: 30,
  PORTAL_TITLE: "INSIDE FUTA",
  PORTAL_SUBTITLE: "SMART TEST PORTAL",
  LOGO_URL: "https://files.catbox.moe/33ap4i.jpg",
  TEST_START: "",
  TEST_END: "",
  REQUIRE_WEBCAM: true,
  ONE_ATTEMPT: true,
  AUTO_WHATSAPP: true,
};

export const DEFAULT_BANK: Question[] = [
  { q: "Who wrote 'Things Fall Apart'?", o: ["Wole Soyinka", "Chinua Achebe", "Ngũgĩ wa Thiong'o", "Buchi Emecheta"], a: 1, e: "Published in 1958." },
  { q: "What is the capital of Australia?", o: ["Sydney", "Melbourne", "Canberra", "Brisbane"], a: 2, e: "Canberra was founded in 1913." },
  { q: "Which element has the chemical symbol 'Au'?", o: ["Silver", "Aluminum", "Gold", "Argon"], a: 2, e: "Au is from the Latin 'aurum'." },
  { q: "In what year did World War I begin?", o: ["1912", "1914", "1916", "1918"], a: 1, e: "July 1914." },
  { q: "Who painted the 'Sistine Chapel' ceiling?", o: ["Leonardo da Vinci", "Raphael", "Michelangelo", "Donatello"], a: 2, e: "Completed in 1512." },
  { q: "What is the largest desert in the world?", o: ["Sahara", "Arabian", "Gobi", "Antarctic"], a: 3, e: "The Antarctic is a polar desert." },
  { q: "Which economist wrote 'The Wealth of Nations'?", o: ["Karl Marx", "John Maynard Keynes", "Adam Smith", "Milton Friedman"], a: 2, e: "Smith published it in 1776." },
  { q: "What is the speed of light in a vacuum?", o: ["299,792 km/s", "150,000 km/s", "400,000 km/s", "1,000,000 km/s"], a: 0, e: "Approx 300,000 km/s." },
  { q: "Who was the first President of the United States?", o: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], a: 2, e: "George Washington (1789)." },
  { q: "What is the longest river in the world?", o: ["Amazon", "Nile", "Yangtze", "Mississippi"], a: 1, e: "The Nile River." },
  { q: "Which planet is known as the Red Planet?", o: ["Venus", "Jupiter", "Mars", "Saturn"], a: 2, e: "Mars has iron oxide surface." },
  { q: "Who wrote 'One Hundred Years of Solitude'?", o: ["Mario Vargas Llosa", "Gabriel García Márquez", "Jorge Luis Borges", "Pablo Neruda"], a: 1, e: "Published 1967." },
  { q: "What is the currency of Japan?", o: ["Yuan", "Won", "Yen", "Ringgit"], a: 2, e: "Japanese Yen." },
  { q: "Which organ filters blood in the human body?", o: ["Liver", "Heart", "Kidneys", "Lungs"], a: 2, e: "Renal filtration." },
  { q: "What is the hardest natural substance on Earth?", o: ["Quartz", "Diamond", "Topaz", "Corundum"], a: 1, e: "Diamond." },
  { q: "In which year did the Berlin Wall fall?", o: ["1987", "1989", "1991", "1993"], a: 1, e: "November 1989." },
  { q: "Who developed the theory of relativity?", o: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"], a: 2, e: "Albert Einstein." },
  { q: "What is the largest ocean on Earth?", o: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3, e: "Pacific Ocean." },
  { q: "Which country has the most UNESCO sites?", o: ["Italy", "China", "Spain", "France"], a: 0, e: "Italy holds the record." },
  { q: "What does 'DNA' stand for?", o: ["Deoxyribonucleic Acid", "Dinucleic Acid", "Double Nucleic Acid", "Dynamic Nucleic Acid"], a: 0, e: "Genetic code." },
  { q: "Who was the longest-reigning British monarch?", o: ["Victoria", "Elizabeth II", "George III", "Henry VIII"], a: 1, e: "Elizabeth II (70 years)." },
  { q: "What is the capital of Canada?", o: ["Toronto", "Vancouver", "Ottawa", "Montreal"], a: 2, e: "Ottawa." },
  { q: "Which gas makes up 78% of Earth's atmosphere?", o: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"], a: 2, e: "Nitrogen." },
  { q: "Who composed the 'Four Seasons'?", o: ["Bach", "Mozart", "Vivaldi", "Beethoven"], a: 2, e: "Antonio Vivaldi." },
  { q: "What is the smallest unit of matter?", o: ["Molecule", "Atom", "Electron", "Quark"], a: 1, e: "The Atom." },
  { q: "Which African country was never colonized?", o: ["Ethiopia", "Liberia", "Both A and B", "Egypt"], a: 2, e: "Ethiopia and Liberia." },
  { q: "What is the powerhouse of the cell?", o: ["Nucleus", "Ribosome", "Mitochondria", "Golgi"], a: 2, e: "Mitochondria." },
  { q: "Who wrote 'The Communist Manifesto'?", o: ["Lenin", "Marx & Engels", "Stalin", "Trotsky"], a: 1, e: "Karl Marx and Friedrich Engels." },
  { q: "What is the deepest point in the ocean?", o: ["Mariana Trench", "Puerto Rico", "Tonga", "Philippine"], a: 0, e: "Challenger Deep." },
  { q: "What is the largest island in the world?", o: ["Australia", "Greenland", "New Guinea", "Borneo"], a: 1, e: "Greenland (Island, not Continent)." },
];

const CFG_KEY = "futa_config_v1";
const BANK_KEY = "futa_bank_v1";

export function loadConfig(): QuizConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      ADMIN: { ...DEFAULT_CONFIG.ADMIN, ...(parsed.ADMIN || {}) },
      SCHOOLS: parsed.SCHOOLS || DEFAULT_CONFIG.SCHOOLS,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: QuizConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

export function resetConfig() {
  localStorage.removeItem(CFG_KEY);
}

export function loadBank(): Question[] {
  try {
    const raw = localStorage.getItem(BANK_KEY);
    if (!raw) return DEFAULT_BANK;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BANK;
    return parsed;
  } catch {
    return DEFAULT_BANK;
  }
}

export function saveBank(bank: Question[]) {
  localStorage.setItem(BANK_KEY, JSON.stringify(bank));
}

export function resetBank() {
  localStorage.removeItem(BANK_KEY);
}
