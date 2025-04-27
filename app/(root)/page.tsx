import HeaderBox from '@/components/HeaderBox'
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'
import Link from 'next/link'

// Use the simplest approach possible
const Home = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) => {
  const loggedIn = await getLoggedInUser();
  
  if (!loggedIn) {
    // Handle the case when user is not logged in
    // Maybe redirect to login page or show a message
    return <div>Please log in to view your accounts</div>;
  }
  
  const accounts = await getAccounts({userId: loggedIn.$id});
  
  const accountsData = accounts?.data || [];
  let appwriteItemId = accountsData[0]?.appwriteItemId;
  
  const accountDetails = appwriteItemId ? await getAccount({appwriteItemId}) : null;

  // Extract the page parameter safely
  const pageParam = searchParams.page;
  const pageStr = typeof pageParam === 'string' ? pageParam : 
                 Array.isArray(pageParam) && pageParam.length > 0 ? pageParam[0] : 
                 '1';
  const page = parseInt(pageStr, 10) || 1;

  return (
    <section className='home'>
      <div className='home-content'>
        <header className='home-header'>
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}   
            subtext="Access your account and manage your transactions efficiently"
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>

        <div className="recent-transactions">
          <RecentTransactions
            accounts={accountsData}
            transactions={accountDetails?.transactions || []}
            appwriteItemId={appwriteItemId}
            page={page}
          />
        </div>
      </div>
      <RightSidebar
        user={loggedIn}
        transactions={accountDetails?.transactions || []}
        banks={accountsData}
      />
    </section>
  )
}
export default Home;