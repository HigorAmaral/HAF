import { extractText } from "unpdf";

export interface ParsedResume {
  fullName: string;
  email: string;
  phone: string;
  targetRole: string;
  seniority: string;
  skills: string[];
  summary: string;
  experience: string;
  education: string;
  linkedinUrl: string;
  portfolioUrl: string;
  languages: string;
  rawText: string;
}

const KNOWN_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "Go",
  "Golang",
  "Rust",
  "PHP",
  "Laravel",
  "Ruby",
  "Rails",
  "Vue",
  "Angular",
  "Svelte",
  "Tailwind",
  "HTML",
  "CSS",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Prisma",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Terraform",
  "Linux",
  "Git",
  "CI/CD",
  "GraphQL",
  "REST",
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "Android",
  "iOS",
  "Figma",
  "UI/UX",
  "Power BI",
  "Tableau",
  "Excel",
  "Scrum",
  "Agile",
  "Jira",
  "QA",
  "Cypress",
  "Playwright",
  "Selenium",
  "Jest",
  "Machine Learning",
  "Data Science",
  "Pandas",
  "Spark",
  "Kafka",
  "RabbitMQ",
  "Microservices",
  "WordPress",
  "Shopify",
  "SAP",
  "Salesforce",
];

const ROLE_PATTERNS = [
  /(?:desenvolvedor(?:a)?|dev|developer|engineer|engenheiro(?:a)?)\s+(?:full\s*stack|front[-\s]*end|back[-\s]*end|mobile|de\s+software|software)/i,
  /(?:full\s*stack|front[-\s]*end|back[-\s]*end)\s+(?:developer|engineer|dev)/i,
  /(?:analista|cientista|engenheiro(?:a)?)\s+de\s+dados/i,
  /(?:data\s+(?:analyst|scientist|engineer))/i,
  /(?:devops|sre|cloud\s+engineer)/i,
  /(?:qa|quality\s+assurance|analista\s+de\s+testes)/i,
  /(?:ux\/?ui|product\s+designer|designer)/i,
  /(?:product\s+manager|product\s+owner|scrum\s+master)/i,
  /(?:analista\s+de\s+sistemas|suporte\s+t[eé]cnico|tech\s+lead)/i,
];

function extractSection(text: string, headings: string[], stopHeadings: string[]): string {
  const lines = text.split(/\r?\n/);
  const startRegex = new RegExp(`^\\s*(?:${headings.join("|")})\\b`, "i");
  const stopRegex = new RegExp(`^\\s*(?:${stopHeadings.join("|")})\\b`, "i");

  let capturing = false;
  const collected: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!capturing) {
      if (startRegex.test(trimmed)) {
        capturing = true;
      }
      continue;
    }
    if (stopRegex.test(trimmed) && collected.length > 0) {
      break;
    }
    if (trimmed) collected.push(trimmed);
    if (collected.length >= 12) break;
  }

  return collected.join("\n").slice(0, 1500);
}

export async function parseResumePdf(buffer: ArrayBuffer): Promise<ParsedResume> {
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });

  const cleanText = (text || "").replace(/\u0000/g, "").trim();
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = cleanText.match(
    /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-.\s]?\d{4})/
  );
  const linkedinMatch = cleanText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i
  );
  const githubMatch = cleanText.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i
  );

  // Nome: primeira linha curta sem @, http ou dígitos em excesso
  let fullName = "";
  for (const line of lines.slice(0, 8)) {
    if (
      line.length >= 4 &&
      line.length <= 60 &&
      !line.includes("@") &&
      !line.includes("http") &&
      !/\d{4}/.test(line) &&
      line.split(/\s+/).length >= 2
    ) {
      fullName = line;
      break;
    }
  }

  // Senioridade
  let seniority = "";
  if (/\b(s[eê]nior|sr\.?|especialista|lead)\b/i.test(cleanText)) {
    seniority = "Sênior";
  } else if (/\b(pleno|mid[-\s]?level)\b/i.test(cleanText)) {
    seniority = "Pleno";
  } else if (/\b(j[uú]nior|jr\.?|entry)\b/i.test(cleanText)) {
    seniority = "Júnior";
  } else if (/\b(est[aá]gio|estagi[aá]rio|intern)\b/i.test(cleanText)) {
    seniority = "Estágio";
  }

  // Cargo alvo
  let targetRole = "";
  for (const pattern of ROLE_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match) {
      targetRole = match[0].replace(/\s+/g, " ").trim();
      break;
    }
  }

  // Skills detectadas
  const skills: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escaped}(?:$|[^a-zA-Z0-9])`, "i");
    if (regex.test(cleanText)) {
      skills.push(skill);
    }
  }

  const allHeadings = [
    "resumo",
    "sobre",
    "objetivo",
    "summary",
    "about",
    "experi[eê]ncia",
    "experience",
    "hist[oó]rico",
    "forma[cç][aã]o",
    "educa[cç][aã]o",
    "education",
    "habilidades",
    "compet[eê]ncias",
    "skills",
    "idiomas",
    "certifica[cç][oõ]es",
  ];

  const summary = extractSection(
    cleanText,
    ["resumo", "sobre", "objetivo", "summary", "about"],
    allHeadings
  );
  const experience = extractSection(
    cleanText,
    ["experi[eê]ncia", "experience", "hist[oó]rico"],
    allHeadings
  );
  const education = extractSection(
    cleanText,
    ["forma[cç][aã]o", "educa[cç][aã]o", "education"],
    allHeadings
  );
  const languages = extractSection(
    cleanText,
    ["idiomas", "languages"],
    allHeadings
  );

  return {
    fullName,
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0] || "",
    targetRole,
    seniority,
    skills: skills.slice(0, 20),
    summary: summary || lines.slice(0, 6).join(" ").slice(0, 500),
    experience,
    education,
    linkedinUrl: linkedinMatch
      ? linkedinMatch[0].startsWith("http")
        ? linkedinMatch[0]
        : `https://${linkedinMatch[0]}`
      : "",
    portfolioUrl: githubMatch
      ? githubMatch[0].startsWith("http")
        ? githubMatch[0]
        : `https://${githubMatch[0]}`
      : "",
    languages,
    rawText: cleanText.slice(0, 4000),
  };
}
