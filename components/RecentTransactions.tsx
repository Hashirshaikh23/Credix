'use client'
 
import Link from 'next/link'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTabItem } from './BankTabItem'
import BankInfo from './BankInfo'
import TransactionsTable from './TransactionsTable'
import { Pagination } from './Pagination'

const RecentTransactions = ({
    accounts,
    transactions = [],
    appwriteItemId,
    page = 1,
}:RecentTransactionsProps) => {
  // Use state to track the active tab
  const [activeTab, setActiveTab] = useState(appwriteItemId)

  const rowsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(transactions.length / rowsPerPage)); 

  const indexOfLastTransaction = page * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  return (
    <section className='recent-transactions'>
        <header className='flex items-center justify-between'>
            <h2 className='recent-transactions-label'>
                Recent Transactions
            </h2>
            <Link href={`/transaction-history?id=${activeTab}`} className='view-all-btn'>
            View All
            </Link>
        </header>
        <Tabs  
          defaultValue={appwriteItemId} 
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
            <TabsList className='recent-transactions-tablist'>
                {accounts.map((account: Account) => (
                    <TabsTrigger 
                      key={account.id} 
                      value={account.appwriteItemId}
                    >
                        <BankTabItem
                            key={account.id}
                            account={account}
                            appwriteItemId={activeTab}
                        />
                    </TabsTrigger>
                ))}
            </TabsList>

            {accounts.map((account: Account) => (
                <TabsContent
                    value={account.appwriteItemId}
                    key={account.id}
                    className='space-y-4'
                >
                    <BankInfo
                        account={account}
                        appwriteItemId={account.appwriteItemId}
                        type='full'
                    />

                    <TransactionsTable transactions={currentTransactions} />  
                    
                    {totalPages > 1 &&(
                        <div className="my-4 w-full">
                            <Pagination
                            totalPages={totalPages}
                            page={page}
                            />
                        </div>
                    )}
                    
                    
                </TabsContent>
            ))}
        </Tabs>
    </section>
  )
}

export default RecentTransactions
