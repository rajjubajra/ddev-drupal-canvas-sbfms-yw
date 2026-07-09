import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';
const client = new JsonApiClient();
export default function sales_sales_book() {
    /**--------------------------------------------------------------------------------------------
  * Extract UUID from URL query parameters and fetch the corresponding purchase data via JSON:API.
  * Then display the purchase details and provide a button to post a journal entry for the purchase.
  -------------------------------------------------------------------------------------------*/ const [uuid, setUuid] = useState(null);
    const [journalEntryNodeId, setJournalEntryNodeId] = useState(null);
    const [isCheckingJournal, setIsCheckingJournal] = useState(false);
    // Function to check for existing journal entry
    const checkJournalEntry = (uuidParam)=>{
        console.log('Checking journal entry for UUID:', uuidParam);
        if (!uuidParam) return;
        setIsCheckingJournal(true);
        setJournalEntryNodeId(null);
        // First get the purchase nid from UUID
        fetch(`${window.location.origin}/jsonapi/node/invoice/${uuidParam}`).then((res)=>res.json()).then((purchaseData)=>{
            var _purchaseData_data_attributes, _purchaseData_data;
            const purchaseNid = purchaseData === null || purchaseData === void 0 ? void 0 : (_purchaseData_data = purchaseData.data) === null || _purchaseData_data === void 0 ? void 0 : (_purchaseData_data_attributes = _purchaseData_data.attributes) === null || _purchaseData_data_attributes === void 0 ? void 0 : _purchaseData_data_attributes.drupal_internal__nid;
            if (!purchaseNid) {
                setIsCheckingJournal(false);
                return;
            }
            // Then check if journal entry exists
            return fetch(`/jsonapi/node/acc_journal_entry?filter[field_purchase_sale_reference_id]=${'sales' + ' ' + String(uuidParam)}`).then((res)=>res.json()).then((result)=>{
                var _result_data;
                if ((result === null || result === void 0 ? void 0 : (_result_data = result.data) === null || _result_data === void 0 ? void 0 : _result_data.length) > 0) {
                    var _result_data_;
                    setJournalEntryNodeId((_result_data_ = result.data[0]) === null || _result_data_ === void 0 ? void 0 : _result_data_.drupal_internal__nid);
                }
                setIsCheckingJournal(false);
            });
        }).catch((err)=>{
            console.error('Error checking journal entry:', err);
            setIsCheckingJournal(false);
        });
    };
    /* --------------------------------------------------
         State: Date Filters (default = defined fiscal year)
    ------------------------------------------------------ */ const [datePickedFrom, setDatePickedFrom] = useState('');
    const [datePickedTo, setDatePickedTo] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    /* --------------------------------------------------
        Fetch: Financial Year
    -------------------------------------------------- */ const { data: fy, error: fyError, isLoading: fyIsLoading } = useSWR([
        'node--financial_year',
        {
            queryString: new DrupalJsonApiParams().addSort([
                '-created'
            ]).getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    useEffect(()=>{
        if (!fy || fy.length === 0) return;
        if ((!datePickedFrom || datePickedFrom === '') && (!datePickedTo || datePickedTo === '')) {
            setDateFrom(fy[0].field_date_from);
            setDateTo(fy[0].field_date_to);
        } else {
            setDateFrom(datePickedFrom);
            setDateTo(datePickedTo);
        }
    }, [
        fy,
        datePickedFrom,
        datePickedTo
    ]);
    /**--------------------------------------- 
                PAGENATION 
        -------------------------------------------**/ const [page, setPage] = useState(0);
    const [itemPerPage, setItemPerPage] = useState(10);
    const ITEMS_PER_PAGE = itemPerPage;
    const offset = page * ITEMS_PER_PAGE;
    useEffect(()=>{
        console.log('PAGE CHANGED:', page, 'OFFSET:', offset);
    }, [
        page,
        offset
    ]);
    /**------------------------------------------------------------------
    * FETCH: SALES from content type 'invoice'
    ---------------------------------------------------------------------*/ const params = new DrupalJsonApiParams().addInclude([
        'field_sales_invoice_items',
        'field_customer_id'
    ]).addFilter('field_invoice_date', dateFrom, '>=').addFilter('field_invoice_date', dateTo, '<=').addSort([
        '-field_invoice_date'
    ]).addPageLimit(ITEMS_PER_PAGE).addPageOffset(offset);
    const { data, error, isLoading } = useSWR(!dateFrom || !dateTo ? null // ⛔ don’t fetch until ready
     : [
        'node--invoice',
        dateFrom,
        dateTo,
        page,
        {
            queryString: params.getQueryString()
        }
    ], ([type, , , , options])=>client.getCollection(type, options));
    console.log('Sales Book: ', data, 'Error:', error, 'Loading', isLoading);
    console.log('Sales Book JSON: ', JSON.stringify(data, null, 2));
    if (isLoading) return /*#__PURE__*/ _jsx("div", {
        children: "Loading...."
    });
    if (data && (data === null || data === void 0 ? void 0 : data.length) === 0) return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Sales Book"
            }),
            /*#__PURE__*/ _jsxs("form", {
                className: "flex flex-wrap gap-4 items-end mb-6 p-4 border rounded",
                onSubmit: (e)=>e.preventDefault(),
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date From"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateFrom,
                                onChange: (e)=>setDateFrom(e.target.value),
                                className: "border px-2 py-1 rounded"
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date To"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateTo,
                                onChange: (e)=>setDateTo(e.target.value),
                                className: "border px-2 py-1 rounded"
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "text-lg",
                children: "No data found..."
            })
        ]
    });
    return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Sales Book"
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "w-full flex justify-end mb-4",
                children: [
                    /*#__PURE__*/ _jsx("a", {
                        href: "/sales-invoice-form",
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: "Generate Invoice"
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "mx-2 relative top-4",
                        children: [
                            "Items Per page:",
                            /*#__PURE__*/ _jsx("input", {
                                className: "w-24 ml-4 border p-2",
                                type: "number",
                                value: itemPerPage,
                                onChange: (e)=>setItemPerPage(e.target.value)
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("form", {
                className: "flex flex-wrap gap-4 items-end mb-6 p-4 border rounded",
                onSubmit: (e)=>e.preventDefault(),
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date From"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateFrom,
                                onChange: (e)=>setDateFrom(e.target.value),
                                className: "border px-2 py-1 rounded"
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date To"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateTo,
                                onChange: (e)=>setDateTo(e.target.value),
                                className: "border px-2 py-1 rounded"
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex gap-2 font-semibold text-sm p-2 m-2 border border-slate-200",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "w-24",
                                children: "Date"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "w-24",
                                children: "Invoice No."
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "w-86",
                                children: "Customer"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "w-32",
                                children: "Total Amount"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "w-18",
                                children: "Link"
                            })
                        ]
                    }),
                    data && (data === null || data === void 0 ? void 0 : data.map((item)=>{
                        var _item_field_customer_id;
                        return /*#__PURE__*/ _jsx("div", {
                            className: "m-2 p-2 border border-slate-200",
                            children: /*#__PURE__*/ _jsxs("div", {
                                className: "flex gap-2 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-24",
                                        children: /*#__PURE__*/ _jsx("span", {
                                            children: item.field_invoice_date
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-24",
                                        children: /*#__PURE__*/ _jsx("span", {
                                            children: item.field_invoice_number
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-86",
                                        children: /*#__PURE__*/ _jsx("span", {
                                            children: (_item_field_customer_id = item.field_customer_id) === null || _item_field_customer_id === void 0 ? void 0 : _item_field_customer_id.title
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "w-32",
                                        children: /*#__PURE__*/ _jsx("div", {
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: item.field_total_amount
                                            })
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "border-l border-slate-300 font-bold",
                                        children: /*#__PURE__*/ _jsx("div", {
                                            className: "mx-2 px-2",
                                            children: /*#__PURE__*/ _jsx("div", {
                                                children: isCheckingJournal ? /*#__PURE__*/ _jsx("button", {
                                                    className: "cursor-wait px-4 py-2 border bg-slate-400 text-white",
                                                    disabled: true,
                                                    children: "Checking..."
                                                }) : journalEntryNodeId ? /*#__PURE__*/ _jsx("a", {
                                                    href: `/invoice-post-journal/?nodeId=${item.drupal_internal__nid}`,
                                                    children: "View Invoice"
                                                }) : /*#__PURE__*/ _jsx("a", {
                                                    href: `/invoice-post-journal/?nodeId=${item.drupal_internal__nid}`,
                                                    children: "Post Journal entry"
                                                })
                                            })
                                        })
                                    })
                                ]
                            })
                        }, item.id);
                    }))
                ]
            })
        ]
    });
}
