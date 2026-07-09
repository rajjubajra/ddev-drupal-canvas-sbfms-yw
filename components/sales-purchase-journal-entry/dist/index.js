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
import { FormattedText } from 'drupal-canvas';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
import Amount from '@/components/utl-amount';
const client = new JsonApiClient();
export default function PurchaseJournalEntry() {
    var _data_data, _data_data_attributes, _data_data1, _data_data_attributes1, _data_data2, _data_data_attributes2, _data_data3, _data_included, _data_included1, _data_data_attributes3, _data_data4, _data_data_attributes4, _data_data5, _data_data_attributes5, _data_data6, _data_data_attributes6, _data_data7, _data_data_attributes7, _data_data8, _data_data_attributes8, _data_data9, _data_data_attributes9, _data_data10, _data_data_attributes10, _data_data11, _data_data_attributes11, _data_data12, _data_data_attributes12, _data_data13;
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
        fetch(`${window.location.origin}/jsonapi/node/purchase_book/${uuidParam}`).then((res)=>res.json()).then((purchaseData)=>{
            var _purchaseData_data_attributes, _purchaseData_data;
            const purchaseNid = purchaseData === null || purchaseData === void 0 ? void 0 : (_purchaseData_data = purchaseData.data) === null || _purchaseData_data === void 0 ? void 0 : (_purchaseData_data_attributes = _purchaseData_data.attributes) === null || _purchaseData_data_attributes === void 0 ? void 0 : _purchaseData_data_attributes.drupal_internal__nid;
            if (!purchaseNid) {
                setIsCheckingJournal(false);
                return;
            }
            // Then check if journal entry exists
            return fetch(`/jsonapi/node/acc_journal_entry?filter[field_purchase_sale_reference_id]=${'purchase' + ' ' + String(uuidParam)}`).then((res)=>res.json()).then((result)=>{
                var _result_data;
                if ((result === null || result === void 0 ? void 0 : (_result_data = result.data) === null || _result_data === void 0 ? void 0 : _result_data.length) > 0) {
                    setJournalEntryNodeId(result.data[0].attributes.drupal_internal__nid);
                }
                setIsCheckingJournal(false);
            });
        }).catch((err)=>{
            console.error('Error checking journal entry:', err);
            setIsCheckingJournal(false);
        });
    };
    // Initial UUID load and listen for URL changes (back/forward navigation)
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        const uuidParam = params.get('uuid');
        console.log('URL params:', window.location.search);
        console.log('UUID from URL:', uuidParam);
        setUuid(uuidParam);
        checkJournalEntry(uuidParam);
        // Listen for popstate events (back/forward navigation)
        const handlePopState = ()=>{
            const params = new URLSearchParams(window.location.search);
            const newUuid = params.get('uuid');
            setUuid(newUuid);
            checkJournalEntry(newUuid);
        };
        // Also listen for visibility change (when page becomes visible again)
        const handleVisibilityChange = ()=>{
            if (document.visibilityState === 'visible') {
                const params = new URLSearchParams(window.location.search);
                const newUuid = params.get('uuid');
                setUuid(newUuid);
                checkJournalEntry(newUuid);
            }
        };
        window.addEventListener('popstate', handlePopState);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return ()=>{
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
   -----------------------------------------------------------------------*/ const { data, error, isLoading } = useSWR(shouldFetch ? `node--purchase_book--${uuid}` : null, ()=>_async_to_generator(function*() {
            console.log('Fetching individual resource:', uuid);
            try {
                const res = yield fetch(`${window.location.origin}/jsonapi/node/purchase_book/${uuid}?include=field_product_name,field_product_brand,field_product_code,field_product_company,field_product_size,field_sales_department,field_sku,field_vendor`);
                console.log('Fetch response status:', res.status);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                const data_1 = yield res.json();
                console.log('Fetched data:', data_1);
                return data_1;
            } catch (err) {
                console.error('Fetch error:', err);
                throw err;
            }
        })());
    console.log('SWR Data:', data === null || data === void 0 ? void 0 : (_data_data = data.data) === null || _data_data === void 0 ? void 0 : _data_data.attributes);
    console.log('SWR Include:', data === null || data === void 0 ? void 0 : data.included);
    console.log('SWR Error:', error);
    console.log('SWR Loading:', isLoading);
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
    function postJournalForPurchase(item) {
        return _async_to_generator(function*() {
            console.log('Posting journal entry for purchase item:', item);
            try {
                var _item_attributes_field_product_name, _item_attributes, _item_attributes_field_product_name1, _item_attributes1, _responseData_data_attributes, _responseData_data;
                const token = yield getCsrfToken();
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
                            title: `Inventory Purchase - ${item === null || item === void 0 ? void 0 : (_item_attributes = item.attributes) === null || _item_attributes === void 0 ? void 0 : (_item_attributes_field_product_name = _item_attributes.field_product_name) === null || _item_attributes_field_product_name === void 0 ? void 0 : _item_attributes_field_product_name.name}`,
                            field_amount: totalAmount,
                            field_date: today,
                            field_purchase_sale_reference_id: 'purchase' + ' ' + refId,
                            field_description: {
                                value: `Purchased ${item.attributes.field_quantity} box(es) of ${item === null || item === void 0 ? void 0 : (_item_attributes1 = item.attributes) === null || _item_attributes1 === void 0 ? void 0 : (_item_attributes_field_product_name1 = _item_attributes1.field_product_name) === null || _item_attributes_field_product_name1 === void 0 ? void 0 : _item_attributes_field_product_name1.name}`,
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
                const res = yield fetch('/jsonapi/node/acc_journal_entry', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/vnd.api+json',
                        'X-CSRF-Token': token
                    },
                    credentials: 'include',
                    body: JSON.stringify(journalEntry)
                });
                const responseData = yield res.json();
                // Get created nodeId (nid)
                const nodeId = responseData === null || responseData === void 0 ? void 0 : (_responseData_data = responseData.data) === null || _responseData_data === void 0 ? void 0 : (_responseData_data_attributes = _responseData_data.attributes) === null || _responseData_data_attributes === void 0 ? void 0 : _responseData_data_attributes.drupal_internal__nid;
                // Redirect to Journal Entry Page
                if (nodeId) {
                    window.location.href = `/acc-journal-entry?nodeId=${nodeId}`;
                }
            } catch (err) {
                console.error('Purchase Journal Error:', err);
            }
        })();
    }
    const productDetails = (term_type)=>{
        var _data_included;
        console.log('Extracting product details for term type:', term_type);
        const productInfo = {};
        const term = data === null || data === void 0 ? void 0 : (_data_included = data.included) === null || _data_included === void 0 ? void 0 : _data_included.find((inc)=>inc.type === term_type);
        console.log(`Found term for ${term_type}:`, term);
        if (term) {
            var _term_attributes;
            productInfo.name = (_term_attributes = term.attributes) === null || _term_attributes === void 0 ? void 0 : _term_attributes.name;
            productInfo.id = term.id;
        }
        return productInfo;
    };
    /** DATE FORMAT */ const formatDate = (dateString)=>{
        if (!dateString) return '';
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx("button", {
                onClick: ()=>window.history.back(),
                children: /*#__PURE__*/ _jsx(Button, {
                    children: "Back"
                })
            }),
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Purchase - Post Journal Entry"
            }),
            isLoading && /*#__PURE__*/ _jsx("p", {
                children: "Loading..."
            }),
            error && /*#__PURE__*/ _jsxs("div", {
                children: [
                    /*#__PURE__*/ _jsx("p", {
                        children: "Error loading data"
                    }),
                    /*#__PURE__*/ _jsx("pre", {
                        children: JSON.stringify(error, null, 2)
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex justify-between",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex gap-2 text-xs font-semibold",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                children: productDetails('taxonomy_term--product_code').name
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                children: "."
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    "SKU - ",
                                    productDetails('taxonomy_term--sku').name
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "flex gap-2 uppercase text-xs font-semibold",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "bg-blue-50",
                                children: "Purchase"
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "bg-green-50",
                                children: "Posted"
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex gap-4 text-xs",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                children: "Invoice Date: "
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "font-semibold",
                                children: formatDate(data === null || data === void 0 ? void 0 : (_data_data1 = data.data) === null || _data_data1 === void 0 ? void 0 : (_data_data_attributes = _data_data1.attributes) === null || _data_data_attributes === void 0 ? void 0 : _data_data_attributes.field_invoice_date)
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        children: "."
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                children: "Purchase Date: "
                            }),
                            /*#__PURE__*/ _jsx("span", {
                                className: "font-semibold",
                                children: formatDate(data === null || data === void 0 ? void 0 : (_data_data2 = data.data) === null || _data_data2 === void 0 ? void 0 : (_data_data_attributes1 = _data_data2.attributes) === null || _data_data_attributes1 === void 0 ? void 0 : _data_data_attributes1.field_received_date)
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "my-4 grid md:grid-cols-2  gap-4",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "py-4 px-4 border border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "uppercase text-sm tracking-tighter font-semibold",
                                children: "Product"
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "py-4 border-b border-slate-300",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "text-2xl tracking-tighter",
                                        children: [
                                            productDetails('taxonomy_term--product_name').name,
                                            "-",
                                            productDetails('taxonomy_term--product_size').name
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex gap-2 text-xs",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                children: productDetails('taxonomy_term--product_brand').name
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                children: "."
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                children: productDetails('taxonomy_term--product_company').name
                                            })
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "mt-4 text-xs",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "grid grid-cols-2 gap-2 border-b border-slate-300",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                children: "Brand"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex justify-end font-semibold",
                                                children: productDetails('taxonomy_term--product_brand').name
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "grid grid-cols-2 gap-2 border-b border-slate-300",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                children: "Company"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex justify-end font-semibold",
                                                children: productDetails('taxonomy_term--product_company').name
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "grid grid-cols-2 gap-2 border-b border-slate-300",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                children: "Units per box"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex justify-end font-semibold",
                                                children: data === null || data === void 0 ? void 0 : (_data_data3 = data.data) === null || _data_data3 === void 0 ? void 0 : (_data_data_attributes2 = _data_data3.attributes) === null || _data_data_attributes2 === void 0 ? void 0 : _data_data_attributes2.field_unit_per_box
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "py-4 px-4 border border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                className: "uppercase text-sm tracking-tighter font-semibold",
                                children: "Vendor"
                            }),
                            (data === null || data === void 0 ? void 0 : data.included) && (data === null || data === void 0 ? void 0 : (_data_included = data.included) === null || _data_included === void 0 ? void 0 : _data_included.length) > 0 && (data === null || data === void 0 ? void 0 : (_data_included1 = data.included) === null || _data_included1 === void 0 ? void 0 : _data_included1.map((inc)=>{
                                var _inc_attributes, _inc_attributes_field_contact_person, _inc_attributes1, _inc_attributes_field_address, _inc_attributes2, _inc_attributes3, _inc_attributes_field_phone_number, _inc_attributes4;
                                return inc.type === 'node--vendor' && /*#__PURE__*/ _jsxs("div", {
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "py-4 border-b border-slate-300",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-2xl tracking-tighter",
                                                    children: inc === null || inc === void 0 ? void 0 : (_inc_attributes = inc.attributes) === null || _inc_attributes === void 0 ? void 0 : _inc_attributes.title
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    className: "text-xs",
                                                    children: [
                                                        "Contact: ",
                                                        (_inc_attributes1 = inc.attributes) === null || _inc_attributes1 === void 0 ? void 0 : (_inc_attributes_field_contact_person = _inc_attributes1.field_contact_person) === null || _inc_attributes_field_contact_person === void 0 ? void 0 : _inc_attributes_field_contact_person.join(' | ')
                                                    ]
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "mt-4 text-xs",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(FormattedText, {
                                                        children: inc === null || inc === void 0 ? void 0 : (_inc_attributes2 = inc.attributes) === null || _inc_attributes2 === void 0 ? void 0 : (_inc_attributes_field_address = _inc_attributes2.field_address) === null || _inc_attributes_field_address === void 0 ? void 0 : _inc_attributes_field_address.value
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Email: ",
                                                        (_inc_attributes3 = inc.attributes) === null || _inc_attributes3 === void 0 ? void 0 : _inc_attributes3.field_email
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Phone: ",
                                                        inc === null || inc === void 0 ? void 0 : (_inc_attributes4 = inc.attributes) === null || _inc_attributes4 === void 0 ? void 0 : (_inc_attributes_field_phone_number = _inc_attributes4.field_phone_number) === null || _inc_attributes_field_phone_number === void 0 ? void 0 : _inc_attributes_field_phone_number.join(' | ')
                                                    ]
                                                })
                                            ]
                                        })
                                    ]
                                }, inc.id);
                            }))
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "p-4 border border-slate-300",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "uppercase text-xs font-semibold mb-2",
                        children: "Quantity & Value"
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "grid md:grid-cols-5 gap-2 text-center",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "bg-slate-100 py-2 px-4 text-center",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs uppercase",
                                        children: "Qty (Boxes)"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "font-semibold",
                                        children: [
                                            data === null || data === void 0 ? void 0 : (_data_data4 = data.data) === null || _data_data4 === void 0 ? void 0 : (_data_data_attributes3 = _data_data4.attributes) === null || _data_data_attributes3 === void 0 ? void 0 : _data_data_attributes3.field_quantity,
                                            " Box(es)"
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "text-xs",
                                        children: [
                                            "[ in units: ",
                                            (data === null || data === void 0 ? void 0 : (_data_data5 = data.data) === null || _data_data5 === void 0 ? void 0 : (_data_data_attributes4 = _data_data5.attributes) === null || _data_data_attributes4 === void 0 ? void 0 : _data_data_attributes4.field_quantity) * (data === null || data === void 0 ? void 0 : (_data_data6 = data.data) === null || _data_data6 === void 0 ? void 0 : (_data_data_attributes5 = _data_data6.attributes) === null || _data_data_attributes5 === void 0 ? void 0 : _data_data_attributes5.field_unit_per_box),
                                            "]"
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "bg-slate-100 py-2 px-4 text-center",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs uppercase",
                                        children: "Price / unit"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-semibold",
                                        children: /*#__PURE__*/ _jsx(Amount, {
                                            amt: (data === null || data === void 0 ? void 0 : (_data_data7 = data.data) === null || _data_data7 === void 0 ? void 0 : (_data_data_attributes6 = _data_data7.attributes) === null || _data_data_attributes6 === void 0 ? void 0 : _data_data_attributes6.field_cost_price) / (data === null || data === void 0 ? void 0 : (_data_data8 = data.data) === null || _data_data8 === void 0 ? void 0 : (_data_data_attributes7 = _data_data8.attributes) === null || _data_data_attributes7 === void 0 ? void 0 : _data_data_attributes7.field_unit_per_box)
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "bg-slate-100 py-2 px-4 text-center",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs uppercase",
                                        children: "Price / Box"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-semibold",
                                        children: /*#__PURE__*/ _jsx(Amount, {
                                            amt: data === null || data === void 0 ? void 0 : (_data_data9 = data.data) === null || _data_data9 === void 0 ? void 0 : (_data_data_attributes8 = _data_data9.attributes) === null || _data_data_attributes8 === void 0 ? void 0 : _data_data_attributes8.field_cost_price
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "bg-slate-100 py-2 px-4 text-center",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs uppercase",
                                        children: "Purchase Cost"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-semibold",
                                        children: /*#__PURE__*/ _jsx(Amount, {
                                            amt: (data === null || data === void 0 ? void 0 : (_data_data10 = data.data) === null || _data_data10 === void 0 ? void 0 : (_data_data_attributes9 = _data_data10.attributes) === null || _data_data_attributes9 === void 0 ? void 0 : _data_data_attributes9.field_quantity) * (data === null || data === void 0 ? void 0 : (_data_data11 = data.data) === null || _data_data11 === void 0 ? void 0 : (_data_data_attributes10 = _data_data11.attributes) === null || _data_data_attributes10 === void 0 ? void 0 : _data_data_attributes10.field_cost_price)
                                        })
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "bg-slate-100 py-2 px-4 text-center",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "text-xs uppercase",
                                        children: "Trade Value"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "font-semibold",
                                        children: /*#__PURE__*/ _jsx(Amount, {
                                            amt: (data === null || data === void 0 ? void 0 : (_data_data12 = data.data) === null || _data_data12 === void 0 ? void 0 : (_data_data_attributes11 = _data_data12.attributes) === null || _data_data_attributes11 === void 0 ? void 0 : _data_data_attributes11.field_quantity) * (data === null || data === void 0 ? void 0 : (_data_data13 = data.data) === null || _data_data13 === void 0 ? void 0 : (_data_data_attributes12 = _data_data13.attributes) === null || _data_data_attributes12 === void 0 ? void 0 : _data_data_attributes12.field_selling_price)
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "py-2 my-2 border-b border-slate-300",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "py-2",
                    children: isCheckingJournal ? /*#__PURE__*/ _jsx("button", {
                        className: "cursor-wait px-4 py-2 border bg-slate-400 text-white",
                        disabled: true,
                        children: "Checking..."
                    }) : journalEntryNodeId ? /*#__PURE__*/ _jsx("button", {
                        className: "cursor-pointer px-4 py-2 border bg-blue-500 text-white",
                        onClick: ()=>window.location.href = `/acc-journal-entry?nodeId=${journalEntryNodeId}`,
                        children: "Go to Journal Entry"
                    }) : /*#__PURE__*/ _jsx("button", {
                        className: "cursor-pointer px-4 py-2 border bg-slate-600 text-white",
                        onClick: ()=>postJournalForPurchase(data === null || data === void 0 ? void 0 : data.data),
                        children: "Post Journal Entry"
                    })
                })
            }),
            !data && /*#__PURE__*/ _jsx("p", {
                children: "No purchase data found for the given UUID."
            })
        ]
    });
}
