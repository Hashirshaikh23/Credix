import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { transactionCategoryStyles } from "@/constants"
import { cn, formatAmount, formatDateTime, getTransactionStatus, removeSpecialCharacters } from "@/lib/utils"
  
const CategoryBadge = ({category}:CategoryBadgeProps) => {

    const {
        borderColor, 
        backgroundColor, 
        textColor, 
        chipBackgroundColor
    } = transactionCategoryStyles[category as keyof typeof transactionCategoryStyles] || transactionCategoryStyles.default
    return (
        <div className={cn('category-badge', borderColor, chipBackgroundColor)}>
            <div className={cn('size-2 rounded-full', backgroundColor)}/>
            <p className={cn('text-[12px] font-medium', textColor, borderColor)}>{category}</p>
        </div>
    )
} 

const TransactionsTable = ({transactions}:TransactionTableProps) => {
  // Always show the "No transactions" message when transactions array is empty
  if (!transactions || transactions.length === 0) {
    return (
      <Table>
        <TableHeader className="bg-[#f9fafb]">
          <TableRow>
            <TableHead className="px-2 max-md:hidden">Transaction</TableHead>
            <TableHead className="px-2 max-md:hidden">Amount</TableHead>
            <TableHead className="px-2 max-md:hidden">Status</TableHead>
            <TableHead className="px-2 max-md:hidden">Date</TableHead>
            <TableHead className="px-2 max-md:hidden">Channel</TableHead>
            <TableHead className="px-2 max-md:hidden">Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              No transactions found. Transactions may take a few moments to appear.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
        <TableHeader className="bg-[#f9fafb]">
            <TableRow>
                <TableHead className="px-2 max-md:hidden">Transaction</TableHead>
                <TableHead className="px-2 max-md:hidden">Amount</TableHead>
                <TableHead className="px-2 max-md:hidden">Status</TableHead>
                <TableHead className="px-2 max-md:hidden">Date</TableHead>
                <TableHead className="px-2 max-md:hidden">Channel</TableHead>
                <TableHead className="px-2 max-md:hidden">Category</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {transactions.map((t: Transaction) => {
                // console.log("Transaction item:", t); // Debug individual transaction
                const status = getTransactionStatus(new Date(t.date))
                const amount = formatAmount(t.amount)
                
                const isDebit = t.type === 'debit';
                const isCredit = t.type === 'credit';
                
                return (
                    <TableRow key={t.id} className={`${isDebit || amount[0] === '-' ? 'bg-[#FFFBFA]' : 'bg-[#F6FEF9]'} !over:bg-none !border-b-DEFAULT`}>
                        <TableCell className="max-w-[250px] pl-2 pr-10">
                            <div className="flex items-center gap-3">
                                <h1 className="text-14 truncate font-semibold text-[#344054]">{removeSpecialCharacters(t.name)}</h1>
                            </div>
                        </TableCell>
                        {/* <TableCell>{isDebit ? `-${amount}` : isCredit ? amount : amount}</TableCell> */}
                        <TableCell className={`pl-2 pr-10 font-semibold ${
                isDebit || amount[0] === '-' ?
                  'text-[#f04438]'
                  : 'text-[#039855]'
              }`}>{amount}</TableCell>
                        <TableCell className="pl-2 pr-10"><CategoryBadge category={status}/></TableCell>
                        {/* <TableCell>{t.date}</TableCell> */}
                        <TableCell className="min-w-32 pl-2 pr-10">{formatDateTime(new Date(t.date)).dateTime}</TableCell>
                        <TableCell className="pl-2 pr-10 capitalize min-w-24">{t.paymentChannel || 'N/A'}</TableCell>
                        <TableCell className="pl-2 pr-10 max-md:hidden"><CategoryBadge category={t.category || 'Other'}/></TableCell>
                    </TableRow>
                )
            })}
        </TableBody>
    </Table>
  )
}

export default TransactionsTable;
