import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';
import React from 'react'

// Use the simplest approach possible
const TransactionHistory = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
    const page = Number(searchParams.page) || 1; // Assuming page is a search parameter
    const loggedIn = await getLoggedInUser();  
    const accounts = await getAccounts({userId: loggedIn.$id});
  
    const accountsData = accounts?.data || [];
    
    
    // Correct way to access searchParams
    const idParam = searchParams.id;
    const bankId = typeof idParam === 'string' ? idParam : 
                  Array.isArray(idParam) && idParam.length > 0 ? idParam[0] : 
                  undefined;
    
    // Make sure to log this value to verify it's correct
    console.log("Using bank ID:", bankId);
  
    let appwriteItemId = bankId || accountsData[0]?.appwriteItemId;
  
    const accountDetails = appwriteItemId ? await getAccount({appwriteItemId}) : null;
    
    // Get the account name and officialName safely
    const accountName = accountDetails?.account?.name || 'Account';
    const officialName = accountDetails?.account?.officialName || '';
    const mask = accountDetails?.account?.mask || '****';
    const currentBalance = accountDetails?.account?.currentBalance || 0;
    const transactions = accountDetails?.transactions || [];

    const rowsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(accountDetails?.transactions.length / rowsPerPage)); 

    const indexOfLastTransaction = page * rowsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
    const currentTransactions = accountDetails?.transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

    return (
        <div className="transactions">
            <div className="transactions-header">
                <HeaderBox
                  title='Transaction History'
                  subtext='See your bank details and transactions' 
                />
            </div>

            <div className='space-y-6'>
                <div className='transactions-account'>
                    <div className='flex flex-col gap-2'>
                        <h2 className='text-18 font-bold text-white'>{accountName}</h2>
                        <p className='text-14 text-blue-25'>{officialName}</p>
                        <p className='text-14 font-semibold tracking-[1.1px] text-white'>
                        ●●●● ●●●● ●●●● {mask}
                        </p>
                    </div>

                    <div className='transactions-account-balance'>
                        <p className='text-14'>Current Balance</p>
                        <p className='text-24 text-center font-bold text-white'>
                            {formatAmount(currentBalance)}
                        </p> 
                    </div>
                </div>
                
                <div className="transactions-table">
                    <TransactionsTable transactions={currentTransactions} />
                    {totalPages > 1 &&(
                        <div className="my-4 w-full">
                            <Pagination
                            totalPages={totalPages}
                            page={page}
                            />
                        </div>
                    )}

                </div>
            </div>
        </div>
    ) 
}

export default TransactionHistory;