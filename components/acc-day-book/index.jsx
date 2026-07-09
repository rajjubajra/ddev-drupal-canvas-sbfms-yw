import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { JsonApiClient } from 'drupal-canvas';
import { DrupalJsonApiParams } from 'drupal-jsonapi-params';

import PageTitle from '@/components/utl-page-title';
import Amount from '@/components/utl-amount';
import Button from '@/components/utl-button';

/* --------------------------------------------------
   Drupal JSON:API Client
-------------------------------------------------- */
const client = new JsonApiClient();


export default function DayBook() {
  
  
   /* --------------------------------------------------
     State: Date Filters (default = defined fiscal year)
  -------------------------------------------------- */

  const [datePickedFrom, setDatePickedFrom] = useState('');
  const [datePickedTo, setDatePickedTo] = useState('');
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


      /* --------------------------------------------------
           Fetch: Financial Year
        -------------------------------------------------- */
        const { data:fy, error:fyError, isLoading:fyIsLoading } = useSWR(
          [
            'node--financial_year',
            {
              queryString: new DrupalJsonApiParams()
                .addSort(['-created'])
                .getQueryString(),
            },
          ],
          ([type, options]) => client.getCollection(type, options)
        );
      
        useEffect(() => {
          if (!fy || fy.length === 0) return;

          if (!datePickedFrom && !datePickedTo) {
            setDateFrom(fy[0].field_date_from);
            setDateTo(fy[0].field_date_to);
          } else {
            setDateFrom(datePickedFrom);
            setDateTo(datePickedTo);
          }
        }, [fy, datePickedFrom, datePickedTo]);

  

 /**--------------------------------------- 
            PAGENATION 
      -------------------------------------------**/
        
  const [page, setPage] = useState(0);
  const [itemPerPage, setItemPerPage] = useState(20)
  const ITEMS_PER_PAGE = itemPerPage;
  const offset = page * ITEMS_PER_PAGE;
      

          useEffect(() => {
            console.log('PAGE CHANGED:', page, 'OFFSET:', offset);
          }, [page, offset]);

  const handleDateFromChange = (e) => {
    const value = e.target.value;
    setDatePickedFrom(value);
    setDateFrom(value);
    setPage(0);
  };

  const handleDateToChange = (e) => {
    const value = e.target.value;
    setDatePickedTo(value);
    setDateTo(value);
    setPage(0);
  };

  const handleItemsPerPageChange = (e) => {
    const value = Math.max(Number(e.target.value) || 1, 1);
    setItemPerPage(value);
    setPage(0);
  };



  /* --------------------------------------------------
     Fetch: Journal Entries (filtered by date range)
  -------------------------------------------------- */
  const { data, error, isLoading } = useSWR(
    [
      'node--acc_journal_entry',
      dateFrom,
      dateTo,
      page,
      {
        queryString: new DrupalJsonApiParams()
          .addInclude([
            'field_credit_account.field_account_type',
            'field_debit_account.field_account_type',
          ])
          .addFilter('field_date', dateFrom, '>=')
          .addFilter('field_date', dateTo, '<=')
          .addSort(['-field_date'])
          .addPageLimit(ITEMS_PER_PAGE)
          .addPageOffset(offset)
          .getQueryString(),
      },
    ],
    ([type, , , , options]) => client.getCollection(type, options)
  );

 

  /* --------------------------------------------------
     Export filtered data to CSV
  -------------------------------------------------- */
  const exportToCSV = () => {
    if (!data) return;

    const headers = [
      'Date',
      'Title',
      'Debit Ledger Name',
      'Debit Account Type',
      'Debit Amount',
      'Credit Ledger Name',
      'Credit Account Type',
      'Credit Amount',
    ];

    const rows = data.map((entry) => [
      entry.field_date,
      entry.title,
      entry.field_debit_account.field_ledger_account_name,
      entry.field_debit_account.field_account_type.name,
      entry.field_amount,
      entry.field_credit_account.field_ledger_account_name,
      entry.field_credit_account.field_account_type.name,
      entry.field_amount,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'day-book.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  /* --------------------------------------------------
     Render States
  -------------------------------------------------- */
  if (error) return 'An error has occurred.';
  if (isLoading) return 'Loading...';

  /* --------------------------------------------------
     Render UI
  -------------------------------------------------- */
  return (
    <div className="space-y-6">
      {/* Page Header & Export Button */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={exportToCSV}>
            <Button>Export CSV</Button>
          </button>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Items Per Page
          </label>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 sm:w-28"
            type="number"
            min="1"
            value={itemPerPage}
            onChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      {/* Date Filter Form */}
      <form
        className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="w-full">
          <label className="block text-sm font-semibold mb-1">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="w-full">
          <label className="block text-sm font-semibold mb-1">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
      </form>

      <PageTitle title="Day Book" />

      {data?.length === 0 && (
        <div className="mt-4 text-gray-500">No entries found</div>
      )}

      {/* Mobile cards */}
      <div className="space-y-4 md:hidden">
        {data?.map((entry) => (
          <div
            key={entry?.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {entry?.field_date}
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {entry.title}
                </div>
              </div>
              <a
                className="shrink-0 rounded border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50"
                href={`/acc-journal-entry/?nodeId=${entry?.drupal_internal__nid}`}
              >
                JRN
              </a>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Debit
                </div>
                <div className="mt-1 font-medium text-slate-900">
                  {entry?.field_debit_account.field_ledger_account_name}
                </div>
                <div className="text-slate-600">
                  {entry?.field_debit_account.field_account_type?.name}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Credit
                </div>
                <div className="mt-1 font-medium text-slate-900">
                  {entry?.field_credit_account.field_ledger_account_name}
                </div>
                <div className="text-slate-600">
                  {entry?.field_credit_account.field_account_type?.name}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </span>
                <div className="font-semibold text-slate-900">
                  <Amount amt={entry?.field_amount} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>




      {/* Desktop table */}
      <div className="sm:hidden md:flex">
        <div className="overflow-x-auto border border-slate-200">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[100px_140px_1.0fr_1.0fr_120px_80px] gap-1 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div>Date</div>
              <div>Title</div> 
              <div>Debit Ledger Name <br /><span className='text-xs'>Account Type</span></div>
              <div>Credit Ledger Name<br /><span className='text-xs'>Account Type</span></div>
              <div>Amount</div>
              <div>Journal</div>
            </div>

            {data?.map((entry) => (
              <div
                key={entry?.id}
                className="grid grid-cols-[100px_140px_1.0fr_1.0fr_120px_80px] gap-1 border-b border-slate-200 px-4 py-4 text-sm text-slate-700 last:border-b-0"
              >
                <div>{entry?.field_date}</div>
                <div>{entry?.title}</div>
                <div>
                  {entry?.field_debit_account?.field_ledger_account_name}<br />
                  <span className='text-xs'>{entry?.field_debit_account?.field_account_type?.name}</span>
                </div>
                <div>
                  {entry?.field_credit_account?.field_ledger_account_name}<br />
                  <span className='text-xs'>{entry?.field_credit_account?.field_account_type?.name}</span>
                </div>
                <div>
                  <Amount amt={entry?.field_amount} />
                </div>
                <div className="flex items-center justify-center">
                  <a
                    className="inline-flex rounded border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-slate-50"
                    href={`/acc-journal-entry/?nodeId=${entry?.drupal_internal__nid}`}
                  >
                    JRN
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/** PAGENATION SECTION ----------------------------------------------- */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div onClick={() => setPage((p) => Math.max(p - 1, 0))}>
          {page !== 0 && <Button>← Previous</Button>}
        </div>

        <div className="text-sm font-semibold text-slate-700">
          Page {page + 1}
        </div>

        <div onClick={() => setPage((p) => p + 1)}>
          {data && data.length !== 0 && <Button>Next →</Button>}
        </div>
      </div>
    </div>
  );
}
