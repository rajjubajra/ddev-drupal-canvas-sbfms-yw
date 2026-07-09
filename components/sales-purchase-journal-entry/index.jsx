import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';

const client = new JsonApiClient();

export default function PurchaseJournalEntry() {



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
    fetch(`${window.location.origin}/jsonapi/node/purchase_book/${uuidParam}`)
      .then(res => res.json())
      .then(purchaseData => {
        const purchaseNid = purchaseData?.data?.attributes?.drupal_internal__nid;
        if (!purchaseNid) {
          setIsCheckingJournal(false);
          return;
        }
        
        // Then check if journal entry exists
        return fetch(`/jsonapi/node/acc_journal_entry?filter[field_purchase_sale_reference_id]=${'purchase' + ' ' + String(uuidParam)}`)
          .then(res => res.json())
          .then(result => {
            if (result?.data?.length > 0) {
              setJournalEntryNodeId(result.data[0].attributes.drupal_internal__nid);
            }
            setIsCheckingJournal(false);
          });
      })
      .catch(err => {
        console.error('Error checking journal entry:', err);
        setIsCheckingJournal(false);
      });
  };

  // Initial UUID load and listen for URL changes (back/forward navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uuidParam = params.get('uuid');
    console.log('URL params:', window.location.search);
    console.log('UUID from URL:', uuidParam);
    setUuid(uuidParam);
    checkJournalEntry(uuidParam);

    // Listen for popstate events (back/forward navigation)
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const newUuid = params.get('uuid');
      setUuid(newUuid);
      checkJournalEntry(newUuid);
    };

    // Also listen for visibility change (when page becomes visible again)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const params = new URLSearchParams(window.location.search);
        const newUuid = params.get('uuid');
        setUuid(newUuid);
        checkJournalEntry(newUuid);
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  console.log('UUID state:', uuid);
  const shouldFetch = typeof uuid === 'string' && uuid.trim().length > 0;
  console.log('Should Fetch:', shouldFetch);



  /**---------------------------------------------------------------------
   * fetch purchase data for the given UUID using SWR. 
   * 
   -----------------------------------------------------------------------*/
  const { data, error, isLoading } = useSWR(
    shouldFetch
      ? `node--purchase_book--${uuid}`
      : null,
    async () => {
      console.log('Fetching individual resource:', uuid);
      try {
        const res = await fetch(`${window.location.origin}/jsonapi/node/purchase_book/${uuid}?include=field_product_name,field_product_brand,field_product_code,field_product_company,field_product_size,field_sales_department,field_sku,field_vendor`);
        console.log('Fetch response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data_1 = await res.json();
        console.log('Fetched data:', data_1);
        return data_1;
      } catch (err) {
        console.error('Fetch error:', err);
        throw err;
      }
    }
  );

  console.log('SWR Data:', data?.data?.attributes);
  console.log('SWR Include:', data?.included);
  console.log('SWR Error:', error);
  console.log('SWR Loading:', isLoading);



 // Get CSRF token
  async function getCsrfToken() {
      try {
        const response = await fetch("/session/token", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get CSRF token: ${response.status}`);
        }
        
        return await response.text();
      } catch (error) {
        console.error("CSRF token error:", error);
        throw error;
      }
    }


  async function postJournalForPurchase(item) {

    console.log('Posting journal entry for purchase item:', item);

    
    try {
      const token = await getCsrfToken();
      const today = new Date().toISOString().split('T')[0];

      console.log('Token:', token);
      
      // Total Purchase Amount
      const totalAmount = item.attributes.field_quantity * item.attributes.field_cost_price;

      // Reference (link back to purchase)
      const refId = item.id; // Assuming this is the purchase nid

      const journalEntry = {
        data: {
          type: 'node--acc_journal_entry',
          attributes: {
            title: `Inventory Purchase - ${item?.attributes?.field_product_name?.name}`,
            field_amount: totalAmount,
            field_date: today,
            field_purchase_sale_reference_id: 'purchase' + ' ' + refId,
            field_description: {
              value: `Purchased ${item.attributes.field_quantity} box(es) of ${item?.attributes?.field_product_name?.name}`,
              format: 'plain_text'
            },
            field_comment: {
              value: `Auto generated purchase entry`,
              format: 'plain_text'
            }
          },
          relationships: {
            // Debit → Inventory
            field_debit_account: {
              data: {
                type: "node--accounting_ledger",
                id: "c5343609-65ee-4e0d-926e-20104956edd9"
              }
            },
            // Credit → Cash OR Accounts Payable
            field_credit_account: {
              data: {
                type: "node--accounting_ledger",
                id: "0f92cdfb-9533-47fb-8951-c882369e59bd"
              }
            }
          }
        }
      };

      // POST
      const res = await fetch('/jsonapi/node/acc_journal_entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'X-CSRF-Token': token
        },
        credentials: 'include',
        body: JSON.stringify(journalEntry)
      });

      const responseData = await res.json();

      // Get created nodeId (nid)
      const nodeId = responseData?.data?.attributes?.drupal_internal__nid;

      // Redirect to Journal Entry Page
      if (nodeId) {
        window.location.href = `/acc-journal-entry?nodeId=${nodeId}`;
      }

    } catch (err) {
      console.error('Purchase Journal Error:', err);
    }
    
  }


  const productDetails = (term_type) => {
    console.log('Extracting product details for term type:', term_type);
    const productInfo = {};
    const term = data?.included?.find(inc => inc.type === term_type);
    console.log(`Found term for ${term_type}:`, term);
    if (term) {
      productInfo.name = term.attributes?.name;
      productInfo.id = term.id;
    }
    return productInfo;
  }

/** DATE FORMAT */

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};


  return (
    <div>

      <button onClick={() => window.history.back()}>
          <Button>Back</Button>
      </button>


      <PageTitle title="Purchase - Post Journal Entry" />

      {isLoading && <p>Loading...</p>}
      {error && (
        <div>
          <p>Error loading data</p>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}


{/** FIRST ROW PRODUCT -CODE AND SKU */}
      <div className='flex justify-between'>
        <div className='flex gap-2 text-xs font-semibold'>
          <div>{productDetails('taxonomy_term--product_code').name}</div>
          <div>.</div>
          <div>SKU - {productDetails('taxonomy_term--sku').name}</div>
        </div>
        <div className='flex gap-2 uppercase text-xs font-semibold'>
          <div className='bg-blue-50'>Purchase</div>
          <div className='bg-green-50'>Posted</div>
        </div>
      </div>  




{/**
 * SECOND ROW - INVOICE DATE, PURCHASE DATE
*/}
    <div className='flex gap-4 text-xs'>
      <div><span>Invoice Date: </span><span className='font-semibold'>{formatDate(data?.data?.attributes?.field_invoice_date)}</span></div>
      <div>.</div>
      <div><span>Purchase Date: </span><span className='font-semibold'>{formatDate(data?.data?.attributes?.field_received_date)}</span></div>
    </div>
      

{/**THIRD ROW - PRODUCT DETAILS */}
    <div className='my-4 grid md:grid-cols-2  gap-4'>
      {/** PRODUCT DETAILS   */}
      <div className='py-4 px-4 border border-slate-300'>
        <div className='uppercase text-sm tracking-tighter font-semibold'>Product</div>
        <div className='py-4 border-b border-slate-300'>
            <div className='text-2xl tracking-tighter'>
              {productDetails('taxonomy_term--product_name').name} 
              - 
              {productDetails('taxonomy_term--product_size').name}</div>
            <div className='flex gap-2 text-xs'>
              <div>{productDetails('taxonomy_term--product_brand').name}</div>
              <div>.</div>
              <div>{productDetails('taxonomy_term--product_company').name}</div>
            </div>
        </div>

        <div className='mt-4 text-xs'>
          <div className='grid grid-cols-2 gap-2 border-b border-slate-300'>
            <div>Brand</div>
            <div className='flex justify-end font-semibold'>{productDetails('taxonomy_term--product_brand').name}</div>
          </div>
          <div className='grid grid-cols-2 gap-2 border-b border-slate-300'>
            <div>Company</div>
            <div className='flex justify-end font-semibold'>{productDetails('taxonomy_term--product_company').name}</div>
          </div>
          <div className='grid grid-cols-2 gap-2 border-b border-slate-300'>
            <div>Units per box</div>
            <div className='flex justify-end font-semibold'>{data?.data?.attributes?.field_unit_per_box}</div> 
          </div>
        </div>
      </div>



      {/** VENDOR DETAILS */}
      <div className='py-4 px-4 border border-slate-300'>
        <div className='uppercase text-sm tracking-tighter font-semibold'>Vendor</div>

         { 
                data?.included 
                && data?.included?.length > 0 
                && data?.included?.map((inc) => (
                inc.type === 'node--vendor' && 

                <div key={inc.id}>
                  <div className='py-4 border-b border-slate-300'>
                    <div className='text-2xl tracking-tighter'>{inc?.attributes?.title}</div>
                    <div className='text-xs'>Contact: {inc.attributes?.field_contact_person?.join(' | ')}</div>
                  </div>  
                  <div className='mt-4 text-xs'>
                      <div><FormattedText>{inc?.attributes?.field_address?.value}</FormattedText></div>
                      <div>Email: {inc.attributes?.field_email}</div>
                      <div>Phone: {inc?.attributes?.field_phone_number?.join(' | ')}</div>
                  </div>
                </div>
                ))
          }
      </div>
    </div>

      


{/** FOURTH ROW - PURCHASE COST AND TRADE VALUE */}
    <div className='p-4 border border-slate-300'>
        <div className='uppercase text-xs font-semibold mb-2'>Quantity & Value</div>
        <div className='grid md:grid-cols-5 gap-2 text-center'>
          <div className='bg-slate-100 py-2 px-4 text-center'>
            <div className='text-xs uppercase'>Qty (Boxes)</div>
            <div className='font-semibold'>{data?.data?.attributes?.field_quantity} Box(es)</div>
            <div className='text-xs'>[ in units: {data?.data?.attributes?.field_quantity * data?.data?.attributes?.field_unit_per_box}]</div>
          </div>
          <div className='bg-slate-100 py-2 px-4 text-center'>
            <div className='text-xs uppercase'>Price / unit</div>
            <div className='font-semibold'><Amount amt={data?.data?.attributes?.field_cost_price / data?.data?.attributes?.field_unit_per_box} /></div>
          </div>
          <div className='bg-slate-100 py-2 px-4 text-center'>
            <div className='text-xs uppercase'>Price / Box</div>
            <div className='font-semibold'><Amount amt={data?.data?.attributes?.field_cost_price} /></div>
          </div>
          <div className='bg-slate-100 py-2 px-4 text-center'>
            <div className='text-xs uppercase'>Purchase Cost</div>
            <div className='font-semibold'><Amount amt={data?.data?.attributes?.field_quantity * data?.data?.attributes?.field_cost_price} /></div>
          </div>
          <div className='bg-slate-100 py-2 px-4 text-center'>
            <div className='text-xs uppercase'>Trade Value</div>
            <div className='font-semibold'><Amount amt={data?.data?.attributes?.field_quantity * data?.data?.attributes?.field_selling_price} /></div>  
          </div>
        </div>
    </div>      



  {/** JOURNAL ENTRY BUTTON  */}      
    <div className='py-2 my-2 border-b border-slate-300'>             
              {/* Journal Entry Post Button */}
              <div className='py-2'>
                {isCheckingJournal ? (
                  <button className='cursor-wait px-4 py-2 border bg-slate-400 text-white' disabled>
                    Checking...
                  </button>
                ) : journalEntryNodeId ? (
                  <button
                    className='cursor-pointer px-4 py-2 border bg-blue-500 text-white'
                    onClick={() => window.location.href = `/acc-journal-entry?nodeId=${journalEntryNodeId}`}
                  >
                    Go to Journal Entry
                  </button>
                ) : (
                  <button
                    className='cursor-pointer px-4 py-2 border bg-slate-600 text-white'
                    onClick={() => postJournalForPurchase(data?.data)}
                  >
                    Post Journal Entry
                  </button>
                )}
              </div>
      </div>
          
        
      

      {!data && <p>No purchase data found for the given UUID.</p>}
    </div>
  );
}