import { useState, useEffect } from 'react';
import useSWR from 'swr';

import { JsonApiClient, FormattedText, Image } from 'drupal-canvas';

import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import Button from '@/components/utl-button';
import PageTitle from '@/components/utl-page-title';
import Amount from '@/components/utl-amount';
import AmountTotal from '@/components/utl-amount-total';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();



export default function JournalEntriesList() {


   /* --------------------------------------------------
     State: Date Filters (default = defined fiscal year)
  -------------------------------------------------- */

  const [datePickedFrom, setDatePickedFrom] = useState('');
  const [datePickedTo, setDatePickedTo] = useState('');
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  /* --------------------------------------------------
           Fetch: Financial Year
  -------------------------------------------------- */
        const { data:fy, error:fyError, isLoading:fyIsLoading } = useSWR(
          [
            'node--financial_year',
            {
              queryString: new DrupalJsonApiParams()
                .addSort(['-created'])
                .getQueryString(),
            },
          ],
          ([type, options]) => client.getCollection(type, options)
        );
      
         useEffect(() => {
      
           if(datePickedFrom === undefined || datePickedFrom === '' 
              && datePickedTo === undefined || datePickedTo === '')
           {
             setDateFrom(fy[0].field_date_from);
             setDateTo(fy[0].field_date_to);
           }else{
             setDateFrom(datePickedFrom);
             setDateTo(datePickedTo);
           }
           
         },[fy])


  /* --------------------------------------------------
     Fetch: Taxonomy Term (account_types)
  -------------------------------------------------- */
    const { data:accType, error:accTypeError, isLoading:accTypeIsLoading } = useSWR(
          [
            'taxonomy_term--account_types',
            {
              queryString: new DrupalJsonApiParams()
                .getQueryString(),
            },
          ],
          ([type, , , options]) => client.getCollection(type, options)
    );


  /* --------------------------------------------------
     Fetch: Journal Entries (filtered by date range)
  -------------------------------------------------- */
    const { data, error, isLoading } = useSWR(
    [
      'node--acc_journal_entry',
      dateFrom,
      dateTo,
      {
        queryString: new DrupalJsonApiParams()
          .addInclude([
            'field_credit_account.field_account_type',
            'field_debit_account.field_account_type',
          ])

          //DATE FROM
          .addFilter('field_date', dateFrom, '>=')
          //DATE TO
          .addFilter('field_date', dateTo, '<=')

          //SORT BY DESCENDING field_date
          .addSort(['-field_date'])
          .getQueryString(),
      },
    ],
    ([type, , , options]) => client.getCollection(type, options)
  );
  console.log('DATA: ', JSON.stringify(data,null,2));



/**
 * DEBIT AND CREDIT GROUP TOTAL
 */

const [debitTotal, setDebitTotal] = useState('');
const [creditTotal, setCreditTotal] = useState('');

useEffect(() => {
  const debit = data?.reduce(
  (sum, i) => sum + Number(i?.field_amount || 0),0);
  const credit = data?.reduce(
  (sum, i) => sum + Number(i?.field_amount || 0),0);
  
  setDebitTotal(debit);
  setCreditTotal(credit);
},[data])

console.log(data && data[1]?.field_credit_account);
console.log(data && data[1]?.field_credit_account?.field_amount);
console.log(creditTotal, ' | ', debitTotal);

/**----------------------------------------------
  Debit and Credit items grouped Array
-------------------------------------------------**/
  
  const [drGrouped, setDrGrouped] = useState([])
  const [crGrouped, setCrGrouped] = useState([])


     useEffect(() => {
/** -----------------------------------------
  Credit Items - Grouped by Taxnomy Term(Acount Type)
    -----------------------------------------  **/
  const drGrouped = accType.map((item) => (
      {
              'taxonomyId': item.id,
              'taxonomyName': item.name,
              'items': data
                .filter(jr=> jr.field_debit_account.field_account_type.id === item.id)
                .map(jr => (
                  { 
                    'id': jr.id,
                    'ledgerId': jr.field_debit_account.id,
                    'nodeId': jr.drupal_internal__nid,
                    'title': jr.title,
                    'dr_amount': jr.field_amount
                  }) )
      }))
      console.log('DrGrouped', drGrouped);
      setDrGrouped(drGrouped);


/** -----------------------------------------
  Credit Items - Grouped by Taxnomy Term(Acount Type)
    -----------------------------------------  **/
       const crGrouped = accType.map((item) => (
             {
              'taxonomyId': item.id,
              'taxonomyName': item.name,
              'items': data
                .filter(jr=> jr.field_credit_account.field_account_type.id === item.id)
                .map(jr => (
                  { 
                    'id': jr.id,
                    'nodeId': jr.drupal_internal__nid,
                    'ledgerId': jr.field_credit_account.id,
                    'title': jr.title,
                    'cr_amount': jr.field_amount,   
                  }) )
            }))
       console.log('crGrouped', crGrouped);
       setCrGrouped(crGrouped);
     },[data])




  /** HELPER: SUM AMOUNT **/

  const sum = (items, field) =>
  items.reduce((t, i) => t + Number(i[field] || 0), 0);


  /** GET TOTAL BY TAXONOMY **/

    const getDebitTotalByTaxonomy = (taxonomyName) => {
      const group = drGrouped.find(g => g.taxonomyName === taxonomyName);
      return group ? sum(group.items, 'dr_amount') : 0;
    };

    const getCreditTotalByTaxonomy = (taxonomyName) => {
      const group = crGrouped.find(g => g.taxonomyName === taxonomyName);
      return group ? sum(group.items, 'cr_amount') : 0;
    };



      /** PROFIT CALCULATION */
      /** REVENUE */
      const crRevenue = getCreditTotalByTaxonomy('Revenue');
      const drRevenue = getDebitTotalByTaxonomy('Revenue');
      const grossRevenue = crRevenue - drRevenue;
      
      const contraRevenue = getDebitTotalByTaxonomy('Contra Revenue');

      const netRevenue = grossRevenue - contraRevenue;


      /** EXPENSES */
      const drExpenses = getDebitTotalByTaxonomy('Expenses');
      const crExpenses = getCreditTotalByTaxonomy('Expenses');
      const netExpense = drExpenses - crExpenses;
      /** EXPENSES - COGS */
      const drCogsExpenses = getDebitTotalByTaxonomy('Expenses-COGS');
      const crCogsExpenses = getCreditTotalByTaxonomy('Expenses-COGS');
      const netCogsExpenses = drCogsExpenses - crCogsExpenses;
      /** EXPENSES - TAX */
      const drTaxExpenses = getDebitTotalByTaxonomy('Expenses-tax');
      const crTaxExpenses = getCreditTotalByTaxonomy('Expenses-tax');
      const netTaxExpenses = drTaxExpenses - crTaxExpenses;
      /** TOTAL EXPENSE */
      const totalExpenses = netExpense + netCogsExpenses + netTaxExpenses;
      /** NET PROFIT */
      const netProfit = netRevenue - totalExpenses
      
    
/**--------------------------------------------------
 * EXPORT LEDGER DETAILS IN CSV 
 ---------------------------------------------------*/

      const exportTrialBalanceCSV = () => {

          const rows = [];

          // Header
          rows.push([
            "Account Name",
            "Account Type",
            "Debit",
            "Credit"
          ]);

          // Debit Accounts
          drGrouped?.forEach(group => {
            group.items?.forEach(item => {
              rows.push([
                item.title,
                group.taxonomyName,
                item.dr_amount || 0,
                ""
              ]);
            });
          });

          // Credit Accounts
          crGrouped?.forEach(group => {
            group.items?.forEach(item => {
              rows.push([
                item.title,
                group.taxonomyName,
                "",
                item.cr_amount || 0
              ]);
            });
          });

          // Convert to CSV string
          const csvContent = rows
            .map(row => row.join(","))
            .join("\n");

          // Create file
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", "trial_balance.csv");

          document.body.appendChild(link);
          link.click();

          document.body.removeChild(link);
        };



  /**----------------------------------------------------
   * EXPORT INCOME STATEMENT IN CSV
   *-----------------------------------------------------*/
  
        const exportIncomeStatementToCSV = () => {
        const rows = [
          ["Section", "Amount"],
          ["Revenue - Credit", crRevenue],
          ["Revenue - Debit", drRevenue],
          ["Gross Revenue", grossRevenue],
          ["Contra Revenue", contraRevenue],
          ["Net Revenue", netRevenue],
          ["Expenses (Cost of Goods Sold)", netCogsExpenses],
          ["Gross Profit", netRevenue - netCogsExpenses],
          ["Operating Expenses", netExpense],
          ["Operating Profit", netRevenue - (netCogsExpenses + netExpense)],
          ["Tax Expenses", netTaxExpenses],
          ["Net Profit", netProfit],
        ];

        const csvContent =
          "data:text/csv;charset=utf-8," +
          rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "profit_loss_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };




  
    
  /* --------------------------------------------------
     Render States
  -------------------------------------------------- */
  if (error) return 'An error has occurred.';
  if (isLoading) return 'Loading...';

  /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */
  return (
    <div>
      <PageTitle title="Income Statement" dateFrom={dateFrom} dateTo={dateTo} />
    

{/*------------------------------------- 
Date Filter Form 
----------------------------------------*/}
      <form
        className="flex flex-wrap gap-4 items-end mb-6 p-4 border rounded"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label className="block text-sm font-semibold mb-1">
            Date From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">
            Date To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border px-2 py-1 rounded"
          />
        </div>
      </form>

{/**---------------------------------------------
 * CSV EXPORT BUTTON 
 * ----------------------------------------------*/}
      <div className='w-full flex justify-end'>
        <button onClick={exportIncomeStatementToCSV}>
          <Button>Export CSV</Button>
        </button>
      </div>




{/**---------------------------------------------------
 * INCOME STATEMENT
 ------------------------------------------------------*/}

 
      <div className='mb-20 border m-2 p-4'>
      
      {/** NET REVENUE CALCULATION */}
        <div className='border-b mb-2'>
          <div className='uppercase'>Revenue</div>
          <div className='grid grid-cols-2'>
            <div>Credit</div><div><Amount amt={crRevenue} /></div>
          </div>
          <div className='grid grid-cols-2'>
            <div>Less: Debit</div><div><Amount amt={drRevenue} /></div>
          </div>
          <div className='grid grid-cols-2'>
            <div className='uppercase'>Gross Revenue</div><div><Amount amt={grossRevenue} /></div>
          </div>
          <div className='grid grid-cols-2'>
            <div>Less: Contra Revenue</div><div><Amount amt={contraRevenue} /></div>
          </div>     
          <div className='grid grid-cols-2'>
            <div className='font-bold'>Net Revenue</div><div><AmountTotal amt={netRevenue} /></div>
          </div>
        </div>

      {/** EXPENSES - COST OF GOODS SOLD */}
        <div className='grid grid-cols-2'>
          <div>Less: Expenses (cost of goods sold)</div><div><Amount amt={netCogsExpenses} /></div>
        </div>
      
      {/** GROSS PROFIT */}
        <div className='grid grid-cols-2 border-b mb-2'>
          <div className='uppercase'>Gross Profit</div>
          <div><Amount amt={netRevenue - netCogsExpenses} /></div>
        </div>
         
      {/** OPERATING EXPENSES */}
        <div className='grid grid-cols-2'>
          <div>Less: Operating Expenses</div><div><Amount amt={netExpense} /></div>
        </div> 
      
      {/** OPERATING PROFIT */}
        <div className='grid grid-cols-2 border-b mb-2'>
          <div className='uppercase'>Operating Profit</div>
          <div>
            <Amount amt={netRevenue - (netCogsExpenses + netExpense)} />
          </div>
        </div>

        <div className='grid grid-cols-2 mb-2 border-b'>
          <div>Less: Tax Expenses</div>
          <div><Amount amt={netTaxExpenses} /></div>
        </div>


        <div className='grid grid-cols-2'>
          <div className='uppercase font-bold'>Net profit</div>
          <div><AmountTotal amt={netProfit} /></div>
        </div>
      
    
      </div>





{/**--------------------------------------------------------------------------
 * LEDGER ACCOUNTS LISTINGS
 -----------------------------------------------------------------------------*/}
      <PageTitle title='Ledger Account Totals' dateFrom={dateFrom} dateTo={dateTo} />

      <div className='mb-4'>
        <button onClick={exportTrialBalanceCSV}>
          <Button>Export CSV</Button>
        </button>
      </div>

      <div className='text-xl uppercase'>Debit Account Types</div>
      <div className='uppercase font-bold'>
        Debit Total: {debitTotal}
      </div>
      { 
         drGrouped && drGrouped.map((item) => {
           return <div key={item.id} className='my-2 border-b border-slate-300'>
              <div className='text-sm font-bold uppercase grid grid-cols-2 gap-2'>
               
               <div>Total - {item.taxonomyName}</div>
               <div>
                 {
                   item.items?.reduce((sum, i) => sum + Number(i.dr_amount || 0), 0).toFixed(2)
                 }
               </div>
             </div>
             {
               item.items?.map(jr => {
                 return <div key={jr.id} className='grid grid-cols-3 gap-2'> 
                   <div><a href={`/ledger-account/?ledgerId=${jr.ledgerId}`}>{jr.title}</a></div>
                   <div className='text-xs pl-1'>{item.taxonomyName}</div>
                   <div>{jr.dr_amount}</div>
                 </div>
               })
             }
           </div>
         })  
      }
      <div className='mt-10 text-xl'>Credit Account Types:</div>
      <div className='uppercase font-bold'>
        Credit Total: {creditTotal}
      </div>
      {
         crGrouped && crGrouped.map((item) => {
           return <div key={item.id} className='my-2 border-b border-slate-300'>
             <div className='text-sm font-bold uppercase grid grid-cols-2 gap-2'>
               <div>Total - {item.taxonomyName}</div>
               <div>
                 {
                   item.items?.reduce((sum, i) => sum + Number(i.cr_amount || 0), 0).toFixed(2)
                 }
               </div>
             </div>
             {
               item.items?.map(jr => {
                 return <><div key={jr.id} className='grid grid-cols-3 gap-2'>           
                   <div><a href={`/ledger-account/?ledgerId=${jr.ledgerId}`}>{jr.title}</a></div>
                   <div className='text-xs pl-1'>{item.taxonomyName}</div>
                   <div>{jr.cr_amount}</div>
                 </div>
                 </>
               })
             }
           </div>
         })  
      }
      

    </div>
  );
}
