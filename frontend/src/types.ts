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
}

export interface AccountInput {
  name: string;
  isJoint: boolean;
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
