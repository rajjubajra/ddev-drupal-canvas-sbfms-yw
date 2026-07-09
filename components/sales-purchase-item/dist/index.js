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
import Amount from '@/components/utl-amount';
const client = new JsonApiClient();
export default function purchase_item() {
    const [nodeId, setNodeId] = useState([]);
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        console.log('PARAMS: ', params);
        const idsParam = params.get('nodeId'); // e.g. "12,13"
        if (idsParam) {
            const idsArray = idsParam.split(',').map((id)=>Number(id));
            setNodeId(idsArray);
        }
    }, []);
    /**------------------------------------------------------------------
* FETCH: Available Stock and Product details
* from 'purchase_book' content type
--------------------------------------------------------------------*/ //const isReady = jourId !== null && jourId !== undefined && jourId !== '';
    const isReady = Array.isArray(nodeId) && nodeId.length > 0;
    const params = new DrupalJsonApiParams().addInclude([
        'field_product_name',
        'field_product_brand',
        'field_product_code',
        'field_product_company',
        'field_product_size',
        'field_sales_department',
        'field_sku',
        'field_vendor'
    ]);
    if (isReady) {
        params.addFilter('drupal_internal__nid', nodeId, 'IN');
    }
    const { data, error, isLoading } = useSWR(isReady ? [
        'node--purchase_book',
        nodeId.join(','),
        {
            queryString: params.getQueryString()
        }
    ] : null, ([type, , options])=>client.getCollection(type, options));
    console.log('DATA: ', data);
    console.log('purchase Book: ', data, 'Error:', error, 'Loading', isLoading);
    // console.log( 'purchase book', JSON.stringify(data, null, 2));
    /**--------------------------------------------------------
   *  SOLD ITEMS ROM invoice_items CONTENT TYPE 
   *--------------------------------------------------------*/ const [soldQtyMap, setSoldQtyMap] = useState({});
    console.log('items sold : ', JSON.stringify(soldQtyMap, null, 2));
    const { data: soldItems, error: soldItemsError, isLoading: soldItemsIsLoading } = useSWR([
        'node--invoice_items',
        {
            queryString: new DrupalJsonApiParams().getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    useEffect(()=>{
        const grouped = {};
        soldItems === null || soldItems === void 0 ? void 0 : soldItems.forEach((item)=>{
            const productId = item.field_product_id;
            const qty = Number(item.field_product_quantity_units) || 0;
            if (!grouped[productId]) {
                grouped[productId] = 0;
            }
            grouped[productId] += qty;
        });
        console.log(grouped);
        setSoldQtyMap(grouped);
    }, [
        soldItems
    ]);
    console.log('sold items : ', JSON.stringify(soldItems, null, 2));
    /**------------------------------------------------------------------------
       * FUNCTION CALCULATE AVAIBLE STOCKS
       *
       * @param {number} purchaseBoxes
       * @param {number} unitsPerBox
       * @param {number} soldUnits
       * @returns {{ boxes: number, units: number, totalUnits: number }}
       --------------------------------------------------------------------------
    
       * Safe remaining stock formatter
       --------------------------------------------------------------------------*/ function getRemainingStock(purchaseBoxes, unitsPerBox, soldUnits) {
        const boxesInput = Number(purchaseBoxes !== null && purchaseBoxes !== void 0 ? purchaseBoxes : 0);
        const unitsPerBoxInput = Number(unitsPerBox !== null && unitsPerBox !== void 0 ? unitsPerBox : 0);
        const soldUnitsInput = Number(soldUnits !== null && soldUnits !== void 0 ? soldUnits : 0);
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
     --------------------------------------------------------------------------- */ // Get CSRF token
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
            try {
                var _item_field_product_name, _item_field_product_name1, _data_data_attributes, _data_data;
                const token = yield getCsrfToken();
                const today = new Date().toISOString().split('T')[0];
                // ✅ Total Purchase Amount
                const totalAmount = item.field_quantity * item.field_cost_price;
                // ✅ Reference (link back to purchase)
                const refId = item.drupal_internal__nid; // you are already checking with this
                const journalEntry = {
                    data: {
                        type: 'node--acc_journal_entry',
                        attributes: {
                            title: `Inventory Purchase - ${item === null || item === void 0 ? void 0 : (_item_field_product_name = item.field_product_name) === null || _item_field_product_name === void 0 ? void 0 : _item_field_product_name.name}`,
                            field_amount: totalAmount,
                            field_date: today,
                            field_purchase_sale_reference_id: refId,
                            field_purchase_sale_reference_ty: 'purchase',
                            field_description: {
                                value: `Purchased ${item.field_quantity} box(es) of ${item === null || item === void 0 ? void 0 : (_item_field_product_name1 = item.field_product_name) === null || _item_field_product_name1 === void 0 ? void 0 : _item_field_product_name1.name}`,
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
                const res = yield fetch('/jsonapi/node/acc_journal_entry', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/vnd.api+json',
                        'X-CSRF-Token': token
                    },
                    credentials: 'include',
                    body: JSON.stringify(journalEntry)
                });
                const data = yield res.json();
                // ✅ Get created nodeId (nid)
                const nodeId = data === null || data === void 0 ? void 0 : (_data_data = data.data) === null || _data_data === void 0 ? void 0 : (_data_data_attributes = _data_data.attributes) === null || _data_data_attributes === void 0 ? void 0 : _data_data_attributes.drupal_internal__nid;
                // ✅ Redirect to Journal Entry Page
                if (nodeId) {
                    window.location.href = `/acc-journal-entry?nodeId=${nodeId}`;
                }
            } catch (err) {
                console.error('Purchase Journal Error:', err);
            }
        })();
    }
    /**---------------------------------------------------------------------
     * FETCH JOURNAL acc_journal_entry only field_purchase_sale_reference_id
     ------------------------------------------------------------------------*/ const journalParams = new DrupalJsonApiParams().addFields('node--acc_journal_entry', [
        'field_purchase_sale_reference_id',
        'drupal_internal__nid'
    ]).addFilter('field_purchase_sale_reference_id', data === null || data === void 0 ? void 0 : data.map((item)=>item.drupal_internal__nid), 'IN');
    const { data: jrn = [] } = useSWR((data === null || data === void 0 ? void 0 : data.length) ? [
        'node--acc_journal_entry',
        'purchase-journal-check',
        {
            queryString: journalParams.getQueryString()
        }
    ] : null, ([type, , options])=>client.getCollection(type, options));
    const journalMap = new Set(jrn.map((j)=>String(j.field_purchase_sale_reference_id)));
    /** returns array of field_purchase_sale_reference_id ------------------------------*/ console.log('Journal Map: ', journalMap, jrn);
    /** RETUNR JOURNAL ENTRY NODE IT */ const journalEntryNodeId = (refId)=>{
        var _jrn_index;
        const index = jrn.findIndex((j)=>String(j.field_purchase_sale_reference_id) === String(refId));
        console.log('typeof Index: ', typeof index);
        return (_jrn_index = jrn[index]) === null || _jrn_index === void 0 ? void 0 : _jrn_index.drupal_internal__nid;
    };
    if (isLoading) return /*#__PURE__*/ _jsx("div", {
        children: "Loading...."
    });
    return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Purchase Book"
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "w-full flex justify-end mb-4",
                children: [
                    /*#__PURE__*/ _jsx("button", {
                        onClick: ()=>window.history.back(),
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: " ← Back "
                        })
                    }),
                    /*#__PURE__*/ _jsx("a", {
                        href: "/node/add/purchase_book",
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: "New purchase entry:"
                        })
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                children: data && (data === null || data === void 0 ? void 0 : data.map((item)=>{
                    var _item_field_product_name, _item_field_product_size, _item_field_product_brand, _item_field_product_company, _item_field_sales_department, _item_field_sku, _item_field_vendor, _item_field_vendor_field_address, _item_field_vendor1, _item_field_vendor2, _item_field_vendor_field_phone_number, _item_field_vendor3, _item_field_vendor_field_contact_person, _item_field_vendor4;
                    const isPosted = journalMap.has(String(item.drupal_internal__nid));
                    console.log('IS POSTED: ', isPosted);
                    return /*#__PURE__*/ _jsxs("div", {
                        className: "py-2 my-2 border-b border-slate-300",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    "Purchase date: ",
                                    item.field_invoice_date
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "py-2",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "uppercase text-xs font-semibold",
                                        children: "Product Details:"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "font-bold",
                                        children: [
                                            item === null || item === void 0 ? void 0 : (_item_field_product_name = item.field_product_name) === null || _item_field_product_name === void 0 ? void 0 : _item_field_product_name.name,
                                            " - ",
                                            item === null || item === void 0 ? void 0 : (_item_field_product_size = item.field_product_size) === null || _item_field_product_size === void 0 ? void 0 : _item_field_product_size.name
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Brand: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_product_brand = item.field_product_brand) === null || _item_field_product_brand === void 0 ? void 0 : _item_field_product_brand.name
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Made by: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_product_company = item.field_product_company) === null || _item_field_product_company === void 0 ? void 0 : _item_field_product_company.name
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Purchase Ref: ",
                                            item === null || item === void 0 ? void 0 : item.field_purchase_reference
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Sales Department: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_sales_department = item.field_sales_department) === null || _item_field_sales_department === void 0 ? void 0 : _item_field_sales_department.name
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "SKU: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_sku = item.field_sku) === null || _item_field_sku === void 0 ? void 0 : _item_field_sku.name
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "py-2",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "uppercase text-xs font-semibold",
                                        children: "Purchased Quantity and Value"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "border border-slate-300 p-2",
                                        children: [
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-5 gap-2",
                                                children: [
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        children: [
                                                            "Purchased Qty",
                                                            /*#__PURE__*/ _jsx("br", {}),
                                                            "[Box/Case]"
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        children: [
                                                            "Purchase",
                                                            /*#__PURE__*/ _jsx("br", {}),
                                                            "Price per unit"
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        children: [
                                                            "Purchased Price",
                                                            /*#__PURE__*/ _jsx("br", {}),
                                                            " [Box/Case]"
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Purchased Cost"
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Trade Value"
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-5 gap-2",
                                                children: [
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        children: [
                                                            item.field_quantity,
                                                            /*#__PURE__*/ _jsxs("span", {
                                                                className: "text-xs",
                                                                children: [
                                                                    "[ in units: ",
                                                                    item.field_quantity * item.field_unit_per_box,
                                                                    "]"
                                                                ]
                                                            })
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: item.field_cost_price / item.field_unit_per_box
                                                        })
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: item.field_cost_price
                                                        })
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: item.field_quantity * item.field_cost_price
                                                        })
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: item.field_quantity * item.field_selling_price
                                                        })
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "py-2 border border-slate-300",
                                children: /*#__PURE__*/ _jsxs("div", {
                                    className: "uppercase text-sm font-bold",
                                    children: [
                                        "Units Per Box/Case: ",
                                        item.field_unit_per_box
                                    ]
                                })
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "py-2",
                                children: /*#__PURE__*/ _jsxs("div", {
                                    className: "border border-slate-300 p-2",
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-4 gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Selling Price",
                                                        /*#__PURE__*/ _jsx("br", {}),
                                                        "[Box/Case]"
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Selling Price",
                                                        /*#__PURE__*/ _jsx("br", {}),
                                                        "Per unit"
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Sold Qty"
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Actual",
                                                        /*#__PURE__*/ _jsx("br", {}),
                                                        "Sale Value"
                                                    ]
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-4 gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: item.field_selling_price
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: item.field_selling_price / item.field_unit_per_box
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: item.field_selling_price / item.field_unit_per_box * soldQtyMap[item.id] || 0
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                })
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "py-2",
                                children: /*#__PURE__*/ _jsxs("div", {
                                    className: "border border-slate-300 p-2",
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2 gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Available Stock",
                                                        /*#__PURE__*/ _jsx("br", {}),
                                                        "[Box/Case]"
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "Available Stock",
                                                        /*#__PURE__*/ _jsx("br", {}),
                                                        "Units"
                                                    ]
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2 gap-2 font-bold",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: getRemainingStock(item === null || item === void 0 ? void 0 : item.field_quantity, item === null || item === void 0 ? void 0 : item.field_unit_per_box, soldQtyMap[item.id])
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: (item === null || item === void 0 ? void 0 : item.field_quantity) * (item === null || item === void 0 ? void 0 : item.field_unit_per_box) - (soldQtyMap[item.id] || 0) || 0
                                                })
                                            ]
                                        })
                                    ]
                                })
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "py-2",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "uppercase text-xs font-semibold",
                                        children: "Vendor"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: item === null || item === void 0 ? void 0 : (_item_field_vendor = item.field_vendor) === null || _item_field_vendor === void 0 ? void 0 : _item_field_vendor.title
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: /*#__PURE__*/ _jsx(FormattedText, {
                                            children: item === null || item === void 0 ? void 0 : (_item_field_vendor1 = item.field_vendor) === null || _item_field_vendor1 === void 0 ? void 0 : (_item_field_vendor_field_address = _item_field_vendor1.field_address) === null || _item_field_vendor_field_address === void 0 ? void 0 : _item_field_vendor_field_address.value
                                        })
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Email: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_vendor2 = item.field_vendor) === null || _item_field_vendor2 === void 0 ? void 0 : _item_field_vendor2.field_email
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Phone : ",
                                            item === null || item === void 0 ? void 0 : (_item_field_vendor3 = item.field_vendor) === null || _item_field_vendor3 === void 0 ? void 0 : (_item_field_vendor_field_phone_number = _item_field_vendor3.field_phone_number) === null || _item_field_vendor_field_phone_number === void 0 ? void 0 : _item_field_vendor_field_phone_number.map((item)=>/*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        item,
                                                        " |"
                                                    ]
                                                }))
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Contact Person: ",
                                            item === null || item === void 0 ? void 0 : (_item_field_vendor4 = item.field_vendor) === null || _item_field_vendor4 === void 0 ? void 0 : (_item_field_vendor_field_contact_person = _item_field_vendor4.field_contact_person) === null || _item_field_vendor_field_contact_person === void 0 ? void 0 : _item_field_vendor_field_contact_person.map((item, i)=>/*#__PURE__*/ _jsx("div", {
                                                    className: "px-2",
                                                    children: item
                                                }, i))
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "py-2",
                                children: isPosted ? /*#__PURE__*/ _jsx("a", {
                                    className: "px-4 py-2 border",
                                    href: `/acc-journal-entry/?nodeId=${journalEntryNodeId(item.drupal_internal__nid)}`,
                                    children: "View Journal Entry"
                                }) : /*#__PURE__*/ _jsx("button", {
                                    className: "cursor-pointer px-4 py-2 border bg-slate-600 text-white",
                                    onClick: ()=>postJournalForPurchase(item),
                                    children: "Post Journal Entry"
                                })
                            })
                        ]
                    }, item.id);
                }))
            })
        ]
    });
}
