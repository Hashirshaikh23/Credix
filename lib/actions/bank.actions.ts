"use server";

import {
  ACHClass,
  CountryCode,
  TransactionPaymentChannelEnum,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { DATABASE_ID, BANK_COLLECTION_ID } from "@/constants";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    console.log("Getting accounts for user:", userId);
    
    // Get banks from DB
    const banks = await getBanks({ userId });
    console.log("Banks retrieved from DB:", {
      count: banks?.length,
      banks: JSON.stringify(banks, null, 2)
    });

    if (!banks || banks.length === 0) {
      console.log("No banks found for user");
      return { data: [], totalBanks: 0, totalCurrentBalance: 0 };
    }

    const accounts = await Promise.all(
      banks?.map(async (bank) => {
        console.log("Processing bank:", bank.$id);
        
        try {
          // Get account info from plaid
          const accountsResponse = await plaidClient.accountsGet({
            access_token: bank.accessToken,
          });

          const accountData = accountsResponse.data.accounts[0];

          const account = {
            id: accountData.account_id,
            availableBalance: accountData.balances.available,
            currentBalance: accountData.balances.current,
            institutionId: "ins_56", // Default value
            name: accountData.name,
            officialName: accountData.official_name,
            mask: accountData.mask,
            type: accountData.type,
            subtype: accountData.subtype,
            appwriteItemId: bank.$id,
            shareableId: bank.shareableId,
          };

          return account;
        } catch (error) {
          console.error("Error fetching accounts for bank:", bank.$id, error);
          return null;
        }
      })
    );

    // Filter out any null accounts
    const validAccounts = accounts.filter(account => account !== null);

    const totalBanks = validAccounts.length;
    const totalCurrentBalance = validAccounts.reduce((total, account) => {
      return total + (account.currentBalance || 0);
    }, 0);

    console.log("Final processed accounts data:", {
      accountsCount: validAccounts.length,
      accounts: validAccounts,
      totalBanks,
      totalCurrentBalance
    });

    return parseStringify({ data: validAccounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("Error in getAccounts:", error);
    return { data: [], totalBanks: 0, totalCurrentBalance: 0 };
  }
};

// export const getAccounts = async ({ userId }: getAccountsProps) => {
//   try {
//     // get banks from db
//     const banks = await getBanks({ userId });

//     if (!banks || banks.length === 0) {
//       console.error("No banks found for userId:", userId);
//       return null;
//     }

//     const accounts = await Promise.all(
//       banks?.map(async (bank: Bank) => {
//         if (!bank.accessToken) {
//           console.error(`Missing access token for bank: ${bank.$id}`);
//           return null; // Skip this bank if accessToken is missing
//         }

//         try {
//           // get each account info from plaid
//           const accountsResponse = await plaidClient.accountsGet({
//             access_token: bank.accessToken,
//           });

//           const accountData = accountsResponse.data.accounts[0];

//           // get institution info from plaid
//           const institution = await getInstitution({
//             institutionId: accountsResponse.data.item.institution_id!,
//           });

//           const account = {
//             id: accountData.account_id,
//             availableBalance: accountData.balances.available!,
//             currentBalance: accountData.balances.current!,
//             institutionId: institution.institution_id,
//             name: accountData.name,
//             officialName: accountData.official_name,
//             mask: accountData.mask!,
//             type: accountData.type as string,
//             subtype: accountData.subtype! as string,
//             appwriteItemId: bank.$id,
//             sharableId: bank.sharableId,
//           };

//           return account;
//         } catch (plaidError) {
//           console.error("Plaid API Error:", plaidError);
//           return null; // Skip this bank on error
//         }
//       })
//     );

//     const validAccounts = accounts.filter((acc) => acc !== null); // Filter out null values

//     const totalBanks = validAccounts.length;
//     const totalCurrentBalance = validAccounts.reduce((total, account) => total + account.currentBalance, 0);

//     return parseStringify({ data: validAccounts, totalBanks, totalCurrentBalance });
//   } catch (error) {
//     console.error("An error occurred while getting the accounts:", error);
//     return null;
//   }
// };


// Get one bank account
export const getAccount = async ({ appwriteItemId }: { appwriteItemId: string }) => {
  try {
    // Get the bank from Appwrite
    const { database } = await createAdminClient();
    const bank = await database.getDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      appwriteItemId
    );

    if (!bank) {
      console.error('Bank not found');
      return null;
    }

    // Get account details from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Try to get transactions, but handle errors gracefully
    let transactions = [];
    try {
      // get transfer transactions from appwrite
      const transferTransactionsData = await getTransactionsByBankId({
        bankId: bank.$id,
      });

      const transferTransactions = transferTransactionsData?.documents?.map(
        (transferData: Transaction) => ({
          id: transferData.$id,
          name: transferData.name!,
          amount: transferData.amount!,
          date: transferData.$createdAt,
          paymentChannel: transferData.channel,
          category: transferData.category,
          type: transferData.senderBankId === bank.$id ? "debit" : "credit",
        })
      ) || [];

      // get institution info from plaid
      const institution = await getInstitution({
        institutionId: accountsResponse.data.item.institution_id!,
      });

      try {
        // Only try to get Plaid transactions if we haven't hit rate limits
        transactions = await getTransactions({
          accessToken: bank?.accessToken,
        }) || [];
      } catch (transactionError) {
        console.error("Error fetching Plaid transactions:", transactionError);
        // Continue with empty transactions array
        transactions = [];
      }

      const account = {
        id: accountData.account_id,
        availableBalance: accountData.balances.available!,
        currentBalance: accountData.balances.current!,
        institutionId: institution?.institution_id || 'ins_56',
        name: accountData.name,
        officialName: accountData.official_name,
        mask: accountData.mask!,
        type: accountData.type as string,
        subtype: accountData.subtype! as string,
        appwriteItemId: bank.$id,
      };

      // Make sure both arrays are defined before spreading
      const allTransactions = [
        ...(Array.isArray(transactions) ? transactions : []), 
        ...(Array.isArray(transferTransactions) ? transferTransactions : [])
      ].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return parseStringify({
        account,
        transactions: allTransactions,
      });
    } catch (error) {
      console.error("An error occurred while getting the account details:", error);
      
      // Return a default structure with the account info but empty transactions
      return parseStringify({
        account: {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
        },
        transactions: [],
      });
    }
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return null;
  }
};

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return null;
  }
};

