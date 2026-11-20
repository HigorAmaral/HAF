export interface BrazilState {
  uf: string;
  name: string;
  cities: string[];
}

export const BRAZIL_STATES: BrazilState[] = [
  { uf: "AC", name: "Acre", cities: ["Rio Branco", "Cruzeiro do Sul"] },
  { uf: "AL", name: "Alagoas", cities: ["Maceió", "Arapiraca"] },
  { uf: "AP", name: "Amapá", cities: ["Macapá", "Santana"] },
  { uf: "AM", name: "Amazonas", cities: ["Manaus", "Parintins"] },
  {
    uf: "BA",
    name: "Bahia",
    cities: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Ilhéus"],
  },
  {
    uf: "CE",
    name: "Ceará",
    cities: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Sobral"],
  },
  { uf: "DF", name: "Distrito Federal", cities: ["Brasília", "Taguatinga", "Águas Claras"] },
  {
    uf: "ES",
    name: "Espírito Santo",
    cities: ["Vitória", "Vila Velha", "Serra", "Cariacica"],
  },
  {
    uf: "GO",
    name: "Goiás",
    cities: ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde"],
  },
  { uf: "MA", name: "Maranhão", cities: ["São Luís", "Imperatriz", "Caxias"] },
  {
    uf: "MT",
    name: "Mato Grosso",
    cities: ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop"],
  },
  {
    uf: "MS",
    name: "Mato Grosso do Sul",
    cities: ["Campo Grande", "Dourados", "Três Lagoas"],
  },
  {
    uf: "MG",
    name: "Minas Gerais",
    cities: [
      "Belo Horizonte",
      "Uberlândia",
      "Contagem",
      "Juiz de Fora",
      "Betim",
      "Montes Claros",
      "Uberaba",
      "Poços de Caldas",
    ],
  },
  { uf: "PA", name: "Pará", cities: ["Belém", "Ananindeua", "Santarém", "Marabá"] },
  { uf: "PB", name: "Paraíba", cities: ["João Pessoa", "Campina Grande", "Patos"] },
  {
    uf: "PR",
    name: "Paraná",
    cities: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais"],
  },
  {
    uf: "PE",
    name: "Pernambuco",
    cities: ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina"],
  },
  { uf: "PI", name: "Piauí", cities: ["Teresina", "Parnaíba", "Picos"] },
  {
    uf: "RJ",
    name: "Rio de Janeiro",
    cities: [
      "Rio de Janeiro",
      "Niterói",
      "São Gonçalo",
      "Duque de Caxias",
      "Nova Iguaçu",
      "Campos dos Goytacazes",
      "Petrópolis",
    ],
  },
  { uf: "RN", name: "Rio Grande do Norte", cities: ["Natal", "Mossoró", "Parnamirim"] },
  {
    uf: "RS",
    name: "Rio Grande do Sul",
    cities: ["Porto Alegre", "Caxias do Sul", "Canoas", "Pelotas", "Santa Maria", "São Leopoldo"],
  },
  { uf: "RO", name: "Rondônia", cities: ["Porto Velho", "Ji-Paraná"] },
  { uf: "RR", name: "Roraima", cities: ["Boa Vista"] },
  {
    uf: "SC",
    name: "Santa Catarina",
    cities: ["Florianópolis", "Joinville", "Blumenau", "São José", "Chapecó", "Itajaí"],
  },
  {
    uf: "SP",
    name: "São Paulo",
    cities: [
      "São Paulo",
      "Campinas",
      "São Bernardo do Campo",
      "Santo André",
      "Osasco",
      "Sorocaba",
      "Ribeirão Preto",
      "São José dos Campos",
      "Barueri",
      "Santos",
      "Jundiaí",
    ],
  },
  { uf: "SE", name: "Sergipe", cities: ["Aracaju", "Nossa Senhora do Socorro"] },
  { uf: "TO", name: "Tocantins", cities: ["Palmas", "Araguaína"] },
];

export type WorkModeFilter = "all" | "remote" | "hybrid" | "onsite";

export interface LocationFilter {
  state: string; // UF (ex: "SP") ou ""
  cities: string[]; // até 5 cidades
  includeRemote: boolean;
  workMode?: WorkModeFilter;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesLocationFilter(
  jobText: string,
  filter: LocationFilter
): boolean {
  const normalized = normalizeText(jobText);
  const isRemote = /\b(remoto|remote|home office|anywhere|telecommut)\b/.test(normalized);
  const isHybrid = /\b(hibrido|hybrid)\b/.test(normalized);
  const workMode = filter.workMode || "all";

  if (workMode === "remote" && !isRemote) return false;
  if (workMode === "hybrid" && !isHybrid) return false;
  if (workMode === "onsite" && (isRemote || isHybrid)) return false;

  const hasState = Boolean(filter.state?.trim());
  const hasCities = filter.cities && filter.cities.length > 0;

  // Se nenhum filtro de estado ou cidade foi definido, aceita tudo que passou no workMode
  if (!hasState && !hasCities) return true;

  if (filter.includeRemote && workMode !== "onsite" && isRemote) {
    return true;
  }

  // Se há cidades selecionadas (até 5), verifica se alguma cidade bate
  if (hasCities) {
    const cityMatched = filter.cities.some((city) => {
      const normCity = normalizeText(city);
      return normCity.length >= 2 && normalized.includes(normCity);
    });
    if (cityMatched) return true;
    // Quando cidades específicas estão selecionadas, exige match em alguma delas
    return false;
  }

  // Apenas estado selecionado: verifica nome completo do estado ou UF com borda de palavra
  if (hasState) {
    const st = BRAZIL_STATES.find((s) => s.uf === filter.state);
    if (st) {
      const normName = normalizeText(st.name);
      if (normalized.includes(normName)) return true;
      const ufRegex = new RegExp(`\\b${st.uf.toLowerCase()}\\b`);
      if (ufRegex.test(normalized)) return true;
    }
    return false;
  }

  return true;
}
