import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

const config = new Configuration({
  basePath:
    PlaidEnvironments[
      (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || "sandbox"
    ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(config);

// Create a link token — sent to the frontend to open Plaid Link
export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "FinTrack",
    products: [Products.Transactions],
    country_codes: [
      CountryCode.Us,
      CountryCode.Gb,
      CountryCode.Nl,
      CountryCode.De,
      CountryCode.Fr,
      CountryCode.Es,
      CountryCode.It,
      CountryCode.Ca,
      CountryCode.Ie,
      CountryCode.Be,
      CountryCode.Pl,
      CountryCode.Se,
      CountryCode.No,
      CountryCode.Dk,
    ],
    language: "en",
  });
  return response.data.link_token;
}

// Exchange public token (from Link) for permanent access token
export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

// Get all accounts for an access token
export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({ access_token: accessToken });
  return {
    accounts: response.data.accounts,
    institution: response.data.item,
  };
}

// Get institution name from item
export async function getInstitution(institutionId: string) {
  const response = await plaidClient.institutionsGetById({
    institution_id: institutionId,
    country_codes: [
      CountryCode.Us,
      CountryCode.Gb,
      CountryCode.Nl,
      CountryCode.De,
      CountryCode.Fr,
      CountryCode.Es,
      CountryCode.It,
      CountryCode.Ca,
      CountryCode.Ie,
      CountryCode.Be,
    ],
  });
  return response.data.institution;
}

// Get transactions — Plaid uses a date range
export async function getTransactions(
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string, // YYYY-MM-DD
  cursor?: string
) {
  // Use transactions/sync for incremental updates (cursor-based)
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor: cursor,
    count: 500,
  });

  return {
    added: response.data.added,
    modified: response.data.modified,
    removed: response.data.removed,
    nextCursor: response.data.next_cursor,
    hasMore: response.data.has_more,
  };
}