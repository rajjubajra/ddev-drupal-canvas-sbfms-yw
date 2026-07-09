import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Amount from '@/components/utl-amount';
import Button from '@/components/utl-button';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function DayBook() {
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
        if (!datePickedFrom && !datePickedTo) {
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
    const [itemPerPage, setItemPerPage] = useState(20);
    const ITEMS_PER_PAGE = itemPerPage;
    const offset = page * ITEMS_PER_PAGE;
    useEffect(()=>{
        console.log('PAGE CHANGED:', page, 'OFFSET:', offset);
    }, [
        page,
        offset
    ]);
    const handleDateFromChange = (e)=>{
        const value = e.target.value;
        setDatePickedFrom(value);
        setDateFrom(value);
        setPage(0);
    };
    const handleDateToChange = (e)=>{
        const value = e.target.value;
        setDatePickedTo(value);
        setDateTo(value);
        setPage(0);
    };
    const handleItemsPerPageChange = (e)=>{
        const value = Math.max(Number(e.target.value) || 1, 1);
        setItemPerPage(value);
        setPage(0);
    };
    /* --------------------------------------------------
     Fetch: Journal Entries (filtered by date range)
  -------------------------------------------------- */ const { data, error, isLoading } = useSWR([
        'node--acc_journal_entry',
        dateFrom,
        dateTo,
        page,
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_credit_account.field_account_type',
                'field_debit_account.field_account_type'
            ]).addFilter('field_date', dateFrom, '>=').addFilter('field_date', dateTo, '<=').addSort([
                '-field_date'
            ]).addPageLimit(ITEMS_PER_PAGE).addPageOffset(offset).getQueryString()
        }
    ], ([type, , , , options])=>client.getCollection(type, options));
    /* --------------------------------------------------
     Export filtered data to CSV
  -------------------------------------------------- */ const exportToCSV = ()=>{
        if (!data) return;
        const headers = [
            'Date',
            'Title',
            'Debit Ledger Name',
            'Debit Account Type',
            'Debit Amount',
            'Credit Ledger Name',
            'Credit Account Type',
            'Credit Amount'
        ];
        const rows = data.map((entry)=>[
                entry.field_date,
                entry.title,
                entry.field_debit_account.field_ledger_account_name,
                entry.field_debit_account.field_account_type.name,
                entry.field_amount,
                entry.field_credit_account.field_ledger_account_name,
                entry.field_credit_account.field_account_type.name,
                entry.field_amount
            ]);
        const csvContent = [
            headers,
            ...rows
        ].map((row)=>row.map((value)=>`"${String(value !== null && value !== void 0 ? value : '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([
            csvContent
        ], {
            type: 'text/csv;charset=utf-8;'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'day-book.csv';
        link.click();
        URL.revokeObjectURL(url);
    };
    /* --------------------------------------------------
     Render States
  -------------------------------------------------- */ if (error) return 'An error has occurred.';
    if (isLoading) return 'Loading...';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: /*#__PURE__*/ _jsx("button", {
                            onClick: exportToCSV,
                            children: /*#__PURE__*/ _jsx(Button, {
                                children: "Export CSV"
                            })
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "w-full sm:w-auto",
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "mb-1 block text-sm font-semibold text-slate-700",
                                children: "Items Per Page"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                className: "w-full rounded border border-slate-300 px-3 py-2 sm:w-28",
                                type: "number",
                                min: "1",
                                value: itemPerPage,
                                onChange: handleItemsPerPageChange
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs("form", {
                className: "grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3",
                onSubmit: (e)=>e.preventDefault(),
                children: [
                    /*#__PURE__*/ _jsxs("div", {
                        className: "w-full",
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date From"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateFrom,
                                onChange: handleDateFromChange,
                                className: "w-full rounded border border-slate-300 px-3 py-2"
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "w-full",
                        children: [
                            /*#__PURE__*/ _jsx("label", {
                                className: "block text-sm font-semibold mb-1",
                                children: "Date To"
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                type: "date",
                                value: dateTo,
                                onChange: handleDateToChange,
                                className: "w-full rounded border border-slate-300 px-3 py-2"
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Day Book"
            }),
            (data === null || data === void 0 ? void 0 : data.length) === 0 && /*#__PURE__*/ _jsx("div", {
                className: "mt-4 text-gray-500",
                children: "No entries found"
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "space-y-4 md:hidden",
                children: data === null || data === void 0 ? void 0 : data.map((entry)=>{
                    var _entry_field_debit_account_field_account_type, _entry_field_credit_account_field_account_type;
                    return /*#__PURE__*/ _jsxs("div", {
                        className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "mb-3 flex items-start justify-between gap-3",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-xs font-semibold uppercase tracking-wide text-slate-500",
                                                children: entry === null || entry === void 0 ? void 0 : entry.field_date
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-base font-semibold text-slate-900",
                                                children: entry.title
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsx("a", {
                                        className: "shrink-0 rounded border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50",
                                        href: `/acc-journal-entry/?nodeId=${entry === null || entry === void 0 ? void 0 : entry.drupal_internal__nid}`,
                                        children: "JRN"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "space-y-3 text-sm",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "rounded-lg bg-slate-50 p-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-xs font-semibold uppercase tracking-wide text-slate-500",
                                                children: "Debit"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "mt-1 font-medium text-slate-900",
                                                children: entry === null || entry === void 0 ? void 0 : entry.field_debit_account.field_ledger_account_name
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-slate-600",
                                                children: entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account_field_account_type = entry.field_debit_account.field_account_type) === null || _entry_field_debit_account_field_account_type === void 0 ? void 0 : _entry_field_debit_account_field_account_type.name
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "rounded-lg bg-slate-50 p-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-xs font-semibold uppercase tracking-wide text-slate-500",
                                                children: "Credit"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "mt-1 font-medium text-slate-900",
                                                children: entry === null || entry === void 0 ? void 0 : entry.field_credit_account.field_ledger_account_name
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "text-slate-600",
                                                children: entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account_field_account_type = entry.field_credit_account.field_account_type) === null || _entry_field_credit_account_field_account_type === void 0 ? void 0 : _entry_field_credit_account_field_account_type.name
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center justify-between border-t border-slate-200 pt-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "text-xs font-semibold uppercase tracking-wide text-slate-500",
                                                children: "Amount"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "font-semibold text-slate-900",
                                                children: /*#__PURE__*/ _jsx(Amount, {
                                                    amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                                })
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    }, entry === null || entry === void 0 ? void 0 : entry.id);
                })
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "sm:hidden md:flex",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "overflow-x-auto border border-slate-200",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "min-w-[800px]",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "grid grid-cols-[100px_140px_1.0fr_1.0fr_120px_80px] gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Date"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Title"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Debit Ledger Name ",
                                            /*#__PURE__*/ _jsx("br", {}),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "text-xs",
                                                children: "Account Type"
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            "Credit Ledger Name",
                                            /*#__PURE__*/ _jsx("br", {}),
                                            /*#__PURE__*/ _jsx("span", {
                                                className: "text-xs",
                                                children: "Account Type"
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Amount"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Journal"
                                    })
                                ]
                            }),
                            data === null || data === void 0 ? void 0 : data.map((entry)=>{
                                var _entry_field_debit_account, _entry_field_debit_account_field_account_type, _entry_field_debit_account1, _entry_field_credit_account, _entry_field_credit_account_field_account_type, _entry_field_credit_account1;
                                return /*#__PURE__*/ _jsxs("div", {
                                    className: "grid grid-cols-[100px_140px_1.0fr_1.0fr_120px_80px] gap-1 border-b border-slate-200 px-4 py-4 text-sm text-slate-700 last:border-b-0",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            children: entry === null || entry === void 0 ? void 0 : entry.field_date
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            children: entry === null || entry === void 0 ? void 0 : entry.title
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            children: [
                                                entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account = entry.field_debit_account) === null || _entry_field_debit_account === void 0 ? void 0 : _entry_field_debit_account.field_ledger_account_name,
                                                /*#__PURE__*/ _jsx("br", {}),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "text-xs",
                                                    children: entry === null || entry === void 0 ? void 0 : (_entry_field_debit_account1 = entry.field_debit_account) === null || _entry_field_debit_account1 === void 0 ? void 0 : (_entry_field_debit_account_field_account_type = _entry_field_debit_account1.field_account_type) === null || _entry_field_debit_account_field_account_type === void 0 ? void 0 : _entry_field_debit_account_field_account_type.name
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            children: [
                                                entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account = entry.field_credit_account) === null || _entry_field_credit_account === void 0 ? void 0 : _entry_field_credit_account.field_ledger_account_name,
                                                /*#__PURE__*/ _jsx("br", {}),
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "text-xs",
                                                    children: entry === null || entry === void 0 ? void 0 : (_entry_field_credit_account1 = entry.field_credit_account) === null || _entry_field_credit_account1 === void 0 ? void 0 : (_entry_field_credit_account_field_account_type = _entry_field_credit_account1.field_account_type) === null || _entry_field_credit_account_field_account_type === void 0 ? void 0 : _entry_field_credit_account_field_account_type.name
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: entry === null || entry === void 0 ? void 0 : entry.field_amount
                                            })
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "flex items-center justify-center",
                                            children: /*#__PURE__*/ _jsx("a", {
                                                className: "inline-flex rounded border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50",
                                                href: `/acc-journal-entry/?nodeId=${entry === null || entry === void 0 ? void 0 : entry.drupal_internal__nid}`,
                                                children: "JRN"
                                            })
                                        })
                                    ]
                                }, entry === null || entry === void 0 ? void 0 : entry.id);
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: "flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between",
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        onClick: ()=>setPage((p)=>Math.max(p - 1, 0)),
                        children: page !== 0 && /*#__PURE__*/ _jsx(Button, {
                            children: "← Previous"
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "text-sm font-semibold text-slate-700",
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
