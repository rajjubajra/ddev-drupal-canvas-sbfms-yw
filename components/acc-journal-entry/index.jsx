import { useState, useEffect } from 'react';
import useSWR from 'swr';

import { JsonApiClient, FormattedText, Image } from 'drupal-canvas';

import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import Button from '@/components/utl-button';
import PageTitle from '@/components/utl-page-title';
import AmountTotal from '@/components/utl-amount-total';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient()



export default function JournalEntry() {


  const [jourId, setJourId] = useState([]);
  
  useEffect(() => {   
    const params = new URLSearchParams(window.location.search);
    console.log('PARAMS: ',params);

      const idsParam = params.get('nodeId'); // e.g. "12,13"
        if (idsParam) {
          const idsArray = idsParam.split(',').map(id => Number(id));
          setJourId(idsArray);
        }
  },[])
  
  
  /* --------------------------------------------------
       Fetch: Journal Entries
  -------------------------------------------------- */
    
    //const isReady = jourId !== null && jourId !== undefined && jourId !== '';

    const isReady = Array.isArray(jourId) && jourId.length > 0;
    
    const params = new DrupalJsonApiParams()
      .addInclude([
        'field_debit_account',
        'field_credit_account',
        'field_image_image.field_media_image',
      ]);
    
   

    if (isReady) {
      params.addFilter('drupal_internal__nid', jourId, 'IN');
    }


    const { data, error, isLoading } = useSWR(
        isReady
          ? [
              'node--acc_journal_entry',
              jourId.join(','), // unique key
              { queryString: params.getQueryString() },
            ]
          : null,
        ([type, , options]) => client.getCollection(type, options)
      );

          console.log('JOURNAL ENTRIES : ',data);



/**
 * 
 * split the string, check the first word and build link accordingly  
 * 
 */
      function generateLink(text) {
        if (!text) return 'Manual Journal Entry';

        const parts = text.trim().split(' ');

        const type = parts[0];
        const id = parts[1];

        if (!id) return '';

        if (type === 'purchase') {
          return <a href={`/purchase-post-journal/?uuid=${id}`}>Go to Purchase</a>;
        } else {
          return <a href={`/invoice/?uuid=${id}`}>Go to Invoice</a>;
        }
      }


    
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

      {/* BACK AN DCREATE NEW BUTTON ------------------------------------------ */}
      <div className="w-full flex justify-end mb-4 gap-2">
        <button onClick={() => window.history.back()}>
            <Button> ← Back </Button>
        </button>

        <a href="/node/add/acc_journal_entry">
          <Button>Create Journal Entry</Button>
        </a>
      </div>

    {/** PAGE TITLE ---------------------------------------------------------  */}
      <PageTitle title="Journal Entries" />
      <div></div>


      {/* Journal Entry List */}
      { data?.map((entry) => (
        <div
          key={entry?.id}
          className="my-2 py-4 border border-slate-300">

{/** JOURNAL ENTRYd TITLE ------------------------------------------------------ */}
        <div className='border-b border-slate-300 flex flex-wrap justify-between'>
          <div className='px-4'>
            <div className='font-semibold'>{entry?.title}</div>
            <div className='text-xs'>{entry?.field_date}</div>
          </div>
          <div className='px-4'>
            <div className='flex gap-2'>
              <a href={`/node/${entry?.drupal_internal__nid}/edit?destination=/admin/content`}><Button>Edit</Button></a>             
            </div>
          </div>  
        </div>


{/** DESCRIPTION --------------------------------------------------------- */}
          <div className="my-2 pl-4 flex flex-wrap">
            <div className="mt-2 text-xs uppercase w-32">
              Description
            </div>
            <div className='mt-1 ml-2 text-sm'><FormattedText>
              {entry?.field_description?.processed}
            </FormattedText></div>
          </div>

{/** COMMENT ----------------------------------------------------------------- */}
          <div className="my-2 pl-4 flex flex-wrap">
            <div className="mt-2 text-xs uppercase w-32">
              Comment
            </div>
            <div className='mt-1 ml-2 text-sm'><FormattedText>{entry?.field_comment?.processed}</FormattedText></div>
          </div>



{/** DEBIT SECTION --------------------------------------------------*/}
          <div className="grid md:grid-cols-2 md:justify-between my-4 border-t border-b border-slate-300">
            {/* Debit */}
            <div className='border-r border-slate-300 p-4'>
              <div className="font-semibold">Debit</div>
              <div className="mx-4 pl-4 border-l-2 border-blue-400">
                <div className='text-sm tracking-tighter'>
                  <a href={`/acc-ledger-book?ledgerId=${entry?.field_debit_account?.id}`}>
                  {
                    entry?.field_debit_account?.field_ledger_account_name
                  }
                  </a>
                </div>
                <div>
                  <AmountTotal amt={entry?.field_amount} />
                </div>
              </div>
            </div>

{/** CREDIT SECTION --------------------------------------------- */}
            {/* Credit */}
            <div className='p-4'>
              <div className="font-semibold">Credit</div>
              <div className="mx-4 pl-4 border-l-2 border-blue-400">
                <div className='text-sm tracking-tighter'>
                  <a href={`/acc-ledger-book?ledgerId=${entry?.field_credit_account?.id}`}> 
                  {
                    entry?.field_credit_account?.field_ledger_account_name
                  }
                  </a>
                </div>
                <div>
                  <AmountTotal amt={entry?.field_amount} />
                </div>
              </div>
            </div>
          </div>


{/** IMAGE : SECTION */}
          <div className='flex'>
            { entry?.field_image_image &&
              entry?.field_image_image?.map((img) => 
            <a href={img?.field_media_image?.uri?.url} target='_blank'>
              <Image
               className='w-64 h-auto p-2 m-2 border border-slate-300'
               src={img?.field_media_image?.uri?.url}
               alt='supporting image' 
               width={1000}
               height={500}
               unoptimized />
            </a>
            )
            }
          </div>

{/**----------------------------------------------------------- 
 * REFERENCE UUID FROM INVOICE AND PURCHASE AUTO-POSTING :
 * ----------------------------------------------------------*/}
          <div className='text-xs px-4 flex justify-end'>

           { 
           entry?.field_purchase_sale_reference_id !== '' ?
            
                generateLink(entry?.field_purchase_sale_reference_id)  
            
           : 'Manual Journal Entry'
           
           }
          </div>
        </div>
      ))}
    </div>
  );
}
