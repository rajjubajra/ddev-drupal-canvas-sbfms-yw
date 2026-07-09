import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';
import PageTitle from '@/components/utl-page-title';
import Amount from '@/components/utl-amount';
/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */ const client = new JsonApiClient();
export default function BalanceSheet() {
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
     Fetch: Taxonomy Term (account_types)
  -------------------------------------------------- */ const { data: accType, error: accTypeError, isLoading: accTypeIsLoading } = useSWR([
        'taxonomy_term--account_types',
        {
            queryString: new DrupalJsonApiParams().getQueryString()
        }
    ], ([type, , , options])=>client.getCollection(type, options));
    /* --------------------------------------------------
     Fetch: Journal Entries (filtered by date range)
  -------------------------------------------------- */ const { data, error, isLoading } = useSWR([
        'node--acc_journal_entry',
        dateFrom,
        dateTo,
        {
            queryString: new DrupalJsonApiParams().addInclude([
                'field_credit_account.field_account_type',
                'field_debit_account.field_account_type'
            ])//DATE FROM
            .addFilter('field_date', dateFrom, '>=')//DATE TO
            .addFilter('field_date', dateTo, '<=')//SORT BY DESCENDING field_date
            .addSort([
                '-field_date'
            ]).getQueryString()
        }
    ], ([type, , , options])=>client.getCollection(type, options));
    /**----------------------------------------------
  Debit and Credit items grouped Array
-------------------------------------------------**/ const [drGrouped, setDrGrouped] = useState([]);
    const [crGrouped, setCrGrouped] = useState([]);
    console.log('Dr Group : ', drGrouped);
    console.log('Cr Group : ', crGrouped);
    useEffect(()=>{
        /** -----------------------------------------
  Credit Items - Grouped by Taxnomy Term(Acount Type)
    -----------------------------------------  **/ const drGrouped = accType.map((item)=>({
                'taxonomyId': item.id,
                'taxonomyName': item.name,
                'items': data.filter((jr)=>jr.field_debit_account.field_account_type.id === item.id).map((jr)=>({
                        'id': jr.id,
                        'ledgerId': jr.field_debit_account.id,
                        'nodeId': jr.drupal_internal__nid,
                        'title': jr.title,
                        'dr_amount': jr.field_amount
                    }))
            }));
        console.log('DrGrouped', drGrouped);
        setDrGrouped(drGrouped);
        /** -----------------------------------------
  Credit Items - Grouped by Taxnomy Term(Acount Type)
    -----------------------------------------  **/ const crGrouped = accType.map((item)=>({
                'taxonomyId': item.id,
                'taxonomyName': item.name,
                'items': data.filter((jr)=>jr.field_credit_account.field_account_type.id === item.id).map((jr)=>({
                        'id': jr.id,
                        'nodeId': jr.drupal_internal__nid,
                        'ledgerId': jr.field_credit_account.id,
                        'title': jr.title,
                        'cr_amount': jr.field_amount
                    }))
            }));
        console.log('crGrouped', crGrouped);
        setCrGrouped(crGrouped);
    }, [
        data
    ]);
    /** HELPER: SUM AMOUNT **/ const sum = (items, field)=>items.reduce((t, i)=>t + Number(i[field] || 0), 0);
    /** FUNCTION, TOTAL BY TAXONOMY TERM **/ const getDebitTotalByTaxonomy = (taxonomyName)=>{
        const group = drGrouped.find((g)=>g.taxonomyName === taxonomyName);
        return group ? sum(group.items, 'dr_amount') : 0;
    };
    const getCreditTotalByTaxonomy = (taxonomyName)=>{
        const group = crGrouped.find((g)=>g.taxonomyName === taxonomyName);
        return group ? sum(group.items, 'cr_amount') : 0;
    };
    /** BALANCE SHEET CALCULATION (COARE LOGIC)**/ /**
    * Assets:
    *   - Current Assets
    *   - Fixed Assets
    * 
    * Liabilites
    *   - Current Liabilities
    *   - Fiexed Liabilities
    * 
    * Equity
    *   - Equity
    *   - Revenue
    *   - Contra Revenue
    *   - Expenses
    *   - Expenses - COGS
    *   - Expenses - TAX
    */ /** CURRENT ASSETS */ const drCurrentAssets = getDebitTotalByTaxonomy('Current Assets');
    const crCurrentAssets = getCreditTotalByTaxonomy('Current Assets');
    /** FIXED ASSETS */ const drFixedAssets = getDebitTotalByTaxonomy('Fixed Assets');
    const crFixedAssets = getCreditTotalByTaxonomy('Fixed Assets');
    /** CONTRA ASSETS */ /**
       * Contra assets (like Accumulated Depreciation or Allowance for Doubtful Accounts) 
       * usually have a credit balance. 
       * If a Contra Asset Shows a Debit Balance
          This is unusual, but it can happen (error, reversal, or over-adjustment). In that case:
          KEY RULE:
          Balance Sheet figure = Asset – Contra Asset (if credit balance)
          Balance Sheet figure = Asset + Contra Asset (if debit balance)
       */ const drContraAssets = getDebitTotalByTaxonomy('Contra Assets');
    const crContraAssets = getCreditTotalByTaxonomy('Contra Assets');
    /** CURRENT LIABILITIES */ const drCurrentLiabilities = getDebitTotalByTaxonomy('Current Liabilities');
    const crCurrentLiabilities = getCreditTotalByTaxonomy('Current Liabilities');
    /** FIXED LIBILITIES */ const drFixedLiabilities = getDebitTotalByTaxonomy('Fixed Liabilities');
    const crFixedLiabilities = getCreditTotalByTaxonomy('Fixed Liabilities');
    /** OWNERS INVESTMENT - EQUITY */ const crEquity = getCreditTotalByTaxonomy('Equity');
    const drEquity = getDebitTotalByTaxonomy('Equity');
    /** PROFIT CALCULATION */ /** REVENUE */ const crRevenue = getCreditTotalByTaxonomy('Revenue');
    const drRevenue = getDebitTotalByTaxonomy('Revenue');
    const grossRevenue = crRevenue - drRevenue;
    const contraRevenue = getDebitTotalByTaxonomy('Contra Revenue');
    const netRevenue = grossRevenue - contraRevenue;
    /** EXPENSES */ const drExpenses = getDebitTotalByTaxonomy('Expenses');
    const crExpenses = getCreditTotalByTaxonomy('Expenses');
    const netExpense = drExpenses - crExpenses;
    /** EXPENSES - COGS */ const drCogsExpenses = getDebitTotalByTaxonomy('Expenses-COGS');
    const crCogsExpenses = getCreditTotalByTaxonomy('Expenses-COGS');
    const netCogsExpenses = drCogsExpenses - crCogsExpenses;
    /** EXPENSES - TAX */ const drTaxExpenses = getDebitTotalByTaxonomy('Expenses-tax');
    const crTaxExpenses = getCreditTotalByTaxonomy('Expenses-tax');
    const netTaxExpenses = drTaxExpenses - crTaxExpenses;
    /** TOTAL EXPENSE */ const totalExpenses = netExpense + netCogsExpenses + netTaxExpenses;
    /** NET PROFIT */ const netProfit = netRevenue - totalExpenses;
    /* --------------------------------------------------
     Render States
  -------------------------------------------------- */ if (error) return 'An error has occurred.';
    if (isLoading) return 'Loading...';
    /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */ return /*#__PURE__*/ _jsxs("div", {
        children: [
            /*#__PURE__*/ _jsx(PageTitle, {
                title: "Balance Sheet",
                dateFrom: dateFrom,
                dateTo: dateTo
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
                className: "mb-20 border m-2 p-4",
                children: /*#__PURE__*/ _jsxs("div", {
                    className: "grid grid-cols-2 gap-2",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            children: [
                                /*#__PURE__*/ _jsx("div", {
                                    className: "uppercase",
                                    children: "Assets"
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "border-b",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-bold",
                                            children: "Current Assets"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Debit: "
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: drCurrentAssets
                                                    })
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Credit: "
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: crCurrentAssets
                                                    })
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Balance:"
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: drCurrentAssets - crCurrentAssets
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "border-b",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "font-bold",
                                            children: "Fixed Assets"
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Debit: "
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: drFixedAssets
                                                    })
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Credit: "
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: crFixedAssets
                                                    })
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ _jsxs("div", {
                                            className: "grid grid-cols-2",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: "Balance:"
                                                }),
                                                /*#__PURE__*/ _jsx("div", {
                                                    children: /*#__PURE__*/ _jsx(Amount, {
                                                        amt: drFixedAssets - crFixedAssets
                                                    })
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "grid grid-cols-2",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            children: "Less:Depreciation"
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: crContraAssets
                                            })
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "grid grid-cols-2",
                                    children: [
                                        /*#__PURE__*/ _jsx("div", {
                                            className: "uppercase",
                                            children: "Net Assets Total:"
                                        }),
                                        /*#__PURE__*/ _jsx("div", {
                                            children: /*#__PURE__*/ _jsx(Amount, {
                                                amt: drCurrentAssets + drContraAssets - crCurrentAssets + (drFixedAssets - crFixedAssets - crContraAssets)
                                            })
                                        })
                                    ]
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            children: /*#__PURE__*/ _jsxs("div", {
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "uppercase",
                                        children: "Liabilities"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "font-bold",
                                                children: "Current Liabilities"
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Credit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crCurrentLiabilities
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Debit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: drCurrentLiabilities
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Balance:"
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crCurrentLiabilities - drCurrentLiabilities
                                                        })
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "font-bold",
                                                children: "Fixed Liabilities"
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Credit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crFixedLiabilities
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Debit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: drFixedLiabilities
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Balance:"
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crFixedLiabilities - drFixedLiabilities
                                                        })
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "font-bold",
                                                children: "Equity"
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Credit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crEquity
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Debit: "
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: drEquity
                                                        })
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "grid grid-cols-2",
                                                children: [
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: "Balance:"
                                                    }),
                                                    /*#__PURE__*/ _jsx("div", {
                                                        children: /*#__PURE__*/ _jsx(Amount, {
                                                            amt: crEquity - drEquity
                                                        })
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "grid grid-cols-2 border-b",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                children: "Add Retain Earning (Net Profit)"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                children: /*#__PURE__*/ _jsx(Amount, {
                                                    amt: netProfit
                                                })
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "grid grid-cols-2",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "uppercase",
                                                children: "Liabilities Total:"
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                children: /*#__PURE__*/ _jsx(Amount, {
                                                    amt: crCurrentLiabilities - drCurrentLiabilities + (crFixedLiabilities - drFixedLiabilities) + (crEquity - drEquity) + netProfit
                                                })
                                            })
                                        ]
                                    })
                                ]
                            })
                        })
                    ]
                })
            })
        ]
    });
}
