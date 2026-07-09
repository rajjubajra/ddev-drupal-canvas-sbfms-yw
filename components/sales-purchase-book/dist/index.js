import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
const client = new JsonApiClient();
export default function purchase_book() {
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
* FETCH: Available Stock and Product details
* from 'purchase_book' content type
---------------------------------------------------------------------*/ const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(()=>{
        const timeout = setTimeout(()=>{
            setDebouncedSearch(searchTerm);
        }, 400);
        return ()=>clearTimeout(timeout);
    }, [
        searchTerm
    ]);
    const params = new DrupalJsonApiParams().addFilter('title', searchTerm, 'CONTAINS').addInclude([
        'field_product_name',
        'field_product_brand',
        'field_product_code',
        'field_product_company',
        'field_product_size',
        'field_sales_department',
        'field_sku',
        'field_vendor'
    ]).addFilter('field_invoice_date', dateFrom, '>=').addFilter('field_invoice_date', dateTo, '<=').addSort([
        '-field_invoice_date'
    ]).addPageLimit(ITEMS_PER_PAGE).addPageOffset(offset);
    const { data, error, isLoading } = useSWR(!dateFrom || !dateTo ? null // ⛔ don’t fetch until ready
     : [
        'node--purchase_book',
        dateFrom,
        dateTo,
        page,
        searchTerm,
        {
            queryString: params.getQueryString()
        }
    ], ([type, , , , , options])=>client.getCollection(type, options));
    console.log('purchase Book: ', data, 'Error:', error, 'Loading', isLoading);
    console.log('purchase book', JSON.stringify(data, null, 2));
    /**--------------------------------------------------------
   *  SOLD ITEMS ROM invoice_items CONTENT TYPE 
   *---------------------------------------------------------*/ const [soldQtyMap, setSoldQtyMap] = useState({});
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
    //console.log('sold items : ', JSON.stringify(soldItems,null,2));
    /**
       * FUNCTION CALCULATE AVAIBLE STOCKS
       *
       * @param {number} purchaseBoxes
       * @param {number} unitsPerBox
       * @param {number} soldUnits
       * @returns {{ boxes: number, units: number, totalUnits: number }}
       */ /**
       * Safe remaining stock formatter
       */ function getRemainingStock(purchaseBoxes, unitsPerBox, soldUnits) {
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
    /**---------------------------------------------------------------------
     * FETCH JOURNAL acc_journal_entry only field_purchase_sale_reference_id
     -----------------------------------------------------------------------*/ const journalParams = new DrupalJsonApiParams().addFields('node--acc_journal_entry', [
        'field_purchase_sale_reference_id'
    ]).addFilter('field_purchase_sale_reference_id', data === null || data === void 0 ? void 0 : data.map((item)=>'purchase' + ' ' + String(item.id)), 'IN');
    const { data: jrn = [] } = useSWR((data === null || data === void 0 ? void 0 : data.length) ? [
        'node--acc_journal_entry',
        'purchase-journal-check',
        {
            queryString: journalParams.getQueryString()
        }
    ] : null, ([type, , options])=>client.getCollection(type, options));
    const journalMap = new Set(jrn.map((j)=>j.field_purchase_sale_reference_id));
    /** returns array of field_purchase_sale_reference_id */ console.log('Journal Map: ', journalMap);
    /** splite the ref id */ const splitRefId = (refId)=>{
        if (!refId) return null;
        const parts = refId.split(' ');
        return refId + ' : ' + parts[0] + ' - ' + parts[1];
    //return parts.length > 1 ? parts[1] : null;
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
                    /*#__PURE__*/ _jsx("a", {
                        href: "/node/add/purchase_book",
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: "Post new purchase:"
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
                className: "w-fll flex flex-wrap gap-4 items-end mb-6 p-4 border border-slate-300",
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
                className: "w-full",
                children: /*#__PURE__*/ _jsx("input", {
                    className: "w-full border border-slate-300 focus:outline-slate-500 px-4 py-2 mb-4",
                    placeholder: "Search Product by Name",
                    type: "text",
                    value: searchTerm,
                    onChange: (e)=>setSearchTerm(e.target.value)
                })
            }),
            /*#__PURE__*/ _jsx("div", {
                children: data && (data === null || data === void 0 ? void 0 : data.map((item)=>{
                    var _item_field_product_name, _item_field_product_size;
                    console.log('item id to JournalMap:', item.id);
                    const isPosted = journalMap.has('purchase' + ' ' + String(item.id));
                    return /*#__PURE__*/ _jsx("div", {
                        children: /*#__PURE__*/ _jsxs("div", {
                            className: "border border-slate-300 my-2",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "border-b border-slate-300 px-2",
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "text-lg font-semibold tracking-tighter",
                                            children: [
                                                item === null || item === void 0 ? void 0 : (_item_field_product_name = item.field_product_name) === null || _item_field_product_name === void 0 ? void 0 : _item_field_product_name.name,
                                                " - ",
                                                item === null || item === void 0 ? void 0 : (_item_field_product_size = item.field_product_size) === null || _item_field_product_size === void 0 ? void 0 : _item_field_product_size.name
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "flex gap-1 text-xs",
                                            children: [
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        item.field_unit_per_box,
                                                        " units per box"
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "."
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        "purchased on ",
                                                        item.field_invoice_date
                                                    ]
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "grid md:grid-cols-3 text-center border-b border-slate-300",
                                    children: [
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "border-r border-slate-300 p-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "uppercase text-xs",
                                                    children: "Purchased"
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-lg",
                                                    children: item.field_quantity * item.field_unit_per_box
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-xs",
                                                    children: getRemainingStock(item.field_quantity, item.field_unit_per_box, 0)
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "p-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Sold"
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-lg",
                                                    children: soldQtyMap[item.id] || 0
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-xs",
                                                    children: "units"
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "border-l border-slate-300 p-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Available"
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-lg",
                                                    children: (item === null || item === void 0 ? void 0 : item.field_quantity) * (item === null || item === void 0 ? void 0 : item.field_unit_per_box) - (soldQtyMap[item.id] || 0) || 0
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-xs",
                                                    children: getRemainingStock(item.field_quantity, item.field_unit_per_box, soldQtyMap[item.id] || 0)
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "p-2 text-right",
                                    children: /*#__PURE__*/ _jsx("div", {
                                        className: "w-full",
                                        children: /*#__PURE__*/ _jsxs("a", {
                                            className: `p-2 border border-slate-400 cursor-pointer text-xs w-full
                              ${isPosted ? 'bg-white border-none' : 'bg-slate-400 text-blue-500'}`,
                                            href: `/purchase-post-journal/?uuid=${item.id}`,
                                            children: [
                                                isPosted ? 'View Details' : 'Post Journal Entry',
                                                " - ",
                                                item.drupal_internal__nid
                                            ]
                                        })
                                    })
                                })
                            ]
                        })
                    }, item.id);
                }))
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex justify-between items-center mt-6",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        disabled: page === 0,
                        onClick: ()=>setPage((p)=>Math.max(p - 1, 0)),
                        children: page !== 0 && /*#__PURE__*/ _jsx(Button, {
                            children: "← Previous"
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "text-sm font-semibold",
                        children: [
                            "Page ",
                            page + 1
                        ]
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        onClick: ()=>setPage((p)=>p + 1),
                        children: data && data.length !== 0 && /*#__PURE__*/ _jsx(Button, {
                            children: "Next →"
                        })
                    })
                ]
            })
        ]
    });
}
