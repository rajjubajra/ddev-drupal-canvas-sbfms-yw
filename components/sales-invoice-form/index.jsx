import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';

import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';

const client = new JsonApiClient();

export default function InvoiceForm() {

  
  /** 
   * DATE : TODAY
   */
  const dateToday = new Date().toISOString().split('T')[0];
  
  /**----------------------------------------------------------------
   * FORM STATE : TITLE, Customer Id, Address, invoice date and notes
   ------------------------------------------------------------------*/
  const [formData, setFormData] = useState({
    title: '',
    customerId: null,
    customerTitle: '',
    customerAddress: '',
    invoice_date: dateToday,
    notes: ''
  });
  console.log('Form data:', formData);

  /**------------------------------------
   * IVOICE - ITEMS 
   ---------------------------------------*/
  const [productItems, setProductItems] = useState([]);
  console.log('Product items:', JSON.stringify(productItems,null,2));
  

 
  /**-----------------------------------------------------
   * CUSTOMER SEARCH STATE
   ------------------------------------------------------*/
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
 
  /**----------------------------------------------------
   *  ON-SUBMIT UI STATES
   ------------------------------------------------------*/
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  console.log('is submitting : ',isSubmitting,' submit success ' ,submitSuccess);


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
  
  //console.log('sold items : ', JSON.stringify(soldItems,null,2));

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

 



  /**------------------------------------------------------------------
   * FETCH - CUSTOMER from 'customer' content type
   ------------------------------------------------------------------*/
   
  const { data: customers, error: customerError, isLoading: customerIsLoading } = useSWR(
    customerSearch.length > 2 ?
    [
      'node--customer',
      {
        queryString: new DrupalJsonApiParams()
          .addFilter('title', customerSearch, 'CONTAINS')
          .addFields('node--customer', ['title', 'field_address'])
          .getQueryString(),
      }
    ] : null,
    ([type, options]) => client.getCollection(type, options)
  );

/**---------------------------------------------------------------------
 * FETCH: Product from 'purchase_book' content type
 ---------------------------------------------------------------------*/
  const { data: products, error: productError, isLoading: productIsLoading } = useSWR(
    productSearch.length > 1 ?
    [
      'node--purchase_book',
      {
        queryString: new DrupalJsonApiParams()
          .addFilter('title', productSearch, 'CONTAINS')
          .addFields('node--purchase_book', [
            'title',
            'field_product_name',
            'field_sku',
            'field_selling_price',
            'field_cost_price',
            'field_unit_per_box',
            'field_quantity',
            'field_sold_quantity_in_unit'
          ])
          .getQueryString(),
      }
    ] : null,
    ([type, options]) => client.getCollection(type, options)
  );
  
  console.log('Purchase Book:', products);


  // Clear customer selection
  const clearCustomerSelection = () => {
    setFormData(prev => ({
      ...prev,
      customerId: null,
      customerTitle: '',
      customerAddress: ''
    }));
    setCustomerSearch('');
  };

  // Select customer
  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerTitle: customer.title,
      customerAddress: customer.field_address?.processed || ''
    }));
    setCustomerSearch('');
  };

  // Clear product search
  const clearProductSearch = () => {
    setProductSearch('');
  };

  // Add product to invoice
  const addProduct = (product) => {


    console.log('Adding product:', product);
    // Check if product already added
    if (productItems.some(item => item.id === product.id)) {
      alert('Product already added to invoice');
      return;
    }

    const newItem = {
      id: product.id, // This is the UUID
      title: product.field_product_name?.name || product.title,
      sku: product.field_sku?.name || '',
      price: parseFloat(product.field_selling_price) / parseInt(product.field_unit_per_box || 1),
      cost_price: parseFloat(product.field_cost_price) / parseInt(product.field_unit_per_box || 1),
      quantity: 1,
      purchased_units: product.field_quantity * product.field_unit_per_box,
      sold_units: soldQtyMap[product.id],
      nodeId: product.drupal_internal__nid
    };

    setProductItems(prev => [...prev, newItem]);
    setProductSearch('');
  };

  // Update quantity
  const updateQuantity = (itemId, newQuantity) => {
    const quantity = parseInt(newQuantity) || 0;
    const item = productItems.find(i => i.id === itemId);
    
    if (!item) return;
    
    if (quantity > (item.purchased_units - item.sold_units)) {
      alert(`Quantity exceeds available stock (${item.purchased_units - item.sold_units})`);
      return;
    }
    
    if (quantity < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    setProductItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  // Remove product
  const removeProduct = (itemId) => {
    setProductItems(prev => prev.filter(item => item.id !== itemId));
  };

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



  // Validate form before submission
  const validateForm = () => {
    
    if (!formData.title?.trim()) {
      alert('Please enter an invoice title');
      return false;
    }
    
    if (!formData.customerId) {
      alert('Please select a customer');
      return false;
    }
    
    if (!formData.invoice_date) {
      alert('Please select an invoice date');
      return false;
    }
    
    if (productItems.length === 0) {
      alert('Please add at least one product');
      return false;
    }
    
    const invalidQuantity = productItems.some(item => item.quantity <= 0);
    if (invalidQuantity) {
      alert('All products must have quantity greater than 0');
      return false;
    }
    
    return true;
  };



/** FUNCTIONS TO GENERATE INVOICE-------------------------------------------------- */  

  /**
   * 
   * @returns GENERATE INVOICE NUMBER
   */
   async function getNextInvoiceNumber() {

      const res = await fetch(
        '/jsonapi/node/invoice?sort=-field_invoice_number&page[limit]=1'
      );

      const data = await res.json();
      //console.log('Generate Invoice number', data);

      if (!data.data || data.data.length === 0) return 1;


      return parseInt(data.data[0].attributes.field_invoice_number, 10) + 1;
    }


  /**
   * PREPARE INVOICE ITEMS
   *  */ 
  async function prepareInvoiceItems() {
      /** Validate Form */
      if(!validateForm()) return;

      /** run after validation */
      try {

        const createdItemId = [];

      for (const item of productItems){

            const invoiceItems = {
              "data": {
                  "type": "node--invoice_items",
                  "attributes": {
                    "title": `Invoice Item - ${item.title}`,
                    "field_product_id": item.id,
                    "field_product_quantity_units": item.quantity,
                    "field_product_unit_price": item.price,                    
                    "field_amount": item.quantity * item.price
                  }
                }
            }

            //console.log('prepared product Items', productItems);
            //console.log(JSON.stringify(invoiceItems, null,2));
            console.log('invoice items', invoiceItems);

            const token = await getCsrfToken();
            
            const response = await fetch('/jsonapi/node/invoice_items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
                'X-CSRF-Token': token
              },
              credentials: 'include',
              body: JSON.stringify(invoiceItems)
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Error response:', errorText);
              throw new Error(`HTTP error ${response.status}`);
            }

            const result = await response.json();
            console.log('Created invoice item:', result);
            
            // Make sure we return the ID
            createdItemId.push(result.data.id);    

          
      }
      //return AFTER loop finishes
      return createdItemId;

      } catch (error) {
        console.error('Error in createInvoiceItem:', error);
        throw error;
      }
    }   


  /** 
   * PREPARE INVOICE 
   * */  
  async function prepareInvoice(itemUUIDs){
    console.log('prepare invoice', itemUUIDs);

    /**
     * FORM VALITATION
     */
    // if(!validateForm()) return;


     /** RUN AFTER VALIDATION */
     try{
            /** GENERATE INVOICE */
            const invoiceNumber = await getNextInvoiceNumber();
            const totalAmount = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const invoice_json = {
                "data": {
                "type": 'node--invoice',
                "attributes":{
                  "title": formData.title,
                  "field_notes": {
                    "value": formData.notes,
                    "format": 'plain_text'
                  },
                  "field_invoice_date": formData.invoice_date,
                  "field_invoice_number": invoiceNumber,
                  "field_total_amount": totalAmount
                },
                "relationships":{
                  "field_customer_id":{
                    "data":{
                      "type": 'node--customer',
                      id: formData.customerId
                    }
                  },
                  "field_sales_invoice_items":{
                    "data": itemUUIDs.map(id =>({
                      "type": 'node--invoice_items',
                      "id":id
                    }))
                  }

                }
              }
            }

            console.log(JSON.stringify(invoice_json,null,2));

            const token = await getCsrfToken();
          
                const response = await fetch('/jsonapi/node/invoice', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json',
                    'X-CSRF-Token': token
                  },
                  credentials: 'include',
                  body: JSON.stringify(invoice_json)
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Error response:', errorText);
                  throw new Error(`HTTP error ${response.status}`);
                }

                // Parse JSON
                const result = await response.json();

                console.log('INVOICE RESULT:', result);

                // Extract nid
                const nid = result?.data?.attributes?.drupal_internal__nid;

                // Return nid - don't set submitSuccess here, let parent handle it
                return nid;
             

          }catch(error){
            console.error("prepare invoice error: ", error);
          }
  }


  function redirectToPage(baseUrl, params) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?${queryString}`;
    window.location.href = fullUrl;
  }





/** update date and title */
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(dateToday);
  useEffect(() => {
    setFormData({...formData, title: 'Invoice - ' + dateToday});
  }, []);


/**
 * 
 * @returns POST INVOICE WITH RELATIONSHIP WITH INVOICE_ITEMS UUID
 */
  const postInvoice = async () => {

  if (submitSuccess) return;

  try {
    setIsSubmitting(true);
    setSubmitError(null);

    const createdItemId = await prepareInvoiceItems();
    if (!createdItemId || createdItemId.length === 0) {
      throw new Error('Failed to create invoice items');
    }

    const nodeId = await prepareInvoice(createdItemId);
    if (!nodeId) {
      throw new Error('Failed to create invoice');
    }


    setSubmitSuccess(true);

    redirectToPage('/invoice-post-journal', { nodeId:nodeId });

  } catch (err) {
    console.error('Invoice submission error:', err);
    setSubmitError(err.message || 'Failed to create invoice');
  } finally {
    setIsSubmitting(false);
  }
}



  /**---------------------------------------------
   * UI - return
   -----------------------------------------------*/

  const handleCreateNew = () => {
    // Reset all state to allow creating a new invoice
    setFormData({
      title: '',
      customerId: null,
      customerTitle: '',
      customerAddress: '',
      invoice_date: dateToday,
      notes: ''
    });
    setProductItems([]);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  if (submitSuccess) return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 text-center">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        Invoice created successfully!
      </div>
      <button
        onClick={handleCreateNew}
        className="border px-4 py-2 rounded hover:bg-gray-100"
      >
        Create Another Invoice
      </button>
    </div>
  );



  /**
   * UI - MAIN INVOICE FORM
   */
  return (
    <div>

      <PageTitle title='Invoice Form' />

      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 space-y-6">
{/*--------------- Success Message --------------------------- */}
        {submitSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Invoice created successfully!
          </div>
        )}

{/*----------------Error Message---------------------------------*/}
        {submitError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {submitError}
          </div>
        )}



{/*---------------- Invoice Title : ----------------------------------------------------- */}
        <div className='border p-4 rounded border-slate-200'>
          <label className="block mb-1 font-medium">Invoice Title *</label>
          <input
            type='text'
            value={formData.title}
            placeholder='Invoice Title'
            className='border p-2 border-slate-200 w-full mb-2 rounded'
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>


{/*--------------- Invoice Date and Number---------------------- */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Invoice Date *</label>
            <div className='flex gap-2'>
            <input
              type='date'
              value={invoiceDate}
              className='p-2'
              onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
              required
            />
            <input 
              type='text' 
              hidden={true}
              value={formData.invoiceNumber} 
              className='p-2 w-full border-none' 
              readOnly />
            </div>
          </div>
        </div>



{/*----------------------------------- 
* Customer Section : search and pick 
*--------------------------------------*/}
        <div className='border p-4 rounded border-slate-200'>
          <label className='block mb-2 font-medium'>Customer *</label>
          
          {!formData.customerId ? (
            <>
              <input
                className='border p-2 w-full rounded'
                placeholder='Search customer (min 3 characters)'
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              
              {customerIsLoading && <div className="mt-2 text-gray-500">Loading...</div>}
              
              {customers && customers.length > 0 && (
                <div className="mt-2 border rounded max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      onClick={() => selectCustomer(customer)}
                    >
                      <div className="font-medium">{customer.title}</div>
                      {customer.field_address?.processed && (
                        <div className="text-sm text-gray-600" 
                          dangerouslySetInnerHTML={{ __html: customer.field_address.processed }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between items-start">
              
              <div>
                <div className="font-bold">{formData.customerTitle}</div>
                {formData.customerAddress && (
                  <div dangerouslySetInnerHTML={{ __html: formData.customerAddress }} />
                )}
              </div>
              <button
                onClick={clearCustomerSelection}
                className="text-red-500 text-sm hover:text-red-700"
              >
                Change Customer
              </button>
            </div>
          )}
        </div>



{/*--------------Products Section : search an pick ----------------------------------------------- */}
        <div className='border p-4 rounded border-slate-200'>
          <label className='block mb-2 font-medium'>Products *</label>
          
    {/*---Product search----*/}
          <input
            placeholder='Search products (min 3 characters)'
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className='border p-2 w-full rounded mb-2'
          />
          
          {productIsLoading && <div className="text-gray-500">Loading...</div>}
          
          {products && products.length > 0 && (
            <div className="mb-4 border rounded max-h-48 overflow-y-auto">
              {products.map((product) => {

                const sold = soldQtyMap[product.id];
                const stock = (product.field_quantity * product.field_unit_per_box);   

                return (
                  <div
                    key={product.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    onClick={() => addProduct(product)}
                  >
                    <div className="font-medium">
                      {product.field_product_name?.name || product.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      SKU: {product.field_sku?.name || 'N/A'} | 
                      Stock: {stock} | Sold: {sold} | Balance: {stock - sold} | 
                      Price: <Amount amt={product.field_selling_price / product.field_unit_per_box} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

    {/*--- Selected products---*/}
          {productItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Products:</h3>
              {productItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center border p-2 rounded">
                  <div className="col-span-4">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-gray-600">SKU: {item.sku}</div>
                    <div className="text-xs font-bold">
                      Available: {item.purchased_units} - {item.sold_units || 0} = {item.purchased_units - (item.sold_units || 0)}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      max={item.purchased_units - item.sold_units}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                      className="border p-1 w-full rounded"
                    />
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <Amount amt={item.price} />
                  </div>
                  
                  <div className="col-span-3 text-right font-bold">
                    <Amount amt={item.price * item.quantity} />
                  </div>
                  
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => removeProduct(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="text-right font-bold text-lg border-t pt-2">
                Total: <Amount amt={productItems.reduce((sum, item) => 
                  sum + (item.price * item.quantity), 0
                )} />
              </div>
            </div>
          )}
        </div>

{/*-------------Notes: Invoice Notes field--------------------------------------------------------*/}
        <div>
          <label className="block mb-1 font-medium">Notes (Optional)</label>
          <textarea
            value={formData.notes}
            placeholder='Additional notes...'
            className='border p-2 border-slate-200 w-full rounded'
            rows="3"
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </div>



{/*------------- Submit buttons -------------------------------------------------------------------*/}
        <div className="flex gap-4">
          <button
            onClick={() => postInvoice()}
            disabled={isSubmitting || submitSuccess}
            className={`flex-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer border px-2 py-1'}`}
          >
            {isSubmitting ? 'Creating Invoice...' : 'Submit Invoice'}
          </button>
        </div>
      </div>
    </div>
  );

}