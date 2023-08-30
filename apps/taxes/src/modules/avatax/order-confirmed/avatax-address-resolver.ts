import { AddressFragment } from "../../../../generated/graphql";
import { avataxAddressFactory } from "../address-factory";
import { AvataxConfig } from "../avatax-connection-schema";
import { CreateTransactionModel } from "avatax/lib/models/CreateTransactionModel";

export class AvataxAddressResolver {
  resolve({
    from,
    to,
  }: {
    from: AvataxConfig["address"];
    to: AddressFragment;
  }): CreateTransactionModel["addresses"] {
    return {
      shipFrom: avataxAddressFactory.fromChannelAddress(from),
      shipTo: avataxAddressFactory.fromSaleorAddress(to),
    };
  }
}
