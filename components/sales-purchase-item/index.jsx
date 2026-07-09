import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';




const client = new JsonApiClient();




export default function purchase_item(){

   const [nodeId, setNodeId] = useState([]);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    console.log('PARAMS: ',params);

      const idsParam = params.get('nodeId'); // e.g. "12,13"
        if (idsParam) {
          const idsArray = idsParam.split(',').map(id => Number(id));
          setNodeId(idsArray);
        }
  },[])

    
          
/**------------------------------------------------------------------
* FETCH: Available Stock and Product details
* from 'purchase_book' content type
--------------------------------------------------------------------*/
      
      //const isReady = jourId !== null && jourId !== undefined && jourId !== '';
  
      const isReady = Array.isArray(nodeId) && nodeId.length > 0;
      
      const params = new DrupalJsonApiParams().addInclude([
        'field_product_name',
        'field_product_brand',
        'field_product_code', 
        'field_product_company',
        'field_product_size',
        'field_sales_department',
        'field_sku',
        'field_vendor'])
     
  
      if (isReady) {
        params.addFilter('drupal_internal__nid', nodeId, 'IN');
      }
  
  
      const { data, error, isLoading } = useSWR(
          isReady
            ? [
                'node--purchase_book',
                nodeId.join(','), // unique key
                { queryString: params.getQueryString() },
              ]
            : null,
          ([type, , options]) => client.getCollection(type, options)
        );
  
       console.log('DATA: ',data);
    
      
  console.log('purchase Book: ',data, 'Error:', error, 'Loading', isLoading);
 // console.log( 'purchase book', JSON.stringify(data, null, 2));




  /**--------------------------------------------------------
   *  SOLD ITEMS ROM invoice_items CONTENT TYPE 
   *--------------------------------------------------------*/
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

      console.log('sold items : ', JSON.stringify(soldItems,null,2));



      /**------------------------------------------------------------------------
       * FUNCTION CALCULATE AVAIBLE STOCKS
       *
       * @param {number} purchaseBoxes
       * @param {number} unitsPerBox
       * @param {number} soldUnits
       * @returns {{ boxes: number, units: number, totalUnits: number }}
       --------------------------------------------------------------------------
    
       * Safe remaining stock formatter
       --------------------------------------------------------------------------*/

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


    /**-------------------------------------------------------------------------
     *  JOURNAL ENTRY - ONCLICK BUTTON POST FUNCTION
     *      DR INVENTORY ACCOUNT  - AMOUNT
     *         CR ACCOUNT PAYABLE  - AMOUNT
     --------------------------------------------------------------------------- */  
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
        try {
          const token = await getCsrfToken();
          const today = new Date().toISOString().split('T')[0];

          // ✅ Total Purchase Amount
          const totalAmount = item.field_quantity * item.field_cost_price;

          // ✅ Reference (link back to purchase)
          const refId = item.drupal_internal__nid; // you are already checking with this

          const journalEntry = {
            data: {
              type: 'node--acc_journal_entry',
              attributes: {
                title: `Inventory Purchase - ${item?.field_product_name?.name}`,
                field_amount: totalAmount,
                field_date: today,
                field_purchase_sale_reference_id: refId,
                field_purchase_sale_reference_ty: 'purchase',
                field_description: {
                  value: `Purchased ${item.field_quantity} box(es) of ${item?.field_product_name?.name}`,
                  format: 'plain_text'
                },
                field_comment: {
                  value: `Auto generated purchase entry`,
                  format: 'plain_text'
                }
              },
              relationships: {
                // ✅ Debit → Inventory
                field_debit_account: {
                  data: {
                    type: "node--accounting_ledger",
                    id: "c23fb1c0-c533-4b28-a4e9-064184788471" // 👈 replace this
                  }
                },

                // ✅ Credit → Cash OR Accounts Payable
                field_credit_account: {
                  data: {
                    type: "node--accounting_ledger",
                    id: "798a5ec9-1e85-4323-ab14-7b4318863c6e" // 👈 replace this
                  }
                }
              }
            }
          };

          // ✅ POST
          const res = await fetch('/jsonapi/node/acc_journal_entry', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/vnd.api+json',
              'X-CSRF-Token': token
            },
            credentials: 'include',
            body: JSON.stringify(journalEntry)
          });

          const data = await res.json();

          // ✅ Get created nodeId (nid)
          const nodeId = data?.data?.attributes?.drupal_internal__nid;

          // ✅ Redirect to Journal Entry Page
          if (nodeId) {
            window.location.href = `/acc-journal-entry?nodeId=${nodeId}`;
          }

        } catch (err) {
          console.error('Purchase Journal Error:', err);
        }
      }

    

    /**---------------------------------------------------------------------
     * FETCH JOURNAL acc_journal_entry only field_purchase_sale_reference_id
     ------------------------------------------------------------------------*/

      const journalParams = new DrupalJsonApiParams()
          .addFields('node--acc_journal_entry', [
            'field_purchase_sale_reference_id',
            'drupal_internal__nid',
          ])
          .addFilter(
            'field_purchase_sale_reference_id',
            data?.map(item => item.drupal_internal__nid),
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
            jrn.map(j => String(j.field_purchase_sale_reference_id))
          );             
  /** returns array of field_purchase_sale_reference_id ------------------------------*/
         console.log('Journal Map: ',journalMap, jrn);


  /** RETUNR JOURNAL ENTRY NODE IT */
  const journalEntryNodeId = (refId) => {
     const index = jrn.findIndex((j) => String(j.field_purchase_sale_reference_id) === String(refId))
     console.log('typeof Index: ',typeof(index));
     return jrn[index]?.drupal_internal__nid;
  }       

    if(isLoading) return <div>Loading....</div>

    return(
      <div>

{/** THE PAGE TITLE */}
   <PageTitle title='Purchase Book' />
 


{/** BUTTONS: Back and New Purchase entry------------------------------------------------------------*/}
      <div className="w-full flex justify-end mb-4">
        
        <button onClick={() => window.history.back()}>
            <Button> ← Back </Button>
        </button>
        <a href="/node/add/purchase_book">
          <Button>New purchase entry:</Button>
        </a>

      </div>


{/*------------------------------------------------------
* PURCHASE ITEM LISTING 
---------------------------------------------------------*/}
    <div>
                {
                    data && data?.map((item) => {
                        const isPosted = journalMap.has(String(item.drupal_internal__nid))
                        console.log('IS POSTED: ',isPosted);
                        return<div key={item.id} className='py-2 my-2 border-b border-slate-300'>

                        <div>Purchase date: {item.field_invoice_date}</div>
{/** PRODUCT DETAILS ------------------------------------------------*/}
                        <div className='py-2'>
                            <div className='uppercase text-xs font-semibold'>Product Details:</div>
                            <div className='font-bold'>
                              {item?.field_product_name?.name} - {item?.field_product_size?.name}
                            </div>
                            <div>Brand: {item?.field_product_brand?.name}</div>
                            <div>Made by: {item?.field_product_company?.name}</div>
                            <div>Purchase Ref: {item?.field_purchase_reference}</div>
                            <div>Sales Department: {item?.field_sales_department?.name}</div>
                            <div>SKU: {item?.field_sku?.name}</div>
                        </div>
{/** PURCHASE COST AND TRADE VALUE ------------------------------------------------*/}
                        <div className='py-2'>
                            <div className='uppercase text-xs font-semibold'>Purchased Quantity and Value</div>
                            <div className='border border-slate-300 p-2'>
                              <div className='grid grid-cols-5 gap-2'>
                                <div>Purchased Qty<br />[Box/Case]</div>
                                <div>Purchase<br />Price per unit</div>
                                <div>Purchased Price<br /> [Box/Case]</div>
                                <div>Purchased Cost</div>
                                <div>Trade Value</div>
                              </div>

                              <div className='grid grid-cols-5 gap-2'>
                                <div>
                                  {item.field_quantity} 
                                  <span className='text-xs'>[ in units: {item.field_quantity * item.field_unit_per_box}]</span>
                                </div>
                                <div><Amount amt={item.field_cost_price/item.field_unit_per_box} /></div>
                                <div><Amount amt={item.field_cost_price} /></div>
                                <div><Amount amt={item.field_quantity * item.field_cost_price} /></div>
                                <div><Amount amt={item.field_quantity * item.field_selling_price} /></div>
                              </div>
                            </div>
                        </div>
{/** UNITS PER BOX/CASE ------------------------------------*/}
                        <div className='py-2 border border-slate-300'>
                          <div className='uppercase text-sm font-bold'>
                            Units Per Box/Case: {item.field_unit_per_box}
                          </div>
                        </div>
{/** SELLING PRICE ------------------------------------------*/}     
                        <div className='py-2'>
                          <div className='border border-slate-300 p-2'>
                           <div className='grid grid-cols-4 gap-2'>
                             <div>Selling Price<br />[Box/Case]</div>
                             <div>Selling Price<br />Per unit</div>
                             <div>Sold Qty</div>
                             <div>Actual<br />Sale Value</div> 
                           </div>
                           <div className='grid grid-cols-4 gap-2'>
                            <div><Amount amt={item.field_selling_price} /></div>
                            <div><Amount amt={item.field_selling_price/item.field_unit_per_box} /></div>
                           
                            <div><Amount amt={(item.field_selling_price/item.field_unit_per_box)*soldQtyMap[item.id] || 0} /></div>
                           </div> 
                          </div>
                        </div>
{/** AVAILABLE STOCK------------------------------------------*/} 
                      <div className='py-2'>
                        <div className='border border-slate-300 p-2'>
                          <div className='grid grid-cols-2 gap-2'>
                            <div>Available Stock<br />[Box/Case]</div>
                            <div>Available Stock<br />Units</div>
                          </div>
                          <div className='grid grid-cols-2 gap-2 font-bold'>
                            <div>{getRemainingStock(item?.field_quantity, item?.field_unit_per_box, soldQtyMap[item.id])}</div>
                            <div>{((item?.field_quantity * item?.field_unit_per_box) - (soldQtyMap[item.id] || 0)) || 0}</div>
                          </div>
                        </div>
                      </div>                    
{/** VENDOR DETAILS --------------------------------------------- */}        
                      <div className='py-2'>
                        <div className='uppercase text-xs font-semibold'>Vendor</div>
                            <div>{item?.field_vendor?.title}</div>
                            <div><FormattedText>{item?.field_vendor?.field_address?.value}</FormattedText></div>
                            <div>Email: {item?.field_vendor?.field_email}</div>
                            <div>Phone : {item?.field_vendor?.field_phone_number?.map((item)=> (<div>{item} |</div>))}</div>
                            <div>Contact Person: {item?.field_vendor?.field_contact_person?.map((item,i) => <div key={i} className='px-2'>{item}</div>)}</div>
                      </div>


{/** JOURNAL ENTRY POST BUTTON */}
                      <div className='py-2'>
                        {
                          isPosted 
                          ? 
                          <a
                          className='px-4 py-2 border' 
                          href={`/acc-journal-entry/?nodeId=${journalEntryNodeId(item.drupal_internal__nid)}`}>
                            View Journal Entry
                          </a>
                          : 
                          <button
                          className='cursor-pointer px-4 py-2 border bg-slate-600 text-white' 
                          onClick={() => postJournalForPurchase(item)}>Post Journal Entry
                          </button>
                        }                    
                      </div>
                </div>
                })
            }
    </div>

    </div>
    )
}