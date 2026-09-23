"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function ReceiptPage() {
  const params = useParams();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchReceipt(params.id as string);
    }
  }, [params.id]);

  const fetchReceipt = async (id: string) => {
    try {
      const data = await apiClient.get(`api/v1/finance/receipts/${id}`);
      setReceipt(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading receipt...</div>;
  if (!receipt) return <div className="p-8 text-center text-red-500">Receipt not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Receipt</h1>
        </div>
        <button className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-navy/90 focus:outline-none" onClick={() => window.print()}>Print Receipt</button>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-gray-900 print:shadow-none print:border-none">
        <div className="text-center mb-8 border-b pb-6">
          <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-widest">Official Receipt</h2>
          <p className="text-gray-500 mt-2">Receipt No: {receipt.receiptNumber}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h4>
            <p className="font-medium text-lg">
              {receipt.student ? `${receipt.student.firstName} ${receipt.student.lastName}` : "Unknown Student"}
            </p>
            {receipt.student?.admissionNumber && (
              <p className="text-gray-600">ID: {receipt.student.admissionNumber}</p>
            )}
          </div>
          <div className="text-right">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Details</h4>
            <p className="text-gray-600">Date: {new Date(receipt.createdAt).toLocaleDateString()}</p>
            <p className="text-gray-600">Method: {receipt.payment?.method || "N/A"}</p>
            <p className="text-gray-600">Ref: {receipt.payment?.reference || "N/A"}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-bold mb-4">Amount Received</h3>
          <p className="text-4xl font-extrabold text-brand-navy">
            ₦{Number(receipt.amountReceived).toLocaleString()}
          </p>
        </div>

        {receipt.payment?.allocations?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Allocated To Invoices</h4>
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount Allocated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {receipt.payment.allocations.map((alloc: any) => (
                  <tr key={alloc.id}>
                    <td className="py-3 text-sm">{alloc.invoice?.invoiceNumber || "Unknown"}</td>
                    <td className="py-3 text-sm text-right font-medium">₦{Number(alloc.amountAllocated).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-gray-400">
          <p>This is a computer-generated document. No signature is required.</p>
        </div>
      </div>
    </div>
  );
}
