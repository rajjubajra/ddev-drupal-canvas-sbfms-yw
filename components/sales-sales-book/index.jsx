import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';




const client = new JsonApiClient();



export default function sales_sales_book(){

 /**--------------------------------------------------------------------------------------------
  * Extract UUID from URL query parameters and fetch the corresponding purchase data via JSON:API.
  * Then display the purchase details and provide a button to post a journal entry for the purchase.
  -------------------------------------------------------------------------------------------*/
  const [uuid, setUuid] = useState(null);
  const [journalEntryNodeId, setJournalEntryNodeId] = useState(null);
  const [isCheckingJournal, setIsCheckingJournal] = useState(false);

  // Function to check for existing journal entry
  const checkJournalEntry = (uuidParam) => {
    console.log('Checking journal entry for UUID:', uuidParam);
    if (!uuidParam) return;

    setIsCheckingJournal(true);
    setJournalEntryNodeId(null);

    // First get the purchase nid from UUID
    fetch(`${window.location.origin}/jsonapi/node/invoice/${uuidParam}`)
      .then(res => res.json())
      .then(purchaseData => {
        const purchaseNid = purchaseData?.data?.attributes?.drupal_internal__nid;
        if (!purchaseNid) {
          setIsCheckingJournal(false);
          return;
        }
        
        // Then check if journal entry exists
        return fetch(`/jsonapi/node/acc_journal_entry?filter[field_purchase_sale_reference_id]=${'sales' + ' ' + String(uuidParam)}`)
          .then(res => res.json())
          .then(result => {
            if (result?.data?.length > 0) {
              setJournalEntryNodeId(result.data[0]?.drupal_internal__nid);
            }
            setIsCheckingJournal(false);
          });
      })
      .catch(err => {
        console.error('Error checking journal entry:', err);
        setIsCheckingJournal(false);
      });
  };





    /* --------------------------------------------------
         State: Date Filters (default = defined fiscal year)
    ------------------------------------------------------ */
    
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
              if (!fy || fy.length === 0) return;
            
              if (
                (!datePickedFrom || datePickedFrom === '') &&
                (!datePickedTo || datePickedTo === '')
              ) {
                setDateFrom(fy[0].field_date_from);
                setDateTo(fy[0].field_date_to);
              } else {
                setDateFrom(datePickedFrom);
                setDateTo(datePickedTo);
              }
            }, [fy, datePickedFrom, datePickedTo]);
    
    
    
       /**--------------------------------------- 
                PAGENATION 
        -------------------------------------------**/
            
            const [page, setPage] = useState(0);
            const [itemPerPage, setItemPerPage] = useState(10)
            const ITEMS_PER_PAGE = itemPerPage;
            const offset = page * ITEMS_PER_PAGE;
          
    
              useEffect(() => {
                console.log('PAGE CHANGED:', page, 'OFFSET:', offset);
              }, [page, offset]);
    
      
    /**------------------------------------------------------------------
    * FETCH: SALES from content type 'invoice'
    ---------------------------------------------------------------------*/
     const params = new DrupalJsonApiParams()
            .addInclude([
            'field_sales_invoice_items',
            'field_customer_id'
            ])
            .addFilter('field_invoice_date', dateFrom, '>=')
            .addFilter('field_invoice_date', dateTo, '<=')
            .addSort(['-field_invoice_date'])
            .addPageLimit(ITEMS_PER_PAGE)
            .addPageOffset(offset);
    
          const { data, error, isLoading } = useSWR(
            (!dateFrom || !dateTo)
              ? null // ⛔ don’t fetch until ready
              : [
                  'node--invoice',
                  dateFrom,
                  dateTo,
                  page,
                  {
                    queryString: params.getQueryString(),
                  },
                ],
            ([type, , , , options]) =>
              client.getCollection(type, options)
          );
    
      console.log('Sales Book: ',data, 'Error:', error, 'Loading', isLoading);
      console.log( 'Sales Book JSON: ', JSON.stringify(data, null, 2));



    if(isLoading) return <div>Loading....</div>

    if(data && data?.length === 0) return  <div>

      <PageTitle title='Sales Book' />
  {/*--------------------------------------------------- 
    DATE FILTER FORM
  ------------------------------------------------------*/}
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
      
      <div className='text-lg'>
        No data found...
      </div>
      
      
      </div>

    return(
        <div>
            <PageTitle title='Sales Book' />


            {/** BUTTONS */}
      <div className="w-full flex justify-end mb-4">
        <a href="/sales-invoice-form">
          <Button>Generate Invoice</Button>
        </a>
        <div className='mx-2 relative top-4'>
          Items Per page:
          <input 
            className='w-24 ml-4 border p-2' 
            type='number' 
            value={itemPerPage} 
            onChange={(e) => setItemPerPage(e.target.value)} />
        </div>
      </div>



 {/*--------------------------------------------------- 
    DATE FILTER FORM
  ------------------------------------------------------*/}
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

{/*------------------------------------------------------
* INVOICE ITEM LISTING 
---------------------------------------------------------*/}
    <div>
      <div className='flex gap-2 font-semibold text-sm p-2 m-2 border border-slate-200'>
          <div className='w-24'>Date</div>
          <div className='w-24'>Invoice No.</div>
          <div className='w-86'>Customer</div>
          <div className='w-32'>Total Amount</div>
          <div className='w-18'>Link</div>
      </div> 
      {
        data && data?.map((item) => {
        return(<div key={item.id} className='m-2 p-2 border border-slate-200'>
                            


              <div className='flex gap-2 text-sm'>
                
                  <div className='w-24'>
                      <span>{item.field_invoice_date}</span>
                  </div>
                  <div className='w-24'>
                      <span>{item.field_invoice_number}</span>
                  </div>
                
              
                  <div className='w-86'>
                      
                      <span>{item.field_customer_id?.title}</span>
                  </div>
                
                <div className='w-32'>
                      <div><Amount amt={item.field_total_amount} /></div>
                </div>

                {/** VIEW INVOICE BUTTON 
                <div className='w-18'>  
                  <a href={`/sales-invoice-copy/?nodeId=${item.drupal_internal__nid}`}>View Invoice</a>
                </div>  
                */}

                <div className='border-l border-slate-300 font-bold'>
                  {/** JOURNAL ENTRY BUTTON  */}      
                  <div className='mx-2 px-2'>             
                      {/* Journal Entry Post Button */}
                      <div>
                        {isCheckingJournal ? (

                            <button className='cursor-wait px-4 py-2 border bg-slate-400 text-white' disabled>
                                  Checking...
                            </button>
                            
                          ) : journalEntryNodeId ? (
                                
                            <a href={`/invoice-post-journal/?nodeId=${item.drupal_internal__nid}`}>View Invoice</a>

                          ) : (
                            
                            <a href={`/invoice-post-journal/?nodeId=${item.drupal_internal__nid}`}>Post Journal entry</a>
                        )}
                      </div>
                  </div>
                </div>
                            
              </div>              
          </div>)
            }) 
        }
        </div>
    </div>
    )
}