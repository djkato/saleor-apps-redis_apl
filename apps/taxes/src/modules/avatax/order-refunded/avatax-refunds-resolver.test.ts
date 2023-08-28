import { PaymentFragment, TransactionKind } from "../../../../generated/graphql";
import { AvataxRefundsResolver } from "./avatax-refunds-resolver";
import { expect, describe, it } from "vitest";

describe("AvataxRefundsResolver", () => {
  it("returns transaction amounts for refunds", () => {
    const resolver = new AvataxRefundsResolver();
    const mockPayments: PaymentFragment[] = [
      {
        transactions: [
          {
            kind: TransactionKind.Refund,
            amount: {
              amount: 20.0,
              currency: "USD",
            },
          },
          {
            kind: TransactionKind.Capture,
            amount: {
              amount: 20.0,
              currency: "USD",
            },
          },
        ],
      },
      {
        transactions: [
          {
            kind: TransactionKind.Refund,
            amount: {
              amount: 35.0,
              currency: "USD",
            },
          },
        ],
      },
    ];

    const refunds = resolver.resolve(mockPayments);

    expect(refunds).toEqual([
      {
        amount: 20.0,
        currency: "USD",
      },
      {
        amount: 35.0,
        currency: "USD",
      },
    ]);
  });
});
