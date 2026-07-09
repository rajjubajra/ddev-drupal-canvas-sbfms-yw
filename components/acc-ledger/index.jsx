import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();





export default function LedgerBook() {
  

  const [ledgerId, setLedgerId] = useState(''); 
     
      useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('ledgerId');
        console.log('ledger Id : ',id);
          setLedgerId(id);
      },[])


  
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
     Fetch: Ledger Accounts
  -------------------------------------------------- */
  const { data, error, isLoading } = useSWR(
    [
      'node--accounting_ledger',
      {
        queryString: new DrupalJsonApiParams()
          .addInclude(['field_account_type'])
          .getQueryString(),
      },
    ],
    ([type, options]) => client.getCollection(type, options)
  );

  /* --------------------------------------------------
     Fetch: Journal Entries (date filtered)
  -------------------------------------------------- */
  const {
    data: journal,
    error: jnerror,
    isLoading: jnLoading,
  } = useSWR(
    [
      'node--acc_journal_entry',
      dateFrom,
      dateTo,
      {
        queryString: new DrupalJsonApiParams()
          .addInclude([
            'field_debit_account',
            'field_credit_account',
          ])
          .addFilter('field_date', dateFrom, '>=')
          .addFilter('field_date', dateTo, '<=')
          .addSort(['field_date'])
          .getQueryString(),
      },
    ],
    ([type, , , options]) => client.getCollection(type, options)
  );

  /* --------------------------------------------------
     Normalize Journal → Ledger Transactions
  -------------------------------------------------- */
  const [drledgerAccounts, setDrLedgerAccounts] = useState([]);
  const [crledgerAccounts, setCrLedgerAccounts] = useState([]);

  useEffect(() => {
    if (!journal) return;

    const drArr = [];
    const crArr = [];

    journal.forEach((item) => {
      drArr.push({
        id: item?.id,
        date: item?.field_date,
        nodeId: item?.drupal_internal__nid,
        ledgerId:
          item?.field_debit_account?.id,
        transaction: item?.title,
        ledgerName:
          item?.field_debit_account?.field_ledger_account_name,
        creditedLedger: item?.field_credit_account?.field_ledger_account_name,
        typeName:
          item?.field_debit_account?.field_ledger_account_name,
        drAmount: item?.field_amount,
      });

      crArr.push({
        id: item?.id,
        date: item?.field_date,
        nodeId: item?.drupal_internal__nid,
        ledgerId:
          item?.field_credit_account?.id,
        transaction: item?.title,
        ledgerName:
          item?.field_credit_account?.field_ledger_account_name,
        debitedLedger: item?.field_debit_account?.field_ledger_account_name,
        typeName:
          item?.field_credit_account?.field_ledger_account_name,
        crAmount: item?.field_amount,
      });
    });

    setDrLedgerAccounts(drArr);
    setCrLedgerAccounts(crArr);
  }, [journal]);

  /* --------------------------------------------------
     Render States
  -------------------------------------------------- */
  if (error || jnerror) return 'An error has occurred.';
  if (isLoading || jnLoading) return 'Loading...';

  /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */
  return (
    <div>
      {/* ---------------- Date Filter ---------------- */}
      <form
        className="flex flex-wrap gap-4 mb-6 p-4 border rounded"
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


     {/**-----BACK BUTTON------------------------------------ */} 
      <div className='w-full flex justify-end gap-2'>
        
        <button onClick={() => window.history.back()}>
            <Button> ← Back </Button>
        </button>
        <a href='/node/add/accounting_ledger' target='_blank'><Button>Create New Ledger</Button></a>
      </div>


    {/**------ Ledger Detail ---------------- */}
      {ledgerId !== '' && (
        <div>
            <div className='flex justify-between'>
              <PageTitle
                title={data?.find(i => i.id === ledgerId)?.title}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            </div>

          
        <div className="grid md:grid-cols-2 grid-cols-1 gap-4 text-sm">
            {/* Debit */}
            <div>
              <div className="flex font-bold border-b">
                <div className='w-24'>Date</div>
                <div className='w-64'>Description</div>
                <div className='w-24'>Dr Amount</div>
              </div>
              {drledgerAccounts
                ?.filter((i) => i.ledgerId === ledgerId)
                ?.map((item) => (
                  <div key={item?.id} className="flex gap-2">
                    
                    <div className="w-24">{item?.date}</div>
                    <div className="w-64">
                      <a href={`/acc-journal-entry/?nodeId=${item?.nodeId}`}>
                      {item?.transaction}
                      <br /><span className='text-xs relative -top-2'>cr : {item?.creditedLedger}</span>
                      </a>  
                    </div>
                    <div className="w-24 text-right">
                      {item?.drAmount}
                    </div>
                  </div>
                ))}
              
            </div>
            

            {/* Credit */}
            <div>
              <div className="flex font-bold border-b">
                <div className='w-24'>Date</div>
                <div className='w-64'>Description</div>
                <div className='w-24'>Cr Amount</div>
              </div>
              {crledgerAccounts
                .filter((i) => i.ledgerId === ledgerId)
                .map((item) => (
                  <div key={item?.id} className="flex gap-2">
                    <div className="w-24">{item?.date}</div>
                    <div className="w-64">
                      <a href={`/acc-journal-entry/?nodeId=${item?.nodeId}`}>
                      {item?.transaction}
                      <br /><span className='text-xs relative -top-2'>dr : {item?.debitedLedger}</span>
                      </a>
                      </div>
                    <div className="w-24 text-right">
                      {item?.crAmount}
                    </div>
                  </div>
                ))}
            </div>
            
          </div>
           <div className='grid grid-cols-2 gap-4 border-t border-b md:text-sm text-xs font-bold uppercase py-2'>
                <div className='flex justify-between'>
                  <div>Debit Total</div>
                  <div>{drledgerAccounts
                            ?.filter(i => i.ledgerId === ledgerId)
                            ?.reduce((sum, i) => sum + Number(i?.drAmount || 0), 0).toFixed(2)}</div>
                </div>
                <div className='flex justify-between'>
                    <div>Credit Total</div>
                    <div>{crledgerAccounts
                            ?.filter(i => i?.ledgerId === ledgerId)
                            ?.reduce((sum, i) => sum + Number(i?.crAmount || 0), 0).toFixed(2)}
                    </div>
                </div> 
          </div>
        </div>
      )}

     
    </div>
  );
}
