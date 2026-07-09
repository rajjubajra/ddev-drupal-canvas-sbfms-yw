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

  



  /* --------------------------------------------------
     Fetch: Journal Entries
  -------------------------------------------------- */

      const params = new DrupalJsonApiParams()
        .addInclude([
          'field_image_image.field_media_image',
          'field_credit_account',
          'field_debit_account'
        ])
        .addFilter('field_date', dateFrom, '>=')
        .addFilter('field_date', dateTo, '<=')
        .addSort(['-field_date'])
        .addPageLimit(ITEMS_PER_PAGE)
        .addPageOffset(offset);

      const { data, error, isLoading } = useSWR(
        (!dateFrom || !dateTo)
          ? null // ⛔ don’t fetch until ready
          : [
              'node--acc_journal_entry',
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
console.log('JOurnal DATA', data, error, isLoading);



  /*--------------------------------------------------
    Journal only for Total Number of pages
  -------------------------------------------------- */
    const [jrTotal, setJrTotal] = useState('');
      
      useEffect(() => {
          data && setJrTotal(setJrTotal.length);
      },[data])
    
    console.log('jr total', jrTotal && jrTotal.length)


/**-----------------------------------------------------------
 * EXPORT TO CSV
 --------------------------------------------------------------*/

 const exportJournalCSV = () => {

          const headers = [
            "Date",
            "Title",
            "Description",
            "Comment",
            "Debit Account",
            "Credit Account",
            "Amount"
          ];

          const rows = data?.map((entry) => [
            entry.field_date,
            entry.title,
            entry?.field_description?.processed?.replace(/<[^>]+>/g, ""), // remove HTML
            entry?.field_comment || "",
            entry?.field_debit_account?.field_ledger_account_name?.field_ledger_account_name,
            entry?.field_credit_account?.field_ledger_account_name?.field_ledger_account_name,
            entry?.field_amount
          ]);

          const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers, ...rows]
              .map((row) => row.map((item) => `"${item ?? ""}"`).join(","))
              .join("\n");

          const encodedUri = encodeURI(csvContent);

          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "journal_entries.csv");
          document.body.appendChild(link);

          link.click();
          document.body.removeChild(link);
        };


  
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

    {isLoading && (
      <div className="py-4 text-sm text-gray-500">
        Loading journal entries…
      </div>
    )}

  if (error) return 'An error has occurred.';


  /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */
  return (
    <div>


      
{/**-----------------------------------------------------------
 * BUTTONS - CREATE NEW ENTRY, DISPLAY ITEM NUMBERS, CSV EXPORT
 --------------------------------------------------------------*/}
      

      {/* Actions */}
      <div className="w-full flex justify-end mb-4">
        <div className='w-full flex flex-wrap gap-2'>
          <div>
            <a href="/node/add/acc_journal_entry">
            <Button>Create Journal Entry</Button>
            </a>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button><button className='cursor-pointer'
              onClick={exportJournalCSV}>
              Export CSV
            </button></Button>
            <Button>
            <a href='/admin/content/csv-to-journal-entry'>
              Import CSV
            </a>
            </Button>
          </div>
        </div>
        <div className='mx-2 relative top-4'>
          <div>Items Per page:</div>
          <input 
            className='w-24 border p-2' 
            type='number' 
            value={itemPerPage} 
            onChange={(e) => setItemPerPage(e.target.value)} />
        </div>
      </div>



      {/** PAGE TITLE ---------------------------------------------------------  */}
      <PageTitle title="Journal Entries" />



      {/*--------------------------------------------------- 
      Date Filter Form 
      ------------------------------------------------------*/}
      <form
        className="flex flex-wrap gap-4 items-end mb-6 p-4 mx-2 border"
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






      {/*---- Journal Entry List ----------------------------------------*/}
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
          <div className="my-2 pl-4 md:flex flex-wrap">
            <div className="mt-2 text-xs uppercase w-32">
              Description
            </div>
            <div className='mt-1 ml-2 text-sm'><FormattedText>
              {entry?.field_description?.processed}
            </FormattedText></div>
          </div>


        
{/** COMMENT ----------------------------------------------------------------- */}
          <div className="my-2 pl-4 md:flex flex-wrap">
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



{/** REFERENCE CODE FROM INVOICE AND PURCHASE AUTO POSTING */}
          <div className='text-xs px-4 flex justify-end'>  
            {generateLink(entry?.field_purchase_sale_reference_id)}
          </div>



{/** IMAGE SECTION ----------------------------------------- */}
          <div className='flex'>
            { entry?.field_image_image &&
              entry?.field_image_image?.map((img, i) => 
            <a key={i} href={img?.field_media_image?.uri?.url} target='_blank'>
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

        </div>
      ))}


      
{/** PAGENATION SECTION ----------------------------------------------- */}
         <div className="flex justify-between items-center mt-6">
           <div disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}> 
             { page !== 0 && <Button>← Previous</Button>}
           </div>
          
            <div className="text-sm font-semibold">
              Page {page + 1}
            </div>

           
            <div onClick={() => setPage((p) => p + 1)}>
              { data && data.length !== 0 &&<Button>Next →</Button>}
            </div>
            

          </div>

    </div>
  );
}
