import React from 'react'
import HeaderBox from '@/components/HeaderBox';
import PaymentTransferForm from '@/components/PaymentTransferForm'
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccounts } from '@/lib/actions/bank.actions';

// Add this line to make the page dynamic
export const dynamic = 'force-dynamic';

const Transfer = async () => {

  const loggedIn = await getLoggedInUser();
  
  // If user is not logged in, show a message or redirect
  if (!loggedIn || !loggedIn.$id) {
    return (
      <section className='flex'>
        <div className='my-banks'>
          <HeaderBox
            title='My Bank Accounts'
            subtext='Effortlessly manage your banking activities'
          />
          <div className='space-y-4'>
            <h2 className='header-2'>Your Cards</h2>
            <div>No user found. Please log in.</div>
          </div>
        </div>
      </section>
    );
  }

  const accounts = await getAccounts({userId: loggedIn.$id});

  const accountsData = accounts?.data || [];
  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Payment Transfer"
        subtext="Please provide any specific details or notes to the payment transfer "
      />

      <section className="size-full pt-5">
        <PaymentTransferForm
          accounts={accountsData}
        />
      </section>
    </section>
  )
}

export default Transfer
