import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasMore?: boolean;
  pageIndex?: number;
  emptyMessage?: string;
  disablePagination?: boolean;
}

export function DataTable<T>({ 
  data, 
  columns, 
  loading, 
  onNext, 
  onPrev, 
  hasMore = false, 
  pageIndex = 0,
  emptyMessage = "No records found",
  disablePagination = false
}: DataTableProps<T>) {

  if (loading && data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-gray-200 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface shadow-sm">
        <p className="text-sm text-gray-500 dark:text-brand-gray-text">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface shadow-sm overflow-hidden">
      <div className="overflow-x-auto relative">
        {loading && data.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-brand-navy-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
             <p className="text-sm font-medium text-gray-600 dark:text-brand-offwhite">Updating...</p>
          </div>
        )}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-brand-border-dark">
          <thead className="bg-gray-50 dark:bg-brand-navy border-b border-gray-200 dark:border-brand-border-dark">
            <tr>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  scope="col" 
                  className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-gray-text ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-brand-border-dark bg-white dark:bg-brand-navy-surface">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-brand-gray-text">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-brand-navy transition-colors">
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-brand-offwhite ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                    >
                      {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disablePagination && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={onPrev}
              disabled={pageIndex === 0 || loading}
              className="relative inline-flex items-center rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite hover:bg-gray-50 dark:hover:bg-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasMore || loading}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 dark:border-brand-border-dark bg-white dark:bg-brand-navy-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-brand-offwhite hover:bg-gray-50 dark:hover:bg-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-brand-gray-text">
                Showing page <span className="font-semibold text-gray-900 dark:text-brand-offwhite">{pageIndex + 1}</span>
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={onPrev}
                  disabled={pageIndex === 0 || loading}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 dark:text-brand-gray-text ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasMore || loading}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 dark:text-brand-gray-text ring-1 ring-inset ring-gray-300 dark:ring-brand-border-dark hover:bg-gray-50 dark:hover:bg-brand-navy focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
