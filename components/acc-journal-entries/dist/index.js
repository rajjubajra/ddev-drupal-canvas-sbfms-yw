import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient, FormattedText, Image } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import Button from '@/components/utl-button';
import PageTitle from '@/components/utl-page-title';
import AmountTotal from '@/components/utl-amount-total';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function JournalEntriesList() {
    /* --------------------------------------------------
     State: Date Filters (default = defined fiscal year)
  -------------------------------------------------- */ const [datePickedFrom, setDatePickedFrom] = useState('');
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
    /* --------------------------------------------------
     Fetch: Journal Entries
  -------------------------------------------------- */ const params = new DrupalJsonApiParams().addInclude([
        'field_image_image.field_media_image',
        'field_credit_account',
        'field_debit_account'
    ]).addFilter('field_date', dateFrom, '>=').addFilter('field_date', dateTo, '<=').addSort([
        '-field_date'
    ]).addPageLimit(ITEMS_PER_PAGE).addPageOffset(offset);
    const { data, error, isLoading } = useSWR(!dateFrom || !dateTo ? null // ⛔ don’t fetch until ready
     : [
        'node--acc_journal_entry',
        dateFrom,
        dateTo,
        page,
        {
            queryString: params.getQueryString()
        }
    ], ([type, , , , options])=>client.getCollection(type, options));
    console.log('JOurnal DATA', data, error, isLoading);
    /*--------------------------------------------------
    Journal only for Total Number of pages
  -------------------------------------------------- */ const [jrTotal, setJrTotal] = useState('');
    useEffect(()=>{
        data && setJrTotal(setJrTotal.length);
    }, [
        data
    ]);
    console.log('jr total', jrTotal && jrTotal.length);
    /**-----------------------------------------------------------
 * EXPORT TO CSV
 --------------------------------------------------------------*/ const exportJournalCSV = ()=>{
        const headers = [
            "Date",
            "Title",
            "Description",
            "Comment",
            "Debit Account",
            "Credit Account",
            "Amount"
        ];
        const rows = data === null || data === void 0 ? void 0 : data.map((entry)=>{
            var _entry_field_description_processed, _entry_field_description, _entry_field_debit_account_field_ledger_account_name, _entry_field_debit_account, _entry_field_credit_account_field_ledger_account_name, _entry_field_credit_account;
            return [
                entry.field_date,
                entry.title,
                entry === null || entry === void 0 ? void 0 : (_entry_field_description = entry.field_description) === null || _entry_field_description === void 0 ? void 0 : (_entry_field_description_processed = _entry_field_description.processed) === null || _entry_field_description_processed === void 0 ? void 0 : _entry_field_description_processed.replace(/<[^>]+>/g, ""),
                (entry === null || entry === void 0 ? void 0 : entry.field_comment) || "",
                entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account = entry.field_debit_account) === null || _entry_field_debit_account === void 0 ? void 0 : (_entry_field_debit_account_field_ledger_account_name = _entry_field_debit_account.field_ledger_account_name) === null || _entry_field_debit_account_field_ledger_account_name === void 0 ? void 0 : _entry_field_debit_account_field_ledger_account_name.field_ledger_account_name,
                entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account = entry.field_credit_account) === null || _entry_field_credit_account === void 0 ? void 0 : (_entry_field_credit_account_field_ledger_account_name = _entry_field_credit_account.field_ledger_account_name) === null || _entry_field_credit_account_field_ledger_account_name === void 0 ? void 0 : _entry_field_credit_account_field_ledger_account_name.field_ledger_account_name,
                entry === null || entry === void 0 ? void 0 : entry.field_amount
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [
            headers,
            ...rows
        ].map((row)=>row.map((item)=>`"${item !== null && item !== void 0 ? item : ""}"`).join(",")).join("\n");
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
 */ function generateLink(text) {
        if (!text) return 'Manual Journal Entry';
        const parts = text.trim().split(' ');
        const type = parts[0];
        const id = parts[1];
        if (!id) return '';
        if (type === 'purchase') {
            return /*#__PURE__*/ _jsx("a", {
                href: `/purchase-post-journal/?uuid=${id}`,
                children: "Go to Purchase"
            });
        } else {
            return /*#__PURE__*/ _jsx("a", {
                href: `/invoice/?uuid=${id}`,
                children: "Go to Invoice"
            });
        }
    }
    /* --------------------------------------------------
     Render States
  -------------------------------------------------- */ {
        isLoading && /*#__PURE__*/ _jsx("div", {
            className: "py-4 text-sm text-gray-500",
            children: "Loading journal entries…"
        });
    }
    if (error) return 'An error has occurred.';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "w-full flex justify-end mb-4",
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "w-full flex flex-wrap gap-2",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                children: /*#__PURE__*/ _jsx("a", {
                                    href: "/node/add/acc_journal_entry",
                                    children: /*#__PURE__*/ _jsx(Button, {
                                        children: "Create Journal Entry"
                                    })
                                })
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex flex-wrap gap-2",
                                children: [
                                    /*#__PURE__*/ _jsx(Button, {
                                        children: /*#__PURE__*/ _jsx("button", {
                                            onClick: exportJournalCSV,
                                            children: "Export CSV"
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(Button, {
                                        children: /*#__PURE__*/ _jsx("a", {
                                            href: "/admin/content/csv-to-journal-entry",
                                            children: "Import CSV"
                                        })
                                    })
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "mx-2 relative top-4",
                        children: [
                            /*#__PURE__*/ _jsx("div", {
                                children: "Items Per page:"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                className: "w-24 border p-2",
                                type: "number",
                                value: itemPerPage,
                                onChange: (e)=>setItemPerPage(e.target.value)
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Journal Entries"
            }),
            /*#__PURE__*/ _jsxs("form", {
                className: "flex flex-wrap gap-4 items-end mb-6 p-4 mx-2 border",
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
            data === null || data === void 0 ? void 0 : data.map((entry)=>{
                var _entry_field_description, _entry_field_comment, _entry_field_debit_account, _entry_field_debit_account1, _entry_field_credit_account, _entry_field_credit_account1, _entry_field_image_image;
                return /*#__PURE__*/ _jsxs("div", {
                    className: "my-2 py-4 border border-slate-300",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "border-b border-slate-300 flex flex-wrap justify-between",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "px-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: entry === null || entry === void 0 ? void 0 : entry.title
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "text-xs",
                                            children: entry === null || entry === void 0 ? void 0 : entry.field_date
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "px-4",
                                    children: /*#__PURE__*/ _jsx("div", {
                                        className: "flex gap-2",
                                        children: /*#__PURE__*/ _jsx("a", {
                                            href: `/node/${entry === null || entry === void 0 ? void 0 : entry.drupal_internal__nid}/edit?destination=/admin/content`,
                                            children: /*#__PURE__*/ _jsx(Button, {
                                                children: "Edit"
                                            })
                                        })
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "my-2 pl-4 md:flex flex-wrap",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-2 text-xs uppercase w-32",
                                    children: "Description"
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-1 ml-2 text-sm",
                                    children: /*#__PURE__*/ _jsx(FormattedText, {
                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_description = entry.field_description) === null || _entry_field_description === void 0 ? void 0 : _entry_field_description.processed
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "my-2 pl-4 md:flex flex-wrap",
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-2 text-xs uppercase w-32",
                                    children: "Comment"
                                }),
                                /*#__PURE__*/ _jsx("div", {
                                    className: "mt-1 ml-2 text-sm",
                                    children: /*#__PURE__*/ _jsx(FormattedText, {
                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_comment = entry.field_comment) === null || _entry_field_comment === void 0 ? void 0 : _entry_field_comment.processed
                                    })
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsxs("div", {
                            className: "grid md:grid-cols-2 md:justify-between my-4 border-t border-b border-slate-300",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "border-r border-slate-300 p-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: "Debit"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "mx-4 pl-4 border-l-2 border-blue-400",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-sm tracking-tighter",
                                                    children: /*#__PURE__*/ _jsx("a", {
                                                        href: `/acc-ledger-book?ledgerId=${entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account = entry.field_debit_account) === null || _entry_field_debit_account === void 0 ? void 0 : _entry_field_debit_account.id}`,
                                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account1 = entry.field_debit_account) === null || _entry_field_debit_account1 === void 0 ? void 0 : _entry_field_debit_account1.field_ledger_account_name
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(AmountTotal, {
                                                        amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "p-4",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-semibold",
                                            children: "Credit"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "mx-4 pl-4 border-l-2 border-blue-400",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "text-sm tracking-tighter",
                                                    children: /*#__PURE__*/ _jsx("a", {
                                                        href: `/acc-ledger-book?ledgerId=${entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account = entry.field_credit_account) === null || _entry_field_credit_account === void 0 ? void 0 : _entry_field_credit_account.id}`,
                                                        children: entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account1 = entry.field_credit_account) === null || _entry_field_credit_account1 === void 0 ? void 0 : _entry_field_credit_account1.field_ledger_account_name
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(AmountTotal, {
                                                        amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "text-xs px-4 flex justify-end",
                            children: generateLink(entry === null || entry === void 0 ? void 0 : entry.field_purchase_sale_reference_id)
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "flex",
                            children: (entry === null || entry === void 0 ? void 0 : entry.field_image_image) && (entry === null || entry === void 0 ? void 0 : (_entry_field_image_image = entry.field_image_image) === null || _entry_field_image_image === void 0 ? void 0 : _entry_field_image_image.map((img, i)=>{
                                var _img_field_media_image_uri, _img_field_media_image, _img_field_media_image_uri1, _img_field_media_image1;
                                return /*#__PURE__*/ _jsx("a", {
                                    href: img === null || img === void 0 ? void 0 : (_img_field_media_image = img.field_media_image) === null || _img_field_media_image === void 0 ? void 0 : (_img_field_media_image_uri = _img_field_media_image.uri) === null || _img_field_media_image_uri === void 0 ? void 0 : _img_field_media_image_uri.url,
                                    target: "_blank",
                                    children: /*#__PURE__*/ _jsx(Image, {
                                        className: "w-64 h-auto p-2 m-2 border border-slate-300",
                                        src: img === null || img === void 0 ? void 0 : (_img_field_media_image1 = img.field_media_image) === null || _img_field_media_image1 === void 0 ? void 0 : (_img_field_media_image_uri1 = _img_field_media_image1.uri) === null || _img_field_media_image_uri1 === void 0 ? void 0 : _img_field_media_image_uri1.url,
                                        alt: "supporting image",
                                        width: 1000,
                                        height: 500,
                                        unoptimized: true
                                    })
                                }, i);
                            }))
                        })
                    ]
                }, entry === null || entry === void 0 ? void 0 : entry.id);
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
