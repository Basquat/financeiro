// Shapes mirror the backend DTOs (see API.md). IDs are numbers (Long).

export interface UserSummary {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

export interface BudgetSettings {
  housingCost?: number | null;
  householdSize?: number | null;
  paysFood?: boolean | null;
  foodPerPerson?: number | null;
  emergencySaved?: number | null;
  usesHouseholdIncome?: boolean | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string | null;
  salary?: number | null;
  budget?: BudgetSettings | null;
  pinEnabled?: boolean;
  categoryBudgets?: Record<string, number>; // monthly limit per category
}

export interface AuthResult {
  user: User;
  token: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: number;
  title: string;
  amount: number; // negative = expense, positive = income
  transactionDate: string; // ISO LocalDateTime
  type: TransactionType;
  category: string;
  user?: UserSummary | null;
  account?: { id: number; name: string; isJoint: boolean } | null;
  installmentCurrent?: number | null;
  installmentTotal?: number | null;
}

export interface TransactionInput {
  title: string;
  amount: number;
  transactionDate: string; // ISO LocalDateTime
  type: TransactionType;
  category: string;
  userId: number;
  accountId: number;
  installmentCurrent?: number;
  installmentTotal?: number;
}

export interface Account {
  id: number;
  name: string;
  isJoint: boolean;
  currentBalance?: number | null;
  owners?: UserSummary[] | null;
  creditCard?: boolean | null; // a negative balance is the open bill
  closingDay?: number | null;
  dueDay?: number | null;
}

export interface AccountInput {
  name: string;
  isJoint: boolean;
  creditCard?: boolean;
  closingDay?: number | null;
  dueDay?: number | null;
}

/** A monthly bill or income, posted with one tap. */
export interface Recurring {
  id: number;
  title: string;
  amount: number; // always positive; type gives the sign
  type: TransactionType;
  category: string;
  dayOfMonth: number;
  accountId: number;
  accountName: string;
  pendingThisMonth: boolean;
}

export type RecurringInput = Pick<Recurring, 'title' | 'amount' | 'type' | 'category' | 'dayOfMonth' | 'accountId'>;

export interface ImportRow {
  date: string; // yyyy-MM-dd
  title: string;
  amount: number; // signed
  category: string;
  duplicate: boolean;
}

export interface InstallmentPlan {
  id: number;
  title: string;
  totalAmount: number;
  remainingAmount: number;
  installmentsLeft: number;
  dueDate: string; // ISO LocalDate
  category: string;
  user?: UserSummary | null;
}

export interface InstallmentPlanInput {
  title: string;
  totalAmount: number;
  dueDate: string;
  category: string;
  userId: number;
  installmentsLeft?: number;
  remainingAmount?: number;
}

export type GoalIcon = 'Home' | 'Plane' | 'Shield' | 'Car' | 'PiggyBank' | 'Gift' | 'Heart' | 'Sparkles';

export interface SharedGoal {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO LocalDate
  icon: string;
}

export interface SharedGoalInput {
  title: string;
  targetAmount: number;
  deadline: string;
  icon: string;
}

/* ---------- Assistente (IA) ---------- */

export interface AiProvider {
  id: string;
  label: string;
}

export interface AssistantSettings {
  providers: AiProvider[];
  provider?: string | null;
  model?: string | null;
  hasKey: boolean;
  keyHint?: string | null;
  notes?: string | null;
}

export interface AssistantSettingsInput {
  provider: string;
  model: string;
  apiKey?: string | null; // null = keep the saved key, '' = remove it
  notes: string;
}

/** A write the assistant proposed; runs only when the user confirms the card. */
export interface AssistantAction {
  tool: string;
  label: string;
  args: Record<string, unknown>;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatAttachment {
  name: string;
  mediaType: string;
  data: string; // base64
}

export interface ChatReply {
  reply: string;
  actions: AssistantAction[];
}
