import { AccountModal } from './AccountModal';
import { AddSheet } from './AddSheet';
import { AvatarModal } from './AvatarModal';
import { ConfirmDialog } from './ConfirmDialog';
import { ContributeModal } from './ContributeModal';
import { EmailModal } from './EmailModal';
import { GoalModal } from './GoalModal';
import { InstallmentModal } from './InstallmentModal';
import { PartnerModal } from './PartnerModal';
import { PayInstallmentModal } from './PayInstallmentModal';
import { SalaryModal } from './SalaryModal';
import { TransactionModal } from './TransactionModal';

/** Every modal is always mounted; each shows itself based on the ui store. */
export function ModalHost() {
  return (
    <>
      <AddSheet />
      <TransactionModal />
      <InstallmentModal />
      <PayInstallmentModal />
      <GoalModal />
      <AccountModal />
      <ContributeModal />
      <SalaryModal />
      <EmailModal />
      <AvatarModal />
      <PartnerModal />
      <ConfirmDialog />
    </>
  );
}
