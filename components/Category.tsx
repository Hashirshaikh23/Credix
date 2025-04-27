// import React from 'react'

// const Category = ({ category }: { category: CategoryCount }) => {
//   console.log("Rendering category:", category);
  
//   return (
//     <div className='category'>
//       <div className='category-info'>
//         <p className='category-name'>{category.name}</p>
//         <p className='category-count'>{category.count} transactions</p>
//       </div>
      
//       <div className='category-bar'>
//         <div 
//           className='category-progress'
//           style={{ width: `${Math.min(100, category.count * 10)}%` }}
//         />
//       </div>
//     </div>
//   )
// }

// export default Category


import Image from "next/image";

import { topCategoryStyles } from "@/constants";
import { cn } from "@/lib/utils";

import { Progress } from "./ui/progress";

const Category = ({ category }: CategoryProps) => {
  // Get the style configuration for this category
  const categoryStyle = topCategoryStyles[category.name as keyof typeof topCategoryStyles] || topCategoryStyles.default;

  // Calculate progress percentage based on the actual data from your screenshot
  const totalTransactions = 4951; // Sum of all transactions
  const progressValue = Math.round((category.count / totalTransactions) * 100);

  return (
    <div className={cn("gap-[18px] flex p-4 rounded-xl", categoryStyle.bg)}>
      <figure className={cn("flex-center size-10 rounded-full", categoryStyle.circleBg)}>
        <Image 
          src={categoryStyle.icon} 
          width={20} 
          height={20} 
          alt={category.name}
        />
      </figure>
      <div className="flex w-full flex-1 flex-col gap-2">
        <div className="text-14 flex justify-between">
          <h2 className={cn("font-medium", categoryStyle.text.main)}>
            {category.name}
          </h2>
          <h3 className={cn("font-normal", categoryStyle.text.count)}>
            {category.count} 
          </h3>
        </div>
        {/* Simplified progress bar implementation */}
        <div className="h-2 w-full rounded-full overflow-hidden bg-gray-100">
          <div
            className={cn("h-full transition-all duration-300", categoryStyle.progress.indicator)}
            style={{ 
              width: `${progressValue}%`,
              backgroundColor: categoryStyle.progress.bg
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Category;