"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

import { AxiosError } from 'axios';

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({userId}:getUserInfoProps) => {
    try {
        const {database} = await createAdminClient();

        const user = await database.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal('userId', [userId])]
        )

        return parseStringify(user.documents[0]);
    } catch (error) {
        console.log(error)
    }
}

export const signIn = async ({email , password}:signInProps) => {
    try {
        const { account } = await createAdminClient();
        const session = await account.createEmailPasswordSession(email, password);
        const cookieStore = cookies();
        (await cookieStore).set("appwrite-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });


        const user = await getUserInfo({userId: session.userId})  
        return parseStringify(user);
    } catch (error) {
        console.error('Error', error);
        return null;
    }
}
export const signUp = async ({password, ...userData}: SignUpParams) => {
    const {email, firstName, lastName} = userData;

    let newUserAccount;
    
    try {
        const { account, database } = await createAdminClient();

        newUserAccount = await account.create(
            ID.unique(), 
            email, 
            password, 
            `${firstName} ${lastName}`
        );

        if(!newUserAccount) throw new Error('Error creating new user');

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: 'personal'
        }); 

        if(!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer');

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl
            }
        )

        const session = await account.createEmailPasswordSession(email, password);
        const cookieStore = cookies();
        (await cookieStore).set("appwrite-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });

        return parseStringify(newUser);
    } catch (error) {
        console.error('Error', error);
    }
}


export async function getLoggedInUser() {
    try {
      const { account } = await createSessionClient();
      const result = await account.get();

      const user = await getUserInfo({userId: result.$id})

      return parseStringify(user);
    } catch (error) {
      return null;
    }
}
export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();

        (await cookies()).delete('appwrite-session');
        await account.deleteSession('current');
    } catch (error) {
        return null;
    }
}

export const createLinkToken = async (user: User) => {
    try {
        const tokenParams = {
            client_id: process.env.PLAID_CLIENT_ID, // Add client_id
            secret: process.env.PLAID_SECRET, // Add secret
            user: {
                client_user_id: user.$id
            },
            client_name: `${user.firstName} ${user.lastName}`,
            products: ['auth'] as Products[],
            language:'en',
            country_codes: ['US'] as CountryCode[], 
        }

        console.log("Plaid request payload:", JSON.stringify(tokenParams, null, 2)); // Log request payload


        const response = await plaidClient.linkTokenCreate(tokenParams);

        return parseStringify({linkToken: response.data.link_token})
    } catch (error) {
        // console.log(error);
        // console.error("Plaid error:", error.response?.data || error); // Log the detailed error
        const axiosError = error as AxiosError; // Explicitly cast error as AxiosError
        console.error("Plaid error:", axiosError.response?.data || axiosError.message);
    }
}


export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId,
}: createBankAccountProps) => {
    try {
        console.log("Creating bank account with data:", {
            userId,
            bankId,
            accountId,
            fundingSourceUrl,
            shareableId: sharableId
        });

        const {database} = await createAdminClient();

        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId, 
                bankId,
                accountId,
                accessToken,
                fundingSourceUrl,
                shareableId: sharableId
            }
        );

        if (!bankAccount) {
            console.error("Failed to create bank document");
            return null;
        }

        console.log("Bank account created successfully:", bankAccount.$id);
        return bankAccount;
    } catch (error) {
        console.error("Error in createBankAccount:", error);
        return null;
    }
}

export const exchangePublicToken = async ({
    publicToken,
    user,
}: exchangePublicTokenProps) => {
    try {
        console.log("Starting exchangePublicToken process with user:", user.$id);

        // Exchange public token for access and item ID
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        });
        console.log("Public token exchanged successfully");

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // Get account information from Plaid
        const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
        });
        
        const accountData = accountsResponse.data.accounts[0];
        console.log("Account data received:", {
            name: accountData.name,
            id: accountData.account_id
        });

        // Create Processor token
        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,    
        };

        const processTokenResponse = await plaidClient.processorTokenCreate(request);

        // Create funding source
        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken: processTokenResponse.data.processor_token,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) {
            console.error("Failed to create funding source");
            return null;
        }

        // Create bank account in database
        const bankAccount = await createBankAccount({
            userId: user.$id,
            bankId: itemId,
            accountId: accountData.account_id,
            accessToken,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id),
        });

        if (!bankAccount) {
            console.error("Failed to create bank account");
            return null;
        }

        console.log("Bank account created successfully:", {
            bankId: bankAccount.$id,
            userId: user.$id
        });

        revalidatePath("/");
        return parseStringify({ publicTokenExchange: 'complete', bankId: bankAccount.$id });
    } catch (error) {
        console.error("Error in exchangePublicToken:", error);
        return null;
    }
}
export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();
    
    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    console.log("Retrieved banks for user:", {
      userId,
      banksCount: banks.documents.length,
      banks: banks.documents
    });

    return banks.documents;
  } catch (error) {
    console.error("Error getting banks:", error);
    return [];
  }
};
export const getBank = async ({documentId}:getBankProps) =>{
    try {
        const {database} = await createAdminClient();

        const bank = await database.listDocuments(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            [Query.equal('$id', [documentId])]
        )

        return parseStringify(bank.documents[0]);
    } catch (error) {
        console.log(error)
    }
}

export const getBankByAccountId = async ({accountId}:getBankByAccountIdProps) =>{
    try {
        const {database} = await createAdminClient();

        const bank = await database.listDocuments(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            [Query.equal('accountId', [accountId])]
        )

        if(bank.total !==1) return null;

        return parseStringify(bank.documents[0]);
    } catch (error) {
        console.log(error)
    }
}