// Get transactions
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions = [];

  try {
    // Iterate through each page of new transaction updates for item
    let retryCount = 0;
    const maxRetries = 2;
    
    while (hasMore && retryCount < maxRetries) {
      try {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
        });

        const data = response.data;

        const newTransactions = response.data.added.map((transaction) => ({
          id: transaction.transaction_id,
          name: transaction.name,
          paymentChannel: transaction.payment_channel,
          type: transaction.payment_channel,
          accountId: transaction.account_id,
          amount: transaction.amount,
          pending: transaction.pending,
          category: transaction.category ? transaction.category[0] : "",
          date: transaction.date,
          image: transaction.logo_url,
        }));
        
        transactions = [...transactions, ...newTransactions];
        hasMore = data.has_more;
      } catch (error) {
        console.error("Error in transaction sync:", error);
        retryCount++;
        
        // If we hit rate limits, wait a bit before retrying
        if (error.response?.status === 429) {
          console.log("Rate limited, waiting before retry...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // For other errors, break the loop
          hasMore = false;
        }
      }
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting transactions:", error);
    return [];
  }
};

// Create Transfer
export const createTransfer = async () => {
  const transferAuthRequest: TransferAuthorizationCreateRequest = {
    access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
    account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
    funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
    type: "credit" as TransferType,
    network: "ach" as TransferNetwork,
    amount: "10.00",
    ach_class: "ppd" as ACHClass,
    user: {
      legal_name: "Anne Charleston",
    },
  };
  try {
    const transferAuthResponse =
      await plaidClient.transferAuthorizationCreate(transferAuthRequest);
    const authorizationId = transferAuthResponse.data.authorization.id;

    const transferCreateRequest: TransferCreateRequest = {
      access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
      account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
      description: "payment",
      authorization_id: authorizationId,
    };

    const responseCreateResponse = await plaidClient.transferCreate(
      transferCreateRequest
    );

    const transfer = responseCreateResponse.data.transfer;
    return parseStringify(transfer);
  } catch (error) {
    console.error(
      "An error occurred while creating transfer authorization:",
      error
    );
    return null;
  }
};

// Add this function to refresh the access token
export const refreshAccessToken = async ({ userId }: { userId: string }) => {
  try {
    console.log("Refreshing access token for user:", userId);
    
    // Get banks from DB
    const banks = await getBanks({ userId });
    
    if (!banks || banks.length === 0) {
      console.log("No banks found for user");
      return false;
    }
    
    const bank = banks[0]; // Get the first bank
    
    // Create a new public token for the item
    const createResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_56',
      initial_products: ['transactions' as any]
    });
    
    console.log("Created new public token:", createResponse.data.public_token);
    
    // Exchange it for an access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: createResponse.data.public_token
    });
    
    const newAccessToken = exchangeResponse.data.access_token;
    console.log("Exchanged for new access token:", newAccessToken);
    
    // Update the access token in the database
    const { database } = await createAdminClient();
    await database.updateDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      bank.$id,
      {
        accessToken: newAccessToken
      }
    );
    
    console.log("Access token refreshed successfully");
    return true;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return false;
  }
};