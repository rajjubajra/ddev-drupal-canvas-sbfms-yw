import { useState, useEffect } from 'react';
import useSWR from 'swr';

import { JsonApiClient, FormattedText, Image } from 'drupal-canvas';

import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import Button from '@/components/utl-button';
import PageTitle from '@/components/utl-page-title';
import Amount from '@/components/utl-amount';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();



export default function BalanceSheet() {


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


/**----------------------------------------------
  Debit and Credit items grouped Array
-------------------------------------------------**/
  
  const [drGrouped, setDrGrouped] = useState([])
  const [crGrouped, setCrGrouped] = useState([])

  console.log('Dr Group : ',drGrouped);
  console.log('Cr Group : ',crGrouped);

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
                    'cr_amount': jr.field_amount
                  }) )
            }))
       console.log('crGrouped', crGrouped);
       setCrGrouped(crGrouped);
     },[data])




  /** HELPER: SUM AMOUNT **/

  const sum = (items, field) =>
  items.reduce((t, i) => t + Number(i[field] || 0), 0);




  /** FUNCTION, TOTAL BY TAXONOMY TERM **/
    const getDebitTotalByTaxonomy = (taxonomyName) => {
      const group = drGrouped.find(g => g.taxonomyName === taxonomyName);
      return group ? sum(group.items, 'dr_amount') : 0;
    };

    const getCreditTotalByTaxonomy = (taxonomyName) => {
      const group = crGrouped.find(g => g.taxonomyName === taxonomyName);
      return group ? sum(group.items, 'cr_amount') : 0;
    };





  /** BALANCE SHEET CALCULATION (COARE LOGIC)**/
   /**
    * Assets:
    *   - Current Assets
    *   - Fixed Assets
    * 
    * Liabilites
    *   - Current Liabilities
    *   - Fiexed Liabilities
    * 
    * Equity
    *   - Equity
    *   - Revenue
    *   - Contra Revenue
    *   - Expenses
    *   - Expenses - COGS
    *   - Expenses - TAX
    */



      /** CURRENT ASSETS */
      const drCurrentAssets =  getDebitTotalByTaxonomy('Current Assets');
      const crCurrentAssets = getCreditTotalByTaxonomy('Current Assets');

      /** FIXED ASSETS */
      const drFixedAssets = getDebitTotalByTaxonomy('Fixed Assets');
      const crFixedAssets = getCreditTotalByTaxonomy('Fixed Assets');

      /** CONTRA ASSETS */
      /**
       * Contra assets (like Accumulated Depreciation or Allowance for Doubtful Accounts) 
       * usually have a credit balance. 
       * If a Contra Asset Shows a Debit Balance
          This is unusual, but it can happen (error, reversal, or over-adjustment). In that case:
          KEY RULE:
          Balance Sheet figure = Asset – Contra Asset (if credit balance)
          Balance Sheet figure = Asset + Contra Asset (if debit balance)
       */
     
      const drContraAssets = getDebitTotalByTaxonomy('Contra Assets');
      const crContraAssets = getCreditTotalByTaxonomy('Contra Assets');


      /** CURRENT LIABILITIES */
      const drCurrentLiabilities =  getDebitTotalByTaxonomy('Current Liabilities');
      const crCurrentLiabilities = getCreditTotalByTaxonomy('Current Liabilities');

      /** FIXED LIBILITIES */
      const drFixedLiabilities =  getDebitTotalByTaxonomy('Fixed Liabilities');
      const crFixedLiabilities = getCreditTotalByTaxonomy('Fixed Liabilities');


      /** OWNERS INVESTMENT - EQUITY */
      const crEquity = getCreditTotalByTaxonomy('Equity');
      const drEquity = getDebitTotalByTaxonomy('Equity');

  


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
      <PageTitle title="Balance Sheet" dateFrom={dateFrom} dateTo={dateTo} />

  {/*------------------------------------------
   Date Filter Form 
  ----------------------------------------------*/}
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

      
      
      <div className='mb-20 border m-2 p-4'>
        
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <div className='uppercase'>Assets</div>

            <div className='border-b'>
              <div className='font-bold'>Current Assets</div>
              <div className='grid grid-cols-2'>
                <div>Debit: </div>
                <div><Amount amt={drCurrentAssets} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Credit: </div>
                <div><Amount amt={crCurrentAssets} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Balance:</div>
                <div><Amount amt={drCurrentAssets - crCurrentAssets} /></div>
              </div>
            </div>
            
            <div className='border-b'>
              <div className='font-bold'>Fixed Assets</div>
              <div className='grid grid-cols-2'>
                <div>Debit: </div>
                <div><Amount amt={drFixedAssets} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Credit: </div>
                <div><Amount amt={crFixedAssets} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Balance:</div>
                <div><Amount amt={drFixedAssets - crFixedAssets} /></div>
              </div>
            </div>

            <div className='grid grid-cols-2'>
              <div>Less:Depreciation</div>
              <div><Amount amt={crContraAssets} /></div>
            </div>
            
            <div className='grid grid-cols-2'>
              <div className='uppercase'>Net Assets Total:</div>
              <div><Amount amt={((drCurrentAssets + drContraAssets ) - crCurrentAssets) + (drFixedAssets - crFixedAssets - crContraAssets)} /></div>
            </div>

          </div>
          <div>
            <div>
            <div className='uppercase'>Liabilities</div>

            <div className='border-b'>
              <div className='font-bold'>Current Liabilities</div>
              <div className='grid grid-cols-2'>
                <div>Credit: </div>
                <div><Amount amt={crCurrentLiabilities} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Debit: </div>
                <div><Amount amt={drCurrentLiabilities} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Balance:</div>
                <div>
                  <Amount amt={crCurrentLiabilities - drCurrentLiabilities} />
                </div>
              </div>
            </div>
            
            <div className='border-b'>
              <div className='font-bold'>Fixed Liabilities</div>
              <div className='grid grid-cols-2'>
                <div>Credit: </div>
                <div><Amount amt={crFixedLiabilities} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Debit: </div>
                <div><Amount amt={drFixedLiabilities} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Balance:</div>
                <div><Amount amt={crFixedLiabilities - drFixedLiabilities} /></div>
              </div>
            </div>

            <div className='border-b'>
              <div className='font-bold'>Equity</div>
              <div className='grid grid-cols-2'>
                <div>Credit: </div>
                <div><Amount amt={crEquity} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Debit: </div>
                <div><Amount amt={drEquity} /></div>
              </div>
              <div className='grid grid-cols-2'>
                <div>Balance:</div>
                <div><Amount amt={crEquity- drEquity} /></div>
              </div>
            </div>


            <div className='grid grid-cols-2 border-b'>
                <div>Add Retain Earning (Net Profit)</div>
                <div><Amount amt={netProfit} /></div>
            </div>
            
            <div className='grid grid-cols-2'>
              <div className='uppercase'>Liabilities Total:</div>
              <div>
                <Amount amt={
                  (crCurrentLiabilities - drCurrentLiabilities) + 
                  (crFixedLiabilities - drFixedLiabilities) +
                  (crEquity - drEquity) + netProfit
                } 
                />
              </div>
            </div>

          </div>
          </div>
        </div>
       
      </div>


    </div>
  );
}
