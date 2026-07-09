import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';




const client = new JsonApiClient();




export default function purchase_book(){

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
* FETCH: Available Stock and Product details
* from 'purchase_book' content type
---------------------------------------------------------------------*/

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
      const timeout = setTimeout(() => {
        setDebouncedSearch(searchTerm);
      }, 400);

      return () => clearTimeout(timeout);
    }, [searchTerm]);

      const params = new DrupalJsonApiParams()
        .addFilter('title', searchTerm, 'CONTAINS')
        .addInclude([
        'field_product_name',
        'field_product_brand',
        'field_product_code',
        'field_product_company',
        'field_product_size',
        'field_sales_department',
        'field_sku',
        'field_vendor'
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
              'node--purchase_book',
              dateFrom,
              dateTo,
              page,
              searchTerm, //THIS IS CRITICAL
              {
                queryString: params.getQueryString(),
              },
            ],
        ([type, , , , , options]) =>
        client.getCollection(type, options)

      );          

  console.log('purchase Book: ',data, 'Error:', error, 'Loading', isLoading);
  console.log( 'purchase book', JSON.stringify(data, null, 2));




  /**--------------------------------------------------------
   *  SOLD ITEMS ROM invoice_items CONTENT TYPE 
   *---------------------------------------------------------*/ 
      const [soldQtyMap, setSoldQtyMap] = useState({});
      console.log('items sold : ', JSON.stringify(soldQtyMap, null,2));
      const { data:soldItems, error:soldItemsError, isLoading:soldItemsIsLoading } = useSWR(
        [
          'node--invoice_items',
          {
            queryString: new DrupalJsonApiParams()
            .getQueryString(),
          }
        ],
        ([type, options]) => client.getCollection(type, options)
      );

      useEffect(() => {
        const grouped = {};

              soldItems?.forEach(item => {
                const productId = item.field_product_id;
                const qty = Number(item.field_product_quantity_units) || 0;

                if (!grouped[productId]) {
                  grouped[productId] = 0;
                }

                grouped[productId] += qty;
              });

              console.log(grouped);

              setSoldQtyMap(grouped);

      },[soldItems])

      //console.log('sold items : ', JSON.stringify(soldItems,null,2));



      /**
       * FUNCTION CALCULATE AVAIBLE STOCKS
       *
       * @param {number} purchaseBoxes
       * @param {number} unitsPerBox
       * @param {number} soldUnits
       * @returns {{ boxes: number, units: number, totalUnits: number }}
       */
      /**
       * Safe remaining stock formatter
       */
        function getRemainingStock(purchaseBoxes, unitsPerBox, soldUnits) {
              const boxesInput = Number(purchaseBoxes ?? 0);
              const unitsPerBoxInput = Number(unitsPerBox ?? 0);
              const soldUnitsInput = Number(soldUnits ?? 0);

              if (!unitsPerBoxInput) return '0 Box 0 Units';

              const totalUnits = boxesInput * unitsPerBoxInput;
              const remainingUnits = totalUnits - soldUnitsInput;

              const safeRemaining = Math.max(0, remainingUnits);

              const boxes = Math.floor(safeRemaining / unitsPerBoxInput);
              const units = safeRemaining % unitsPerBoxInput;

              return `${boxes} Box ${units} Units`;
        }




    /**---------------------------------------------------------------------
     * FETCH JOURNAL acc_journal_entry only field_purchase_sale_reference_id
     -----------------------------------------------------------------------*/

      const journalParams = new DrupalJsonApiParams()
          .addFields('node--acc_journal_entry', [
            'field_purchase_sale_reference_id'
          ])
          .addFilter(
            'field_purchase_sale_reference_id',
            data?.map(item => 'purchase' + ' ' + String(item.id)), // ['purchase 123', 'purchase 124', ...]
            'IN'
          );

        const { data: jrn = [] } = useSWR(
            data?.length
              ? [
                  'node--acc_journal_entry',
                  'purchase-journal-check',
                  { queryString: journalParams.getQueryString() }
                ]
              : null,
            ([type, , options]) => client.getCollection(type, options)
          );

          const journalMap = new Set(
            jrn.map(j => j.field_purchase_sale_reference_id)
          );      
       
        /** returns array of field_purchase_sale_reference_id */
         console.log('Journal Map: ',journalMap);




    if(isLoading) return <div>Loading....</div>

    return(
      <div>
        <PageTitle title='Purchase Book' />

{/** BUTTONS */}
      <div className="w-full flex justify-end mb-4">
        <a href="/node/add/purchase_book">
          <Button>Post new purchase:</Button>
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
        className="w-fll flex flex-wrap gap-4 items-end mb-6 p-4 border border-slate-300"
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



{/**------------------------------------------------------------------
 * SEARCH FORM
 -------------------------------------------------------------------*/}
    <div className='w-full'>
      <input 
      className='w-full border border-slate-300 focus:outline-slate-500 px-4 py-2 mb-4'
      placeholder='Search Product by Name'
      type='text' 
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>




{/*------------------------------------------------------
* PURCHASE ITEM LISTING 
---------------------------------------------------------*/}
            <div>
                {
                    data && data?.map((item) => {
                      console.log('item id to JournalMap:', item.id);
                      const isPosted = journalMap.has('purchase' + ' '  + String(item.id));
                        return<div key={item.id}>

                       
                {/** PRODUCT DETAILS ------------------------------------------------*/}
                      <div className='border border-slate-300 my-2'>
                        <div className='border-b border-slate-300 px-2'>
                          <div className='text-lg font-semibold tracking-tighter'>
                            {item?.field_product_name?.name} - {item?.field_product_size?.name}
                          </div>
                          <div className='flex gap-1 text-xs'>
                            <div>{item.field_unit_per_box} units per box</div>
                            <div>.</div>
                            <div>purchased on {item.field_invoice_date}</div>
                          </div>
                        </div>


                        {/** STOCK DETAILS ------------------------------------------------*/}
                        <div className='grid md:grid-cols-3 text-center border-b border-slate-300'>
                            <div className='border-r border-slate-300 p-2'>
                              <div className='uppercase text-xs'>Purchased</div>
                              <div className='text-lg'>{item.field_quantity * item.field_unit_per_box}</div>
                              <div className='text-xs'>
                                {getRemainingStock(item.field_quantity, item.field_unit_per_box, 0) }
                              </div>
                            </div>
                            <div className='p-2'>
                              <div>Sold</div>
                              <div className='text-lg'>{soldQtyMap[item.id] || 0}</div>
                              <div className='text-xs'>units</div> 
                            </div>
                            <div className='border-l border-slate-300 p-2'>
                              <div>Available</div>
                              <div className='text-lg'>{((item?.field_quantity * item?.field_unit_per_box) - (soldQtyMap[item.id] || 0)) || 0}</div>
                              <div className='text-xs'>
                                {getRemainingStock(item.field_quantity, item.field_unit_per_box, soldQtyMap[item.id] || 0)  }
                              </div>
                            </div>  
                        </div>
                         {/** LINK DETAIL VIEW */} 
                        <div className='p-2 text-right'>
                            <div className='w-full'>
                              <a className={`p-2 border border-slate-400 cursor-pointer text-xs w-full
                              ${isPosted ? 'bg-white border-none' : 'bg-slate-400 text-blue-500'}`}                   
                              href={`/purchase-post-journal/?uuid=${item.id}`}>
                                 {isPosted ? 'View Details' : 'Post Journal Entry'} - {item.drupal_internal__nid}
                              </a>
                            </div>  
                        </div>
                      </div>    
                </div>
                })
            }
            </div>





{/* -------------------------------------------------------------
    Pagination 
------------------------------------------------------------------*/}
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
    )
}