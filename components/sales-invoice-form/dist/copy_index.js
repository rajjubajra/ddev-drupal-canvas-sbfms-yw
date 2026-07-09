import { useState, useEffect } from 'react';

import useSWR from 'swr';

import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';



/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();


export default function InvoiceForm() {




    const { data:invoice, error:invoiceError, isLoading:invoiceIsLoading } = useSWR(
        [
         'node--invoice',
          {
                   queryString: new DrupalJsonApiParams()
                     .getQueryString(),
          },
        ],
        ([type, options]) => client.getCollection(type, options)
    );


 
  /* --------------------------------------------------
     Customer AutoComplete
  -------------------------------------------------- */
  
    const [search, setSearch] = useState('');
    const [title, setTitle] = useState('');
    const [address, setAddress] = useState('');
    const [customerId, setCustomerId] = useState(null);
  

  // console.log('Search Term:', search.length);
      /** Search term , fetch data */
       const { data, error, isLoading } = useSWR(
          search.length > 0 ?
               [
                 'node--customer',
                 {
                   queryString: new DrupalJsonApiParams()
                     .addFilter('title', search,'CONTAINS')
                     .getQueryString(),
                 },
               ] : null,
               ([type, options]) => client.getCollection(type, options)
             );

      
      console.log('API Response:', data);
    
  
    /** CLEAR Search input */
      function clearSearch() {
        setSearch('');
        setTitle('');
        setAddress('');
        setCustomerId(null);
      }

  
  /* --------------------------------------------------
     Product AutoComplete
  -------------------------------------------------- */
  
      const [productSearch, setProductSearch] = useState('');
      const [productId, setProductId] = useState(null);
      const [productTitle, setProductTitle] = useState('');
      const [productItems, setProductItems] = useState([]);
      console.log('Product Items:', productItems);

      const { data:prd, error:prdError, isLoading:prdIsLoading } = useSWR(
          productSearch.length > 0 ?
               [
                 'node--product',
                 {
                   queryString: new DrupalJsonApiParams()
                     .addFilter('title', productSearch,'CONTAINS')
                     .getQueryString(),
                 },
               ] : null,
               ([type, options]) => client.getCollection(type, options)
             );

      console.log('Product Search Term:', productSearch);
      console.log('Product API Response:', prd);
      console.log('Product title:', productTitle);
      console.log('Product ID:', productId);


    /** CLEAR Product Search input */
      function clearProductSearch() {
        setProductSearch('');
        setProductId(null);
        setProductTitle('');
      }

      function handleProductSelect(item) {
       const arr = [];

        setProductId(item.id);
        setProductTitle(item.title);
       

        arr.push({
          'id': item.id,
          'title': item.title,
          'price': item.field_selling_price,
          'quantity': 0,
          'stock': item.field_stock
        })
        setProductItems(prevItems => [...prevItems, ...arr]);
        setProductSearch('');
        setProductId(null);
        setProductTitle('');
      }


      function updateQuantity(itemId, quantity) {
        setProductItems(prevItems => 
          prevItems.map(item => 
            item.id === itemId ? { ...item, quantity } : item
          )
        );
      }
  



      /**
       * 
       * On form submission, it should send a JSON:API POST request to create the invoice with all the details including customer reference, product references with quantity and price.
       */

      const [payload, setPayload] = useState(null);

      useEffect(() => {


        const included = prd.map((item, index) => ({
            type: "paragraph--sales_invoice_items",
            id: `temp-item-${index}`,
            attributes: {
              field_quantity: item.quantity,
              field_price: item.price
            },
            relationships: {
              field_product: {
                data: {
                  type: "node--product",
                  id: item.id
                }
              }
            }
          }));


          const relationships = {
            field_sales_invoice_items: {
              data: included.map(p => ({
                type: p.type,
                id: p.id
              }))
            }
          };


          const payload = {
            data: {
              type: "node--invoice",
              attributes: {
                title: "Invoice Test"
              },
              relationships
            },
            included
          };

        setPayload(payload);
        console.log('Included:', included,' relationships ', relationships, 'Payload',payload);
      }, [prd]);




      const handleSubmit = async (payload) => {

        if (!payload) {
          console.error("No payload to submit");
          return;
        }

        
        await fetch("/jsonapi/node/invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/vnd.api+json",
            "Accept": "application/vnd.api+json",
          },
          body: JSON.stringify(payload),
        });         
          
      
    }
    





  /*---------------------------------------------------
     Render UI
    -------------------------------------------------- */
  return (
    <div>

     <PageTitle title='Invoice Form' />


      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 space-y-6">

      <h2 className="text-xl font-semibold border-b pb-2">Sales Invoice</h2>


      <div>
        <input name='invoice_date' type='date' className='border p-2 border-slate-200' />
      </div>


      <div>
        <input name='invoice_number' className='border p-2 border-slate-200' />
      </div>


  {/*<!-- Invoice Info -->*/}


  {/** CUSTOMER -----------------------------------------------------------*/}
      <div className='border p-2 my-2 border-slate-200'>
        <label className='block mb-1 font-medium'>Customer</label>
        <div>
        <input name='customer_id' value={customerId || ''} className='text-xs' readOnly />
        </div>
           {
           title === '' && 
           <input
             className='border p-2'
             placeholder='Search Customer'
             name='search customer'
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
           }
           <div>
            {
              data && data.length > 0 && data.map((item) => {
                return(
                  <div key={item.id}>
                    <div className='cursor-pointer' onClick={() => {
                      setTitle(item.title);
                      setAddress(item.field_address.processed);
                      setCustomerId(item.id);
                      setSearch('');
                    }}>{item.title}</div>
                  </div>
                )
              })
            }
            <div className='font-bold text-sm'>{title}</div>
            <FormattedText>
              {address}
            </FormattedText>  
            { search.length > 0 || title ?
              <span className='p-2 cursor-pointer text-red-500 text-xs' onClick={() => clearSearch()}> Clear Customer </span>
              : null
            }      
           </div>
      </div>
  
{/** CUSTOMER ENDS ----------------------------------------------------------*/}




    
{/** PRODUCT STARTS-------------------------------------------------------------*/}     
      <div className='border p-2 my-2 border-slate-200'>

        <label className='block mb-1 font-medium'>Product</label>
        {/** PRODUCT SEARCH INPUT */}
        <input 
        placeholder='Product Search' 
        name='productSearch' 
        value={productSearch}
        onChange={(e) => setProductSearch(e.target.value)}
        className='border p-2 border-slate-200' />

        {/** PRODUCT SELECT OPTIONS  */}
        <div className='mb-2'>
          <div className='font-bold text-sm'>{productTitle}</div>
          {productSearch.length > 0 || productTitle ?
            <span 
            className='p-2 cursor-pointer text-red-500 text-xs' 
            onClick={() => clearProductSearch()}> 
            Clear search 
            </span>
            : null
          }
        </div>

        <div>
          <div>
            { prd && prd.length > 0 && prd.map((item) => {
              return(
                !productItems.some(product => product.id === item.id) && /** do not display if already selected */
                <div className='md:flex' key={item.id}>
                  <div className='cursor-pointer' onClick={() => handleProductSelect(item)}>{item.title}</div>
                  {item.field_product_type === 'goods' && <div className='text-xs md:ml-2 md:pt-2 pb-2  font-bold'>
                    Available Stock : <span className={`${item.field_stock === 0 ? 'text-red-500' : 'text-green-500'}`}>{item.field_stock}</span>
                  </div>}
                </div>
              )
            })
            }
          </div>
          {
            productItems && productItems.length > 0 && productItems.map((item) => {
              return(
                <div key={item.id} className='grid grid-cols-4 gap-2'>
                  <input name='product_id' value={item.id || ''} className='border p-2 border-slate-200 text-xs' hidden readOnly />
                  <div className='p-2'>
                    <div>{item.title}</div>
                    <div className='text-xs font-bold'>Available Stock: {item.stock}</div>
                  </div>
                  <input 
                    placeholder='Quantity' 
                    type='number'
                    name={`quantity_${item.id}`} 
                    className='border border-slate-200' 
                    value={item.quantity ? item.quantity : 1}
                    onChange={(e) => updateQuantity(item.id, e.target.value)}
                  />
                  <div>{item.price}</div>
                  <div className='p-2'>{item.price * item.quantity}</div>
                </div>
              )
            })
          }
          
        </div>
      </div>
{/** PRODUCT ENDS-------------------------------------------------------------*/}


{
  /**
   * 
   * I have content type - 'invoice' 
     with fields - 'field_customer', 'field_invoice_date', 'field_invoice_number', 'field_notes' and
     field_sales_invoice_items 
     (paragraph 'sales_invoice_items') with fields 'field_product_id' (entity reference to product), 'field_quantity' and 'field_price'
   * 
   * I want to create a form to create 'invoice' content using JSON:API POST request. 
   * The form should have an autocomplete search to select 'customer' and 'product'. 
   * On selecting product, it should display available stock and allow user to enter quantity. 
   * On form submission, it should send a JSON:API POST request to create the invoice with all the details including customer reference, product references with quantity and price.
   */
}

{/** SUBMIT BUTTON -------------------------------------------------------------*/}
    <div>
      <Button onClick={() => handleSubmit(payload)}>
        Submit Invoice
      </Button>
    </div>  

    </div>
  </div>
  
  );
}
