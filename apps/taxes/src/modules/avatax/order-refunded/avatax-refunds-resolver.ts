import { PaymentFragment, TransactionKind } from "../../../../generated/graphql";

export class AvataxRefundsResolver {
  resolve(payments: PaymentFragment[]) {
    return payments
      .flatMap(
        (payment) => payment.transactions?.filter((t) => t.kind === TransactionKind.Refund) ?? [],
      )
      .map((t) => t.amount);
  }
}
