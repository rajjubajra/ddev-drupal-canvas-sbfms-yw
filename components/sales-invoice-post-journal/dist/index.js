function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import { FormattedText } from 'drupal-canvas';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import AmountTotal from '@/components/utl-amount-total';
import Amount from '@/components/utl-amount';
const client = new JsonApiClient();
export default function sales_invoice_copy() {
    var _data_, _data__field_customer_id_field_phone_number, _data__field_sales_invoice_items, _data_1, _data__field_notes, _data_2;
    /**----------------------------------------------------------------
 *  UUID FROM THE SALES LIST
 ------------------------------------------------------------------*/ const [nodeId, setNodeId] = useState('');
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        const id = params.get('nodeId');
        console.log('Node Id : ', id);
        setNodeId(id);
    }, []);
    /**--------------------------------------------------------------------------------------------
  * Extract UUID from URL query parameters and fetch the corresponding purchase data via JSON:API.
  * Then display the purchase details and provide a button to post a journal entry for the purchase.
  -------------------------------------------------------------------------------------------*/ const [uuid, setUuid] = useState(null);
    const [journalEntryNodeId, setJournalEntryNodeId] = useState(null);
    const [isCheckingJournal, setIsCheckingJournal] = useState(false);
    const [journalEntry, setJournalEntry] = useState(null);
    // Function to check for existing journal entry
    const checkJournalEntry = (uuidParam)=>{
        console.log('Checking journal entry for UUID:', uuidParam);
        if (!uuidParam) return;
        setIsCheckingJournal(true);
        setJournalEntryNodeId(null);
        // First get the purchase nid from UUID
        fetch(`${window.location.origin}/jsonapi/node/sales_book/${uuidParam}`).then((res)=>res.json()).then((purchaseData)=>{
            var _purchaseData_data;
            console.log('Purchase data:', purchaseData);
            const purchaseNid = purchaseData === null || purchaseData === void 0 ? void 0 : (_purchaseData_data = purchaseData.data) === null || _purchaseData_data === void 0 ? void 0 : _purchaseData_data.drupal_internal__nid;
            if (!purchaseNid) {
                setIsCheckingJournal(false);
                return;
            }
            // Then check if journal entry exists
            return fetch(`${window.location.origin}/jsonapi/node/acc_journal_entry`).then((res)=>res.json()).then((result)=>{
                setJournalEntry(result);
            });
            // Then check if journal entry exists
            return fetch(`/jsonapi/node/acc_journal_entry?filter[field_purchase_sale_reference_id]=${'sales' + ' ' + String(uuidParam)}`).then((res)=>res.json()).then((result)=>{
                var _result_data;
                if ((result === null || result === void 0 ? void 0 : (_result_data = result.data) === null || _result_data === void 0 ? void 0 : _result_data.length) > 0) {
                    var _result_data_;
                    console.log('Existing journal entry found:', result.data[0]);
                    setJournalEntryNodeId((_result_data_ = result.data[0]) === null || _result_data_ === void 0 ? void 0 : _result_data_.drupal_internal__nid);
                }
                setIsCheckingJournal(false);
            });
        }).catch((err)=>{
            console.error('Error checking journal entry:', err);
            setIsCheckingJournal(false);
        });
    };
    useEffect(()=>{
        nodeId && checkJournalEntry(nodeId);
    }, [
        nodeId
    ]);
    /**----------------------------------------------------------------------
 * FETCH data for invoice copy from content type 'invoice'
 ------------------------------------------------------------------------*/ const { data, error, isLoading } = useSWR([
        'node--invoice',
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_sales_invoice_items',
                'field_customer_id'
            ]).addFilter('drupal_internal__nid', nodeId, '=') // Exclude current article by uuid.
            .getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    console.log('DATA', data, data && ((_data_ = data[0]) === null || _data_ === void 0 ? void 0 : _data_.id), error, isLoading);
    // Get CSRF token
    function getCsrfToken() {
        return _async_to_generator(function*() {
            try {
                const response = yield fetch("/session/token", {
                    method: "GET",
                    credentials: "include"
                });
                if (!response.ok) {
                    throw new Error(`Failed to get CSRF token: ${response.status}`);
                }
                return yield response.text();
            } catch (error) {
                console.error("CSRF token error:", error);
                throw error;
            }
        })();
    }
    /** SALE STATUS */ const [cashsale, setCashSale] = useState(null);
    const saleStatus = cashsale === null ? 'Sale Status Not Set' : cashsale ? 'Cash Sale' : 'Credit Sale';
    /**
 * Create Journal Entries (Drupal fields aligned)
 * this function is generated by chatgpt
    */ function postJournalEntryForInvoice(invoiceId, productItems) {
        return _async_to_generator(function*() {
            console.log('submitted', invoiceId, productItems);
            if (cashsale === null) {
                alert('Please select Cash Sale or Credit Sale before posting journal entry.');
                return;
            }
            try {
                var _productItems_, _data2_data_attributes, _data2_data, _data2;
                const token = yield getCsrfToken();
                const today = new Date().toISOString().split('T')[0];
                console.log('running try');
                // ✅ Calculate totals
                const totalAmount = productItems.reduce((sum, item)=>sum + item.field_product_unit_price * item.field_product_quantity_units, 0);
                console.log('total Amount: ', totalAmount);
                // (Optional) If you have cost field
                /**
    const totalCOGS = productItems.reduce(
      (sum, item) => sum + ((item.cost_price || 0) * item.quantity)
      ,0);
    **/ const refString = `${invoiceId}-${today}`;
                // Get nodeId from the first product item
                const nodeId = (_productItems_ = productItems[0]) === null || _productItems_ === void 0 ? void 0 : _productItems_.drupal_internal__nid;
                // Only create journal entries if we have a valid nodeId
                if (!nodeId) {
                    console.warn('No nodeId available for journal entries');
                    return;
                }
                console.log('total Amount', totalAmount, 'node id', nodeId, 'refString', refString);
                // -------- Revenue Entry --------
                const revenueEntry = {
                    data: {
                        type: 'node--acc_journal_entry',
                        attributes: {
                            title: `Invoice Revenue - ${invoiceId}`,
                            field_amount: totalAmount,
                            field_date: today,
                            field_purchase_sale_reference_id: nodeId,
                            field_purchase_sale_reference_ty: 'invoice',
                            field_description: {
                                value: `Revenue for Invoice ${nodeId}`,
                                format: 'plain_text'
                            },
                            field_comment: {
                                value: `Auto generated consolidated revenue entry`,
                                format: 'plain_text'
                            }
                        },
                        relationships: {
                            field_debit_account: {
                                data: {
                                    type: "node--accounting_ledger",
                                    id: "91ff33c2-6d0d-4876-9746-e1551585f29e" // Accounts Receivable / Cash
                                }
                            },
                            field_credit_account: {
                                data: {
                                    type: "node--accounting_ledger",
                                    id: "4f7d0b0f-0a5a-421d-ab45-47779da5ecc0" // Sales Revenue
                                }
                            }
                        }
                    }
                };
                // -------- COGS Entry --------
                const cogsEntry = {
                    data: {
                        type: 'node--acc_journal_entry',
                        attributes: {
                            title: `COGS - ${invoiceId}`,
                            field_amount: totalAmount,
                            field_date: today,
                            field_purchase_sale_reference_id: nodeId,
                            field_purchase_sale_reference_ty: 'invoice',
                            field_description: {
                                value: `COGS for Invoice ${nodeId}`,
                                format: 'plain_text'
                            },
                            field_comment: {
                                value: `Auto generated consolidated COGS entry`,
                                format: 'plain_text'
                            }
                        },
                        relationships: {
                            field_debit_account: {
                                data: {
                                    type: "node--accounting_ledger",
                                    id: "d030ea84-af4f-4f2e-a1a7-313b560181fc" // COGS Expense
                                }
                            },
                            field_credit_account: {
                                data: {
                                    type: "node--accounting_ledger",
                                    id: "c5343609-65ee-4e0d-926e-20104956edd9" // Inventory
                                }
                            }
                        }
                    }
                };
                // -------- POST Revenue --------
                const res1 = yield fetch('/jsonapi/node/acc_journal_entry', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/vnd.api+json',
                        'Accept': 'application/vnd.api+json',
                        'X-CSRF-Token': token
                    },
                    credentials: 'include',
                    body: JSON.stringify(revenueEntry)
                });
                const data1 = yield res1.json();
                console.log('Revenue entry response:', data1);
                // -------- POST COGS --------
                if (totalAmount > 0) {
                    const res2 = yield fetch('/jsonapi/node/acc_journal_entry', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/vnd.api+json',
                            'Accept': 'application/vnd.api+json',
                            'X-CSRF-Token': token
                        },
                        credentials: 'include',
                        body: JSON.stringify(cogsEntry)
                    });
                    const data21 = yield res2.json();
                    console.log('COGS entry response:', data21);
                }
                // ✅ Redirect commented out - can be enabled if needed
                if ((_data2 = data2) === null || _data2 === void 0 ? void 0 : (_data2_data = _data2.data) === null || _data2_data === void 0 ? void 0 : (_data2_data_attributes = _data2_data.attributes) === null || _data2_data_attributes === void 0 ? void 0 : _data2_data_attributes.drupal_internal__nid) {
                    window.location.href = `/acc-journal-entry?nodeId=${data1.data.attributes.drupal_internal__nid},${data2.data.attributes.drupal_internal__nid}`;
                }
            } catch (err) {
                console.error('Journal error:', err);
                throw err;
            }
        })();
    }
    console.log('Journal Entry Node ID:', journalEntryNodeId, 'isCheckingJournal:', isCheckingJournal);
    console.log('Journal Entry Data:', journalEntry);
    if (error) return /*#__PURE__*/ _jsx("div", {
        children: "Loading error..."
    });
    if (isLoading) return /*#__PURE__*/ _jsx("div", {
        children: "Loading ..."
    });
    return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx("div", {
                className: "flex justify-end",
                children: /*#__PURE__*/ _jsx(Button, {
                    children: /*#__PURE__*/ _jsx("button", {
                        className: "cursor-pointer",
                        onClick: ()=>window.history.back(),
                        children: "← Back"
                    })
                })
            }),
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Invoice - Post Journal Entry"
            }),
            /*#__PURE__*/ _jsxs("div", {
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex justify-between py-4 border-b border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: `font-bold bg-slate-600 px-4 py-1 ${saleStatus === 'Cash Sale' ? 'text-green-500' : saleStatus === 'Credit Sale' ? 'text-red-500' : 'text-slate-200'}`,
                                        children: saleStatus
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "font-bold",
                                        children: [
                                            "Invoice - ",
                                            data[0].field_invoice_number
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs",
                                        children: data[0].field_invoice_date
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                children: /*#__PURE__*/ _jsx("div", {
                                    className: "text-xs",
                                    children: data[0].field_customer_id.field_customer_code
                                })
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "grid md:grid-cols-2 py-4 border-b border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-semibold",
                                        children: data[0].field_customer_id.title
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs",
                                        children: /*#__PURE__*/ _jsx(FormattedText, {
                                            children: data[0].field_customer_id.field_address.value
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "text-xs border-l border-slate-300 pl-4",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "flex gap-2",
                                        children: (_data__field_customer_id_field_phone_number = data[0].field_customer_id.field_phone_number) === null || _data__field_customer_id_field_phone_number === void 0 ? void 0 : _data__field_customer_id_field_phone_number.map((item)=>/*#__PURE__*/ _jsx("div", {
                                                children: item
                                            }))
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: data[0].field_customer_id.field_email
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Tax Id: ",
                                            data[0].field_customer_id.field_tax_id
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "my-2",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex gap-2 border-b border-slate-300",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-96",
                                        children: "Product"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-12",
                                        children: "Qty"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-32 text-right",
                                        children: "Rate"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-32 text-right",
                                        children: "Amount"
                                    })
                                ]
                            }),
                            (_data__field_sales_invoice_items = data[0].field_sales_invoice_items) === null || _data__field_sales_invoice_items === void 0 ? void 0 : _data__field_sales_invoice_items.map((item)=>{
                                return /*#__PURE__*/ _jsxs("div", {
                                    className: "flex gap-2 border-b border-slate-300 py-1",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "w-96",
                                            children: item === null || item === void 0 ? void 0 : item.title
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "w-12",
                                            children: item === null || item === void 0 ? void 0 : item.field_product_quantity_units
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "w-32",
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: item === null || item === void 0 ? void 0 : item.field_product_unit_price
                                            })
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "w-32",
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: (item === null || item === void 0 ? void 0 : item.field_product_unit_price) * (item === null || item === void 0 ? void 0 : item.field_product_quantity_units)
                                            })
                                        })
                                    ]
                                }, item.id);
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex gap-2 py-2 border-t border-b border-slate-300",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-96"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-12"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-32 uppercase text-xs flex justify-end items-center",
                                        children: "Total Amount"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-32 text-lg text-right",
                                        children: /*#__PURE__*/ _jsx(AmountTotal, {
                                            amt: (_data_1 = data[0]) === null || _data_1 === void 0 ? void 0 : _data_1.field_total_amount
                                        })
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "py-2 border-b border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                children: "Note:"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                children: /*#__PURE__*/ _jsx(FormattedText, {
                                    children: data[0] ? (_data_2 = data[0]) === null || _data_2 === void 0 ? void 0 : (_data__field_notes = _data_2.field_notes) === null || _data__field_notes === void 0 ? void 0 : _data__field_notes.value : '---'
                                })
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "py-2 my-2 border-b border-slate-300 flex gap-4 flex-wrap",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "py-2",
                        children: /*#__PURE__*/ _jsx("button", {
                            className: "cursor-pointer px-4 py-2 border bg-slate-500 text-white",
                            onClick: ()=>setCashSale(true),
                            children: "Cash Sale"
                        })
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "py-2",
                        children: /*#__PURE__*/ _jsx("button", {
                            className: "cursor-pointer px-4 py-2 border bg-slate-500 text-white",
                            onClick: ()=>setCashSale(false),
                            children: "Credit Sale"
                        })
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "py-2",
                        children: isCheckingJournal ? /*#__PURE__*/ _jsx("button", {
                            className: "cursor-wait px-4 py-2 border bg-slate-400 text-white",
                            disabled: true,
                            children: "Checking..."
                        }) : journalEntryNodeId ? /*#__PURE__*/ _jsx("button", {
                            className: "cursor-pointer px-4 py-2 border bg-blue-500 text-white",
                            onClick: ()=>window.location.href = `/acc-journal-entry?nodeId=${journalEntryNodeId}`,
                            children: "Go to Journal Entry"
                        }) : data && /*#__PURE__*/ _jsx("button", {
                            className: "cursor-pointer px-4 py-2 border bg-slate-600 text-white",
                            onClick: ()=>{
                                var _data_;
                                return postJournalEntryForInvoice(data[0].id, (_data_ = data[0]) === null || _data_ === void 0 ? void 0 : _data_.field_sales_invoice_items);
                            },
                            children: "Post Journal Entry"
                        })
                    })
                ]
            })
        ]
    });
}
