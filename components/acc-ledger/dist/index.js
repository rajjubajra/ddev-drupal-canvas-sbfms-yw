import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Button from '@/components/utl-button';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function LedgerBook() {
    var _data_find, _drledgerAccounts_filter, _drledgerAccounts_filter1, _crledgerAccounts_filter;
    const [ledgerId, setLedgerId] = useState('');
    useEffect(()=>{
        const params = new URLSearchParams(window.location.search);
        const id = params.get('ledgerId');
        console.log('ledger Id : ', id);
        setLedgerId(id);
    }, []);
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
            ]).addPageLimit(100).getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    useEffect(()=>{
        if (datePickedFrom === undefined || datePickedFrom === '' && datePickedTo === undefined || datePickedTo === '') {
            setDateFrom(fy[0].field_date_from);
            setDateTo(fy[0].field_date_to);
        } else {
            setDateFrom(datePickedFrom);
            setDateTo(datePickedTo);
        }
    }, [
        fy
    ]);
    /* --------------------------------------------------
     Fetch: Ledger Accounts
  -------------------------------------------------- */ const { data, error, isLoading } = useSWR([
        'node--accounting_ledger',
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_account_type'
            ]).getQueryString()
        }
    ], ([type, options])=>client.getCollection(type, options));
    /* --------------------------------------------------
     Fetch: Journal Entries (date filtered)
  -------------------------------------------------- */ const { data: journal, error: jnerror, isLoading: jnLoading } = useSWR([
        'node--acc_journal_entry',
        dateFrom,
        dateTo,
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_debit_account',
                'field_credit_account'
            ]).addFilter('field_date', dateFrom, '>=').addFilter('field_date', dateTo, '<=').addSort([
                'field_date'
            ]).getQueryString()
        }
    ], ([type, , , options])=>client.getCollection(type, options));
    /* --------------------------------------------------
     Normalize Journal → Ledger Transactions
  -------------------------------------------------- */ const [drledgerAccounts, setDrLedgerAccounts] = useState([]);
    const [crledgerAccounts, setCrLedgerAccounts] = useState([]);
    useEffect(()=>{
        if (!journal) return;
        const drArr = [];
        const crArr = [];
        journal.forEach((item)=>{
            var _item_field_debit_account, _item_field_debit_account1, _item_field_credit_account, _item_field_debit_account2, _item_field_credit_account1, _item_field_credit_account2, _item_field_debit_account3, _item_field_credit_account3;
            drArr.push({
                id: item === null || item === void 0 ? void 0 : item.id,
                date: item === null || item === void 0 ? void 0 : item.field_date,
                nodeId: item === null || item === void 0 ? void 0 : item.drupal_internal__nid,
                ledgerId: item === null || item === void 0 ? void 0 : (_item_field_debit_account = item.field_debit_account) === null || _item_field_debit_account === void 0 ? void 0 : _item_field_debit_account.id,
                transaction: item === null || item === void 0 ? void 0 : item.title,
                ledgerName: item === null || item === void 0 ? void 0 : (_item_field_debit_account1 = item.field_debit_account) === null || _item_field_debit_account1 === void 0 ? void 0 : _item_field_debit_account1.field_ledger_account_name,
                creditedLedger: item === null || item === void 0 ? void 0 : (_item_field_credit_account = item.field_credit_account) === null || _item_field_credit_account === void 0 ? void 0 : _item_field_credit_account.field_ledger_account_name,
                typeName: item === null || item === void 0 ? void 0 : (_item_field_debit_account2 = item.field_debit_account) === null || _item_field_debit_account2 === void 0 ? void 0 : _item_field_debit_account2.field_ledger_account_name,
                drAmount: item === null || item === void 0 ? void 0 : item.field_amount
            });
            crArr.push({
                id: item === null || item === void 0 ? void 0 : item.id,
                date: item === null || item === void 0 ? void 0 : item.field_date,
                nodeId: item === null || item === void 0 ? void 0 : item.drupal_internal__nid,
                ledgerId: item === null || item === void 0 ? void 0 : (_item_field_credit_account1 = item.field_credit_account) === null || _item_field_credit_account1 === void 0 ? void 0 : _item_field_credit_account1.id,
                transaction: item === null || item === void 0 ? void 0 : item.title,
                ledgerName: item === null || item === void 0 ? void 0 : (_item_field_credit_account2 = item.field_credit_account) === null || _item_field_credit_account2 === void 0 ? void 0 : _item_field_credit_account2.field_ledger_account_name,
                debitedLedger: item === null || item === void 0 ? void 0 : (_item_field_debit_account3 = item.field_debit_account) === null || _item_field_debit_account3 === void 0 ? void 0 : _item_field_debit_account3.field_ledger_account_name,
                typeName: item === null || item === void 0 ? void 0 : (_item_field_credit_account3 = item.field_credit_account) === null || _item_field_credit_account3 === void 0 ? void 0 : _item_field_credit_account3.field_ledger_account_name,
                crAmount: item === null || item === void 0 ? void 0 : item.field_amount
            });
        });
        setDrLedgerAccounts(drArr);
        setCrLedgerAccounts(crArr);
    }, [
        journal
    ]);
    /* --------------------------------------------------
     Render States
  -------------------------------------------------- */ if (error || jnerror) return 'An error has occurred.';
    if (isLoading || jnLoading) return 'Loading...';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsxs("form", {
                className: "flex flex-wrap gap-4 mb-6 p-4 border rounded",
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
                className: "w-full flex justify-end gap-2",
                children: [
                    /*#__PURE__*/ _jsx("button", {
                        onClick: ()=>window.history.back(),
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: " ← Back "
                        })
                    }),
                    /*#__PURE__*/ _jsx("a", {
                        href: "/node/add/accounting_ledger",
                        target: "_blank",
                        children: /*#__PURE__*/ _jsx(Button, {
                            children: "Create New Ledger"
                        })
                    })
                ]
            }),
            ledgerId !== '' && /*#__PURE__*/ _jsxs("div", {
                children: [
                    /*#__PURE__*/ _jsx("div", {
                        className: "flex justify-between",
                        children: /*#__PURE__*/ _jsx(PageTitle, {
                            title: data === null || data === void 0 ? void 0 : (_data_find = data.find((i)=>i.id === ledgerId)) === null || _data_find === void 0 ? void 0 : _data_find.title,
                            dateFrom: dateFrom,
                            dateTo: dateTo
                        })
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "grid md:grid-cols-2 grid-cols-1 gap-4 text-sm",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex font-bold border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-24",
                                                children: "Date"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-64",
                                                children: "Description"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-24",
                                                children: "Dr Amount"
                                            })
                                        ]
                                    }),
                                    drledgerAccounts === null || drledgerAccounts === void 0 ? void 0 : (_drledgerAccounts_filter = drledgerAccounts.filter((i)=>i.ledgerId === ledgerId)) === null || _drledgerAccounts_filter === void 0 ? void 0 : _drledgerAccounts_filter.map((item)=>/*#__PURE__*/ _jsxs("div", {
                                            className: "flex gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-24",
                                                    children: item === null || item === void 0 ? void 0 : item.date
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-64",
                                                    children: /*#__PURE__*/ _jsxs("a", {
                                                        href: `/acc-journal-entry/?nodeId=${item === null || item === void 0 ? void 0 : item.nodeId}`,
                                                        children: [
                                                            item === null || item === void 0 ? void 0 : item.transaction,
                                                            /*#__PURE__*/ _jsx("br", {}),
                                                            /*#__PURE__*/ _jsxs("span", {
                                                                className: "text-xs relative -top-2",
                                                                children: [
                                                                    "cr : ",
                                                                    item === null || item === void 0 ? void 0 : item.creditedLedger
                                                                ]
                                                            })
                                                        ]
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-24 text-right",
                                                    children: item === null || item === void 0 ? void 0 : item.drAmount
                                                })
                                            ]
                                        }, item === null || item === void 0 ? void 0 : item.id))
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex font-bold border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-24",
                                                children: "Date"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-64",
                                                children: "Description"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "w-24",
                                                children: "Cr Amount"
                                            })
                                        ]
                                    }),
                                    crledgerAccounts.filter((i)=>i.ledgerId === ledgerId).map((item)=>/*#__PURE__*/ _jsxs("div", {
                                            className: "flex gap-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-24",
                                                    children: item === null || item === void 0 ? void 0 : item.date
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-64",
                                                    children: /*#__PURE__*/ _jsxs("a", {
                                                        href: `/acc-journal-entry/?nodeId=${item === null || item === void 0 ? void 0 : item.nodeId}`,
                                                        children: [
                                                            item === null || item === void 0 ? void 0 : item.transaction,
                                                            /*#__PURE__*/ _jsx("br", {}),
                                                            /*#__PURE__*/ _jsxs("span", {
                                                                className: "text-xs relative -top-2",
                                                                children: [
                                                                    "dr : ",
                                                                    item === null || item === void 0 ? void 0 : item.debitedLedger
                                                                ]
                                                            })
                                                        ]
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "w-24 text-right",
                                                    children: item === null || item === void 0 ? void 0 : item.crAmount
                                                })
                                            ]
                                        }, item === null || item === void 0 ? void 0 : item.id))
                                ]
                            })
                        ]
                    }),
                    /*#__PURE__*/ _jsxs("div", {
                        className: "grid grid-cols-2 gap-4 border-t border-b md:text-sm text-xs font-bold uppercase py-2",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Debit Total"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: drledgerAccounts === null || drledgerAccounts === void 0 ? void 0 : (_drledgerAccounts_filter1 = drledgerAccounts.filter((i)=>i.ledgerId === ledgerId)) === null || _drledgerAccounts_filter1 === void 0 ? void 0 : _drledgerAccounts_filter1.reduce((sum, i)=>sum + Number((i === null || i === void 0 ? void 0 : i.drAmount) || 0), 0).toFixed(2)
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex justify-between",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        children: "Credit Total"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        children: crledgerAccounts === null || crledgerAccounts === void 0 ? void 0 : (_crledgerAccounts_filter = crledgerAccounts.filter((i)=>(i === null || i === void 0 ? void 0 : i.ledgerId) === ledgerId)) === null || _crledgerAccounts_filter === void 0 ? void 0 : _crledgerAccounts_filter.reduce((sum, i)=>sum + Number((i === null || i === void 0 ? void 0 : i.crAmount) || 0), 0).toFixed(2)
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}
