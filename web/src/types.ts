export type Rarity = "일반" | "희귀" | "영웅" | "전설" | "신화" | "초월" | "???";
export type CardType = "유닛" | "마법";
export type Tab = "summon" | "collection" | "combat";

export interface ChronicleCard {
  id: string;
  name: string;
  rarity: Rarity;
  type: CardType;
  cost: number;
  atk?: number;
  hp?: number;
  text: string;
  temp?: boolean;
}

export interface RarityDefinition {
  name: Rarity;
  rate: number;
  refund: number;
  color: string;
}

export interface GameSave {
  gem: number;
  own: Record<string, number>;
  pulls: number;
}

export interface SummonResult {
  card: ChronicleCard;
  first: boolean;
}

export interface SummonOutcome {
  next: GameSave;
  results: SummonResult[];
  refund: number;
}
