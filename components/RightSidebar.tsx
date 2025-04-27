"use client"
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect } from 'react'
import BankCard from './BankCard'
import { countTransactionCategories } from '@/lib/utils'
import Category from './Category'

const RightSidebar = ({ user, transactions, banks }: RightSidebarProps) => {
    // Mock categories for development
    const mockCategories = [
      { name: "Transfer", count: 5 },
      { name: "Payment", count: 3 },
      { name: "Travel", count: 2 },
      { name: "Food and Drink", count: 2 },
      { name: "Other", count: 1 }
    ];

    useEffect(() => {
        console.log("RightSidebar Props:", {
            user,
            transactions: transactions || [],
            transactionsLength: transactions?.length || 0,
            sampleTransaction: transactions?.[0],
            banks: banks || [],
            hasBanks: Array.isArray(banks) && banks.length > 0,
            bankKeys: banks && banks[0] ? Object.keys(banks[0]) : []
        });
    }, [user, transactions, banks])
    
    // Add safety check for banks
    if (!Array.isArray(banks) || banks.length === 0) {
        return (
            <aside className='right-sidebar'>
                <section className='flex flex-col pb-8'>
                    <div className='profile-banner'/>
                    <div className='profile'>
                        <div className='profile-img'>
                            <span className='text-5xl font-bold text-blue-500'>{user?.firstName?.[0]}</span>
                        </div>

                        <div className='profile-details'>
                            <h1 className='profile-name'>
                                {user?.firstName} {user?.lastName}
                            </h1>
                            <p className='profile-email'>
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </section>

                <section className='banks'>
                    <div className='flex w-full justify-between'>
                        <h2 className='header-2'>My Banks</h2>
                        <Link href="/" className='flex gap-2'>
                            <Image
                                src="/icons/plus.svg"
                                width={20}
                                height={20}
                                alt='plus'
                            />
                            <h2 className='text-14 font-semibold text-gray-600'>
                                Add Banks 
                            </h2>
                        </Link>
                    </div>
                    <p className="text-center text-gray-500 mt-4">No banks connected yet</p>
                </section>
            </aside>
        )
    }

    // Use mock categories when no real transactions are available
    const categories: CategoryCount[] = transactions && transactions.length > 0 
      ? countTransactionCategories(transactions)
      : mockCategories;

    console.log("Categories:", categories);
    return (
        <aside className='right-sidebar'>
            <section className='flex flex-col pb-8'>
                <div className='profile-banner'/>
                <div className='profile'>
                    <div className='profile-img'>
                        <span className='text-5xl font-bold text-blue-500'>{user.firstName[0]}</span>
                    </div>

                    <div className='profile-details'>
                        <h1 className='profile-name'>
                            {user.firstName} {user.lastName}
                        </h1>
                        <p className='profile-email'>
                            {user.email}
                        </p>
                    </div>
                </div>
            </section>

            <section className='banks'>
                <div className='flex w-full justify-between'>
                    <h2 className='header-2'>My Banks</h2>
                    <Link href="/" className='flex gap-2'>
                        <Image
                            src="/icons/plus.svg"
                            width={20}
                            height={20}
                            alt='plus'
                        />
                        <h2 className='text-14 font-semibold text-gray-600'>
                            Add Banks 
                        </h2>
                    </Link>
                </div>

                <div className='relative flex flex-1 flex-col items-center justify-center gap-5'>
                    {banks[0] && (
                        <div className='relative z-10'>
                            <BankCard
                                key={banks[0].id || banks[0].$id}
                                account={banks[0]}
                                userName={`${user?.firstName || "Unknown"} ${user?.lastName || ""}`} 
                                showBalance={false}
                            />
                        </div>
                    )}
                    {banks[1] && (
                        <div className='absolute right-0 top-8 z-0 w-[90%]'>
                            <BankCard
                                key={banks[1].id || banks[1].$id}
                                account={banks[1]}
                                userName={`${user?.firstName || "Unknown"} ${user?.lastName || ""}`} 
                                showBalance={false}
                            />
                        </div>
                    )}

                    <div className='mt-10 flex flex-1 flex-col gap-6'>
                        <h2 className='header-2'>Top Categories</h2>
                        <div className='space-y-5'>
                            {categories.map((category, index) => (
                                <Category key={category.name} category={category}/>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </aside>
    )
}

export default RightSidebar
